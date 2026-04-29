"""
Phase 156: Quantization Engine — INT4/INT8 Model Compression

Quantization maps 32-bit floating-point weights to lower-precision integers,
reducing model size 4-8x and speeding up inference 2-4x.

This is how LLMs run on phones (LLaMA.cpp), edge devices, and GPUs with
limited memory. GPTQ, AWQ, and bitsandbytes all implement quantization.

Techniques:
  1. Post-Training Quantization (PTQ): Quantize after training
  2. Quantization-Aware Training (QAT): Simulate quantization during training
  3. GPTQ: Layer-wise optimal quantization using Hessian information
  4. AWQ: Activation-Aware Quantization (protect salient weights)

Math:
  Quantize:   q = round(x / scale) + zero_point
  Dequantize: x̂ = (q - zero_point) × scale
  
  scale = (max_val - min_val) / (2^bits - 1)
"""
import math
import random
import logging
from typing import List, Dict, Any, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class QuantConfig:
    """Quantization configuration."""
    bits: int = 8        # INT8, INT4, etc.
    symmetric: bool = True
    group_size: int = 128  # Per-group quantization for better accuracy


class QuantizationEngine:
    """
    Post-Training Quantization (PTQ) engine.
    
    Supports INT4, INT8, and simulated FP16 quantization.
    """
    def __init__(self, config: QuantConfig = None):
        self.config = config or QuantConfig()
        self.bits = self.config.bits
        self.qmin = -(2 ** (self.bits - 1))
        self.qmax = 2 ** (self.bits - 1) - 1
    
    def compute_scale_zp(self, weights: List[float]) -> Tuple[float, int]:
        """Compute quantization scale and zero-point."""
        w_min = min(weights)
        w_max = max(weights)
        
        if self.config.symmetric:
            abs_max = max(abs(w_min), abs(w_max))
            scale = abs_max / self.qmax if abs_max > 0 else 1.0
            zero_point = 0
        else:
            scale = (w_max - w_min) / (self.qmax - self.qmin) if w_max > w_min else 1.0
            zero_point = int(round(self.qmin - w_min / scale))
        
        return scale, zero_point
    
    def quantize(self, weights: List[float]) -> Tuple[List[int], float, int]:
        """Quantize float weights to integers."""
        scale, zp = self.compute_scale_zp(weights)
        
        quantized = []
        for w in weights:
            q = int(round(w / scale)) + zp
            q = max(self.qmin, min(self.qmax, q))  # Clamp
            quantized.append(q)
        
        return quantized, scale, zp
    
    def dequantize(self, quantized: List[int], scale: float, zp: int) -> List[float]:
        """Dequantize integers back to floats."""
        return [(q - zp) * scale for q in quantized]
    
    def compute_error(self, original: List[float], reconstructed: List[float]) -> Dict[str, float]:
        """Compute quantization error metrics."""
        mse = sum((o - r)**2 for o, r in zip(original, reconstructed)) / len(original)
        max_err = max(abs(o - r) for o, r in zip(original, reconstructed))
        snr = 10 * math.log10(
            sum(o**2 for o in original) / max(sum((o-r)**2 for o, r in zip(original, reconstructed)), 1e-10)
        )
        
        return {
            "mse": round(mse, 8),
            "max_error": round(max_err, 6),
            "snr_db": round(snr, 2),
        }


class PerGroupQuantizer:
    """
    Per-Group Quantization — quantize in groups of G weights.
    
    Why? A single scale/zero-point for ALL weights is too coarse.
    By using different scales for groups of 128 weights, accuracy improves
    dramatically with minimal overhead (one scale per group vs per weight).
    
    This is what GPTQ and AWQ use internally.
    """
    def __init__(self, bits: int = 4, group_size: int = 128):
        self.engine = QuantizationEngine(QuantConfig(bits=bits, symmetric=True))
        self.group_size = group_size
    
    def quantize_grouped(self, weights: List[float]) -> Dict[str, Any]:
        """Quantize weights in groups."""
        n = len(weights)
        all_quantized = []
        scales = []
        zero_points = []
        
        for start in range(0, n, self.group_size):
            end = min(start + self.group_size, n)
            group = weights[start:end]
            
            q, scale, zp = self.engine.quantize(group)
            all_quantized.extend(q)
            scales.append(scale)
            zero_points.append(zp)
        
        return {
            "quantized": all_quantized,
            "scales": scales,
            "zero_points": zero_points,
            "num_groups": len(scales),
        }
    
    def dequantize_grouped(self, data: Dict[str, Any]) -> List[float]:
        """Dequantize grouped weights."""
        result = []
        idx = 0
        for i, (scale, zp) in enumerate(zip(data["scales"], data["zero_points"])):
            end = min(idx + self.group_size, len(data["quantized"]))
            group = data["quantized"][idx:end]
            deq = self.engine.dequantize(group, scale, zp)
            result.extend(deq)
            idx = end
        return result


