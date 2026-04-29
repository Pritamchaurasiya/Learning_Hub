"""
Hyperbolic Embeddings

Non-Euclidean geometry for hierarchical data:
1. Poincaré ball model.
2. Hyperbolic distance.
3. Möbius operations.
"""

import logging
import random
import math
from typing import List, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)


class PoincareBall:
    """
    Poincaré ball model of hyperbolic space.
    Points lie within unit ball: ||x|| < 1
    """
    def __init__(self, dim: int, curvature: float = 1.0):
        self.dim = dim
        self.c = curvature  # Negative curvature parameter
        self.eps = 1e-5

    def _norm(self, x: List[float]) -> float:
        return math.sqrt(sum(xi**2 for xi in x))

    def _dot(self, x: List[float], y: List[float]) -> float:
        return sum(xi * yi for xi, yi in zip(x, y))

    def project(self, x: List[float], max_norm: float = 0.99) -> List[float]:
        """Project point to stay within Poincaré ball."""
        norm = self._norm(x)
        if norm > max_norm:
            return [xi * max_norm / norm for xi in x]
        return x

    def conformal_factor(self, x: List[float]) -> float:
        """Conformal factor lambda_x = 2 / (1 - ||x||²)."""
        norm_sq = sum(xi**2 for xi in x)
        return 2.0 / (1.0 - norm_sq + self.eps)

    def hyperbolic_distance(self, x: List[float], y: List[float]) -> float:
        """
        Hyperbolic distance in Poincaré ball:
        d(x,y) = 2 * artanh(||−x ⊕ y||)
        """
        neg_x = self.mobius_add([-xi for xi in x], y)
        norm = self._norm(neg_x)
        norm = min(norm, 1.0 - self.eps)  # Clamp for stability
        return 2.0 * math.atanh(norm)

    def mobius_add(self, x: List[float], y: List[float]) -> List[float]:
        """
        Möbius addition: x ⊕ y
        """
        x_norm_sq = sum(xi**2 for xi in x)
        y_norm_sq = sum(yi**2 for yi in y)
        xy_dot = self._dot(x, y)
        
        denom = 1.0 + 2.0 * xy_dot + x_norm_sq * y_norm_sq + self.eps
        
        result = []
        for xi, yi in zip(x, y):
            num = (1.0 + 2.0 * xy_dot + y_norm_sq) * xi + (1.0 - x_norm_sq) * yi
            result.append(num / denom)
        
        return self.project(result)

    def mobius_scalar_mult(self, r: float, x: List[float]) -> List[float]:
        """
        Möbius scalar multiplication: r ⊗ x
        """
        norm = self._norm(x)
        if norm < self.eps:
            return x
        
        # r ⊗ x = tanh(r * artanh(||x||)) * x / ||x||
        new_norm = math.tanh(r * math.atanh(min(norm, 1.0 - self.eps)))
        return [new_norm * xi / norm for xi in x]

    def exp_map(self, x: List[float], v: List[float]) -> List[float]:
        """
        Exponential map: exp_x(v) - map tangent vector to manifold.
        """
        v_norm = self._norm(v)
        if v_norm < self.eps:
            return x
        
        lambda_x = self.conformal_factor(x)
        
        # Direction and magnitude
        direction = [vi / v_norm for vi in v]
        magnitude = math.tanh(lambda_x * v_norm / 2.0)
        
        scaled_v = [magnitude * d for d in direction]
        return self.mobius_add(x, scaled_v)

    def log_map(self, x: List[float], y: List[float]) -> List[float]:
        """
        Logarithmic map: log_x(y) - map point to tangent space.
        """
        neg_x_plus_y = self.mobius_add([-xi for xi in x], y)
        norm = self._norm(neg_x_plus_y)
        
        if norm < self.eps:
            return [0.0] * self.dim
        
        lambda_x = self.conformal_factor(x)
        factor = 2.0 / lambda_x * math.atanh(min(norm, 1.0 - self.eps))
        
        return [factor * v / norm for v in neg_x_plus_y]


class HyperbolicEmbedding:
    """Embedding layer in hyperbolic space."""
    def __init__(self, num_embeddings: int, dim: int, curvature: float = 1.0):
        self.ball = PoincareBall(dim, curvature)
        self.dim = dim
        
        # Initialize embeddings near origin (more stable)
        self.embeddings = []
        for _ in range(num_embeddings):
            emb = [random.uniform(-0.01, 0.01) for _ in range(dim)]
            self.embeddings.append(self.ball.project(emb))

    def __getitem__(self, idx: int) -> List[float]:
        return self.embeddings[idx]

    def distance_matrix(self) -> List[List[float]]:
        """Compute pairwise hyperbolic distances."""
        n = len(self.embeddings)
        distances = [[0.0] * n for _ in range(n)]
        
        for i in range(n):
            for j in range(i + 1, n):
                d = self.ball.hyperbolic_distance(self.embeddings[i], self.embeddings[j])
                distances[i][j] = d
                distances[j][i] = d
        
        return distances


class HyperbolicMLP:
    """MLP operating in hyperbolic space."""
    def __init__(self, input_dim: int, hidden_dim: int, output_dim: int):
        self.ball = PoincareBall(output_dim)
        
        # Euclidean weights for tangent space operations
        self.W1 = [[random.gauss(0, 0.1) for _ in range(input_dim)] for _ in range(hidden_dim)]
        self.W2 = [[random.gauss(0, 0.1) for _ in range(hidden_dim)] for _ in range(output_dim)]

    def forward(self, x: List[float]) -> List[float]:
        """
        Hyperbolic neural network layer:
        1. Log map to tangent space
        2. Linear transform
        3. Exp map back to manifold
        """
        origin = [0.0] * len(x)
        
        # Log map at origin (simplifies to identity for origin tangent space)
        v = self.ball.log_map(origin, x)
        
        # Linear in tangent space
        h = []
        for i in range(len(self.W1)):
            hi = sum(self.W1[i][j] * v[j] for j in range(len(v)))
            h.append(math.tanh(hi))
        
        out = []
        for i in range(len(self.W2)):
            oi = sum(self.W2[i][j] * h[j] for j in range(len(h)))
            out.append(oi)
        
        # Exp map back
        return self.ball.exp_map(origin, out)
