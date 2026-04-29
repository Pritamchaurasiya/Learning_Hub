"""
Contrastive Learning Engine (SimCLR approach) (Phase 118).
Self-supervised representation learning via NT-Xent (Normalized Temperature-scaled Cross Entropy) Loss.
"""
import random
import math
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


class SimCLREngine:
    """
    Simulates a self-supervised SimCLR framework.
    1. A data batch is augmented twice (e.g., crop + color jitter for images).
    2. A base encoder extracts representations (h).
    3. A projection head maps h to z.
    4. NT-Xent loss pushes representations of the SAME original image together (positives),
       and pushes representations of DIFFERENT images apart (negatives).
    """
    def __init__(self, representation_dim: int = 128, projection_dim: int = 32):
        self.rep_dim = representation_dim
        self.proj_dim = projection_dim
        self.temperature = 0.5
        
        # Simulated Projection Head weights
        self.w_proj = [[random.gauss(0, 0.1) for _ in range(representation_dim)] for _ in range(projection_dim)]

    def _cosine_similarity(self, v1: List[float], v2: List[float]) -> float:
        dot = sum(x * y for x, y in zip(v1, v2))
        norm1 = math.sqrt(sum(x**2 for x in v1)) + 1e-8
        norm2 = math.sqrt(sum(x**2 for x in v2)) + 1e-8
        return dot / (norm1 * norm2)

    def _project(self, h: List[float]) -> List[float]:
        return [sum(w * x for w, x in zip(row, h)) for row in self.w_proj]

    def simulate_contrastive_batch(self, batch_size: int = 16) -> Dict[str, Any]:
        """
        Simulates the forward pass and NT-Xent loss calculation.
        """
        # 1. Simulate Base Encoder output for augmented views
        # Each "image" has two views: view_a and view_b
        # We simulate them to be somewhat similar to each other
        representations_a = []
        representations_b = []
        
        for _ in range(batch_size):
            base_features = [random.gauss(0, 1) for _ in range(self.rep_dim)]
            # View A is base + noise a
            h_a = [f + random.gauss(0, 0.2) for f in base_features]
            # View B is base + noise b
            h_b = [f + random.gauss(0, 0.2) for f in base_features]
            
            representations_a.append(h_a)
            representations_b.append(h_b)
            
        # 2. Projection Head (z = g(h))
        z_a = [self._project(h) for h in representations_a]
        z_b = [self._project(h) for h in representations_b]
        
        # Combine into one sequence of length 2N: [z_a1, z_b1, z_a2, z_b2, ...]
        z_combined = []
        for i in range(batch_size):
            z_combined.append(z_a[i])
            z_combined.append(z_b[i])
            
        num_augmented = 2 * batch_size
        
        # 3. NT-Xent Loss Calculation
        total_loss = 0.0
        avg_positive_sim = 0.0
        avg_negative_sim = 0.0
        
        for k in range(num_augmented):
            # Positives are adjacent (e.g., 0 and 1, 2 and 3)
            if k % 2 == 0:
                positive_idx = k + 1
            else:
                positive_idx = k - 1
                
            sim_pos = self._cosine_similarity(z_combined[k], z_combined[positive_idx])
            avg_positive_sim += sim_pos
            exp_sim_pos = math.exp(sim_pos / self.temperature)
            
            # Negatives are all other indices
            denominator = 0.0
            for j in range(num_augmented):
                if k != j:
                    sim = self._cosine_similarity(z_combined[k], z_combined[j])
                    denominator += math.exp(sim / self.temperature)
                    if j != positive_idx:
                        avg_negative_sim += sim
                        
            # Loss for this example
            loss_k = -math.log(exp_sim_pos / (denominator + 1e-8))
            total_loss += loss_k
            
        avg_loss = total_loss / num_augmented
        avg_positive_sim /= num_augmented
        # Denominator for negative pairs count: N * (2N - 2)
        avg_negative_sim /= (num_augmented * (num_augmented - 2))
        
        return {
            "batch_size": batch_size,
            "augmented_views_processed": num_augmented,
            "nt_xent_loss": round(avg_loss, 4),
            "average_positive_cosine_similarity": round(avg_positive_sim, 4),
            "average_negative_cosine_similarity": round(avg_negative_sim, 4),
            "mechanics": "Self-Supervised Contrastive Learning (SimCLR). Maximizing agreement between differently augmented views of the same data point via Normalized Temperature-scaled Cross Entropy (NT-Xent) loss."
        }
