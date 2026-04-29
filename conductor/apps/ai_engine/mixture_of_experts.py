"""
Mixture of Experts (MoE)

Sparse AI for efficient large-scale models:
1. Gating network for expert routing.
2. Top-K expert selection.
3. Load balancing loss.
"""

import logging
import random
import math
from typing import List, Dict, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)


class Expert:
    """Single expert network (FFN)."""
    def __init__(self, input_dim: int, hidden_dim: int, output_dim: int, expert_id: int):
        self.expert_id = expert_id
        self.W1 = [[random.gauss(0, 0.1) for _ in range(input_dim)] for _ in range(hidden_dim)]
        self.W2 = [[random.gauss(0, 0.1) for _ in range(hidden_dim)] for _ in range(output_dim)]
        self.hidden_dim = hidden_dim
        self.output_dim = output_dim

    def forward(self, x: List[float]) -> List[float]:
        # Hidden layer with ReLU
        hidden = []
        for i in range(self.hidden_dim):
            h = sum(self.W1[i][j] * x[j] for j in range(min(len(x), len(self.W1[i]))))
            hidden.append(max(0, h))
        
        # Output layer
        output = []
        for i in range(self.output_dim):
            o = sum(self.W2[i][j] * hidden[j] for j in range(self.hidden_dim))
            output.append(o)
        
        return output


class GatingNetwork:
    """Router that assigns tokens to experts."""
    def __init__(self, input_dim: int, num_experts: int):
        self.num_experts = num_experts
        self.W = [[random.gauss(0, 0.1) for _ in range(input_dim)] for _ in range(num_experts)]
        self.noise_scale = 0.1

    def forward(self, x: List[float], add_noise: bool = True) -> List[float]:
        """Compute gating scores for each expert."""
        scores = []
        for i in range(self.num_experts):
            s = sum(self.W[i][j] * x[j] for j in range(min(len(x), len(self.W[i]))))
            if add_noise:
                s += random.gauss(0, self.noise_scale)
            scores.append(s)
        
        # Softmax
        max_s = max(scores)
        exp_scores = [math.exp(s - max_s) for s in scores]
        total = sum(exp_scores)
        probs = [e / total for e in exp_scores]
        
        return probs

    def top_k(self, probs: List[float], k: int) -> List[Tuple[int, float]]:
        """Select top-k experts with their weights."""
        indexed = [(i, p) for i, p in enumerate(probs)]
        sorted_experts = sorted(indexed, key=lambda x: -x[1])[:k]
        
        # Renormalize weights
        total = sum(p for _, p in sorted_experts)
        return [(i, p / total) for i, p in sorted_experts]


class MixtureOfExperts:
    """Full MoE layer."""
    def __init__(self, input_dim: int, hidden_dim: int, output_dim: int, num_experts: int = 8, top_k: int = 2):
        self.num_experts = num_experts
        self.top_k = top_k
        self.experts = [Expert(input_dim, hidden_dim, output_dim, i) for i in range(num_experts)]
        self.gating = GatingNetwork(input_dim, num_experts)
        self.expert_usage = [0] * num_experts  # Track usage for load balancing

    def forward(self, x: List[float]) -> List[float]:
        """Route input through top-k experts."""
        # Get gating scores
        probs = self.gating.forward(x)
        
        # Select top-k experts
        selected = self.gating.top_k(probs, self.top_k)
        
        # Combine expert outputs
        output_dim = self.experts[0].output_dim
        combined = [0.0] * output_dim
        
        for expert_id, weight in selected:
            expert_out = self.experts[expert_id].forward(x)
            for i in range(output_dim):
                combined[i] += weight * expert_out[i]
            self.expert_usage[expert_id] += 1
        
        return combined

    def load_balancing_loss(self, batch_probs: List[List[float]]) -> float:
        """
        Encourage balanced expert usage.
        L_balance = num_experts * sum_i(f_i * P_i)
        where f_i is fraction routed to expert i
        and P_i is average probability for expert i
        """
        if not batch_probs:
            return 0.0
        
        n = len(batch_probs)
        
        # Fraction routed to each expert
        fractions = [0.0] * self.num_experts
        avg_probs = [0.0] * self.num_experts
        
        for probs in batch_probs:
            selected = self.gating.top_k(probs, self.top_k)
            for expert_id, _ in selected:
                fractions[expert_id] += 1.0 / n
            for i, p in enumerate(probs):
                avg_probs[i] += p / n
        
        # Load balancing loss
        loss = 0.0
        for i in range(self.num_experts):
            loss += fractions[i] * avg_probs[i]
        
        return self.num_experts * loss

    def reset_usage(self):
        self.expert_usage = [0] * self.num_experts
