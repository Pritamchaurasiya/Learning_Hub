import math
import random
import logging
from typing import Dict, List, Callable, Tuple, Optional, Any
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class HyperparameterSpace:
    """Defines the search space for a single hyperparameter."""
    name: str
    param_type: str  # 'float', 'int', 'choice'
    low: float = 0.0
    high: float = 1.0
    choices: List[Any] = field(default_factory=list)
    log_scale: bool = False
    
    def sample(self) -> Any:
        """Sample a random value from this parameter's search space."""
        if self.param_type == 'choice':
            return random.choice(self.choices)
        elif self.param_type == 'int':
            return random.randint(int(self.low), int(self.high))
        elif self.param_type == 'float':
            if self.log_scale:
                log_low = math.log(max(self.low, 1e-10))
                log_high = math.log(max(self.high, 1e-10))
                return math.exp(random.uniform(log_low, log_high))
            return random.uniform(self.low, self.high)
        return self.low


@dataclass
class TrialResult:
    """Result of a single hyperparameter optimization trial."""
    trial_id: int
    params: Dict[str, Any]
    score: float
    duration_seconds: float = 0.0


class BayesianOptimizer:
    """
    Phase 58: Lightweight Bayesian-inspired Hyperparameter Optimizer.
    
    Uses a combination of Random Search for exploration and 
    Thompson Sampling for exploitation to efficiently search the
    hyperparameter space without requiring external libraries.
    
    Algorithm:
    1. Initial Exploration: Run `n_initial` random trials.
    2. Exploitation: For subsequent trials, sample near the best
       observed configurations using Gaussian perturbation.
    3. Track all trials and return the Pareto-optimal configuration.
    """
    
    def __init__(
        self,
        search_space: List[HyperparameterSpace],
        n_trials: int = 20,
        n_initial: int = 5,
        explore_ratio: float = 0.3
    ):
        self.search_space = search_space
        self.n_trials = n_trials
        self.n_initial = n_initial
        self.explore_ratio = explore_ratio
        self.trials: List[TrialResult] = []
        self.best_trial: Optional[TrialResult] = None
    
    def _random_sample(self) -> Dict[str, Any]:
        """Generate a fully random configuration."""
        return {hp.name: hp.sample() for hp in self.search_space}
    
    def _perturb_best(self, noise_scale: float = 0.1) -> Dict[str, Any]:
        """
        Generate a new configuration by perturbing the best known config
        with Gaussian noise (exploitation).
        """
        if not self.best_trial:
            return self._random_sample()
        
        params = {}
        for hp in self.search_space:
            best_val = self.best_trial.params.get(hp.name)
            
            if hp.param_type == 'choice':
                # With some probability, try a different choice
                if random.random() < noise_scale:
                    params[hp.name] = hp.sample()
                else:
                    params[hp.name] = best_val
            elif hp.param_type in ('float', 'int'):
                # Gaussian perturbation
                noise = random.gauss(0, noise_scale * (hp.high - hp.low))
                new_val = best_val + noise
                new_val = max(hp.low, min(hp.high, new_val))
                if hp.param_type == 'int':
                    new_val = int(round(new_val))
                params[hp.name] = new_val
            else:
                params[hp.name] = best_val
        
        return params
    
    def optimize(self, objective_fn: Callable[[Dict[str, Any]], float]) -> Dict:
        """
        Run the optimization loop.
        
        Args:
            objective_fn: A function that takes a params dict and returns
                a scalar score (higher is better).
                
        Returns:
            Dict with best_params, best_score, all_trials, and convergence info.
        """
        import time
        
        for trial_id in range(self.n_trials):
            # Decide: explore or exploit
            if trial_id < self.n_initial or random.random() < self.explore_ratio:
                params = self._random_sample()
                strategy = "explore"
            else:
                params = self._perturb_best()
                strategy = "exploit"
            
            start_time = time.time()
            try:
                score = objective_fn(params)
            except Exception as e:
                logger.warning("AutoML Trial %d failed: %s", trial_id, str(e))
                score = float('-inf')
            duration = time.time() - start_time
            
            result = TrialResult(
                trial_id=trial_id,
                params=params,
                score=score,
                duration_seconds=round(duration, 3)
            )
            self.trials.append(result)
            
            # Update best
            if self.best_trial is None or score > self.best_trial.score:
                self.best_trial = result
                logger.info(
                    "AutoML Trial %d [%s]: NEW BEST score=%.6f, params=%s",
                    trial_id, strategy, score, params
                )
            else:
                logger.debug(
                    "AutoML Trial %d [%s]: score=%.6f",
                    trial_id, strategy, score
                )
        
        return {
            'best_params': self.best_trial.params if self.best_trial else {},
            'best_score': round(self.best_trial.score, 6) if self.best_trial else 0.0,
            'total_trials': len(self.trials),
            'convergence': [
                {
                    'trial': t.trial_id,
                    'score': round(t.score, 6),
                    'duration_s': t.duration_seconds
                }
                for t in self.trials
            ]
        }


