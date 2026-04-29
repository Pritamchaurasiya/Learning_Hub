import math
import random
import logging
from typing import List, Dict, Tuple, Callable

logger = logging.getLogger(__name__)


class BayesianOptimizer:
    """
    Phase 78: Bayesian Optimization for Hyperparameter Tuning.
    
    Motivation: Training a neural network requires choosing hyperparameters 
    (learning rate, batch size, dropout rate, etc.). Grid Search is O(k^n) 
    exponential. Random Search is better but wasteful.
    
    Bayesian Optimization is SMART search. It builds a probabilistic *surrogate 
    model* (a Gaussian Process) of the objective function, and uses an 
    *Acquisition Function* (Expected Improvement) to decide WHERE to sample next.
    
    It actively trades off:
    - Exploitation: Sampling near the current best (greedy)
    - Exploration: Sampling uncertain regions (curious)
    """
    
    def __init__(self, param_bounds: Dict[str, Tuple[float, float]], n_initial: int = 5):
        """
        Args:
            param_bounds: e.g. {'learning_rate': (0.0001, 0.1), 'dropout': (0.0, 0.5)}
            n_initial: Number of random initial points before Bayesian kicks in
        """
        self.param_names = list(param_bounds.keys())
        self.param_bounds = param_bounds
        self.n_initial = n_initial
        
        # Observation history
        self.X_observed: List[Dict[str, float]] = []
        self.y_observed: List[float] = []
        
        # Surrogate model state (simplified GP)
        self.best_y = float('-inf')
        self.best_x: Dict[str, float] = {}
        
    def _random_sample(self) -> Dict[str, float]:
        """Samples a random point uniformly within bounds."""
        return {
            name: random.uniform(bounds[0], bounds[1])
            for name, bounds in self.param_bounds.items()
        }
    
    def _surrogate_predict(self, candidate: Dict[str, float]) -> Tuple[float, float]:
        """
        Simplified Gaussian Process prediction.
        Returns (mean, std_dev) as estimates of objective at the candidate point.
        
        In a real GP, this involves inverting the kernel (covariance) matrix.
        Here we approximate using distance-weighted interpolation.
        """
        if not self.X_observed:
            return 0.0, 1.0  # Maximum uncertainty
            
        # Compute RBF (Gaussian) kernel distance to each observed point
        length_scale = 0.5
        weights = []
        for obs_x in self.X_observed:
            dist_sq = sum(
                ((candidate[name] - obs_x[name]) / (self.param_bounds[name][1] - self.param_bounds[name][0])) ** 2
                for name in self.param_names
            )
            kernel_val = math.exp(-dist_sq / (2 * length_scale ** 2))
            weights.append(kernel_val)
            
        total_weight = sum(weights)
        if total_weight < 1e-10:
            return 0.0, 1.0  # Far from all observations
            
        # Weighted mean prediction
        mean = sum(w * y for w, y in zip(weights, self.y_observed)) / total_weight
        
        # Uncertainty: inversely proportional to total kernel weight
        std_dev = max(0.01, 1.0 - (total_weight / len(self.X_observed)))
        
        return mean, std_dev
    
    def _expected_improvement(self, candidate: Dict[str, float], xi: float = 0.01) -> float:
        """
        Expected Improvement Acquisition Function:
        EI(x) = (mu(x) - f_best - xi) * CDF(Z) + sigma(x) * PDF(Z)
        where Z = (mu(x) - f_best - xi) / sigma(x)
        
        This balances exploitation (high mean) and exploration (high uncertainty).
        """
        mu, sigma = self._surrogate_predict(candidate)
        
        if sigma < 1e-10:
            return 0.0
            
        z = (mu - self.best_y - xi) / sigma
        
        # Approximate CDF and PDF of standard normal
        cdf_z = 0.5 * (1.0 + math.erf(z / math.sqrt(2)))
        pdf_z = (1.0 / math.sqrt(2 * math.pi)) * math.exp(-0.5 * z ** 2)
        
        ei = (mu - self.best_y - xi) * cdf_z + sigma * pdf_z
        return max(0.0, ei)
    
    def _select_next_point(self, n_candidates: int = 100) -> Dict[str, float]:
        """
        Selects the next hyperparameter configuration to evaluate by maximizing EI.
        """
        best_ei = -1.0
        best_candidate = self._random_sample()
        
        for _ in range(n_candidates):
            candidate = self._random_sample()
            ei = self._expected_improvement(candidate)
            if ei > best_ei:
                best_ei = ei
                best_candidate = candidate
                
        return best_candidate
        
    def optimize(self, objective_fn: Callable, n_iterations: int = 15) -> Dict:
        """
        Runs the full Bayesian Optimization loop.
        """
        # Phase 1: Random exploration
        for _ in range(self.n_initial):
            x = self._random_sample()
            y = objective_fn(x)
            self.X_observed.append(x)
            self.y_observed.append(y)
            if y > self.best_y:
                self.best_y = y
                self.best_x = dict(x)
                
        # Phase 2: Bayesian-guided search
        convergence = [self.best_y]
        for _ in range(n_iterations - self.n_initial):
            x = self._select_next_point()
            y = objective_fn(x)
            self.X_observed.append(x)
            self.y_observed.append(y)
            if y > self.best_y:
                self.best_y = y
                self.best_x = dict(x)
            convergence.append(self.best_y)
            
        return {
            'best_hyperparameters': {k: round(v, 6) for k, v in self.best_x.items()},
            'best_objective_value': round(self.best_y, 4),
            'total_evaluations': len(self.X_observed),
            'convergence_history': [round(c, 3) for c in convergence],
            'surrogate_model': 'Gaussian Process (RBF Kernel)',
            'acquisition_function': 'Expected Improvement (EI)'
        }
