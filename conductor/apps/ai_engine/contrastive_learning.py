import math
import random
import logging
from typing import List, Dict, Tuple, Optional

logger = logging.getLogger(__name__)


class SSLProjectionHead:
    """
    Phase 65: Projection head for Contrastive Learning.
    
    Maps the student representation h_i vector to a smaller 
    projection space z_i where the contrastive loss is applied.
    Typically a 2-layer MLP (Linear -> ReLU -> Linear).
    """
    def __init__(self, in_features: int, hidden: int, out_features: int, seed_str: str):
        self.in_features = in_features
        self.out_features = out_features
        
        # Layer 1
        seed = hash(seed_str) % (2**31)
        rng = random.Random(seed)
        
        scale1 = math.sqrt(2.0 / (in_features + hidden))
        self.w1 = [[rng.gauss(0, scale1) for _ in range(hidden)] for _ in range(in_features)]
        self.b1 = [0.0] * hidden
        
        # Layer 2
        scale2 = math.sqrt(2.0 / (hidden + out_features))
        self.w2 = [[rng.gauss(0, scale2) for _ in range(out_features)] for _ in range(hidden)]
        self.b2 = [0.0] * out_features

    def forward(self, x: List[float]) -> List[float]:
        # layer 1
        h = [sum(x[i] * self.w1[i][j] for i in range(self.in_features)) + self.b1[j] for j in range(len(self.b1))]
        h_relu = [max(0.0, v) for v in h]
        
        # layer 2
        z = [sum(h_relu[i] * self.w2[i][j] for i in range(len(self.b1))) + self.b2[j] for j in range(self.out_features)]
        return z


class SimCLREngine:
    """
    Phase 65: Self-Supervised Contrastive Learning (Inspired by SimCLR).
    
    Motivation: Labels (like drop-out vs graduation) are sparse or delayed.
    By using Self-Supervised Learning (SSL), we extract highly robust student
    embeddings directly from raw behavioral logs without needing explicit labels.
    
    How it works:
    1. Take a student's history vector x.
    2. Generate two different augmented "views" (e.g. drop 10% of lessons, add noise).
       These are a positive pair (x_i, x_j).
    3. Project them into z-space.
    4. Apply NT-Xent (Normalized Temperature-scaled Cross Entropy) loss.
       Maximize similarity between (x_i, x_j) and minimize similarity 
       between x_i and all other students in the batch.
    """
    
    def __init__(self, feature_dim: int = 10, proj_dim: int = 4, temperature: float = 0.5):
        self.feature_dim = feature_dim
        self.temperature = temperature
        
        # Projection Head: h -> z
        self.projection = SSLProjectionHead(in_features=feature_dim, hidden=8, out_features=proj_dim, seed_str="simclr_proj")
        
    def _augment_student(self, features: List[float], intensity: float = 0.2) -> List[float]:
        """
        Data augmentation for tabular/vector learning data.
        1. Feature masking (simulating missing records/absences).
        2. Gaussian noise addition (simulating natural performance variance).
        """
        augmented = []
        for val in features:
            # Masking (Dropout): 10% chance to drop feature
            if random.random() < 0.1 * intensity:
                augmented.append(0.0)
            else:
                # Add jitter ~ N(0, intensity/2)
                noise = random.gauss(0, intensity * 0.5)
                # Keep values roughly bounded between [0, 1]
                augmented.append(max(0.0, min(1.0, val + noise)))
        return augmented

    def _cosine_similarity(self, a: List[float], b: List[float]) -> float:
        """Compute cosine similarity. Dot product of L2 normalized vectors."""
        norm_a = math.sqrt(sum(x*x for x in a))
        norm_b = math.sqrt(sum(y*y for y in b))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return sum(x*y for x,y in zip(a,b)) / (norm_a * norm_b)
        
    def compute_nt_xent_loss(self, z_i: List[float], z_j: List[float], batch_z: List[List[float]]) -> float:
        """
        Computes NT-Xent Loss for a single positive pair against a batch of negatives.
        
        Formula:
        l(i,j) = -log( exp(sim(i,j)/t) / sum_{k!=i} exp(sim(i,k)/t) )
        """
        # Similarity of positive pair
        sim_pos = self._cosine_similarity(z_i, z_j)
        exp_pos = math.exp(sim_pos / self.temperature)
        
        # Denominator (positives + all negatives)
        denominator = exp_pos
        for z_k in batch_z:
            if z_k != z_i and z_k != z_j: # Skip self and the specific positive sibling
                sim_neg = self._cosine_similarity(z_i, z_k)
                denominator += math.exp(sim_neg / self.temperature)
                
        # Loss
        return -math.log(exp_pos / denominator)
        
    def train_batch(self, student_batch: List[List[float]]) -> Dict:
        """
        Execute one complete contrastive learning forward pass.
        In production, this computes gradients for the base encoder mapping raw
        sequence to h. Here we demonstrate the projection and loss calculation.
        """
        N = len(student_batch)
        if N < 2:
            return {"error": "Batch size must be >= 2 for contrastive loss."}
            
        # 1. Augment batch twice to get 2N views
        view1_batch = [self._augment_student(x) for x in student_batch]
        view2_batch = [self._augment_student(x) for x in student_batch]
        
        # 2. Project all 2N views to z space
        # Here we mock the base encoder by using the raw features as 'h',
        # and we pass them directly into the projection head.
        z1_batch = [self.projection.forward(v1) for v1 in view1_batch]
        z2_batch = [self.projection.forward(v2) for v2 in view2_batch]
        
        all_z_batch = z1_batch + z2_batch
        
        # 3. Compute NT-Xent loss across all positive pairs
        total_loss = 0.0
        
        # For each student k, (z1_k, z2_k) is a positive pair
        for k in range(N):
            # l(2k, 2k+1)
            loss_a = self.compute_nt_xent_loss(z1_batch[k], z2_batch[k], all_z_batch)
            # l(2k+1, 2k) -> Symmetric evaluation
            loss_b = self.compute_nt_xent_loss(z2_batch[k], z1_batch[k], all_z_batch)
            total_loss += (loss_a + loss_b)
            
        avg_loss = total_loss / (2 * N)
        
        return {
            "batch_size": N,
            "total_views": 2 * N,
            "temperature": self.temperature,
            "contrastive_loss": round(avg_loss, 4),
            "status": "Contrastive representations updated successfully."
        }
