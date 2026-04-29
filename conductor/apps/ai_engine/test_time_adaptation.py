"""
Test-Time Adaptation (TTA)

Adapt models at inference:
1. Entropy minimization.
2. Self-training with pseudo-labels.
3. Feature alignment.
"""

import logging
import random
import math
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


class SimpleClassifier:
    """Simple classifier for TTA experiments."""
    def __init__(self, input_dim: int, n_classes: int, hidden_dim: int = 64):
        self.input_dim = input_dim
        self.n_classes = n_classes
        self.hidden_dim = hidden_dim
        
        self.W1 = [[random.gauss(0, 0.1) for _ in range(input_dim)] for _ in range(hidden_dim)]
        self.W2 = [[random.gauss(0, 0.1) for _ in range(hidden_dim)] for _ in range(n_classes)]
        
        # Running statistics for normalization
        self.running_mean = [0.0] * hidden_dim
        self.running_var = [1.0] * hidden_dim

    def forward(self, x: List[float]) -> Tuple[List[float], List[float]]:
        """Forward pass returning (logits, hidden_features)."""
        hidden = []
        for i in range(self.hidden_dim):
            h = sum(self.W1[i][j] * x[j] for j in range(self.input_dim))
            hidden.append(max(0, h))  # ReLU
        
        logits = []
        for i in range(self.n_classes):
            l = sum(self.W2[i][j] * hidden[j] for j in range(self.hidden_dim))
            logits.append(l)
        
        return logits, hidden

    def predict(self, x: List[float]) -> Tuple[int, List[float]]:
        """Predict class and probabilities."""
        logits, _ = self.forward(x)
        
        max_l = max(logits)
        exp_logits = [math.exp(l - max_l) for l in logits]
        total = sum(exp_logits)
        probs = [e / total for e in exp_logits]
        
        return probs.index(max(probs)), probs


class EntropyMinimization:
    """Test-time adaptation via entropy minimization (TENT)."""
    def __init__(self, model: SimpleClassifier, lr: float = 0.001):
        self.model = model
        self.lr = lr

    def entropy(self, probs: List[float]) -> float:
        """Compute entropy of predictions."""
        return -sum(p * math.log(p + 1e-10) for p in probs)

    def adapt_step(self, x: List[float]) -> float:
        """Single adaptation step on test sample."""
        _, probs = self.model.predict(x)
        ent = self.entropy(probs)
        
        # Update only normalization stats (simplified)
        _, hidden = self.model.forward(x)
        
        for i in range(len(hidden)):
            # Update running mean/var
            self.model.running_mean[i] = 0.9 * self.model.running_mean[i] + 0.1 * hidden[i]
            diff = hidden[i] - self.model.running_mean[i]
            self.model.running_var[i] = 0.9 * self.model.running_var[i] + 0.1 * diff ** 2
        
        return ent

    def adapt_batch(self, batch: List[List[float]], n_steps: int = 1) -> float:
        """Adapt on batch of test samples."""
        total_entropy = 0.0
        
        for _ in range(n_steps):
            for x in batch:
                ent = self.adapt_step(x)
                total_entropy += ent
        
        return total_entropy / (len(batch) * n_steps)


class PseudoLabeling:
    """Self-training with pseudo-labels."""
    def __init__(self, model: SimpleClassifier, threshold: float = 0.9, lr: float = 0.001):
        self.model = model
        self.threshold = threshold
        self.lr = lr

    def generate_pseudo_labels(self, samples: List[List[float]]) -> List[Tuple[List[float], int, float]]:
        """Generate pseudo-labels for confident predictions."""
        pseudo_labeled = []
        
        for x in samples:
            pred, probs = self.model.predict(x)
            confidence = max(probs)
            
            if confidence >= self.threshold:
                pseudo_labeled.append((x, pred, confidence))
        
        return pseudo_labeled

    def adapt(self, samples: List[List[float]], n_iterations: int = 5) -> Dict[str, float]:
        """Self-training adaptation loop."""
        stats = {'labeled': 0, 'total': len(samples)}
        
        for iteration in range(n_iterations):
            pseudo_labels = self.generate_pseudo_labels(samples)
            stats['labeled'] = len(pseudo_labels)
            
            if not pseudo_labels:
                break
            
            # Train on pseudo-labels
            for x, label, _ in pseudo_labels:
                # Simple gradient update
                logits, hidden = self.model.forward(x)
                
                for i in range(self.model.n_classes):
                    target = 1.0 if i == label else 0.0
                    max_l = max(logits)
                    prob = math.exp(logits[i] - max_l) / sum(math.exp(l - max_l) for l in logits)
                    error = prob - target
                    
                    for j in range(self.model.hidden_dim):
                        self.model.W2[i][j] -= self.lr * error * hidden[j]
        
        return stats


class FeatureAlignment:
    """Align test features to source distribution."""
    def __init__(self, model: SimpleClassifier, source_mean: Optional[List[float]] = None, 
                 source_var: Optional[List[float]] = None):
        self.model = model
        self.source_mean = source_mean or [0.0] * model.hidden_dim
        self.source_var = source_var or [1.0] * model.hidden_dim

    def compute_statistics(self, samples: List[List[float]]) -> Tuple[List[float], List[float]]:
        """Compute mean and variance of features."""
        features = []
        for x in samples:
            _, hidden = self.model.forward(x)
            features.append(hidden)
        
        n = len(features)
        dim = len(features[0]) if features else 0
        
        mean = [sum(f[i] for f in features) / n for i in range(dim)]
        var = [sum((f[i] - mean[i]) ** 2 for f in features) / n for i in range(dim)]
        
        return mean, var

    def align(self, x: List[float]) -> List[float]:
        """Align single sample's features to source distribution."""
        _, hidden = self.model.forward(x)
        
        aligned = []
        for i, h in enumerate(hidden):
            # Normalize and rescale
            normalized = (h - self.model.running_mean[i]) / (math.sqrt(self.model.running_var[i]) + 1e-8)
            rescaled = normalized * math.sqrt(self.source_var[i]) + self.source_mean[i]
            aligned.append(rescaled)
        
        return aligned


class TestTimeAdaptation:
    """Complete TTA pipeline."""
    def __init__(self, model: SimpleClassifier, method: str = 'tent'):
        self.model = model
        self.method = method
        
        if method == 'tent':
            self.adapter = EntropyMinimization(model)
        elif method == 'pseudo':
            self.adapter = PseudoLabeling(model)
        else:
            self.adapter = FeatureAlignment(model)

    def adapt_and_predict(self, samples: List[List[float]]) -> List[Tuple[int, List[float]]]:
        """Adapt on samples and return predictions."""
        # Adaptation phase
        if self.method == 'tent':
            self.adapter.adapt_batch(samples)
        elif self.method == 'pseudo':
            self.adapter.adapt(samples)
        
        # Prediction phase
        predictions = []
        for x in samples:
            pred, probs = self.model.predict(x)
            predictions.append((pred, probs))
        
        return predictions
