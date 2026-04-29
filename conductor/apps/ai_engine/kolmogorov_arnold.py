"""
Kolmogorov-Arnold Networks (KAN) (Phase 99).
Edges contain learnable activation functions (e.g. splines), nodes just sum.
"""
import random
import math
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


def b_spline(x: float, grid: List[float], k: int = 3) -> float:
    """
    Evaluates a simplistic B-spline or localized basis function.
    For demonstration, we use a simple Gaussian radial basis tied to a grid node.
    """
    # Find the nearest grid point
    dist = min((x - g)**2 for g in grid)
    # RBF response
    return math.exp(-dist * k)


class KANLayer:
    """
    A single Kolmogorov-Arnold layer.
    Instead of out_j = activation(sum_i(W_ij * in_i)),
    KAN uses out_j = sum_i( phi_ij(in_i) ) where phi is a learnable 1D function.
    """
    def __init__(self, in_features: int, out_features: int, grid_size: int = 5):
        self.in_features = in_features
        self.out_features = out_features
        
        # Grid range for the splines [-2, 2]
        self.grid = [(-2.0 + 4.0 * i / (grid_size - 1)) for i in range(grid_size)]
        
        # Learnable Spline Coefficients: shape (in_features, out_features, grid_size)
        self.spline_coeffs = [[[random.gauss(0, 0.1) for _ in range(grid_size)] 
                               for _ in range(out_features)] 
                              for _ in range(in_features)]
                              
        # Learnable base weights: shape (in_features, out_features)
        # KANs usually have a base function like SiLU for stability
        self.base_weights = [[random.gauss(0, 0.1) for _ in range(out_features)] for _ in range(in_features)]
        
    def _evaluate_phi(self, i: int, j: int, x: float) -> float:
        """Evaluates learnable edge function phi_{i,j}(x)."""
        # 1. Base function (SiLU: x * sigmoid(x))
        base_val = x * (1.0 / (1.0 + math.exp(-max(-20, min(20, x)))))
        
        # 2. Spline evaluation 
        spline_val = 0.0
        for g_idx, g in enumerate(self.grid):
            # RBF tied to grid
            basis = math.exp(-((x - g) ** 2) * 2.0)
            spline_val += self.spline_coeffs[i][j][g_idx] * basis
            
        return self.base_weights[i][j] * base_val + spline_val

    def forward(self, x: List[float]) -> List[float]:
        """Forward pass treating edges as non-linear functional approximators."""
        if len(x) != self.in_features:
            raise ValueError("Input length mismatch.")
            
        y = [0.0] * self.out_features
        for j in range(self.out_features):
            for i in range(self.in_features):
                y[j] += self._evaluate_phi(i, j, x[i])
        return y


class KANEngine:
    """
    Phase 99: Kolmogorov-Arnold Networks.
    Replaces global hidden activation nodes with specialized, localized B-spline 
    functions living on every distinct connection edge. Exceedingly interpretable.
    """
    def __init__(self, in_dim: int = 4, hidden_dim: int = 8, out_dim: int = 2):
        self.layer1 = KANLayer(in_dim, hidden_dim)
        self.layer2 = KANLayer(hidden_dim, out_dim)
        
    def predict(self, inputs: List[List[float]]) -> Dict[str, Any]:
        """Forward pass for a batch using functional edges."""
        outputs = []
        for x in inputs:
            h = self.layer1.forward(x)
            y = self.layer2.forward(h)
            outputs.append([round(val, 4) for val in y])
            
        return {
            "mechanics": "Learnable B-spline functions on graphical edges, nodes purely sum.",
            "predictions": outputs
        }
