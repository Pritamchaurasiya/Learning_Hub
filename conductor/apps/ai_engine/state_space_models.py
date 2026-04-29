"""
State Space Models (SSM / Mamba-style)

Efficient sequence modeling:
1. Selective state spaces.
2. Hardware-efficient parallel scan.
3. Gated MLP integration.
"""

import logging
import random
import math
from typing import List, Tuple, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


class SelectiveSSM:
    """
    Selective State Space Model.
    y = SSM(A, B, C, D)(x)
    """
    def __init__(self, d_model: int, d_state: int = 16, dt_rank: int = 8):
        self.d_model = d_model
        self.d_state = d_state
        self.dt_rank = dt_rank
        
        # Learnable parameters
        self.A = [[random.gauss(0, 0.1) for _ in range(d_state)] for _ in range(d_model)]
        self.B = [[random.gauss(0, 0.1) for _ in range(d_state)] for _ in range(d_model)]
        self.C = [[random.gauss(0, 0.1) for _ in range(d_state)] for _ in range(d_model)]
        self.D = [random.gauss(0, 0.1) for _ in range(d_model)]
        
        # Delta (discretization step) projection
        self.dt_proj = [[random.gauss(0, 0.1) for _ in range(d_model)] for _ in range(dt_rank)]

    def discretize(self, delta: float, A: List[float], B: List[float]) -> Tuple[List[float], List[float]]:
        """
        Discretize continuous params: A_bar = exp(delta * A), B_bar = (A_bar - I) * A^-1 * B
        Simplified version.
        """
        A_bar = [math.exp(delta * a) for a in A]
        B_bar = [delta * b for b in B]
        return A_bar, B_bar

    def ssm_step(self, x: float, h: List[float], A_bar: List[float], B_bar: List[float], 
                 C: List[float], D: float) -> Tuple[float, List[float]]:
        """Single SSM step."""
        # Update hidden state: h_new = A_bar * h + B_bar * x
        h_new = [a * hi + b * x for a, hi, b in zip(A_bar, h, B_bar)]
        
        # Output: y = C * h_new + D * x
        y = sum(c * hi for c, hi in zip(C, h_new)) + D * x
        
        return y, h_new

    def forward(self, x_seq: List[List[float]], delta: float = 0.1) -> List[List[float]]:
        """
        Process sequence through SSM.
        x_seq: [seq_len, d_model]
        """
        seq_len = len(x_seq)
        outputs = []
        
        # Initialize hidden states for each channel
        h_states = [[0.0] * self.d_state for _ in range(self.d_model)]
        
        for t in range(seq_len):
            y_t = []
            for d in range(self.d_model):
                A_bar, B_bar = self.discretize(delta, self.A[d], self.B[d])
                y, h_states[d] = self.ssm_step(
                    x_seq[t][d], h_states[d], A_bar, B_bar, self.C[d], self.D[d]
                )
                y_t.append(y)
            outputs.append(y_t)
        
        return outputs


class ParallelScan:
    """
    Hardware-efficient parallel scan for SSM.
    Computes cumulative operations in O(log n) parallel steps.
    """
    @staticmethod
    def associative_scan(elements: List[Tuple[float, float]]) -> List[Tuple[float, float]]:
        """
        Parallel prefix sum using associative operator.
        Each element is (a, b) representing: x -> a*x + b
        """
        if len(elements) <= 1:
            return elements
        
        n = len(elements)
        result = list(elements)
        
        # Up-sweep (reduce)
        d = 1
        while d < n:
            for i in range(0, n - d, 2 * d):
                # Combine: (a1, b1) * (a2, b2) = (a1*a2, a1*b2 + b1)
                a1, b1 = result[i]
                a2, b2 = result[i + d]
                result[i + d] = (a1 * a2, a1 * b2 + b1)
            d *= 2
        
        # Down-sweep
        result[n-1] = (1.0, 0.0)  # Identity
        d = n // 2
        while d >= 1:
            for i in range(0, n - d, 2 * d):
                temp = result[i]
                a1, b1 = result[i + d]
                result[i] = result[i + d]
                result[i + d] = (temp[0] * a1, temp[0] * b1 + temp[1])
            d //= 2
        
        return result


class GatedMLP:
    """Gated MLP block for Mamba-style architecture."""
    def __init__(self, d_model: int, d_inner: int):
        self.d_model = d_model
        self.d_inner = d_inner
        
        self.W_gate = [[random.gauss(0, 0.1) for _ in range(d_model)] for _ in range(d_inner)]
        self.W_up = [[random.gauss(0, 0.1) for _ in range(d_model)] for _ in range(d_inner)]
        self.W_down = [[random.gauss(0, 0.1) for _ in range(d_inner)] for _ in range(d_model)]

    def forward(self, x: List[float]) -> List[float]:
        # Gate
        gate = []
        for i in range(self.d_inner):
            g = sum(self.W_gate[i][j] * x[j] for j in range(self.d_model))
            gate.append(1 / (1 + math.exp(-g)))  # Sigmoid
        
        # Up projection
        up = []
        for i in range(self.d_inner):
            u = sum(self.W_up[i][j] * x[j] for j in range(self.d_model))
            up.append(u)
        
        # Gated activation
        hidden = [g * u for g, u in zip(gate, up)]
        
        # Down projection
        out = []
        for i in range(self.d_model):
            o = sum(self.W_down[i][j] * hidden[j] for j in range(self.d_inner))
            out.append(o)
        
        return out


class MambaBlock:
    """Complete Mamba-style block combining SSM and gated MLP."""
    def __init__(self, d_model: int, d_state: int = 16, expand: int = 2):
        self.ssm = SelectiveSSM(d_model, d_state)
        self.gated_mlp = GatedMLP(d_model, d_model * expand)
        self.d_model = d_model

    def forward(self, x_seq: List[List[float]]) -> List[List[float]]:
        # SSM branch
        ssm_out = self.ssm.forward(x_seq)
        
        # Apply gated MLP and residual
        outputs = []
        for t in range(len(x_seq)):
            mlp_out = self.gated_mlp.forward(ssm_out[t])
            # Residual connection
            out = [x + m for x, m in zip(x_seq[t], mlp_out)]
            outputs.append(out)
        
        return outputs
