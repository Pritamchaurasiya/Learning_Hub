"""
Model Merging

Combine models:
1. Weight averaging.
2. TIES merging.
3. DARE merging.
"""

import random
import math
from typing import List, Dict, Optional
from dataclasses import dataclass
from enum import Enum


class MergeMethod(Enum):
    AVERAGE = "average"
    WEIGHTED = "weighted"
    TIES = "ties"
    DARE = "dare"
    SLERP = "slerp"


@dataclass
class ModelWeight:
    name: str
    weights: Dict[str, List[float]]
    coefficient: float = 1.0


class WeightAverager:
    """Average model weights."""
    def average(self, models: List[ModelWeight]) -> Dict[str, List[float]]:
        if not models:
            return {}
        
        result = {}
        all_keys = set()
        for m in models:
            all_keys.update(m.weights.keys())
        
        for key in all_keys:
            values = [m.weights.get(key, []) for m in models if key in m.weights]
            if values:
                n_params = len(values[0])
                result[key] = [sum(v[i] for v in values) / len(values) for i in range(n_params)]
        
        return result

    def weighted_average(self, models: List[ModelWeight]) -> Dict[str, List[float]]:
        if not models:
            return {}
        
        total_coef = sum(m.coefficient for m in models)
        result = {}
        all_keys = set()
        for m in models:
            all_keys.update(m.weights.keys())
        
        for key in all_keys:
            values = [(m.weights.get(key, []), m.coefficient) for m in models if key in m.weights]
            if values:
                n_params = len(values[0][0])
                result[key] = [
                    sum(v[i] * c for v, c in values) / total_coef 
                    for i in range(n_params)
                ]
        
        return result


class TIESMerger:
    """TIES: Trim, Elect, Merge."""
    def __init__(self, trim_ratio: float = 0.2):
        self.trim_ratio = trim_ratio

    def _compute_task_vector(self, finetuned: List[float], base: List[float]) -> List[float]:
        return [f - b for f, b in zip(finetuned, base)]

    def _trim(self, vector: List[float]) -> List[float]:
        magnitudes = sorted(abs(v) for v in vector)
        threshold = magnitudes[int(len(magnitudes) * self.trim_ratio)]
        return [v if abs(v) > threshold else 0.0 for v in vector]

    def _elect_sign(self, vectors: List[List[float]]) -> List[int]:
        signs = []
        for i in range(len(vectors[0])):
            pos_sum = sum(v[i] for v in vectors if v[i] > 0)
            neg_sum = sum(v[i] for v in vectors if v[i] < 0)
            signs.append(1 if pos_sum >= abs(neg_sum) else -1)
        return signs

    def merge(self, base: Dict[str, List[float]], models: List[ModelWeight]) -> Dict[str, List[float]]:
        result = {}
        for key, base_weights in base.items():
            task_vectors = []
            for m in models:
                if key in m.weights:
                    tv = self._compute_task_vector(m.weights[key], base_weights)
                    trimmed = self._trim(tv)
                    task_vectors.append(trimmed)
            
            if task_vectors:
                signs = self._elect_sign(task_vectors)
                merged = []
                for i in range(len(base_weights)):
                    aligned = [tv[i] for tv in task_vectors if tv[i] * signs[i] > 0]
                    if aligned:
                        merged.append(base_weights[i] + sum(aligned) / len(aligned))
                    else:
                        merged.append(base_weights[i])
                result[key] = merged
            else:
                result[key] = base_weights
        
        return result


class DAREMerger:
    """DARE: Drop And REscale."""
    def __init__(self, drop_rate: float = 0.9):
        self.drop_rate = drop_rate

    def merge(self, base: Dict[str, List[float]], delta: Dict[str, List[float]]) -> Dict[str, List[float]]:
        result = {}
        scale = 1.0 / (1.0 - self.drop_rate)
        
        for key, base_weights in base.items():
            if key in delta:
                merged = []
                for i in range(len(base_weights)):
                    if random.random() > self.drop_rate:
                        merged.append(base_weights[i] + delta[key][i] * scale)
                    else:
                        merged.append(base_weights[i])
                result[key] = merged
            else:
                result[key] = base_weights
        
        return result


class SLERPMerger:
    """Spherical Linear Interpolation."""
    def interpolate(self, w1: List[float], w2: List[float], t: float) -> List[float]:
        dot = sum(a * b for a, b in zip(w1, w2))
        norm1 = math.sqrt(sum(a * a for a in w1))
        norm2 = math.sqrt(sum(b * b for b in w2))
        
        if norm1 * norm2 < 1e-8:
            return [(1 - t) * a + t * b for a, b in zip(w1, w2)]
        
        cos_theta = max(-1, min(1, dot / (norm1 * norm2)))
        theta = math.acos(cos_theta)
        
        if abs(theta) < 1e-6:
            return [(1 - t) * a + t * b for a, b in zip(w1, w2)]
        
        sin_theta = math.sin(theta)
        s1 = math.sin((1 - t) * theta) / sin_theta
        s2 = math.sin(t * theta) / sin_theta
        
        return [s1 * a + s2 * b for a, b in zip(w1, w2)]


class ModelMerger:
    """Complete model merging system."""
    def __init__(self):
        self.averager = WeightAverager()
        self.ties = TIESMerger()
        self.dare = DAREMerger()
        self.slerp = SLERPMerger()

    def merge(
        self,
        method: MergeMethod,
        models: List[ModelWeight],
        base: Optional[Dict[str, List[float]]] = None
    ) -> Dict[str, List[float]]:
        if method == MergeMethod.AVERAGE:
            return self.averager.average(models)
        elif method == MergeMethod.WEIGHTED:
            return self.averager.weighted_average(models)
        elif method == MergeMethod.TIES and base:
            return self.ties.merge(base, models)
        elif method == MergeMethod.DARE and base and len(models) == 1:
            delta = {k: [m - b for m, b in zip(models[0].weights[k], base[k])] 
                     for k in base if k in models[0].weights}
            return self.dare.merge(base, delta)
        else:
            return self.averager.average(models)
