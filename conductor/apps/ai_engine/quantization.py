"""
Quantization

Model compression:
1. INT8/INT4 quantization.
2. GPTQ/AWQ.
3. Dynamic quantization.
"""

import random
import math
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from enum import Enum


class QuantMethod(Enum):
    INT8 = "int8"
    INT4 = "int4"
    FP16 = "fp16"
    GPTQ = "gptq"
    AWQ = "awq"
    DYNAMIC = "dynamic"


@dataclass
class QuantConfig:
    bits: int = 8
    group_size: int = 128
    symmetric: bool = True
    per_channel: bool = True


class INT8Quantizer:
    """INT8 quantization."""
    def __init__(self, symmetric: bool = True):
        self.symmetric = symmetric

    def quantize(self, weights: List[float]) -> Tuple[List[int], float, float]:
        if not weights:
            return [], 1.0, 0.0
        
        min_val = min(weights)
        max_val = max(weights)
        
        if self.symmetric:
            abs_max = max(abs(min_val), abs(max_val))
            scale = abs_max / 127.0 if abs_max > 0 else 1.0
            zero_point = 0.0
            quantized = [max(-128, min(127, int(round(w / scale)))) for w in weights]
        else:
            scale = (max_val - min_val) / 255.0 if max_val > min_val else 1.0
            zero_point = min_val
            quantized = [max(0, min(255, int(round((w - zero_point) / scale)))) for w in weights]
        
        return quantized, scale, zero_point

    def dequantize(self, quantized: List[int], scale: float, zero_point: float) -> List[float]:
        if self.symmetric:
            return [q * scale for q in quantized]
        return [q * scale + zero_point for q in quantized]


class INT4Quantizer:
    """INT4 quantization with grouping."""
    def __init__(self, group_size: int = 128):
        self.group_size = group_size

    def quantize_group(self, weights: List[float]) -> Tuple[List[int], float, float]:
        if not weights:
            return [], 1.0, 0.0
        
        min_val = min(weights)
        max_val = max(weights)
        scale = (max_val - min_val) / 15.0 if max_val > min_val else 1.0
        zero_point = min_val
        quantized = [max(0, min(15, int(round((w - zero_point) / scale)))) for w in weights]
        return quantized, scale, zero_point

    def quantize(self, weights: List[float]) -> Dict:
        groups = []
        for i in range(0, len(weights), self.group_size):
            group = weights[i:i + self.group_size]
            q, s, z = self.quantize_group(group)
            groups.append({'quantized': q, 'scale': s, 'zero_point': z})
        return {'groups': groups, 'group_size': self.group_size}


class GPTQQuantizer:
    """GPTQ-style quantization."""
    def __init__(self, bits: int = 4, group_size: int = 128):
        self.bits = bits
        self.group_size = group_size
        self.max_val = (1 << (bits - 1)) - 1
        self.min_val = -(1 << (bits - 1))

    def _compute_hessian(self, activations: List[List[float]]) -> List[List[float]]:
        # Simplified: H = X^T X
        n = len(activations[0]) if activations else 0
        H = [[0.0 for _ in range(n)] for _ in range(n)]
        for x in activations:
            for i in range(n):
                for j in range(n):
                    H[i][j] += x[i] * x[j]
        return H

    def quantize(self, weights: List[List[float]], activations: Optional[List[List[float]]] = None) -> Dict:
        quantized_weights = []
        scales = []
        
        for row in weights:
            max_abs = max(abs(w) for w in row) if row else 1.0
            scale = max_abs / self.max_val if max_abs > 0 else 1.0
            q_row = [max(self.min_val, min(self.max_val, int(round(w / scale)))) for w in row]
            quantized_weights.append(q_row)
            scales.append(scale)
        
        return {
            'quantized': quantized_weights,
            'scales': scales,
            'bits': self.bits
        }


class AWQQuantizer:
    """Activation-aware Weight Quantization."""
    def __init__(self, bits: int = 4, group_size: int = 128):
        self.bits = bits
        self.group_size = group_size

    def _compute_importance(self, weights: List[float], activations: List[float]) -> List[float]:
        return [abs(w) * abs(a) for w, a in zip(weights, activations)]

    def quantize(self, weights: List[float], activations: Optional[List[float]] = None) -> Dict:
        if activations:
            importance = self._compute_importance(weights, activations)
            # Scale important weights less aggressively
            scale_factors = [1.0 + 0.1 * (imp / max(importance)) for imp in importance]
            scaled_weights = [w * s for w, s in zip(weights, scale_factors)]
        else:
            scaled_weights = weights
        
        int4 = INT4Quantizer(self.group_size)
        return int4.quantize(scaled_weights)


class Quantizer:
    """Complete quantization system."""
    def __init__(self, config: QuantConfig = None):
        self.config = config or QuantConfig()
        self.int8 = INT8Quantizer(self.config.symmetric)
        self.int4 = INT4Quantizer(self.config.group_size)
        self.gptq = GPTQQuantizer(self.config.bits, self.config.group_size)
        self.awq = AWQQuantizer(self.config.bits, self.config.group_size)

    def quantize(
        self,
        weights: List[float],
        method: QuantMethod = QuantMethod.INT8,
        activations: Optional[List[float]] = None
    ) -> Dict:
        if method == QuantMethod.INT8:
            q, s, z = self.int8.quantize(weights)
            return {'quantized': q, 'scale': s, 'zero_point': z, 'method': 'int8'}
        elif method == QuantMethod.INT4:
            return {**self.int4.quantize(weights), 'method': 'int4'}
        elif method == QuantMethod.AWQ:
            return {**self.awq.quantize(weights, activations), 'method': 'awq'}
        else:
            q, s, z = self.int8.quantize(weights)
            return {'quantized': q, 'scale': s, 'zero_point': z, 'method': 'int8'}

    def estimate_compression(self, original_bits: int = 32, target_bits: int = 8) -> float:
        return original_bits / target_bits