class AWQSimulator:
    """
    Activation-Aware Weight Quantization (AWQ) simulator.
    
    Key Insight: Not all weights are equally important. Weights connected to
    high-activation channels are SALIENT and should be protected from
    quantization error.
    
    Strategy:
      1. Collect activation statistics from calibration data
      2. Identify salient channels (top K% by activation magnitude)
      3. Scale salient weights UP before quantization (preserves precision)
      4. Scale them DOWN after dequantization (restores original magnitude)
    """
    def __init__(self, bits: int = 4, salient_ratio: float = 0.1):
        self.bits = bits
        self.salient_ratio = salient_ratio
        self.engine = QuantizationEngine(QuantConfig(bits=bits))
    
    def identify_salient(self, activations: List[float]) -> List[int]:
        """Find indices of salient channels."""
        indexed = [(i, abs(a)) for i, a in enumerate(activations)]
        indexed.sort(key=lambda x: x[1], reverse=True)
        k = max(1, int(len(activations) * self.salient_ratio))
        return [i for i, _ in indexed[:k]]
    
    def quantize_awq(self, weights: List[float], activations: List[float],
                     scale_factor: float = 2.0) -> Dict[str, Any]:
        """AWQ: protect salient weights during quantization."""
        salient_idx = set(self.identify_salient(activations))
        
        # Scale up salient weights
        scaled_weights = [
            w * scale_factor if i in salient_idx else w
            for i, w in enumerate(weights)
        ]
        
        # Quantize
        q, scale, zp = self.engine.quantize(scaled_weights)
        deq = self.engine.dequantize(q, scale, zp)
        
        # Scale down salient weights
        restored = [
            d / scale_factor if i in salient_idx else d
            for i, d in enumerate(deq)
        ]
        
        # Compare with naive quantization
        q_naive, s_naive, zp_naive = self.engine.quantize(weights)
        deq_naive = self.engine.dequantize(q_naive, s_naive, zp_naive)
        
        error_awq = self.engine.compute_error(weights, restored)
        error_naive = self.engine.compute_error(weights, deq_naive)
        
        return {
            "awq_error": error_awq,
            "naive_error": error_naive,
            "improvement": f"{round((1 - error_awq['mse']/max(error_naive['mse'], 1e-10)) * 100, 1)}% MSE reduction",
            "salient_channels": len(salient_idx),
        }


def run_quantization_experiment() -> Dict[str, Any]:
    """Run quantization experiments comparing INT4, INT8, and AWQ."""
    rng = random.Random(42)
    weights = [rng.gauss(0, 0.5) for _ in range(256)]
    activations = [abs(rng.gauss(0, 1)) for _ in range(256)]
    
    results = {}
    for bits in [4, 8]:
        engine = QuantizationEngine(QuantConfig(bits=bits))
        q, scale, zp = engine.quantize(weights)
        deq = engine.dequantize(q, scale, zp)
        error = engine.compute_error(weights, deq)
        
        orig_bytes = len(weights) * 4  # FP32
        quant_bytes = len(weights) * bits // 8
        
        results[f"INT{bits}"] = {
            **error,
            "compression_ratio": f"{orig_bytes/quant_bytes:.1f}x",
            "size_reduction": f"{round((1-quant_bytes/orig_bytes)*100)}%",
        }
    
    # AWQ comparison
    awq = AWQSimulator(bits=4, salient_ratio=0.1)
    awq_result = awq.quantize_awq(weights, activations)
    results["AWQ_INT4"] = awq_result
    
    return {
        "paradigm": "Model Quantization (INT4/INT8/AWQ)",
        "weight_count": len(weights),
        "results": results,
        "insight": "INT4 gives 8x compression (LLMs on phones). AWQ protects salient weights for better accuracy."
    }
