import math
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)


class KnowledgeDistiller:
    """
    Phase 72: Knowledge Distillation (Teacher-Student).
    
    Motivation: We have a massive, accurate "Teacher" model (e.g., 10B parameters) 
    that is too slow for real-time Edge deployment (mobile phones).
    We want to train a tiny, fast "Student" model (e.g., 100M parameters) to mimic 
    the Teacher.
    
    Instead of training the Student on hard labels [1, 0, 0], we train it on the 
    Teacher's "soft" probabilities [0.8, 0.15, 0.05]. The "dark knowledge" in the 
    0.15 and 0.05 teaches the Student about structural similarities in the data.
    
    Loss = (1 - alpha) * L_CE(Student, Hard_Labels) + alpha * L_KL(Student_Soft, Teacher_Soft)
    """
    
    def __init__(self, temperature: float = 3.0, alpha: float = 0.5):
        # Temperature (T > 1) "softens" the probability distribution.
        self.temperature = temperature
        # Alpha balances Hard Loss vs Soft Distillation Loss
        self.alpha = alpha
        
    def _apply_temperature_softmax(self, logits: List[float]) -> List[float]:
        """
        Applies Softmax with Temperature scaling: q_i = exp(z_i / T) / sum(exp(z_j / T))
        """
        if not logits:
            return []
            
        max_logit = max(logits) # for numerical stability
        exp_scaled = [math.exp((z - max_logit) / self.temperature) for z in logits]
        sum_exp = sum(exp_scaled)
        
        return [e / sum_exp for e in exp_scaled]
        
    def _kl_divergence(self, p: List[float], q: List[float]) -> float:
        """
        Kullback-Leibler Divergence: D_KL(P || Q) = sum( P(x) * log(P(x) / Q(x)) )
        Measures how much the Student's distribution (Q) deviates from Teacher's (P).
        """
        div = 0.0
        for p_i, q_i in zip(p, q):
            if p_i > 0 and q_i > 0:
                div += p_i * math.log(p_i / q_i)
        return div
        
    def _cross_entropy(self, student_probs: List[float], hard_label_index: int) -> float:
        """
        Standard Cross Entropy Loss against the true label.
        L_CE = -log(P(correct_class))
        """
        if hard_label_index < 0 or hard_label_index >= len(student_probs):
            return 0.0
        p_correct = student_probs[hard_label_index]
        if p_correct <= 0:
            return 10.0 # High penalty for predicting 0 probability
        return -math.log(p_correct)

    def compute_distillation_loss(
        self, 
        student_logits: List[float], 
        teacher_logits: List[float], 
        true_label_index: int
    ) -> Dict[str, float]:
        """
        Computes the combined loss to train the Student model.
        """
        if len(student_logits) != len(teacher_logits):
            raise ValueError("Student and Teacher must have the same number of output logits.")
            
        # 1. Softeneed Distributions for Distillation (KL Divergence)
        # We must multiply KL term by T^2 to match the scale of the gradients from Hard CE Loss
        teacher_soft_probs = self._apply_temperature_softmax(teacher_logits)
        student_soft_probs = self._apply_temperature_softmax(student_logits)
        
        loss_kl = self._kl_divergence(teacher_soft_probs, student_soft_probs)
        scaled_loss_kl = loss_kl * (self.temperature ** 2)
        
        # 2. Hard Distribution for Standard Training (Cross Entropy)
        # CE uses T=1 (standard softmax)
        student_hard_probs = self._apply_temperature_softmax([z * self.temperature for z in student_logits]) # undo T temporarily
        loss_ce = self._cross_entropy(student_hard_probs, true_label_index)
        
        # 3. Combined Loss
        total_loss = (1.0 - self.alpha) * loss_ce + self.alpha * scaled_loss_kl
        
        return {
            "loss_cross_entropy": round(loss_ce, 4),
            "loss_kl_divergence_scaled": round(scaled_loss_kl, 4),
            "total_distillation_loss": round(total_loss, 4),
            "teacher_soft_target_sample": [round(p, 3) for p in teacher_soft_probs[:3]] # snippet for debugging
        }
