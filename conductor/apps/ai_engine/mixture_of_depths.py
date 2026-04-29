"""
Phase 155: Mixture of Depths (MoD) — Dynamic Compute Allocation

MoD (Raposo et al., Google DeepMind 2024) lets the model SKIP layers for
"easy" tokens and spend more compute on "hard" tokens.

Key Insight: Not all tokens need the same amount of computation.
  - "The cat sat on the" → easy, predictable, skip some layers
  - "The Riemann hypothesis implies" → hard, needs full depth

Architecture:
  For each token at each layer, a ROUTER decides:
    router(x) > threshold → PROCESS through this layer (compute path)
    router(x) ≤ threshold → SKIP this layer via residual (identity path)

This gives variable-depth processing per token within a fixed-depth model.
Achieves 50% FLOPs reduction with minimal quality loss.
"""
import math
import random
import logging
from typing import List, Dict, Any, Tuple
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


class DepthRouter:
    """
    Per-layer router that decides whether to compute or skip.

    router(x) = σ(w · x + b)
    If router(x) > threshold → compute
    Else → skip (pass through residual)

    Uses a capacity budget: at most C% of tokens can be computed per layer.
    """
    def __init__(self, d_model: int, capacity: float = 0.5, seed: int = 0):
        self.d_model = d_model
        self.capacity = capacity  # Max fraction of tokens to process
        rng = random.Random(seed)
        self.w = [rng.gauss(0, math.sqrt(2.0/d_model)) for _ in range(d_model)]
        self.b = 0.0

    def route(self, x: List[float]) -> float:
        """Compute routing score for a single token."""
        score = self.b + sum(self.w[i] * x[i] for i in range(self.d_model))
        return 1.0 / (1.0 + math.exp(-min(max(score, -20), 20)))  # Sigmoid

    def route_batch(self, x_seq: List[List[float]]) -> List[Tuple[int, float, bool]]:
        """
        Route a batch of tokens. Enforce capacity constraint.
        Returns: List of (token_idx, score, should_compute)
        """
        scores = [(i, self.route(x)) for i, x in enumerate(x_seq)]
        scores.sort(key=lambda s: s[1], reverse=True)

        max_compute = max(1, int(len(x_seq) * self.capacity))
        results = []
        for rank, (idx, score) in enumerate(scores):
            should_compute = rank < max_compute
            results.append((idx, score, should_compute))

        results.sort(key=lambda r: r[0])  # Restore original order
        return results


class MoDLayer:
    """
    A transformer layer with Mixture-of-Depths routing.

    For tokens that ARE routed (compute path):
      y = x + FFN(LayerNorm(x))

    For tokens that ARE NOT routed (skip path):
      y = x  (identity / residual only)
    """
    def __init__(self, d_model: int, d_ff: int = 64, capacity: float = 0.5,
                 layer_id: int = 0, seed: int = 0):
        self.d_model = d_model
        self.router = DepthRouter(d_model, capacity, seed=seed + layer_id)

        rng = random.Random(seed + layer_id * 100)
        scale = math.sqrt(2.0 / (d_model + d_ff))
        self.W1 = [[rng.gauss(0, scale) for _ in range(d_ff)] for _ in range(d_model)]
        self.W2 = [[rng.gauss(0, scale) for _ in range(d_model)] for _ in range(d_ff)]

        self.compute_count = 0
        self.skip_count = 0

    def _ffn(self, x: List[float]) -> List[float]:
        """Feed-forward with SiLU activation."""
        hidden = [0.0] * len(self.W1[0])
        for j in range(len(hidden)):
            val = sum(x[i] * self.W1[i][j] for i in range(self.d_model))
            sig = 1.0 / (1.0 + math.exp(-min(max(val, -20), 20)))
            hidden[j] = val * sig  # SiLU

        output = [0.0] * self.d_model
        for j in range(self.d_model):
            output[j] = sum(hidden[i] * self.W2[i][j] for i in range(len(hidden)))
        return output

    def forward(self, x_seq: List[List[float]]) -> Tuple[List[List[float]], Dict[str, Any]]:
        """Process sequence with dynamic depth routing."""
        routing = self.router.route_batch(x_seq)
        output = []
        layer_stats = {"computed": 0, "skipped": 0, "scores": []}

        for idx, score, should_compute in routing:
            layer_stats["scores"].append(round(score, 3))
            if should_compute:
                ffn_out = self._ffn(x_seq[idx])
                result = [x_seq[idx][d] + ffn_out[d] for d in range(self.d_model)]
                layer_stats["computed"] += 1
                self.compute_count += 1
            else:
                result = x_seq[idx][:]  # Identity / skip
                layer_stats["skipped"] += 1
                self.skip_count += 1
            output.append(result)

        return output, layer_stats


class MixtureOfDepths:
    """
    Full MoD model — variable depth per token across multiple layers.
    """
    def __init__(self, d_model: int = 16, n_layers: int = 6, d_ff: int = 64,
                 capacity: float = 0.5, seed: int = 42):
        self.d_model = d_model
        self.n_layers = n_layers
        self.capacity = capacity
        self.layers = [
            MoDLayer(d_model, d_ff, capacity, layer_id=i, seed=seed)
            for i in range(n_layers)
        ]

    def forward(self, x_seq: List[List[float]]) -> Dict[str, Any]:
        """Full forward pass with per-layer routing stats."""
        current = x_seq
        per_layer_stats = []

        for i, layer in enumerate(self.layers):
            current, stats = layer.forward(current)
            per_layer_stats.append({
                "layer": i, "computed": stats["computed"], "skipped": stats["skipped"]
            })

        total_compute = sum(s["computed"] for s in per_layer_stats)
        total_skip = sum(s["skipped"] for s in per_layer_stats)
        total_ops = total_compute + total_skip

        return {
            "architecture": f"MoD-{self.n_layers}L (capacity={self.capacity})",
            "seq_len": len(x_seq),
            "per_layer": per_layer_stats,
            "total_compute_ops": total_compute,
            "total_skip_ops": total_skip,
            "flops_saved": f"{round(100 * total_skip / max(1, total_ops), 1)}%",
            "effective_depth_range": f"{self.n_layers * self.capacity:.0f}-{self.n_layers} layers per token",
        }


def run_mod_experiment() -> Dict[str, Any]:
    """Run Mixture of Depths experiment."""
    mod = MixtureOfDepths(d_model=8, n_layers=6, d_ff=32, capacity=0.5)
    rng = random.Random(42)
    x_seq = [[rng.gauss(0, 1) for _ in range(8)] for _ in range(10)]
    result = mod.forward(x_seq)
    result["insight"] = "MoD skips layers for easy tokens, allocating compute to hard tokens. Achieves ~50% FLOPs reduction."
    return result
