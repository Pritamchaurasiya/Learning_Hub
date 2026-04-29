import math
import random
import logging
from typing import List, Dict, Tuple, Optional

logger = logging.getLogger(__name__)


class VAELinearLayer:
    """A basic linear layer for building VAE encoders/decoders."""
    def __init__(self, in_features: int, out_features: int, seed_str: str):
        self.in_features = in_features
        self.out_features = out_features
        
        # Xavier initialization
        seed = hash(seed_str) % (2**31)
        rng = random.Random(seed)
        scale = math.sqrt(2.0 / (in_features + out_features))
        
        self.weights = [[rng.gauss(0, scale) for _ in range(out_features)] for _ in range(in_features)]
        self.biases = [0.0] * out_features
    
    def forward(self, x: List[float]) -> List[float]:
        """w^T * x + b"""
        output = []
        for j in range(self.out_features):
            val = sum(x[i] * self.weights[i][j] for i in range(self.in_features)) + self.biases[j]
            output.append(val)
        return output
    
    @staticmethod
    def relu(x: List[float]) -> List[float]:
        return [max(0.0, v) for v in x]
    
    @staticmethod
    def sigmoid(x: List[float]) -> List[float]:
        return [1.0 / (1.0 + math.exp(-max(-20, min(20, v)))) for v in x]