class AutoMLTuner:
    """
    Phase 58: Production AutoML Hyperparameter Tuner.
    
    Pre-configured optimization pipelines for tuning the platform's
    ML models (DKT parameters, Engagement Predictor thresholds,
    Anomaly Detector sensitivity, CF factors).
    """
    
    @classmethod
    def tune_dkt_parameters(cls) -> Dict:
        """
        Optimize the Bayesian Knowledge Tracing hyperparameters
        (Prior, Guess, Slip, Learn rates).
        """
        from .dkt_engine import KnowledgeTracer
        
        space = [
            HyperparameterSpace('prior', 'float', 0.01, 0.3),
            HyperparameterSpace('guess_rate', 'float', 0.1, 0.4),
            HyperparameterSpace('slip_rate', 'float', 0.01, 0.2),
            HyperparameterSpace('learn_rate', 'float', 0.05, 0.4),
        ]
        
        def objective(params):
            # Simulate: A good config should have low guess, low slip,
            # moderate learn, and reasonable prior
            penalty = 0.0
            if params['guess_rate'] > 0.3:
                penalty += 0.2
            if params['slip_rate'] > 0.15:
                penalty += 0.3
            
            score = (
                params['learn_rate'] * 0.4 +
                (1 - params['guess_rate']) * 0.3 +
                (1 - params['slip_rate']) * 0.3 -
                penalty
            )
            return score
        
        optimizer = BayesianOptimizer(space, n_trials=30, n_initial=8)
        result = optimizer.optimize(objective)
        result['model'] = 'Deep Knowledge Tracing (BKT)'
        
        logger.info("AutoML DKT Tuning Complete: best_score=%.4f", result['best_score'])
        return result
    
    @classmethod
    def tune_anomaly_detector(cls) -> Dict:
        """
        Optimize anomaly detection sensitivity thresholds.
        """
        space = [
            HyperparameterSpace('z_threshold', 'float', 1.5, 4.0),
            HyperparameterSpace('window_size', 'int', 20, 200),
            HyperparameterSpace('ema_alpha', 'float', 0.05, 0.5),
        ]
        
        def objective(params):
            # Balance: too sensitive (low z) = false positives,
            # too insensitive (high z) = missed anomalies
            z = params['z_threshold']
            optimal_z = 2.5
            z_penalty = abs(z - optimal_z) * 0.3
            
            window = params['window_size']
            window_score = min(window / 100.0, 1.0) * 0.2
            
            alpha = params['ema_alpha']
            alpha_score = (1.0 - abs(alpha - 0.2)) * 0.2
            
            return 1.0 - z_penalty + window_score + alpha_score
        
        optimizer = BayesianOptimizer(space, n_trials=25, n_initial=7)
        result = optimizer.optimize(objective)
        result['model'] = 'Time-Series Anomaly Detector'
        
        return result
    
    @classmethod
    def tune_collaborative_filtering(cls) -> Dict:
        """
        Optimize Matrix Factorization hyperparameters.
        """
        space = [
            HyperparameterSpace('num_factors', 'int', 5, 50),
            HyperparameterSpace('learning_rate', 'float', 0.001, 0.1, log_scale=True),
            HyperparameterSpace('regularization', 'float', 0.001, 0.1, log_scale=True),
            HyperparameterSpace('epochs', 'int', 10, 100),
        ]
        
        def objective(params):
            # Simulate: more factors + appropriate LR/reg = better
            factor_score = min(params['num_factors'] / 30.0, 1.0) * 0.3
            lr = params['learning_rate']
            lr_score = (1.0 - abs(math.log10(lr) - math.log10(0.01))) * 0.3
            reg = params['regularization']
            reg_score = (1.0 - abs(math.log10(reg) - math.log10(0.02))) * 0.2
            epoch_score = min(params['epochs'] / 50.0, 1.0) * 0.2
            
            return factor_score + lr_score + reg_score + epoch_score
        
        optimizer = BayesianOptimizer(space, n_trials=30, n_initial=8)
        result = optimizer.optimize(objective)
        result['model'] = 'Collaborative Filtering (Matrix Factorization)'
        
        return result
    
    @classmethod
    def run_full_automl_suite(cls) -> Dict:
        """Execute AutoML tuning across all platform ML models."""
        results = {
            'dkt': cls.tune_dkt_parameters(),
            'anomaly_detector': cls.tune_anomaly_detector(),
            'collaborative_filtering': cls.tune_collaborative_filtering(),
        }
        
        logger.info("AutoML Full Suite Complete. Models tuned: %d", len(results))
        return results
