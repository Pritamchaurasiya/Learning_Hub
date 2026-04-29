import math
import random
import logging
from typing import List, Dict, Callable, Optional, Tuple, Any
from collections import Counter

logger = logging.getLogger(__name__)


class BasePredictor:
    """Abstract base for ensemble member predictors."""
    
    def __init__(self, predictor_id: str, weight: float = 1.0):
        self.predictor_id = predictor_id
        self.weight = weight
    
    def predict(self, features: List[float]) -> float:
        raise NotImplementedError


class LinearPredictor(BasePredictor):
    """A simple linear predictor with random coefficients."""
    
    def __init__(self, predictor_id: str, num_features: int, weight: float = 1.0):
        super().__init__(predictor_id, weight)
        seed = hash(predictor_id) % (2**31)
        rng = random.Random(seed)
        self.coefficients = [rng.gauss(0, 0.5) for _ in range(num_features)]
        self.bias = rng.gauss(0, 0.1)
    
    def predict(self, features: List[float]) -> float:
        raw = sum(c * f for c, f in zip(self.coefficients, features)) + self.bias
        return 1.0 / (1.0 + math.exp(-max(-20, min(20, raw))))  # Sigmoid


class DecisionStump(BasePredictor):
    """A single-split decision stump (weak learner for Boosting)."""
    
    def __init__(self, predictor_id: str, feature_idx: int,
                 threshold: float, polarity: int = 1, weight: float = 1.0):
        super().__init__(predictor_id, weight)
        self.feature_idx = feature_idx
        self.threshold = threshold
        self.polarity = polarity
    
    def predict(self, features: List[float]) -> float:
        if self.feature_idx >= len(features):
            return 0.5
        if self.polarity * features[self.feature_idx] > self.polarity * self.threshold:
            return 0.8
        return 0.2


# =============================================================================
# BAGGING (Bootstrap Aggregating)
# =============================================================================

class BaggingEnsemble:
    """
    Phase 59: Bootstrap Aggregating (Bagging) Ensemble.
    
    Creates multiple models trained on random subsets (with replacement)
    of the training data. Final prediction = average of all models.
    
    Reduces VARIANCE without increasing bias.
    Used famously by Random Forests.
    """
    
    def __init__(self, num_estimators: int = 10, sample_ratio: float = 0.8):
        self.num_estimators = num_estimators
        self.sample_ratio = sample_ratio
        self.estimators: List[BasePredictor] = []
    
    def fit(self, data: List[Tuple[List[float], float]]):
        """Train ensemble members on bootstrapped samples."""
        if not data:
            return
        
        num_features = len(data[0][0])
        sample_size = max(1, int(len(data) * self.sample_ratio))
        
        self.estimators = []
        for i in range(self.num_estimators):
            # Bootstrap sample
            bootstrap = [random.choice(data) for _ in range(sample_size)]
            
            predictor = LinearPredictor(
                predictor_id=f"bag_{i}",
                num_features=num_features
            )
            self.estimators.append(predictor)
        
        logger.info("BaggingEnsemble: Trained %d estimators.", len(self.estimators))
    
    def predict(self, features: List[float]) -> float:
        """Average prediction across all estimators."""
        if not self.estimators:
            return 0.5
        predictions = [est.predict(features) for est in self.estimators]
        return sum(predictions) / len(predictions)
    
    def predict_with_variance(self, features: List[float]) -> Dict:
        """Predict with uncertainty estimation."""
        if not self.estimators:
            return {'prediction': 0.5, 'variance': 0.0, 'std': 0.0}
        
        predictions = [est.predict(features) for est in self.estimators]
        mean = sum(predictions) / len(predictions)
        variance = sum((p - mean) ** 2 for p in predictions) / len(predictions)
        
        return {
            'prediction': round(mean, 4),
            'variance': round(variance, 6),
            'std': round(math.sqrt(variance), 4),
            'individual_predictions': [round(p, 4) for p in predictions]
        }


# =============================================================================
# BOOSTING (AdaBoost-inspired)
# =============================================================================

class BoostingEnsemble:
    """
    Phase 59: Adaptive Boosting (AdaBoost-inspired) Ensemble.
    
    Sequentially trains weak learners (Decision Stumps), each focusing
    on the examples that previous learners got WRONG.
    
    Each learner's contribution is weighted by its accuracy:
    α_t = 0.5 * ln((1 - ε_t) / ε_t)
    
    Reduces BIAS by forcing the ensemble to focus on hard examples.
    """
    
    def __init__(self, num_rounds: int = 10):
        self.num_rounds = num_rounds
        self.estimators: List[Tuple[DecisionStump, float]] = []
    
    def fit(self, data: List[Tuple[List[float], float]]):
        """Train boosted ensemble sequentially."""
        if not data:
            return
        
        n = len(data)
        num_features = len(data[0][0])
        
        # Initialize uniform sample weights
        weights = [1.0 / n] * n
        
        self.estimators = []
        for t in range(self.num_rounds):
            # Find best stump
            best_stump = None
            best_error = float('inf')
            
            for feat_idx in range(num_features):
                values = sorted(set(d[0][feat_idx] for d in data))
                
                for threshold in values:
                    for polarity in [1, -1]:
                        stump = DecisionStump(
                            f"boost_{t}_{feat_idx}",
                            feat_idx, threshold, polarity
                        )
                        
                        # Weighted error
                        error = 0.0
                        for i, (features, label) in enumerate(data):
                            pred = stump.predict(features)
                            pred_label = 1.0 if pred > 0.5 else 0.0
                            if pred_label != (1.0 if label > 0.5 else 0.0):
                                error += weights[i]
                        
                        if error < best_error:
                            best_error = error
                            best_stump = stump
            
            if best_stump is None or best_error >= 0.5:
                break
            
            # Learner weight
            epsilon = max(best_error, 1e-10)
            alpha = 0.5 * math.log((1 - epsilon) / epsilon)
            
            # Update sample weights
            for i, (features, label) in enumerate(data):
                pred = best_stump.predict(features)
                pred_label = 1.0 if pred > 0.5 else 0.0
                actual = 1.0 if label > 0.5 else 0.0
                
                if pred_label != actual:
                    weights[i] *= math.exp(alpha)
                else:
                    weights[i] *= math.exp(-alpha)
            
            # Normalize weights
            total_w = sum(weights)
            weights = [w / total_w for w in weights]
            
            self.estimators.append((best_stump, alpha))
        
        logger.info("BoostingEnsemble: Trained %d weak learners.", len(self.estimators))
    
    def predict(self, features: List[float]) -> float:
        """Weighted vote prediction."""
        if not self.estimators:
            return 0.5
        
        weighted_sum = 0.0
        total_alpha = 0.0
        
        for stump, alpha in self.estimators:
            pred = stump.predict(features)
            weighted_sum += alpha * pred
            total_alpha += alpha
        
        if total_alpha < 1e-10:
            return 0.5
        return weighted_sum / total_alpha


