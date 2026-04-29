"""
Differential Privacy (DP-SGD) Engine v2 (Phase 117).
Cryptographic privacy guarantees in ML via gradient clipping and noise addition.
"""
import random
import math
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


class DPSGDEngine:
    """
    Simulates Differentially Private Stochastic Gradient Descent.
    Mathematically guarantees that the model's output distribution remains 
    nearly indistinguishable regardless of whether any single individual's 
    data is included in the training set (epsilon-delta privacy).
    """
    def __init__(self, model_dim: int = 10, clipping_bound: float = 1.5, noise_multiplier: float = 0.8):
        self.model_dim = model_dim
        self.global_weights = [random.gauss(0, 0.1) for _ in range(model_dim)]
        
        # C: The maximum allowed L2 norm for an individual student's gradient
        self.clipping_bound = clipping_bound
        # Sigma: Scales the Gaussian noise added to mask individual contributions
        self.noise_multiplier = noise_multiplier
        self.lr = 0.05

    def _compute_l2_norm(self, vec: List[float]) -> float:
        return math.sqrt(sum(x**2 for x in vec))

    def _clip_gradient(self, grad: List[float]) -> List[float]:
        """Clips gradient so its L2 norm is at most C."""
        norm = self._compute_l2_norm(grad)
        if norm <= self.clipping_bound:
            return grad
        scale = self.clipping_bound / norm
        return [g * scale for g in grad]

    def process_dp_batch(self, batch_size: int = 64) -> Dict[str, Any]:
        """
        Simulates processing a batch of data privately.
        1. Compute per-example gradients.
        2. Clip the gradients.
        3. Add noise to the sum of gradients.
        4. Average and update.
        """
        # 1. Simulate per-example gradients (each from an individual student)
        per_example_gradients = []
        for _ in range(batch_size):
            # Gradient could be large or small
            grad = [random.gauss(0, 2.0) for _ in range(self.model_dim)]
            per_example_gradients.append(grad)
            
        # 2. Clip each individual student's gradient
        clipped_gradients = [self._clip_gradient(g) for g in per_example_gradients]
        
        # 3. Aggregate
        summed_gradient = [0.0] * self.model_dim
        for grad in clipped_gradients:
            for i in range(self.model_dim):
                summed_gradient[i] += grad[i]
                
        # 3b. Add calibrated Gaussian noise to the sum
        # Noise std dev = sigma * C
        std_dev = self.noise_multiplier * self.clipping_bound
        noisy_summed_gradient = [
            g + random.gauss(0, std_dev) for g in summed_gradient
        ]
        
        # 4. Average and Update
        update_magnitude = 0.0
        for i in range(self.model_dim):
            avg_grad = noisy_summed_gradient[i] / batch_size
            self.global_weights[i] -= self.lr * avg_grad
            update_magnitude += abs(self.lr * avg_grad)
            
        return {
            "batch_size": batch_size,
            "l2_clipping_bound": self.clipping_bound,
            "noise_multiplier": self.noise_multiplier,
            "noise_std_dev_applied": round(std_dev, 4),
            "model_update_magnitude": round(update_magnitude, 4),
            "mechanics": "Differentially Private SGD. Bounding individual influence via L2 norm gradient clipping and masking via calibrated Gaussian noise."
        }