class VariationalAutoencoder:
    """
    Phase 63: Variational Autoencoder (VAE) for Latent Student Clustering.
    
    A VAE learns to map high-dimensional student profiles into a continuous,
    lower-dimensional latent space (z). Instead of mapping to a single point,
    it maps to a distribution N(μ, σ²). 
    
    - Encoder: x -> μ, log(σ²)
    - Reparameterization Trick: z = μ + σ * ε, where ε ~ N(0, 1)
    - Decoder: z -> x'
    
    Loss = Reconstruction Loss (MSE) + KL Divergence (regularization).
    
    Use case: 
    - Discover underlying "clusters" of learning behavior in latent space.
    - Generate synthetic student profiles by sampling from the prior N(0, 1).
    """
    
    def __init__(self, input_dim: int = 10, hidden_dim: int = 16, latent_dim: int = 3):
        self.input_dim = input_dim
        self.latent_dim = latent_dim
        
        # Encoder
        self.enc_hidden = VAELinearLayer(input_dim, hidden_dim, "enc_hidden")
        self.enc_mu = VAELinearLayer(hidden_dim, latent_dim, "enc_mu")
        self.enc_logvar = VAELinearLayer(hidden_dim, latent_dim, "enc_logvar")
        
        # Decoder
        self.dec_hidden = VAELinearLayer(latent_dim, hidden_dim, "dec_hidden")
        self.dec_out = VAELinearLayer(hidden_dim, input_dim, "dec_out")
    
    def _featurize_student(self, profile: Dict) -> List[float]:
        """Convert a student profile dict into a normalized feature vector."""
        features = [
            profile.get('math_mastery', 0.5),
            profile.get('science_mastery', 0.5),
            profile.get('reading_mastery', 0.5),
            profile.get('avg_quiz_score', 0.5),
            profile.get('engagement_rate', 0.5),
            profile.get('video_completion', 0.5),
            profile.get('study_frequency', 0.5),
            profile.get('assignment_grades', 0.5),
            profile.get('discussion_participation', 0),
            profile.get('dropout_risk', 0.5),
        ]
        # Pad if needed
        while len(features) < self.input_dim:
            features.append(0.5)
        return dict(zip(range(self.input_dim), features[:self.input_dim]))
    
    def encode(self, x: List[float]) -> Tuple[List[float], List[float]]:
        """Map input x to latent distribution parameters μ and log(σ²)."""
        h = self.enc_hidden.relu(self.enc_hidden.forward(x))
        mu = self.enc_mu.forward(h)
        logvar = self.enc_logvar.forward(h)
        return mu, logvar
    
    def reparameterize(self, mu: List[float], logvar: List[float]) -> List[float]:
        """z = μ + σ * ε, where ε ~ N(0, 1)"""
        std = [math.exp(0.5 * lv) for lv in logvar]
        eps = [random.gauss(0, 1) for _ in range(len(mu))]
        return [m + s * e for m, s, e in zip(mu, std, eps)]
    
    def decode(self, z: List[float]) -> List[float]:
        """Map latent vector z back to input space x'."""
        h = self.dec_hidden.relu(self.dec_hidden.forward(z))
        out = self.dec_out.sigmoid(self.dec_out.forward(h)) # Map to [0,1]
        return out
    
    def forward(self, x: List[float]) -> Dict:
        """Complete forward pass: x -> (μ, logvar) -> z -> x'"""
        mu, logvar = self.encode(x)
        z = self.reparameterize(mu, logvar)
        recon_x = self.decode(z)
        
        # Calculate loss components (mocked for stateless API demo)
        # MSE
        mse = sum((r - o)**2 for r, o in zip(recon_x, x)) / len(x)
        # KL Divergence: -0.5 * sum(1 + log(sigma^2) - mu^2 - sigma^2)
        kld = -0.5 * sum(1 + lv - m**2 - math.exp(lv) for m, lv in zip(mu, logvar))
        
        total_loss = mse + 0.1 * kld  # Beta-VAE style weighting
        
        return {
            'reconstructed': [round(v, 4) for v in recon_x],
            'latent_mu': [round(m, 4) for m in mu],
            'latent_logvar': [round(lv, 4) for lv in logvar],
            'z_sampled': [round(v, 4) for v in z],
            'metrics': {
                'reconstruction_loss_mse': round(mse, 6),
                'kl_divergence': round(kld, 6),
                'total_loss': round(total_loss, 6)
            }
        }
    
    def cluster_students(self, students: List[Dict]) -> Dict:
        """
        Map a list of student profiles into the latent space and group them.
        """
        latent_representations = []
        for s in students:
            features = list(self._featurize_student(s).values())
            mu, _ = self.encode(features)
            latent_representations.append({
                'id': s.get('id', 'unknown'),
                'latent_z': [round(m, 4) for m in mu]
            })
            
        # Determine cluster by finding the quadrant/octant in latent space
        # Simple heuristic rule for 3D latent space grouping:
        clusters = {
            'High_Achievers': [],
            'Struggling_Engaged': [],
            'Disengaged': [],
            'Average_Steady': []
        }
        
        for rep in latent_representations:
            z = rep['latent_z']
            if len(z) >= 3:
                # Mock grouping logic based on latent embeddings:
                # Dim 0: roughly maps to Mastery
                # Dim 1: roughly maps to Engagement
                if z[0] > 0.2 and z[1] > 0.2:
                    clusters['High_Achievers'].append(rep['id'])
                elif z[0] <= 0.2 and z[1] > 0.2:
                    clusters['Struggling_Engaged'].append(rep['id'])
                elif z[1] <= 0.2:
                    clusters['Disengaged'].append(rep['id'])
                else:
                    clusters['Average_Steady'].append(rep['id'])
            else:
                clusters['Average_Steady'].append(rep['id'])
                
        return {
            'latent_embeddings': latent_representations,
            'clusters': clusters
        }
    
    def sample_synthetic_profiles(self, n_samples: int = 5) -> List[Dict]:
        """
        Generate purely synthetic, realistic student profiles by sampling
        z ~ N(0, 1) and decoding it.
        """
        synthetic_profiles = []
        labels = [
            'math_mastery', 'science_mastery', 'reading_mastery',
            'avg_quiz_score', 'engagement_rate', 'video_completion',
            'study_frequency', 'assignment_grades', 'discussion_participation',
            'dropout_risk'
        ]
        
        for i in range(n_samples):
            # Sample from isotropic Gaussian prior
            z = [random.gauss(0, 1) for _ in range(self.latent_dim)]
            
            # Decode to feature space
            features = self.decode(z)
            
            profile = {labels[j]: round(features[j], 4) for j in range(self.input_dim)}
            profile['synthetic_id'] = f"syn_{i}"
            synthetic_profiles.append(profile)
            
        return synthetic_profiles
