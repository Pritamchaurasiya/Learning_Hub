"""
Tests for Hyperbolic Embeddings (Poincare Ball).
Validates geometric operations and MLP layers.
"""
import pytest
import math
from apps.ai_engine.hyperbolic_embeddings import PoincareBall, HyperbolicMLP

def test_poincare_projection():
    ball = PoincareBall(dim=2)
    x = [2.0, 2.0] # Outside ball
    projected = ball.project(x)
    norm = math.sqrt(sum(xi**2 for xi in projected))
    assert norm < 1.0

def test_hyperbolic_distance():
    ball = PoincareBall(dim=2)
    x = [0.0, 0.0]
    y = [0.5, 0.0]
    # d(0, x) = 2 * artanh(||x||)
    expected = 2.0 * math.atanh(0.5)
    dist = ball.hyperbolic_distance(x, y)
    assert abs(dist - expected) < 1e-4

def test_mobius_addition():
    ball = PoincareBall(dim=2)
    # x + 0 = x
    x = [0.1, 0.2]
    zero = [0.0, 0.0]
    res = ball.mobius_add(x, zero)
    assert abs(res[0] - x[0]) < 1e-5
    assert abs(res[1] - x[1]) < 1e-5

def test_hyperbolic_mlp_forward():
    mlp = HyperbolicMLP(input_dim=2, hidden_dim=4, output_dim=2)
    x = [0.1, 0.1]
    output = mlp.forward(x)
    assert len(output) == 2
    # Ensure stays in ball
    norm = math.sqrt(sum(xi**2 for xi in output))
    assert norm < 1.0
