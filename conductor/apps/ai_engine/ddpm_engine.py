"""
Phase 150: Denoising Diffusion Probabilistic Models (DDPM)

The generative architecture behind DALL-E 2, Stable Diffusion, Midjourney,
Sora, and modern image/video generation.

Core Idea:
  FORWARD PROCESS:  Gradually add Gaussian noise to data over T steps
                    until it becomes pure noise.
  REVERSE PROCESS:  Train a neural network to DENOISE — predict and remove
                    the noise at each step, recovering the original data.

Math:
  Forward:  q(x_t | x_{t-1}) = N(x_t; √(1-β_t) x_{t-1}, β_t I)
  Reverse:  p_θ(x_{t-1} | x_t) = N(x_{t-1}; μ_θ(x_t, t), σ²_t I)
  
  Closed form for any step t:
    x_t = √(ᾱ_t) x_0 + √(1-ᾱ_t) ε, where ε ~ N(0, I), ᾱ_t = Π(1-β_i)

Training Loss (simplified):
  L = ||ε - ε_θ(x_t, t)||²
  = "predict the noise that was added"
"""
import math
import random
import logging
from typing import List, Dict, Any, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)


class NoiseScheduler:
    """
    Variance schedule β_1, ..., β_T controlling how fast noise is added.
    
    Linear schedule: β increases linearly from β_start to β_end.
    Cosine schedule: Better for image quality (Nichol & Dhariwal, 2021).
    """
    def __init__(self, num_steps: int = 100, beta_start: float = 0.0001, 
                 beta_end: float = 0.02, schedule: str = "cosine"):
        self.T = num_steps
        
        if schedule == "linear":
            self.betas = [beta_start + (beta_end - beta_start) * t / num_steps 
                         for t in range(num_steps)]
        elif schedule == "cosine":
            # Cosine schedule (better gradient flow)
            self.betas = self._cosine_schedule(num_steps)
        else:
            self.betas = [beta_start] * num_steps
        
        # Pre-compute cumulative products
        self.alphas = [1.0 - b for b in self.betas]
        self.alpha_bars = []  # ᾱ_t = Π_{i=1}^{t} α_i
        prod = 1.0
        for a in self.alphas:
            prod *= a
            self.alpha_bars.append(prod)
    
    def _cosine_schedule(self, T: int, s: float = 0.008) -> List[float]:
        """Cosine schedule as proposed in 'Improved DDPM'."""
        def f(t):
            return math.cos(((t / T) + s) / (1 + s) * math.pi / 2) ** 2
        
        betas = []
        for t in range(T):
            beta = 1 - f(t + 1) / f(t)
            betas.append(min(max(beta, 0.0001), 0.999))
        return betas
    
    def add_noise(self, x_0: List[float], t: int) -> Tuple[List[float], List[float]]:
        """
        Forward process: q(x_t | x_0) = N(√ᾱ_t x_0, (1-ᾱ_t)I)
        
        Returns (noisy_x, noise_added)
        """
        alpha_bar = self.alpha_bars[t]
        sqrt_alpha_bar = math.sqrt(alpha_bar)
        sqrt_one_minus = math.sqrt(1 - alpha_bar)
        
        noise = [random.gauss(0, 1) for _ in x_0]
        noisy = [sqrt_alpha_bar * x + sqrt_one_minus * n for x, n in zip(x_0, noise)]
        
        return noisy, noise


