"""
Uncertainty Quantification

Calibrated predictions:
1. Monte Carlo Dropout.
2. Deep Ensembles.
3. Calibration metrics.
"""

import logging
import random
import math
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class Prediction:
    value: Any
    confidence: float
    uncertainty: float
    method: str


class MonteCarloDropout:
    """Monte Carlo Dropout for uncertainty estimation."""
    def __init__(self, dropout_rate: float = 0.5, n_samples: int = 30):
        self.dropout_rate = dropout_rate
        self.n_samples = n_samples

    def _apply_dropout(self, features: List[float]) -> List[float]:
        """Apply dropout to features."""
        return [
            f if random.random() > self.dropout_rate else 0.0
            for f in features
        ]

    def _forward_pass(self, features: List[float]) -> float:
        """Simulated forward pass with dropout."""
        dropped = self._apply_dropout(features)
        # Simple linear combination
        return sum(dropped) / len(dropped) if dropped else 0.0

    def predict_with_uncertainty(self, features: List[float]) -> Prediction:
        """Make prediction with uncertainty estimate."""
        predictions = []
        
        for _ in range(self.n_samples):
            pred = self._forward_pass(features)
            predictions.append(pred)
        
        # Mean prediction
        mean_pred = sum(predictions) / len(predictions)
        
        # Variance as uncertainty
        variance = sum((p - mean_pred) ** 2 for p in predictions) / len(predictions)
        uncertainty = math.sqrt(variance)
        
        # Confidence = 1 - normalized uncertainty
        confidence = 1.0 / (1.0 + uncertainty)
        
        return Prediction(
            value=mean_pred,
            confidence=confidence,
            uncertainty=uncertainty,
            method='mc_dropout'
        )


class DeepEnsemble:
    """Deep Ensemble for uncertainty estimation."""
    def __init__(self, n_models: int = 5, hidden_dim: int = 32):
        self.n_models = n_models
        self.hidden_dim = hidden_dim
        self.models = self._initialize_models()

    def _initialize_models(self) -> List[List[List[float]]]:
        """Initialize ensemble of models (weights)."""
        models = []
        for _ in range(self.n_models):
            # Simple random weights
            weights = [
                [random.gauss(0, 0.1) for _ in range(self.hidden_dim)]
                for _ in range(self.hidden_dim)
            ]
            models.append(weights)
        return models

    def _model_forward(self, model: List[List[float]], features: List[float]) -> float:
        """Forward pass through one model."""
        # Simple matrix-vector multiply simulation
        hidden = [0.0] * min(len(model), len(features))
        
        for i in range(min(len(hidden), len(model))):
            for j in range(min(len(features), len(model[i]))):
                hidden[i] += features[j] * model[i][j]
            # ReLU
            hidden[i] = max(0, hidden[i])
        
        return sum(hidden) / len(hidden) if hidden else 0.0

    def predict_with_uncertainty(self, features: List[float]) -> Prediction:
        """Make prediction using ensemble."""
        predictions = [
            self._model_forward(model, features)
            for model in self.models
        ]
        
        # Mean prediction
        mean_pred = sum(predictions) / len(predictions)
        
        # Variance as uncertainty
        variance = sum((p - mean_pred) ** 2 for p in predictions) / len(predictions)
        uncertainty = math.sqrt(variance)
        
        # Confidence
        confidence = 1.0 / (1.0 + uncertainty)
        
        return Prediction(
            value=mean_pred,
            confidence=confidence,
            uncertainty=uncertainty,
            method='deep_ensemble'
        )


class CalibrationMetrics:
    """Calibration metrics for uncertainty evaluation."""
    def __init__(self, n_bins: int = 10):
        self.n_bins = n_bins

    def expected_calibration_error(
        self, 
        predictions: List[float], 
        confidences: List[float], 
        labels: List[int]
    ) -> float:
        """Compute Expected Calibration Error (ECE)."""
        if not predictions:
            return 0.0
        
        bins = [[] for _ in range(self.n_bins)]
        
        # Bin predictions by confidence
        for pred, conf, label in zip(predictions, confidences, labels):
            bin_idx = min(int(conf * self.n_bins), self.n_bins - 1)
            bins[bin_idx].append((pred, conf, label))
        
        ece = 0.0
        total_samples = len(predictions)
        
        for bin_samples in bins:
            if not bin_samples:
                continue
            
            # Average confidence and accuracy in bin
            avg_conf = sum(s[1] for s in bin_samples) / len(bin_samples)
            accuracy = sum(1 for s in bin_samples if s[0] == s[2]) / len(bin_samples)
            
            # Weighted absolute difference
            ece += len(bin_samples) / total_samples * abs(accuracy - avg_conf)
        
        return ece

    def reliability_diagram_data(
        self,
        predictions: List[float],
        confidences: List[float], 
        labels: List[int]
    ) -> Dict[str, List[float]]:
        """Generate data for reliability diagram."""
        bins = [[] for _ in range(self.n_bins)]
        
        for pred, conf, label in zip(predictions, confidences, labels):
            bin_idx = min(int(conf * self.n_bins), self.n_bins - 1)
            bins[bin_idx].append((pred, conf, label))
        
        bin_confidences = []
        bin_accuracies = []
        bin_counts = []
        
        for i, bin_samples in enumerate(bins):
            if bin_samples:
                avg_conf = sum(s[1] for s in bin_samples) / len(bin_samples)
                accuracy = sum(1 for s in bin_samples if s[0] == s[2]) / len(bin_samples)
            else:
                avg_conf = (i + 0.5) / self.n_bins
                accuracy = avg_conf
            
            bin_confidences.append(avg_conf)
            bin_accuracies.append(accuracy)
            bin_counts.append(len(bin_samples))
        
        return {
            'confidences': bin_confidences,
            'accuracies': bin_accuracies,
            'counts': bin_counts
        }


class UncertaintyQuantifier:
    """Complete uncertainty quantification system."""
    def __init__(self, method: str = 'ensemble'):
        self.method = method
        
        if method == 'mc_dropout':
            self.estimator = MonteCarloDropout()
        else:
            self.estimator = DeepEnsemble()
        
        self.calibration = CalibrationMetrics()
        self.predictions_history: List[Tuple[Prediction, Any]] = []

    def predict(self, features: List[float]) -> Prediction:
        """Make calibrated prediction with uncertainty."""
        return self.estimator.predict_with_uncertainty(features)

    def record_prediction(self, prediction: Prediction, true_label: Any):
        """Record prediction for calibration analysis."""
        self.predictions_history.append((prediction, true_label))

    def evaluate_calibration(self) -> Dict[str, float]:
        """Evaluate calibration of predictions."""
        if not self.predictions_history:
            return {'ece': 0.0}
        
        predictions = []
        confidences = []
        labels = []
        
        for pred, label in self.predictions_history:
            predictions.append(int(pred.value > 0.5))
            confidences.append(pred.confidence)
            labels.append(int(label))
        
        ece = self.calibration.expected_calibration_error(
            predictions, confidences, labels
        )
        
        return {
            'ece': ece,
            'avg_confidence': sum(confidences) / len(confidences),
            'avg_uncertainty': sum(p.uncertainty for p, _ in self.predictions_history) / len(self.predictions_history)
        }
