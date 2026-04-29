"""
Knowledge Distillation Engine

Model compression via Teacher-Student learning:
1. Soft label generation from teacher.
2. Temperature scaling for knowledge transfer.
3. Feature matching for intermediate layers.
"""

import logging
import math
from typing import List, Dict, Any, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)


def softmax(logits: List[float], temperature: float = 1.0) -> List[float]:
    """Temperature-scaled softmax."""
    scaled = [x / temperature for x in logits]
    max_val = max(scaled)
    exp_vals = [math.exp(x - max_val) for x in scaled]
    total = sum(exp_vals)
    return [e / total for e in exp_vals]


def cross_entropy(predictions: List[float], targets: List[float]) -> float:
    """Cross-entropy loss."""
    return -sum(t * math.log(p + 1e-10) for t, p in zip(targets, predictions))


def kl_divergence(p: List[float], q: List[float]) -> float:
    """KL Divergence: D_KL(P || Q)."""
    return sum(pi * math.log((pi + 1e-10) / (qi + 1e-10)) for pi, qi in zip(p, q))


class TeacherModel:
    """
    Large, accurate teacher model (mock).
    """
    def __init__(self, hidden_size: int = 512):
        self.hidden_size = hidden_size
        
    def forward(self, x: List[float]) -> Tuple[List[float], List[float]]:
        """Returns (logits, hidden_features)."""
        # Mock teacher output
        logits = [sum(x) * 0.1, sum(x) * 0.2, sum(x) * 0.3]
        features = [xi * 0.5 for xi in x[:self.hidden_size]]
        return logits, features


class StudentModel:
    """
    Smaller, faster student model.
    """
    def __init__(self, hidden_size: int = 64):
        self.hidden_size = hidden_size
        self.weights = [[0.01] * hidden_size for _ in range(3)]
        
    def forward(self, x: List[float]) -> Tuple[List[float], List[float]]:
        """Returns (logits, hidden_features)."""
        features = [xi * 0.3 for xi in x[:self.hidden_size]]
        logits = [sum(w[i] * features[i] for i in range(min(len(w), len(features)))) for w in self.weights]
        return logits, features


class DistillationTrainer:
    """
    Trains student to mimic teacher.
    """
    def __init__(self, teacher: TeacherModel, student: StudentModel, temperature: float = 4.0, alpha: float = 0.7):
        self.teacher = teacher
        self.student = student
        self.temperature = temperature
        self.alpha = alpha  # Balance between hard and soft targets
        self.lr = 0.01

    def distillation_loss(self, x: List[float], hard_label: int) -> float:
        """
        Combined loss: α * KL(soft_teacher, soft_student) + (1-α) * CE(student, hard_label)
        """
        # Teacher forward (no gradients)
        teacher_logits, teacher_features = self.teacher.forward(x)
        teacher_soft = softmax(teacher_logits, self.temperature)
        
        # Student forward
        student_logits, student_features = self.student.forward(x)
        student_soft = softmax(student_logits, self.temperature)
        
        # Soft target loss (KL divergence)
        soft_loss = kl_divergence(teacher_soft, student_soft) * (self.temperature ** 2)
        
        # Hard target loss (cross-entropy)
        hard_target = [1.0 if i == hard_label else 0.0 for i in range(len(student_logits))]
        hard_loss = cross_entropy(softmax(student_logits, 1.0), hard_target)
        
        # Feature matching loss
        feature_loss = sum((tf - sf) ** 2 for tf, sf in zip(teacher_features[:len(student_features)], student_features)) / len(student_features)
        
        total_loss = self.alpha * soft_loss + (1 - self.alpha) * hard_loss + 0.1 * feature_loss
        return total_loss

    def train_step(self, x: List[float], label: int):
        """Single training step with mock gradient descent."""
        loss = self.distillation_loss(x, label)
        # Mock weight update
        for i in range(len(self.student.weights)):
            for j in range(len(self.student.weights[i])):
                self.student.weights[i][j] -= self.lr * 0.001 * loss
        return loss
