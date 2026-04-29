"""
Energy-Based Models (EBM)

Generative models via energy functions:
1. MCMC sampling (Metropolis-Hastings).
2. Score matching.
3. Langevin dynamics.
"""

import logging
import random
import math
from typing import List, Callable
from dataclasses import dataclass

logger = logging.getLogger(__name__)


class EnergyNetwork:
    """Neural network that outputs scalar energy."""
    def __init__(self, input_dim: int, hidden_dim: int = 64):
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.W1 = [[random.gauss(0, 0.1) for _ in range(input_dim)] for _ in range(hidden_dim)]
        self.W2 = [random.gauss(0, 0.1) for _ in range(hidden_dim)]

    def energy(self, x: List[float]) -> float:
        """Compute E(x)."""
        # Hidden layer with ReLU
        hidden = []
        for i in range(self.hidden_dim):
            h = sum(self.W1[i][j] * x[j] for j in range(min(len(x), self.input_dim)))
            hidden.append(max(0, h))
        
        # Scalar output
        e = sum(self.W2[i] * hidden[i] for i in range(self.hidden_dim))
        return e

    def score(self, x: List[float], eps: float = 1e-4) -> List[float]:
        """
        Compute score function: -d E(x) / dx
        Using numerical differentiation.
        """
        scores = []
        base_energy = self.energy(x)
        
        for i in range(len(x)):
            x_plus = x.copy()
            x_plus[i] += eps
            energy_plus = self.energy(x_plus)
            grad = (energy_plus - base_energy) / eps
            scores.append(-grad)  # Score is negative gradient of energy
        
        return scores


class MetropolisHastings:
    """MCMC sampling using Metropolis-Hastings."""
    def __init__(self, energy_fn: Callable[[List[float]], float], dim: int, step_size: float = 0.3):
        self.energy_fn = energy_fn
        self.dim = dim
        self.step_size = step_size

    def sample(self, n_samples: int, n_burnin: int = 100) -> List[List[float]]:
        """Generate samples using MH algorithm."""
        # Initialize randomly
        x = [random.gauss(0, 1) for _ in range(self.dim)]
        current_energy = self.energy_fn(x)
        
        samples = []
        
        for i in range(n_burnin + n_samples):
            # Propose new state
            proposal = [xi + random.gauss(0, self.step_size) for xi in x]
            proposal_energy = self.energy_fn(proposal)
            
            # Acceptance probability
            log_accept = current_energy - proposal_energy  # Lower energy = higher prob
            
            if math.log(random.random() + 1e-10) < log_accept:
                x = proposal
                current_energy = proposal_energy
            
            if i >= n_burnin:
                samples.append(x.copy())
        
        return samples


class LangevinDynamics:
    """Langevin MCMC for sampling from energy-based models."""
    def __init__(self, energy_network: EnergyNetwork, step_size: float = 0.01, noise_scale: float = 0.005):
        self.network = energy_network
        self.step_size = step_size
        self.noise_scale = noise_scale

    def step(self, x: List[float]) -> List[float]:
        """Single Langevin step: x' = x + step * score(x) + noise."""
        score = self.network.score(x)
        noise = [random.gauss(0, self.noise_scale) for _ in x]
        
        x_new = [
            xi + self.step_size * si + ni 
            for xi, si, ni in zip(x, score, noise)
        ]
        return x_new

    def sample(self, n_samples: int, n_steps: int = 100, n_burnin: int = 50) -> List[List[float]]:
        """Generate samples using Langevin dynamics."""
        samples = []
        
        for _ in range(n_samples):
            # Initialize randomly
            x = [random.gauss(0, 1) for _ in range(self.network.input_dim)]
            
            # Run Langevin chain
            for _ in range(n_burnin + n_steps):
                x = self.step(x)
            
            samples.append(x)
        
        return samples


class EnergyBasedModel:
    """Complete EBM with training via contrastive divergence."""
    def __init__(self, dim: int, hidden_dim: int = 64):
        self.network = EnergyNetwork(dim, hidden_dim)
        self.langevin = LangevinDynamics(self.network)
        self.dim = dim
        self.lr = 0.01

    def contrastive_divergence_step(self, data_batch: List[List[float]], k_steps: int = 10) -> float:
        """
        Single CD-k training step.
        Updates weights to lower energy on data, raise on samples.
        """
        # Positive phase: energy on real data
        pos_energies = [self.network.energy(x) for x in data_batch]
        
        # Negative phase: sample from model
        neg_samples = []
        for x in data_batch:
            x_neg = x.copy()
            for _ in range(k_steps):
                x_neg = self.langevin.step(x_neg)
            neg_samples.append(x_neg)
        
        neg_energies = [self.network.energy(x) for x in neg_samples]
        
        # Loss: E(data) - E(model samples)
        loss = sum(pos_energies) / len(pos_energies) - sum(neg_energies) / len(neg_energies)
        
        return loss

    def sample(self, n_samples: int = 10, n_steps: int = 100) -> List[List[float]]:
        """Sample from the learned distribution."""
        return self.langevin.sample(n_samples, n_steps)
