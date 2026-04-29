"""
Mechanistic Interpretability

Understanding neural network internals:
1. Activation patching.
2. Feature attribution.
3. Circuit discovery.
"""

import logging
import random
import math
from typing import List, Dict, Tuple, Optional, Callable
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class Activation:
    layer: int
    neuron: int
    value: float


class SimpleMLPForInterpretability:
    """Simple MLP with hooks for interpretability."""
    def __init__(self, layer_dims: List[int]):
        self.layers = []
        self.activations: Dict[int, List[float]] = {}
        
        for i in range(len(layer_dims) - 1):
            layer = {
                'W': [[random.gauss(0, 0.1) for _ in range(layer_dims[i])] for _ in range(layer_dims[i+1])],
                'b': [0.0] * layer_dims[i+1]
            }
            self.layers.append(layer)

    def forward(self, x: List[float], store_activations: bool = True) -> List[float]:
        """Forward pass with activation caching."""
        self.activations = {}
        current = x
        
        for i, layer in enumerate(self.layers):
            new_current = []
            for j in range(len(layer['b'])):
                val = sum(layer['W'][j][k] * current[k] for k in range(len(current))) + layer['b'][j]
                # ReLU for hidden layers
                if i < len(self.layers) - 1:
                    val = max(0, val)
                new_current.append(val)
            
            if store_activations:
                self.activations[i] = new_current.copy()
            current = new_current
        
        return current


class ActivationPatching:
    """
    Activation patching for causal tracing.
    Measures effect of swapping activations between clean and corrupted runs.
    """
    def __init__(self, model: SimpleMLPForInterpretability):
        self.model = model

    def patch_and_run(self, clean_input: List[float], corrupted_input: List[float], 
                      patch_layer: int, patch_neuron: int) -> List[float]:
        """
        Run with patched activation:
        1. Get clean activations
        2. Get corrupted activations
        3. Replace corrupted[layer][neuron] with clean value
        4. Continue forward pass
        """
        # Clean run
        clean_output = self.model.forward(clean_input)
        clean_activations = {k: v.copy() for k, v in self.model.activations.items()}
        
        # Corrupted run up to patch layer
        current = corrupted_input
        for i, layer in enumerate(self.model.layers):
            new_current = []
            for j in range(len(layer['b'])):
                val = sum(layer['W'][j][k] * current[k] for k in range(len(current))) + layer['b'][j]
                if i < len(self.model.layers) - 1:
                    val = max(0, val)
                new_current.append(val)
            
            # Apply patch
            if i == patch_layer and patch_neuron < len(new_current):
                new_current[patch_neuron] = clean_activations[i][patch_neuron]
            
            current = new_current
        
        return current

    def causal_trace(self, clean_input: List[float], corrupted_input: List[float]) -> Dict[Tuple[int, int], float]:
        """
        Trace causal importance of each neuron.
        Returns dict of (layer, neuron) -> importance score.
        """
        clean_output = self.model.forward(clean_input)
        corrupted_output = self.model.forward(corrupted_input)
        
        baseline_diff = sum((c - r)**2 for c, r in zip(clean_output, corrupted_output))
        
        importance = {}
        
        for layer_idx in range(len(self.model.layers)):
            layer_size = len(self.model.layers[layer_idx]['b'])
            for neuron_idx in range(layer_size):
                patched_output = self.patch_and_run(
                    clean_input, corrupted_input, layer_idx, neuron_idx
                )
                
                patched_diff = sum((c - p)**2 for c, p in zip(clean_output, patched_output))
                recovery = baseline_diff - patched_diff
                importance[(layer_idx, neuron_idx)] = recovery / (baseline_diff + 1e-8)
        
        return importance


class FeatureAttribution:
    """Attribution methods for feature importance."""
    
    @staticmethod
    def gradient_input(model: SimpleMLPForInterpretability, x: List[float]) -> List[float]:
        """
        Gradient × Input attribution.
        Approximates with finite differences.
        """
        eps = 1e-4
        output = model.forward(x)
        baseline = sum(output)
        
        attributions = []
        for i in range(len(x)):
            x_plus = x.copy()
            x_plus[i] += eps
            output_plus = model.forward(x_plus)
            grad = (sum(output_plus) - baseline) / eps
            attributions.append(grad * x[i])
        
        return attributions

    @staticmethod
    def integrated_gradients(model: SimpleMLPForInterpretability, x: List[float], 
                            baseline: Optional[List[float]] = None, steps: int = 50) -> List[float]:
        """
        Integrated Gradients attribution.
        """
        if baseline is None:
            baseline = [0.0] * len(x)
        
        eps = 1e-4
        attributions = [0.0] * len(x)
        
        for step in range(steps):
            alpha = step / steps
            interpolated = [b + alpha * (xi - b) for xi, b in zip(x, baseline)]
            
            output_base = model.forward(interpolated)
            
            for i in range(len(x)):
                x_plus = interpolated.copy()
                x_plus[i] += eps
                output_plus = model.forward(x_plus)
                grad = (sum(output_plus) - sum(output_base)) / eps
                attributions[i] += grad * (x[i] - baseline[i]) / steps
        
        return attributions


class CircuitDiscovery:
    """Discover computational circuits in neural networks."""
    def __init__(self, model: SimpleMLPForInterpretability):
        self.model = model
        self.patching = ActivationPatching(model)

    def find_important_neurons(self, test_inputs: List[List[float]], 
                                threshold: float = 0.1) -> List[Tuple[int, int, float]]:
        """Find neurons that are causally important across test cases."""
        neuron_scores = {}
        
        for x in test_inputs:
            # Create corrupted version
            corrupted = [xi + random.gauss(0, 0.5) for xi in x]
            
            importance = self.patching.causal_trace(x, corrupted)
            
            for key, score in importance.items():
                if key not in neuron_scores:
                    neuron_scores[key] = []
                neuron_scores[key].append(score)
        
        # Average scores
        important = []
        for (layer, neuron), scores in neuron_scores.items():
            avg_score = sum(scores) / len(scores)
            if avg_score > threshold:
                important.append((layer, neuron, avg_score))
        
        return sorted(important, key=lambda x: -x[2])

    def trace_circuit(self, input_neurons: List[int], 
                      output_neurons: List[int]) -> Dict[str, List]:
        """
        Trace computational circuit from inputs to outputs.
        """
        circuit = {
            'input_neurons': input_neurons,
            'output_neurons': output_neurons,
            'intermediate_nodes': [],
            'edges': []
        }
        
        # Find paths through network
        for layer_idx, layer in enumerate(self.model.layers):
            for out_idx in range(len(layer['b'])):
                # Find strong connections
                for in_idx in range(len(layer['W'][out_idx])):
                    weight = abs(layer['W'][out_idx][in_idx])
                    if weight > 0.3:  # Threshold
                        circuit['edges'].append({
                            'from_layer': layer_idx - 1 if layer_idx > 0 else 'input',
                            'from_neuron': in_idx,
                            'to_layer': layer_idx,
                            'to_neuron': out_idx,
                            'weight': weight
                        })
        
        return circuit
