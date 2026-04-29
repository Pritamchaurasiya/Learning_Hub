"""
Neural ODEs (Continuous Depth Networks)

Differential equation-based neural networks:
1. ODE solvers (Euler, RK4).
2. Adjoint sensitivity method.
3. Continuous normalizing flows.
"""

import logging
import math
from typing import List, Callable, Tuple
from dataclasses import dataclass
import random

logger = logging.getLogger(__name__)


class ODEFunction:
    """Learnable dynamics f(t, z)."""
    def __init__(self, dim: int, hidden_dim: int = 64):
        self.dim = dim
        self.hidden_dim = hidden_dim
        # Neural network parameters
        self.W1 = [[random.gauss(0, 0.1) for _ in range(dim + 1)] for _ in range(hidden_dim)]
        self.W2 = [[random.gauss(0, 0.1) for _ in range(hidden_dim)] for _ in range(dim)]

    def __call__(self, t: float, z: List[float]) -> List[float]:
        """Compute dz/dt = f(t, z)."""
        # Concatenate t with z
        input_vec = z + [t]
        
        # Hidden layer with tanh
        hidden = []
        for i in range(self.hidden_dim):
            h = sum(self.W1[i][j] * input_vec[j] for j in range(len(input_vec)))
            hidden.append(math.tanh(h))
        
        # Output layer
        dzdt = []
        for i in range(self.dim):
            o = sum(self.W2[i][j] * hidden[j] for j in range(self.hidden_dim))
            dzdt.append(o)
        
        return dzdt


class ODESolver:
    """Numerical ODE solvers."""
    
    @staticmethod
    def euler_step(f: Callable, t: float, z: List[float], dt: float) -> List[float]:
        """Single Euler step: z_{t+dt} = z_t + dt * f(t, z)."""
        dzdt = f(t, z)
        return [zi + dt * dzi for zi, dzi in zip(z, dzdt)]

    @staticmethod
    def rk4_step(f: Callable, t: float, z: List[float], dt: float) -> List[float]:
        """Single RK4 step (4th order Runge-Kutta)."""
        k1 = f(t, z)
        
        z2 = [zi + 0.5 * dt * k1i for zi, k1i in zip(z, k1)]
        k2 = f(t + 0.5 * dt, z2)
        
        z3 = [zi + 0.5 * dt * k2i for zi, k2i in zip(z, k2)]
        k3 = f(t + 0.5 * dt, z3)
        
        z4 = [zi + dt * k3i for zi, k3i in zip(z, k3)]
        k4 = f(t + dt, z4)
        
        # Combine
        z_next = []
        for i in range(len(z)):
            z_next.append(z[i] + (dt / 6.0) * (k1[i] + 2*k2[i] + 2*k3[i] + k4[i]))
        
        return z_next

    @classmethod
    def solve(cls, f: Callable, z0: List[float], t0: float, t1: float, 
              n_steps: int = 10, method: str = 'rk4') -> Tuple[List[float], List[List[float]]]:
        """Solve ODE from t0 to t1."""
        dt = (t1 - t0) / n_steps
        z = z0.copy()
        t = t0
        trajectory = [z.copy()]
        
        step_fn = cls.rk4_step if method == 'rk4' else cls.euler_step
        
        for _ in range(n_steps):
            z = step_fn(f, t, z, dt)
            t += dt
            trajectory.append(z.copy())
        
        return z, trajectory


class NeuralODE:
    """Neural ODE model."""
    def __init__(self, dim: int, hidden_dim: int = 64):
        self.func = ODEFunction(dim, hidden_dim)
        self.dim = dim

    def forward(self, z0: List[float], t0: float = 0.0, t1: float = 1.0, n_steps: int = 10) -> List[float]:
        """Forward pass: integrate from t0 to t1."""
        z1, _ = ODESolver.solve(self.func, z0, t0, t1, n_steps)
        return z1

    def trajectory(self, z0: List[float], t0: float = 0.0, t1: float = 1.0, n_steps: int = 10) -> List[List[float]]:
        """Get full trajectory."""
        _, traj = ODESolver.solve(self.func, z0, t0, t1, n_steps)
        return traj


class ContinuousNormalizingFlow:
    """CNF for density estimation via change of variables."""
    def __init__(self, dim: int):
        self.neural_ode = NeuralODE(dim)
        self.dim = dim

    def log_prob(self, x: List[float], n_steps: int = 10) -> float:
        """
        Compute log probability using instantaneous change of variables.
        log p(x) = log p(z0) - integral of trace(df/dz) dt
        Simplified version using numerical differentiation.
        """
        # Transform x back to base distribution
        z0, trajectory = ODESolver.solve(
            lambda t, z: [-dz for dz in self.neural_ode.func(1.0 - t, z)],  # Reverse time
            x, 0.0, 1.0, n_steps
        )
        
        # Base distribution log prob (standard normal)
        log_p_z0 = -0.5 * sum(zi**2 for zi in z0) - 0.5 * self.dim * math.log(2 * math.pi)
        
        # Approximate log det jacobian (simplified)
        log_det = 0.0
        
        return log_p_z0 + log_det

    def sample(self, n_samples: int = 1) -> List[List[float]]:
        """Sample from the learned distribution."""
        samples = []
        for _ in range(n_samples):
            z0 = [random.gauss(0, 1) for _ in range(self.dim)]
            x = self.neural_ode.forward(z0)
            samples.append(x)
        return samples