class UNetDenoiser:
    """
    A simplified denoising network (ε_θ).
    
    In real DDPM, this is a U-Net with:
    - Downsampling encoder → bottleneck → upsampling decoder
    - Skip connections between encoder/decoder at each resolution
    - Time embedding via sinusoidal encoding + MLP
    - Attention layers at lower resolutions
    
    Our simplified version demonstrates the key concept:
    "Given noisy data x_t and timestep t, predict the noise ε that was added."
    """
    def __init__(self, dim: int, hidden_dim: int = 64, seed: int = 42):
        self.dim = dim
        self.hidden_dim = hidden_dim
        rng = random.Random(seed)
        
        # Time embedding (sinusoidal)
        self.time_embed_dim = 16
        
        # Network weights (simplified 2-layer MLP)
        input_dim = dim + self.time_embed_dim
        scale1 = math.sqrt(2.0 / (input_dim + hidden_dim))
        scale2 = math.sqrt(2.0 / (hidden_dim + dim))
        
        self.W1 = [[rng.gauss(0, scale1) for _ in range(hidden_dim)] for _ in range(input_dim)]
        self.b1 = [0.0] * hidden_dim
        self.W2 = [[rng.gauss(0, scale2) for _ in range(dim)] for _ in range(hidden_dim)]
        self.b2 = [0.0] * dim
        
        # Training state
        self.lr = 0.01
    
    def _time_embedding(self, t: int) -> List[float]:
        """Sinusoidal time embedding — tells the network WHICH timestep to denoise."""
        embed = [0.0] * self.time_embed_dim
        for i in range(0, self.time_embed_dim, 2):
            freq = math.pow(10000, -2 * i / self.time_embed_dim)
            embed[i] = math.sin(t * freq)
            if i + 1 < self.time_embed_dim:
                embed[i+1] = math.cos(t * freq)
        return embed
    
    def predict_noise(self, x_t: List[float], t: int) -> List[float]:
        """Predict the noise that was added at timestep t."""
        time_emb = self._time_embedding(t)
        inp = x_t + time_emb  # Concatenate
        
        # Hidden layer with SiLU activation
        hidden = [0.0] * self.hidden_dim
        for j in range(self.hidden_dim):
            val = self.b1[j]
            for i in range(len(inp)):
                if i < len(self.W1):
                    val += inp[i] * self.W1[i][j]
            # SiLU: x * sigmoid(x)
            sig = 1.0 / (1.0 + math.exp(-min(max(val, -20), 20)))
            hidden[j] = val * sig
        
        # Output layer
        noise_pred = [0.0] * self.dim
        for j in range(self.dim):
            val = self.b2[j]
            for i in range(self.hidden_dim):
                val += hidden[i] * self.W2[i][j]
            noise_pred[j] = val
        
        return noise_pred
    
    def train_step(self, x_0: List[float], scheduler: NoiseScheduler) -> float:
        """One training step: add noise, predict noise, compute MSE loss."""
        t = random.randint(0, scheduler.T - 1)
        x_t, true_noise = scheduler.add_noise(x_0, t)
        
        pred_noise = self.predict_noise(x_t, t)
        
        # L = ||ε - ε_θ(x_t, t)||²
        loss = sum((p - n)**2 for p, n in zip(pred_noise, true_noise)) / len(x_0)
        
        # Simplified gradient descent on output bias
        for j in range(self.dim):
            grad = 2 * (pred_noise[j] - true_noise[j]) / len(x_0)
            self.b2[j] -= self.lr * grad
        
        return loss


class DDPMSampler:
    """
    DDPM Sampling (Reverse Process).
    
    Starting from pure noise x_T ~ N(0,I), iteratively denoise:
      x_{t-1} = (1/√α_t)(x_t - (β_t/√(1-ᾱ_t))ε_θ(x_t, t)) + σ_t z
    
    where z ~ N(0,I) for t > 1, z = 0 for t = 0.
    """
    def __init__(self, denoiser: UNetDenoiser, scheduler: NoiseScheduler):
        self.denoiser = denoiser
        self.scheduler = scheduler
    
    def sample(self, dim: int) -> Tuple[List[float], List[List[float]]]:
        """Generate a sample by denoising from pure noise."""
        # Start from pure noise
        x = [random.gauss(0, 1) for _ in range(dim)]
        trajectory = [x[:]]
        
        for t in range(self.scheduler.T - 1, -1, -1):
            pred_noise = self.denoiser.predict_noise(x, t)
            
            alpha = self.scheduler.alphas[t]
            alpha_bar = self.scheduler.alpha_bars[t]
            beta = self.scheduler.betas[t]
            
            # Denoise step
            coeff = beta / math.sqrt(1 - alpha_bar + 1e-10)
            mean = [(x[i] - coeff * pred_noise[i]) / math.sqrt(alpha) for i in range(dim)]
            
            # Add noise (except at t=0)
            if t > 0:
                sigma = math.sqrt(beta)
                z = [random.gauss(0, 1) for _ in range(dim)]
                x = [mean[i] + sigma * z[i] for i in range(dim)]
            else:
                x = mean
            
            if t % 20 == 0:
                trajectory.append(x[:])
        
        return x, trajectory


def run_diffusion_experiment() -> Dict[str, Any]:
    """Run a complete DDPM training + sampling experiment."""
    dim = 4
    T = 50
    
    scheduler = NoiseScheduler(num_steps=T, schedule="cosine")
    denoiser = UNetDenoiser(dim=dim, hidden_dim=32)
    
    # Training
    losses = []
    for epoch in range(100):
        x_0 = [1.0, -0.5, 0.3, 0.8]  # Target data point
        loss = denoiser.train_step(x_0, scheduler)
        losses.append(loss)
    
    # Sampling
    sampler = DDPMSampler(denoiser, scheduler)
    sample, trajectory = sampler.sample(dim)
    
    return {
        "architecture": "DDPM (Denoising Diffusion Probabilistic Model)",
        "timesteps": T,
        "schedule": "cosine",
        "training": {
            "initial_loss": round(losses[0], 4),
            "final_loss": round(losses[-1], 4),
            "improvement": f"{round((1 - losses[-1]/losses[0]) * 100, 1)}%"
        },
        "generated_sample": [round(s, 4) for s in sample],
        "denoising_trajectory_steps": len(trajectory),
        "insight": "DDPM learns to reverse noise corruption. The model is trained to predict what noise was added, then iteratively removes it to generate new data."
    }
