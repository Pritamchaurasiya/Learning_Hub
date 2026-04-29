import math
import random
import logging
from typing import List, Dict, Tuple, Optional

logger = logging.getLogger(__name__)


class GANLinearLayer:
    """A basic linear layer for Generator and Discriminator."""
    def __init__(self, in_features: int, out_features: int, seed_str: str):
        self.in_features = in_features
        self.out_features = out_features
        
        # Xavier Normal Initialization
        seed = hash(seed_str) % (2**31)
        rng = random.Random(seed)
        scale = math.sqrt(2.0 / (in_features + out_features))
        
        self.weights = [[rng.gauss(0, scale) for _ in range(out_features)] for _ in range(in_features)]
        self.biases = [0.0] * out_features
    
    def forward(self, x: List[float]) -> List[float]:
        """Matrix multiplication W^T * x + b"""
        output = [0.0] * self.out_features
        for j in range(self.out_features):
            val = sum(x[i] * self.weights[i][j] for i in range(self.in_features)) + self.biases[j]
            output[j] = val
        return output
    
    @staticmethod
    def leaky_relu(x: List[float], alpha: float = 0.2) -> List[float]:
        return [v if v > 0 else alpha * v for v in x]
    
    @staticmethod
    def sigmoid(x: List[float]) -> List[float]:
        return [1.0 / (1.0 + math.exp(-max(-20, min(20, v)))) for v in x]


class GenerativeAdversarialNetwork:
    """
    Phase 63: Generative Adversarial Network (GAN) Synthesizer.
    
    Consists of two adversary networks:
    1. Generator (G): Attempts to create realistic false learning logs
       (quiz scores, completion rates) from random noise (z).
    2. Discriminator (D): Attempts to differentiate between real logs
       and fake logs produced by G.
       
    The two networks compete in a zero-sum game, leading the Generator
    to eventually mimic the true data distribution incredibly well.
    
    Use case:
    - Generate vast amounts of synthetic training data for DKT / Analytics Models.
    - Balance imbalanced datasets (e.g., simulating a "failing" student).
    - Anonymize real student distributions for sharing outside the platform.
    """
    
    def __init__(self, latent_dim: int = 4, data_dim: int = 8, hidden_dim: int = 16):
        self.latent_dim = latent_dim
        self.data_dim = data_dim
        
        # Generator: z (noise) -> x' (fake data)
        self.g_hidden = GANLinearLayer(latent_dim, hidden_dim, "g_hid")
        self.g_out = GANLinearLayer(hidden_dim, data_dim, "g_out")
        
        # Discriminator: x (real/fake data) -> p(real)
        self.d_hidden = GANLinearLayer(data_dim, hidden_dim, "d_hid")
        self.d_out = GANLinearLayer(hidden_dim, 1, "d_out")
    
    def generate(self, z: List[float]) -> List[float]:
        """G(z): Maps latent noise vector to fake data space."""
        h = self.g_hidden.leaky_relu(self.g_hidden.forward(z), 0.2)
        x_fake = self.g_out.sigmoid(self.g_out.forward(h))
        return x_fake
    
    def discriminate(self, x: List[float]) -> float:
        """D(x): Predicts probability that x is REAL (not fake)."""
        h = self.d_hidden.leaky_relu(self.d_hidden.forward(x), 0.2)
        prob = self.d_out.sigmoid(self.d_out.forward(h))
        return prob[0]
    
    def train_step(self, real_data_batch: List[List[float]]) -> Dict:
        """
        Calculates Generator and Discriminator loss on a batch.
        In a real deep learning pipeline, gradients would be backpropagated here.
        This provides the structural representation of the GAN dynamic.
        
        Discriminator Loss: 
          max D(x) + (1 - D(G(z)))
          - log(D(real)) - log(1 - D(fake))
          
        Generator Loss:
          max D(G(z))
          - log(D(fake))
        """
        d_loss_total = 0.0
        g_loss_total = 0.0
        
        batch_size = len(real_data_batch)
        if batch_size == 0:
            return {'d_loss': 0.0, 'g_loss': 0.0}
            
        eps = 1e-10
        
        for real_x in real_data_batch:
            # 1. Train Discriminator
            # Real probability
            p_real = self.discriminate(real_x)
            
            # Generate fake
            z = [random.gauss(0, 1) for _ in range(self.latent_dim)]
            fake_x = self.generate(z)
            p_fake = self.discriminate(fake_x)
            
            # Binary Cross Entropy Loss for D
            d_loss_real = -math.log(max(p_real, eps))
            d_loss_fake = -math.log(max(1.0 - p_fake, eps))
            d_loss = d_loss_real + d_loss_fake
            d_loss_total += d_loss
            
            # 2. Train Generator
            # Generator wants D to classify fake as REAL
            g_loss = -math.log(max(p_fake, eps))
            g_loss_total += g_loss
            
        return {
            'd_loss': round(d_loss_total / batch_size, 4),
            'g_loss': round(g_loss_total / batch_size, 4),
            'p_real_avg': round(p_real, 4),  # last instance
            'p_fake_avg': round(p_fake, 4)
        }
        
    def synthesize_dataset(self, num_samples: int = 10, target_features: List[str] = None) -> List[Dict]:
        """
        Samples the Generator to create massive synthetic datasets.
        """
        features = target_features or [
            'mastery', 'quiz_score', 'completion', 'time_log', 
            'interactions', 'dropout_risk', 'engagement', 'streak'
        ]
        
        dataset = []
        for _ in range(num_samples):
            z = [random.gauss(0, 1) for _ in range(self.latent_dim)]
            x_fake = self.generate(z)
            
            item = {}
            for i, feat_val in enumerate(x_fake):
                if i < len(features):
                    item[features[i]] = round(feat_val, 4)
            dataset.append(item)
            
        return dataset
