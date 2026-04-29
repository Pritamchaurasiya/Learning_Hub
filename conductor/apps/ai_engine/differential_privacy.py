import math
import random
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)


class DifferentialPrivacyEngine:
    """
    Phase 74: Differential Privacy (DP-SGD).
    
    Motivation: Even if you train on anonymous student data, adversaries can 
    sometimes reverse-engineer the neural network weights to discover if a 
    specific student's data was in the training set (Membership Inference Attack).
    
    Differential Privacy (DP) provides mathematical guarantees that the model's 
    output barely changes whether any single student's data is included or not, 
    often measured by epsilon (ε).
    
    HOW (DP-SGD Algorithm):
    1. Compute per-example gradients (not just batch averages).
    2. Clip the L2 norm of each individual gradient to a maximum bound (C).
       (This bounds the maximum influence any one student can have).
    3. Add Gaussian noise proportional to the clipping bound and a noise multiplier.
    4. Take the average of the noisy, clipped gradients to update the model.
    """
    
    def __init__(self, l2_norm_clip: float = 1.0, noise_multiplier: float = 0.5, learning_rate: float = 0.01):
        self.l2_norm_clip = l2_norm_clip
        self.noise_multiplier = noise_multiplier
        self.learning_rate = learning_rate
        
    def _compute_l2_norm(self, gradient_vector: List[float]) -> float:
        """Computes the Euclidean length (L2 norm) of the vector."""
        return math.sqrt(sum(g ** 2 for g in gradient_vector))

    def _clip_gradient(self, gradient_vector: List[float]) -> List[float]:
        """
        Clips the gradient so its L2 norm doesn't exceed self.l2_norm_clip.
        """
        norm = self._compute_l2_norm(gradient_vector)
        if norm <= self.l2_norm_clip:
            return gradient_vector
            
        # Scale back the vector
        scale_factor = self.l2_norm_clip / norm
        return [g * scale_factor for g in gradient_vector]

    def _add_gaussian_noise(self, gradient_vector: List[float]) -> List[float]:
        """
        Adds Gaussian noise tailored to the privacy budget.
        Standard deviation = noise_multiplier * l2_norm_clip
        """
        std_dev = self.noise_multiplier * self.l2_norm_clip
        
        noisy_grad = []
        for g in gradient_vector:
            # random.gauss(mean, std_dev)
            noise = random.gauss(0.0, std_dev)
            noisy_grad.append(g + noise)
            
        return noisy_grad

    def apply_dp_sgd_update(self, current_weights: List[float], per_example_gradients: List[List[float]]) -> Dict:
        """
        Executes one step of Differentially Private Stochastic Gradient Descent.
        Args:
            current_weights: e.g. [0.5, -0.2, 0.1]
            per_example_gradients: A list where each element is the gradient vector for ONE student.
        """
        if not per_example_gradients:
            return {"status": "No gradients provided."}
            
        batch_size = len(per_example_gradients)
        num_params = len(current_weights)
        
        # 1. Clip per-example gradients
        clipped_gradients = [self._clip_gradient(grad) for grad in per_example_gradients]
        
        # 2. Add Gaussian noise to the SUM of the clipped gradients
        summed_clipped_gradients = [0.0] * num_params
        for grad in clipped_gradients:
            for i in range(num_params):
                summed_clipped_gradients[i] += grad[i]
                
        noisy_summed_gradients = self._add_gaussian_noise(summed_clipped_gradients)
        
        # 3. Average the noisy gradients down to the batch level
        averaged_noisy_gradients = [g / batch_size for g in noisy_summed_gradients]
        
        # 4. Descent - Update weights
        new_weights = []
        for w, grad in zip(current_weights, averaged_noisy_gradients):
            new_weights.append(w - (self.learning_rate * grad))
            
        return {
            "batch_size": batch_size,
            "original_weights": [round(w, 4) for w in current_weights],
            "new_dp_weights": [round(w, 4) for w in new_weights],
            "average_noisy_gradient_sample": round(averaged_noisy_gradients[0], 4),
            "status": "DP-SGD Update Complete (Privacy Preserved)"
        }
