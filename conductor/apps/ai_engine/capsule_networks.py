"""
Capsule Networks (CapsNets) (Phase 95).
Implements part-whole hierarchies and dynamic routing between capsules.
"""
import math
import random
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


def squash(vector: List[float], eps: float = 1e-9) -> List[float]:
    """
    Non-linear activation function for capsules.
    Ensures that short vectors get shrunk to almost zero length 
    and long vectors get shrunk to a length slightly below 1.
    """
    squared_norm = sum(x*x for x in vector)
    norm = math.sqrt(squared_norm)
    
    scale = squared_norm / (1.0 + squared_norm)
    scalar = scale / (norm + eps)
    
    return [scalar * x for x in vector]


class CapsuleLayer:
    """
    A single Capsule Layer that receives inputs from a lower capsule layer
    and uses Dynamic Routing to send its output to an upper capsule layer.
    """
    def __init__(self, num_capsules: int, capsule_dim: int, num_lower_capsules: int, lower_capsule_dim: int, num_routing_iterations: int = 3):
        self.num_capsules = num_capsules
        self.capsule_dim = capsule_dim
        self.num_lower_capsules = num_lower_capsules
        self.lower_capsule_dim = lower_capsule_dim
        self.num_routing_iterations = num_routing_iterations
        
        # Transformation Matrices W_ij: (num_lower, num_capsules, lower_dim, out_dim)
        # To map each lower capsule to a "prediction vector" for each higher capsule
        self.W = [[[[random.gauss(0, 0.1) for _ in range(capsule_dim)] 
                    for _ in range(lower_capsule_dim)] 
                   for _ in range(num_capsules)] 
                  for _ in range(num_lower_capsules)]

    def _transform_input(self, i: int, j: int, u_i: List[float]) -> List[float]:
        r"""Computes prediction vector \hat{u}_{j|i} = W_{ij} * u_i"""
        u_hat = [0.0] * self.capsule_dim
        matrix = self.W[i][j]
        
        for p in range(self.capsule_dim):
            for q in range(self.lower_capsule_dim):
                u_hat[p] += matrix[q][p] * u_i[q]
                
        return u_hat

    def forward(self, lower_capsules: List[List[float]]) -> List[List[float]]:
        """
        Forward pass with Dynamic Routing Algorithm.
        lower_capsules: (num_lower_capsules) lists of length (lower_capsule_dim)
        Returns: (num_capsules) lists of length (capsule_dim)
        """
        
        # 1. Compute all prediction vectors u_hat_{j|i}
        # u_hat shape: [lower_idx][higher_idx][capsule_dim]
        u_hat = [[self._transform_input(i, j, lower_capsules[i]) for j in range(self.num_capsules)] for i in range(self.num_lower_capsules)]
        
        # 2. Initialize Routing Logits b_ij to zero
        # b shape: [lower_idx][higher_idx]
        b = [[0.0] * self.num_capsules for _ in range(self.num_lower_capsules)]
        
        final_higher_capsules = []
        
        for r_iter in range(self.num_routing_iterations):
            # a. Compute routing probabilities c_i = softmax(b_i)
            # Softmax is applied across the HIGHER capsule dimension j
            c = [[0.0] * self.num_capsules for _ in range(self.num_lower_capsules)]
            for i in range(self.num_lower_capsules):
                max_b = max(b[i])
                exp_b = [math.exp(val - max_b) for val in b[i]]
                sum_exp = sum(exp_b)
                c[i] = [val / sum_exp for val in exp_b]
                
            # b. Compute total input to higher capsule j: s_j = sum(c_ij * u_hat_{j|i})
            s = [[0.0] * self.capsule_dim for _ in range(self.num_capsules)]
            for j in range(self.num_capsules):
                for i in range(self.num_lower_capsules):
                    # add c_ij * u_hat_{j|i} to s_j
                    for p in range(self.capsule_dim):
                        s[j][p] += c[i][j] * u_hat[i][j][p]
                        
            # c. Squash to get capsule output v_j
            v = [squash(s_j) for s_j in s]
            final_higher_capsules = v
            
            # d. Update routing logits: b_ij = b_ij + u_hat_{j|i} dot v_j
            if r_iter < self.num_routing_iterations - 1:
                for i in range(self.num_lower_capsules):
                    for j in range(self.num_capsules):
                        dot_product = sum(u_hat[i][j][p] * v[j][p] for p in range(self.capsule_dim))
                        b[i][j] += dot_product
                        
        return final_higher_capsules


class CapsNetEngine:
    """
    Phase 95: Capsule Networks Engine.
    Uses vector representations (Capsules) and Dynamic Routing to understand
    part-whole relationships and solve orientation/pose transformations.
    """
    def __init__(self, in_capsules: int, in_dim: int, out_capsules: int, out_dim: int):
        self.layer = CapsuleLayer(
            num_capsules=out_capsules,
            capsule_dim=out_dim,
            num_lower_capsules=in_capsules,
            lower_capsule_dim=in_dim,
            num_routing_iterations=3
        )
        
    def forward(self, inputs: List[List[float]]) -> List[List[float]]:
        """Processes lower level features/capsules to high-level conceptual capsules."""
        return self.layer.forward(inputs)
