import math
import random
import logging
from typing import List, Dict, Callable, Optional, Tuple, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class CounterfactualResult:
    """A single counterfactual explanation."""
    original_features: Dict[str, float]
    modified_features: Dict[str, float]
    original_prediction: float
    counterfactual_prediction: float
    changes: List[Dict[str, Any]]
    l1_distance: float
    sparsity: int  # Number of features changed
    
    def to_dict(self) -> Dict:
        return {
            'original_prediction': round(self.original_prediction, 4),
            'counterfactual_prediction': round(self.counterfactual_prediction, 4),
            'changes': self.changes,
            'l1_distance': round(self.l1_distance, 4),
            'sparsity': self.sparsity
        }


class GrowingSphereCounterfactual:
    """
    Phase 60: Growing Sphere Counterfactual Generator.
    
    Finds the minimal perturbation to an input that changes the model's
    prediction by growing a hypersphere around the instance and finding
    the nearest decision boundary.
    
    Algorithm:
    1. Start with a small perturbation radius.
    2. Generate random perturbations within the sphere.
    3. Check if any perturbation crosses the decision boundary.
    4. If not, grow the sphere and repeat.
    5. Once boundary instances are found, optimize for sparsity.
    
    This produces counterfactuals that are:
    - Minimal (fewest changes possible)
    - Proximal (close to the original instance)
    - Actionable (only perturb mutable features)
    """
    
    def __init__(
        self,
        predict_fn: Callable[[List[float]], float],
        feature_names: Optional[List[str]] = None,
        mutable_features: Optional[List[int]] = None
    ):
        self.predict_fn = predict_fn
        self.feature_names = feature_names
        self.mutable_features = mutable_features
    
    def generate(
        self,
        instance: List[float],
        desired_prediction: float = 0.5,
        threshold: float = 0.1,
        initial_radius: float = 0.1,
        growth_factor: float = 1.5,
        max_iterations: int = 20,
        n_samples_per_sphere: int = 100,
        n_counterfactuals: int = 3
    ) -> List[CounterfactualResult]:
        """
        Generate counterfactual explanations via growing spheres.
        
        Args:
            instance: The original feature vector.
            desired_prediction: Target prediction value.
            threshold: How close to desired_prediction counts as "crossed".
            initial_radius: Starting sphere radius.
            growth_factor: Multiplier for each growth step.
            max_iterations: Maximum number of growth steps.
            n_samples_per_sphere: Perturbations per sphere.
            n_counterfactuals: Number of counterfactuals to return.
        """
        num_features = len(instance)
        if self.feature_names is None:
            self.feature_names = [f"feature_{i}" for i in range(num_features)]
        
        mutable = self.mutable_features or list(range(num_features))
        original_pred = self.predict_fn(instance)
        
        candidates = []
        radius = initial_radius
        
        for iteration in range(max_iterations):
            for _ in range(n_samples_per_sphere):
                # Generate perturbation within sphere
                perturbed = list(instance)
                
                for feat_idx in mutable:
                    noise = random.gauss(0, radius)
                    perturbed[feat_idx] = max(0.0, perturbed[feat_idx] + noise)
                
                cf_pred = self.predict_fn(perturbed)
                
                # Check if boundary is crossed
                if abs(cf_pred - desired_prediction) < threshold:
                    changes = []
                    l1_dist = 0.0
                    sparsity = 0
                    
                    for i in range(num_features):
                        if abs(perturbed[i] - instance[i]) > 1e-6:
                            changes.append({
                                'feature': self.feature_names[i],
                                'from': round(instance[i], 4),
                                'to': round(perturbed[i], 4),
                                'delta': round(perturbed[i] - instance[i], 4)
                            })
                            l1_dist += abs(perturbed[i] - instance[i])
                            sparsity += 1
                    
                    candidates.append(CounterfactualResult(
                        original_features={self.feature_names[i]: instance[i] for i in range(num_features)},
                        modified_features={self.feature_names[i]: perturbed[i] for i in range(num_features)},
                        original_prediction=original_pred,
                        counterfactual_prediction=cf_pred,
                        changes=changes,
                        l1_distance=l1_dist,
                        sparsity=sparsity
                    ))
            
            if len(candidates) >= n_counterfactuals * 3:
                break
            
            radius *= growth_factor
        
        # Select best counterfactuals (minimize sparsity, then distance)
        candidates.sort(key=lambda c: (c.sparsity, c.l1_distance))
        
        return candidates[:n_counterfactuals]


class WhatIfAnalyzer:
    """
    Phase 60: What-If Scenario Analyzer.
    
    Allows exploration of hypothetical scenarios by systematically
    varying features and observing prediction changes.
    """
    
    def __init__(self, predict_fn: Callable[[List[float]], float]):
        self.predict_fn = predict_fn
    
    def sensitivity_analysis(
        self,
        instance: List[float],
        feature_names: Optional[List[str]] = None,
        perturbation_range: float = 0.2,
        n_steps: int = 10
    ) -> List[Dict]:
        """
        Compute sensitivity of the prediction to each feature.
        
        Sweeps each feature across a range and measures prediction change.
        """
        num_features = len(instance)
        if feature_names is None:
            feature_names = [f"feature_{i}" for i in range(num_features)]
        
        baseline_pred = self.predict_fn(instance)
        results = []
        
        for feat_idx in range(num_features):
            sweep_results = []
            original_val = instance[feat_idx]
            
            low = original_val * (1 - perturbation_range)
            high = original_val * (1 + perturbation_range)
            step = (high - low) / max(1, n_steps - 1) if high > low else 0.01
            
            for s in range(n_steps):
                test_val = low + s * step
                modified = list(instance)
                modified[feat_idx] = max(0.0, test_val)
                
                pred = self.predict_fn(modified)
                sweep_results.append({
                    'feature_value': round(test_val, 4),
                    'prediction': round(pred, 4)
                })
            
            # Compute sensitivity as max prediction range
            pred_range = max(r['prediction'] for r in sweep_results) - min(r['prediction'] for r in sweep_results)
            
            results.append({
                'feature': feature_names[feat_idx],
                'sensitivity': round(pred_range, 6),
                'sweep': sweep_results
            })
        
        results.sort(key=lambda x: x['sensitivity'], reverse=True)
        return results
    
    def interactive_what_if(
        self,
        instance: List[float],
        modifications: Dict[int, float],
        feature_names: Optional[List[str]] = None
    ) -> Dict:
        """
        Apply specific what-if modifications and return the result.
        
        Args:
            instance: Original feature vector.
            modifications: Dict mapping feature_index -> new_value.
        """
        num_features = len(instance)
        if feature_names is None:
            feature_names = [f"feature_{i}" for i in range(num_features)]
        
        original_pred = self.predict_fn(instance)
        modified = list(instance)
        
        changes = []
        for feat_idx, new_val in modifications.items():
            if feat_idx < num_features:
                changes.append({
                    'feature': feature_names[feat_idx],
                    'from': round(instance[feat_idx], 4),
                    'to': round(new_val, 4)
                })
                modified[feat_idx] = new_val
        
        new_pred = self.predict_fn(modified)
        
        return {
            'original_prediction': round(original_pred, 4),
            'new_prediction': round(new_pred, 4),
            'prediction_delta': round(new_pred - original_pred, 4),
            'changes_applied': changes
        }
