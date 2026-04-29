"""
Phase 154: Sparse Autoencoders (SAE) — Mechanistic Interpretability

SAEs are the key tool Anthropic uses to understand what's happening INSIDE
neural networks. They decompose opaque activation vectors into human-readable
"features" — individual concepts the model has learned.

Why this matters:
  A neuron in GPT might activate for "Golden Gate Bridge" AND "the color orange"
  AND "suspension bridges." An SAE decomposes this into SEPARATE features,
  each representing one clean concept.

Architecture:
  encoder: z = ReLU(W_enc · (x - b_dec) + b_enc)   →  sparse code
  decoder: x̂ = W_dec · z + b_dec                     →  reconstruction

Loss:
  L = ||x - x̂||² + λ · ||z||₁
  = reconstruction loss + sparsity penalty

The L1 penalty forces most features to be ZERO, making the representation
sparse and interpretable — each active feature means something specific.
"""
import math
import random
import logging
from typing import List, Dict, Any, Tuple
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


class SparseAutoencoder:
    """
    Sparse Autoencoder for extracting interpretable features from
    neural network activations.

    Key hyperparameters:
      - expansion_factor: How many SAE features per activation dimension
        (typically 4-64x). More features = finer-grained interpretation.
      - sparsity_coeff (λ): Controls how sparse the features are.
        Higher = fewer active features per input = more interpretable.
    """
    def __init__(self, d_model: int, expansion_factor: int = 8,
                 sparsity_coeff: float = 0.04, lr: float = 0.01, seed: int = 42):
        self.d_model = d_model
        self.n_features = d_model * expansion_factor
        self.sparsity_coeff = sparsity_coeff
        self.lr = lr

        rng = random.Random(seed)
        scale = math.sqrt(2.0 / (d_model + self.n_features))

        # Encoder: maps activations → sparse feature space
        self.W_enc = [[rng.gauss(0, scale) for _ in range(self.n_features)]
                      for _ in range(d_model)]
        self.b_enc = [0.0] * self.n_features

        # Decoder: maps sparse features → reconstructed activations
        self.W_dec = [[rng.gauss(0, scale) for _ in range(d_model)]
                      for _ in range(self.n_features)]
        self.b_dec = [0.0] * d_model

        # Training stats
        self.feature_activations = [0] * self.n_features  # Track which features fire

    def encode(self, x: List[float]) -> List[float]:
        """Encode activation vector into sparse feature space."""
        # Subtract decoder bias (centering)
        centered = [x[i] - self.b_dec[i] for i in range(self.d_model)]

        # Linear projection + ReLU
        z = [0.0] * self.n_features
        for j in range(self.n_features):
            val = self.b_enc[j]
            for i in range(self.d_model):
                val += centered[i] * self.W_enc[i][j]
            z[j] = max(0.0, val)  # ReLU enforces non-negativity

        # Track feature activations
        for j in range(self.n_features):
            if z[j] > 0:
                self.feature_activations[j] += 1

        return z

    def decode(self, z: List[float]) -> List[float]:
        """Decode sparse features back to activation space."""
        x_hat = [self.b_dec[i] for i in range(self.d_model)]
        for j in range(self.n_features):
            if z[j] > 0:  # Only active features contribute
                for i in range(self.d_model):
                    x_hat[i] += z[j] * self.W_dec[j][i]
        return x_hat

    def forward(self, x: List[float]) -> Tuple[List[float], List[float], List[float]]:
        """Full forward pass: encode → decode. Returns (reconstruction, features, residual)."""
        z = self.encode(x)
        x_hat = self.decode(z)
        residual = [x[i] - x_hat[i] for i in range(self.d_model)]
        return x_hat, z, residual

    def compute_loss(self, x: List[float]) -> Dict[str, float]:
        """Compute reconstruction + sparsity loss."""
        x_hat, z, _ = self.forward(x)

        # MSE reconstruction loss
        recon_loss = sum((x[i] - x_hat[i])**2 for i in range(self.d_model)) / self.d_model

        # L1 sparsity loss
        l1_loss = sum(abs(zi) for zi in z) / self.n_features

        total = recon_loss + self.sparsity_coeff * l1_loss

        # Sparsity metrics
        num_active = sum(1 for zi in z if zi > 0)
        sparsity = 1.0 - (num_active / self.n_features)

        return {
            "total_loss": round(total, 6),
            "recon_loss": round(recon_loss, 6),
            "l1_loss": round(l1_loss, 6),
            "sparsity": round(sparsity, 4),
            "active_features": num_active,
        }

    def train_step(self, x: List[float]) -> Dict[str, float]:
        """Single training step with gradient descent."""
        metrics = self.compute_loss(x)

        # Simplified gradient update on biases
        x_hat, z, residual = self.forward(x)
        for i in range(self.d_model):
            self.b_dec[i] += self.lr * residual[i] * 0.1

        return metrics

    def get_feature_analysis(self, total_samples: int) -> Dict[str, Any]:
        """Analyze which features are used and how often."""
        active_features = [(i, c) for i, c in enumerate(self.feature_activations) if c > 0]
        active_features.sort(key=lambda x: x[1], reverse=True)

        dead_features = sum(1 for c in self.feature_activations if c == 0)

        return {
            "total_features": self.n_features,
            "active_features": len(active_features),
            "dead_features": dead_features,
            "dead_feature_ratio": round(dead_features / self.n_features, 3),
            "top_10_features": [
                {"feature_id": fid, "activation_count": cnt,
                 "frequency": round(cnt / max(1, total_samples), 3)}
                for fid, cnt in active_features[:10]
            ],
        }


def run_sae_experiment() -> Dict[str, Any]:
    """Run Sparse Autoencoder experiment."""
    d_model = 8
    sae = SparseAutoencoder(d_model=d_model, expansion_factor=8, sparsity_coeff=0.05)

    rng = random.Random(42)
    losses = []
    for step in range(200):
        x = [rng.gauss(0, 1) for _ in range(d_model)]
        metrics = sae.train_step(x)
        losses.append(metrics["total_loss"])

    analysis = sae.get_feature_analysis(total_samples=200)

    return {
        "paradigm": "Sparse Autoencoder (Mechanistic Interpretability)",
        "d_model": d_model,
        "n_features": sae.n_features,
        "expansion_factor": 8,
        "training": {
            "initial_loss": round(losses[0], 4),
            "final_loss": round(losses[-1], 4),
            "final_sparsity": metrics["sparsity"],
        },
        "feature_analysis": analysis,
        "insight": "SAEs decompose neural activations into interpretable features. Anthropic uses these to find 'safety-relevant' features inside Claude."
    }
