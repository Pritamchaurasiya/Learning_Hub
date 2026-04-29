"""
Phase 152: Kolmogorov-Arnold Networks (KAN)

KANs (Liu et al., 2024) are a fundamentally different architecture from MLPs.
Instead of fixed activation functions on NODES (like ReLU), KANs place
LEARNABLE activation functions on EDGES (connections).

MLP:  y = σ(Wx + b)          — fixed activation σ, learn weights W
KAN:  y = Σ φ_i(x_i)          — learn activation functions φ, no weight matrix

Mathematical Foundation (Kolmogorov-Arnold Representation Theorem):
  Any continuous multivariate function f(x_1, ..., x_n) can be decomposed as:
  f(x) = Σ_{q=0}^{2n} Φ_q(Σ_{p=1}^{n} φ_{q,p}(x_p))

  This means you only need 1D functions composed together to represent
  ANY continuous function — no matter how complex!

Why KANs matter:
  - More interpretable than MLPs (you can visualize each edge function)
  - Fewer parameters needed for the same accuracy on scientific tasks
  - Better extrapolation on symbolic regression problems
"""
import math
import random
import logging
from typing import List, Dict, Any, Tuple, Callable
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


class BSplineBasis:
    """
    B-Spline basis functions — the building blocks of learnable activations.
    
    A B-spline of order k is a piecewise polynomial of degree k-1.
    KANs use B-splines because:
      1. They're smooth (C^{k-2} continuous)
      2. They have compact support (local changes don't affect distant regions)
      3. They can approximate ANY continuous function
    """
    def __init__(self, k: int = 3, num_knots: int = 8, domain: Tuple[float, float] = (-1, 1)):
        self.k = k  # B-spline order
        self.num_knots = num_knots
        
        # Uniform knot vector with padding
        t_min, t_max = domain
        step = (t_max - t_min) / (num_knots - 1)
        self.knots = [t_min + i * step for i in range(-k, num_knots + k)]
    
    def evaluate(self, x: float, i: int, k: int = None) -> float:
        """Evaluate B-spline basis function B_{i,k}(x) using Cox-de Boor recursion."""
        if k is None:
            k = self.k
        
        if k == 0:
            if i < len(self.knots) - 1 and self.knots[i] <= x < self.knots[i + 1]:
                return 1.0
            return 0.0
        
        # Guard against index out of range
        idx_left = i
        idx_right = i + k
        if idx_right + 1 >= len(self.knots):
            return 0.0
        
        denom1 = self.knots[idx_left + k] - self.knots[idx_left]
        denom2 = self.knots[idx_right + 1] - self.knots[idx_left + 1]
        
        term1 = 0.0
        if abs(denom1) > 1e-10:
            term1 = ((x - self.knots[idx_left]) / denom1) * self.evaluate(x, i, k - 1)
        
        term2 = 0.0
        if abs(denom2) > 1e-10:
            term2 = ((self.knots[idx_right + 1] - x) / denom2) * self.evaluate(x, i + 1, k - 1)
        
        return term1 + term2
    
    def all_basis(self, x: float) -> List[float]:
        """Evaluate all basis functions at point x."""
        return [self.evaluate(x, i) for i in range(self.num_knots + self.k - 1)]


class KANEdge:
    """
    A single KAN edge — a learnable univariate activation function.
    
    φ(x) = SiLU(x) + Σ c_i B_i(x)
    
    The SiLU (x·sigmoid(x)) is a residual base function.
    The B-spline sum learns the deviation from SiLU.
    """
    def __init__(self, num_knots: int = 8, k: int = 3, seed: int = 0):
        self.basis = BSplineBasis(k=k, num_knots=num_knots)
        self.num_coeffs = num_knots + k - 1
        
        rng = random.Random(seed)
        self.coeffs = [rng.gauss(0, 0.1) for _ in range(self.num_coeffs)]
        self.scale = 1.0
    
    def _silu(self, x: float) -> float:
        """SiLU base function: x · σ(x)."""
        sig = 1.0 / (1.0 + math.exp(-min(max(x, -20), 20)))
        return x * sig
    
    def forward(self, x: float) -> float:
        """Evaluate the learnable activation: φ(x) = SiLU(x) + Σ c_i B_i(x)."""
        base = self._silu(x)
        
        # B-spline enhancement
        basis_vals = self.basis.all_basis(max(-1.0, min(1.0, x)))  # Clamp to domain
        spline = sum(c * b for c, b in zip(self.coeffs, basis_vals))
        
        return self.scale * (base + spline)