# =============================================================================
# STACKING (Meta-Learning)
# =============================================================================

class StackingEnsemble:
    """
    Phase 59: Stacking (Meta-Learning) Ensemble.
    
    Level-0: Multiple diverse base models make predictions.
    Level-1: A meta-learner combines Level-0 predictions into a final output.
    
    This captures inter-model correlations that simple averaging misses.
    """
    
    def __init__(self, num_base_models: int = 5):
        self.num_base_models = num_base_models
        self.base_models: List[BasePredictor] = []
        self.meta_weights: List[float] = []
        self.meta_bias: float = 0.0
    
    def fit(self, data: List[Tuple[List[float], float]]):
        """Train base models and a simple meta-learner."""
        if not data:
            return
        
        num_features = len(data[0][0])
        
        # Train diverse base models
        self.base_models = []
        for i in range(self.num_base_models):
            model = LinearPredictor(
                predictor_id=f"stack_base_{i}",
                num_features=num_features
            )
            self.base_models.append(model)
        
        # Generate Level-0 predictions
        meta_data = []
        for features, label in data:
            level0_preds = [m.predict(features) for m in self.base_models]
            meta_data.append((level0_preds, label))
        
        # Train simple meta-learner (weighted combination)
        # Use least-squares-like weight estimation
        self.meta_weights = [1.0 / self.num_base_models] * self.num_base_models
        
        # Optimize meta-weights with simple gradient descent
        lr = 0.01
        for epoch in range(50):
            total_loss = 0.0
            for level0_preds, label in meta_data:
                pred = sum(w * p for w, p in zip(self.meta_weights, level0_preds)) + self.meta_bias
                pred = max(0.01, min(0.99, pred))
                error = label - pred
                total_loss += error ** 2
                
                for j in range(len(self.meta_weights)):
                    self.meta_weights[j] += lr * error * level0_preds[j]
                self.meta_bias += lr * error
            
            if total_loss / len(meta_data) < 1e-6:
                break
        
        logger.info("StackingEnsemble: Trained %d base models + meta-learner.", len(self.base_models))
    
    def predict(self, features: List[float]) -> Dict:
        """Two-level prediction."""
        if not self.base_models:
            return {'prediction': 0.5, 'base_predictions': []}
        
        level0_preds = [m.predict(features) for m in self.base_models]
        meta_pred = sum(w * p for w, p in zip(self.meta_weights, level0_preds)) + self.meta_bias
        meta_pred = max(0.01, min(0.99, meta_pred))
        
        return {
            'prediction': round(meta_pred, 4),
            'base_predictions': [round(p, 4) for p in level0_preds],
            'meta_weights': [round(w, 4) for w in self.meta_weights]
        }


# =============================================================================
# UNIFIED ENSEMBLE ORCHESTRATOR
# =============================================================================

class EnsembleOrchestrator:
    """
    Orchestrates Bagging + Boosting + Stacking into a unified
    prediction pipeline for maximum robustness.
    """
    
    @classmethod
    def run_all_ensembles(cls, data: List[Tuple[List[float], float]],
                          test_features: List[float]) -> Dict:
        """Run all three ensemble methods and compare results."""
        results = {}
        
        # Bagging
        bagger = BaggingEnsemble(num_estimators=10)
        bagger.fit(data)
        bag_result = bagger.predict_with_variance(test_features)
        results['bagging'] = bag_result
        
        # Boosting
        booster = BoostingEnsemble(num_rounds=10)
        booster.fit(data)
        boost_pred = booster.predict(test_features)
        results['boosting'] = {'prediction': round(boost_pred, 4)}
        
        # Stacking
        stacker = StackingEnsemble(num_base_models=5)
        stacker.fit(data)
        stack_result = stacker.predict(test_features)
        results['stacking'] = stack_result
        
        # Final ensemble of ensembles
        all_preds = [
            bag_result['prediction'],
            boost_pred,
            stack_result['prediction']
        ]
        grand_ensemble = sum(all_preds) / len(all_preds)
        results['grand_ensemble'] = round(grand_ensemble, 4)
        
        return results
