"""
Concept Bottleneck Models

Interpretable predictions through concepts:
1. Concept extraction.
2. Concept-based reasoning.
3. Human intervention on concepts.
"""

import logging
import random
import math
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class Concept:
    name: str
    description: str
    value: float  # 0-1 activation


class ConceptExtractor:
    """Extract interpretable concepts from inputs."""
    def __init__(self, input_dim: int, n_concepts: int, concept_names: Optional[List[str]] = None):
        self.input_dim = input_dim
        self.n_concepts = n_concepts
        
        # Projection to concept space
        self.W = [[random.gauss(0, 0.1) for _ in range(input_dim)] for _ in range(n_concepts)]
        self.bias = [random.gauss(0, 0.1) for _ in range(n_concepts)]
        
        self.concept_names = concept_names or [f"concept_{i}" for i in range(n_concepts)]

    def extract(self, x: List[float]) -> List[Concept]:
        """Extract concepts from input."""
        concepts = []
        
        for i in range(self.n_concepts):
            logit = sum(self.W[i][j] * x[j] for j in range(self.input_dim)) + self.bias[i]
            activation = 1 / (1 + math.exp(-logit))  # Sigmoid
            
            concepts.append(Concept(
                name=self.concept_names[i],
                description=f"Activation of {self.concept_names[i]}",
                value=activation
            ))
        
        return concepts


class ConceptPredictor:
    """Make predictions based on concepts."""
    def __init__(self, n_concepts: int, n_classes: int):
        self.n_concepts = n_concepts
        self.n_classes = n_classes
        
        self.W = [[random.gauss(0, 0.1) for _ in range(n_concepts)] for _ in range(n_classes)]
        self.bias = [random.gauss(0, 0.1) for _ in range(n_classes)]

    def predict(self, concepts: List[Concept]) -> Tuple[int, List[float]]:
        """Predict class from concepts."""
        concept_values = [c.value for c in concepts]
        
        logits = []
        for i in range(self.n_classes):
            logit = sum(self.W[i][j] * concept_values[j] for j in range(self.n_concepts)) + self.bias[i]
            logits.append(logit)
        
        # Softmax
        max_l = max(logits)
        exp_logits = [math.exp(l - max_l) for l in logits]
        total = sum(exp_logits)
        probs = [e / total for e in exp_logits]
        
        return probs.index(max(probs)), probs


class ConceptBottleneckModel:
    """Complete Concept Bottleneck Model."""
    def __init__(self, input_dim: int, n_concepts: int, n_classes: int, 
                 concept_names: Optional[List[str]] = None):
        self.extractor = ConceptExtractor(input_dim, n_concepts, concept_names)
        self.predictor = ConceptPredictor(n_concepts, n_classes)
        self.n_concepts = n_concepts

    def forward(self, x: List[float]) -> Tuple[int, List[float], List[Concept]]:
        """Forward pass with concept explanations."""
        concepts = self.extractor.extract(x)
        prediction, probs = self.predictor.predict(concepts)
        return prediction, probs, concepts

    def intervene(self, x: List[float], interventions: Dict[str, float]) -> Tuple[int, List[float], List[Concept]]:
        """Allow human intervention on concept values."""
        concepts = self.extractor.extract(x)
        
        # Apply interventions
        for concept in concepts:
            if concept.name in interventions:
                concept.value = interventions[concept.name]
        
        prediction, probs = self.predictor.predict(concepts)
        return prediction, probs, concepts

    def explain_prediction(self, concepts: List[Concept], prediction: int) -> Dict[str, float]:
        """Explain prediction in terms of concept contributions."""
        contributions = {}
        
        for i, concept in enumerate(concepts):
            weight = self.predictor.W[prediction][i]
            contribution = weight * concept.value
            contributions[concept.name] = contribution
        
        return contributions


class ConceptSupervisedTrainer:
    """Train CBM with concept supervision."""
    def __init__(self, model: ConceptBottleneckModel, concept_lr: float = 0.01, task_lr: float = 0.01):
        self.model = model
        self.concept_lr = concept_lr
        self.task_lr = task_lr

    def train_step(self, x: List[float], y: int, concept_labels: Optional[List[float]] = None) -> Dict[str, float]:
        """Single training step."""
        # Extract concepts
        concepts = self.model.extractor.extract(x)
        
        # Concept loss (if labels provided)
        concept_loss = 0.0
        if concept_labels:
            for concept, label in zip(concepts, concept_labels):
                concept_loss += (concept.value - label) ** 2
            concept_loss /= len(concepts)
        
        # Task loss
        prediction, probs = self.model.predictor.predict(concepts)
        task_loss = -math.log(probs[y] + 1e-10)
        
        # Simple gradient updates
        for i in range(self.model.n_concepts):
            if concept_labels:
                error = concepts[i].value - concept_labels[i]
                for j in range(len(x)):
                    self.model.extractor.W[i][j] -= self.concept_lr * error * x[j]
        
        return {
            'concept_loss': concept_loss,
            'task_loss': task_loss,
            'total_loss': concept_loss + task_loss
        }