class KANLayer:
    """
    A single KAN layer with learnable edge functions.
    
    Instead of:  y = σ(Wx + b)    (MLP: fixed σ, learn W)
    KAN does:    y_j = Σ_i φ_{i,j}(x_i)  (no W, learn φ)
    
    Each edge (i→j) has its own learnable function φ_{i,j}.
    """
    def __init__(self, in_dim: int, out_dim: int, num_knots: int = 8, seed: int = 0):
        self.in_dim = in_dim
        self.out_dim = out_dim
        
        # Create a learnable function for each edge
        self.edges: List[List[KANEdge]] = []
        for i in range(in_dim):
            row = []
            for j in range(out_dim):
                edge = KANEdge(num_knots=num_knots, seed=seed + i * out_dim + j)
                row.append(edge)
            self.edges.append(row)
    
    def forward(self, x: List[float]) -> List[float]:
        """Compute output: y_j = Σ_i φ_{i,j}(x_i)."""
        output = [0.0] * self.out_dim
        for j in range(self.out_dim):
            for i in range(self.in_dim):
                output[j] += self.edges[i][j].forward(x[i])
        return output


class KolmogorovArnoldNetwork:
    """
    Full KAN — a stack of KAN layers.
    
    Architecture: [in_dim] → KANLayer → KANLayer → ... → [out_dim]
    
    Advantages over MLP:
      - More interpretable: visualize each edge function
      - Better on scientific/mathematical tasks
      - Faster convergence on low-dimensional problems
    
    Disadvantage:
      - More expensive per parameter than MLP
      - Less explored for high-dimensional data (images, text)
    """
    def __init__(self, layer_dims: List[int], num_knots: int = 8, seed: int = 42):
        self.layers = []
        for i in range(len(layer_dims) - 1):
            layer = KANLayer(layer_dims[i], layer_dims[i+1], num_knots, seed=seed + i * 100)
            self.layers.append(layer)
        self.layer_dims = layer_dims
    
    def forward(self, x: List[float]) -> List[float]:
        """Forward pass through all KAN layers."""
        for layer in self.layers:
            x = layer.forward(x)
        return x
    
    def count_parameters(self) -> int:
        """Count total learnable parameters (B-spline coefficients)."""
        total = 0
        for layer in self.layers:
            for row in layer.edges:
                for edge in row:
                    total += len(edge.coeffs) + 1  # +1 for scale
        return total
    
    def run_experiment(self, num_samples: int = 50) -> Dict[str, Any]:
        """Evaluate KAN on function approximation."""
        rng = random.Random(42)
        
        # Target function: f(x1, x2) = sin(x1) + cos(x2)
        errors = []
        for _ in range(num_samples):
            x = [rng.uniform(-1, 1) for _ in range(self.layer_dims[0])]
            target = math.sin(x[0]) + (math.cos(x[1]) if len(x) > 1 else 0)
            
            pred = self.forward(x)
            pred_val = pred[0] if pred else 0
            errors.append((pred_val - target) ** 2)
        
        mse = sum(errors) / len(errors)
        
        return {
            "architecture": f"KAN-{'-'.join(map(str, self.layer_dims))}",
            "total_parameters": self.count_parameters(),
            "mse": round(mse, 6),
            "num_samples": num_samples,
            "vs_mlp": "KAN uses learnable B-spline activations on edges instead of fixed ReLU on nodes. Better for scientific tasks.",
        }


def run_kan_experiment() -> Dict[str, Any]:
    """Run KAN experiment."""
    kan = KolmogorovArnoldNetwork(layer_dims=[2, 5, 5, 1], num_knots=8)
    result = kan.run_experiment()
    return {
        "paradigm": "Kolmogorov-Arnold Network (KAN)",
        **result,
        "mathematical_basis": "Kolmogorov-Arnold Theorem: any f(x1,...,xn) = Σ Φ_q(Σ φ_{q,p}(x_p))",
        "insight": "KANs replace weight matrices with learnable activation functions. Each connection learns its own univariate function via B-splines."
    }
