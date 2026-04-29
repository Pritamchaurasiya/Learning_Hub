"""
Neural Architecture Search (NAS) Module (Phase 27).
Automated discovery of optimal neural network architectures.
"""
import logging
import random
import math
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


class LayerType(Enum):
    """Types of neural network layers."""
    DENSE = "dense"
    CONV2D = "conv2d"
    LSTM = "lstm"
    ATTENTION = "attention"
    DROPOUT = "dropout"
    BATCHNORM = "batchnorm"
    POOLING = "pooling"


@dataclass
class LayerConfig:
    """Configuration for a single layer."""
    layer_type: LayerType
    units: int = 64
    activation: str = "relu"
    kernel_size: int = 3
    dropout_rate: float = 0.2
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.layer_type.value,
            "units": self.units,
            "activation": self.activation,
            "kernel_size": self.kernel_size,
            "dropout_rate": self.dropout_rate
        }


@dataclass
class Architecture:
    """A neural network architecture."""
    id: str
    layers: List[LayerConfig]
    fitness: float = 0.0
    params_count: int = 0
    
    def __post_init__(self):
        self._estimate_params()
    
    def _estimate_params(self):
        """Estimate parameter count."""
        total = 0
        prev_units = 784  # Assume MNIST-like input
        
        for layer in self.layers:
            if layer.layer_type in [LayerType.DENSE, LayerType.LSTM]:
                total += prev_units * layer.units + layer.units
                prev_units = layer.units
            elif layer.layer_type == LayerType.CONV2D:
                total += layer.kernel_size * layer.kernel_size * prev_units * layer.units
                prev_units = layer.units
            elif layer.layer_type == LayerType.ATTENTION:
                total += 3 * prev_units * layer.units  # Q, K, V projections
        
        self.params_count = total


class SearchSpace:
    """Define the neural architecture search space."""
    
    def __init__(self):
        self.layer_types = [LayerType.DENSE, LayerType.CONV2D, LayerType.LSTM, LayerType.ATTENTION]
        self.unit_options = [32, 64, 128, 256, 512]
        self.activations = ["relu", "tanh", "gelu", "swish"]
        self.min_layers = 2
        self.max_layers = 8
    
    def random_layer(self) -> LayerConfig:
        """Generate a random layer configuration."""
        layer_type = random.choice(self.layer_types)
        return LayerConfig(
            layer_type=layer_type,
            units=random.choice(self.unit_options),
            activation=random.choice(self.activations),
            kernel_size=random.choice([3, 5, 7]) if layer_type == LayerType.CONV2D else 3,
            dropout_rate=random.uniform(0.1, 0.5)
        )
    
    def random_architecture(self, arch_id: str) -> Architecture:
        """Generate a random architecture."""
        n_layers = random.randint(self.min_layers, self.max_layers)
        layers = [self.random_layer() for _ in range(n_layers)]
        return Architecture(id=arch_id, layers=layers)


class FitnessEvaluator:
    """Evaluate architecture fitness (simulated)."""
    
    def __init__(self, task_type: str = "classification"):
        self.task_type = task_type
        self.eval_cache: Dict[str, float] = {}
    
    def evaluate(self, arch: Architecture) -> float:
        """
        Evaluate architecture fitness.
        In real NAS, this would train and validate the model.
        Here we simulate based on architecture properties.
        """
        cache_key = self._arch_hash(arch)
        if cache_key in self.eval_cache:
            return self.eval_cache[cache_key]
        
        # Heuristic fitness based on architecture properties
        fitness = 0.5
        
        # Reward moderate depth
        depth = len(arch.layers)
        fitness += 0.1 * (1 - abs(depth - 5) / 5)
        
        # Reward diversity of layer types
        unique_types = len(set(l.layer_type for l in arch.layers))
        fitness += 0.1 * (unique_types / len(LayerType))
        
        # Penalize excessive parameters
        if arch.params_count > 1000000:
            fitness -= 0.1
        elif arch.params_count < 100000:
            fitness += 0.05
        
        # Reward attention layers for sequence tasks
        has_attention = any(l.layer_type == LayerType.ATTENTION for l in arch.layers)
        if has_attention:
            fitness += 0.1
        
        # Add noise to simulate training variance
        fitness += random.gauss(0, 0.05)
        fitness = max(0.1, min(0.99, fitness))
        
        arch.fitness = fitness
        self.eval_cache[cache_key] = fitness
        return fitness
    
    def _arch_hash(self, arch: Architecture) -> str:
        """Create hash for architecture caching."""
        return str([l.to_dict() for l in arch.layers])


class EvolutionaryNAS:
    """Evolutionary Neural Architecture Search."""
    
    def __init__(
        self,
        population_size: int = 20,
        generations: int = 10,
        mutation_rate: float = 0.3,
        crossover_rate: float = 0.5
    ):
        self.population_size = population_size
        self.generations = generations
        self.mutation_rate = mutation_rate
        self.crossover_rate = crossover_rate
        
        self.search_space = SearchSpace()
        self.evaluator = FitnessEvaluator()
        self.population: List[Architecture] = []
        self.best_architecture: Optional[Architecture] = None
        self.history: List[Dict[str, Any]] = []
    
    def _initialize_population(self):
        """Create initial random population."""
        self.population = [
            self.search_space.random_architecture(f"arch_{i}")
            for i in range(self.population_size)
        ]
    
    def _evaluate_population(self):
        """Evaluate fitness of all architectures."""
        for arch in self.population:
            self.evaluator.evaluate(arch)
    
    def _select_parents(self, n: int) -> List[Architecture]:
        """Tournament selection."""
        parents = []
        for _ in range(n):
            tournament = random.sample(self.population, min(3, len(self.population)))
            winner = max(tournament, key=lambda a: a.fitness)
            parents.append(winner)
        return parents
    
    def _crossover(self, parent1: Architecture, parent2: Architecture) -> Architecture:
        """Create offspring by combining parents."""
        # Single-point crossover
        point = random.randint(1, min(len(parent1.layers), len(parent2.layers)) - 1)
        new_layers = parent1.layers[:point] + parent2.layers[point:]
        
        return Architecture(
            id=f"arch_{random.randint(1000, 9999)}",
            layers=new_layers
        )
    
    def _mutate(self, arch: Architecture) -> Architecture:
        """Mutate an architecture."""
        new_layers = arch.layers.copy()
        
        mutation_type = random.choice(["add", "remove", "modify"])
        
        if mutation_type == "add" and len(new_layers) < self.search_space.max_layers:
            pos = random.randint(0, len(new_layers))
            new_layers.insert(pos, self.search_space.random_layer())
        
        elif mutation_type == "remove" and len(new_layers) > self.search_space.min_layers:
            pos = random.randint(0, len(new_layers) - 1)
            new_layers.pop(pos)
        
        elif mutation_type == "modify" and new_layers:
            pos = random.randint(0, len(new_layers) - 1)
            new_layers[pos] = self.search_space.random_layer()
        
        return Architecture(
            id=f"arch_{random.randint(1000, 9999)}",
            layers=new_layers
        )
    
    def search(self) -> Dict[str, Any]:
        """Run the NAS algorithm."""
        self._initialize_population()
        
        for gen in range(self.generations):
            self._evaluate_population()
            
            # Track best
            best_in_gen = max(self.population, key=lambda a: a.fitness)
            if not self.best_architecture or best_in_gen.fitness > self.best_architecture.fitness:
                self.best_architecture = best_in_gen
            
            avg_fitness = sum(a.fitness for a in self.population) / len(self.population)
            self.history.append({
                "generation": gen,
                "best_fitness": best_in_gen.fitness,
                "avg_fitness": avg_fitness,
                "best_params": best_in_gen.params_count
            })
            
            logger.debug(f"Gen {gen}: Best={best_in_gen.fitness:.4f}, Avg={avg_fitness:.4f}")
            
            # Create next generation
            new_population = []
            
            # Elitism: keep top 10%
            sorted_pop = sorted(self.population, key=lambda a: a.fitness, reverse=True)
            elites = sorted_pop[:max(2, self.population_size // 10)]
            new_population.extend(elites)
            
            # Fill rest with offspring
            while len(new_population) < self.population_size:
                if random.random() < self.crossover_rate:
                    parents = self._select_parents(2)
                    child = self._crossover(parents[0], parents[1])
                else:
                    child = self._select_parents(1)[0]
                
                if random.random() < self.mutation_rate:
                    child = self._mutate(child)
                
                new_population.append(child)
            
            self.population = new_population[:self.population_size]
        
        # Final evaluation
        self._evaluate_population()
        self.best_architecture = max(self.population, key=lambda a: a.fitness)
        
        return {
            "best_architecture": self._arch_to_dict(self.best_architecture),
            "best_fitness": self.best_architecture.fitness,
            "generations": self.generations,
            "history": self.history
        }
    
    def _arch_to_dict(self, arch: Architecture) -> Dict[str, Any]:
        """Convert architecture to dictionary."""
        return {
            "id": arch.id,
            "layers": [l.to_dict() for l in arch.layers],
            "params_count": arch.params_count,
            "fitness": arch.fitness
        }


class DifferentiableNAS:
    """
    DARTS-style Differentiable Architecture Search.
    Uses continuous relaxation for gradient-based search.
    """
    
    def __init__(self, n_cells: int = 4, n_operations: int = 5):
        self.n_cells = n_cells
        self.n_operations = n_operations
        
        # Architecture weights (continuous)
        self.alpha = [[random.random() for _ in range(n_operations)] 
                     for _ in range(n_cells)]
        
        self.operations = ["conv3x3", "conv5x5", "maxpool", "avgpool", "identity"]
    
    def _softmax(self, weights: List[float]) -> List[float]:
        """Compute softmax probabilities."""
        max_w = max(weights)
        exp_w = [math.exp(w - max_w) for w in weights]
        total = sum(exp_w)
        return [e / total for e in exp_w]
    
    def _sample_architecture(self) -> List[str]:
        """Sample discrete architecture from continuous weights."""
        arch = []
        for cell_weights in self.alpha:
            probs = self._softmax(cell_weights)
            op_idx = random.choices(range(len(self.operations)), weights=probs)[0]
            arch.append(self.operations[op_idx])
        return arch
    
    def search(self, n_iterations: int = 50) -> Dict[str, Any]:
        """Run differentiable search."""
        lr = 0.1
        history = []
        
        for iteration in range(n_iterations):
            # Sample architecture
            arch = self._sample_architecture()
            
            # Simulate validation loss (lower is better)
            complexity = sum(1 for op in arch if "conv" in op)
            loss = 0.5 + 0.1 * complexity + random.gauss(0, 0.05)
            
            # Update alpha based on "gradient"
            for i, op in enumerate(arch):
                op_idx = self.operations.index(op)
                # Increase weight for good operations (low loss)
                gradient = -loss * 0.1
                self.alpha[i][op_idx] += lr * gradient
            
            history.append({"iteration": iteration, "loss": loss, "architecture": arch})
        
        # Get final architecture
        final_arch = []
        for cell_weights in self.alpha:
            probs = self._softmax(cell_weights)
            best_idx = probs.index(max(probs))
            final_arch.append(self.operations[best_idx])
        
        return {
            "final_architecture": final_arch,
            "n_cells": self.n_cells,
            "search_iterations": n_iterations,
            "final_loss": history[-1]["loss"] if history else None
        }


def run_nas_experiment(pop_size: int = 15, generations: int = 10) -> Dict[str, Any]:
    """Run NAS experiment comparing methods."""
    print("=== Neural Architecture Search ===")
    
    # Evolutionary NAS
    print("\n1. Evolutionary NAS...")
    evo_nas = EvolutionaryNAS(population_size=pop_size, generations=generations)
    evo_result = evo_nas.search()
    
    print(f"   Best fitness: {evo_result['best_fitness']:.4f}")
    print(f"   Layers: {len(evo_result['best_architecture']['layers'])}")
    print(f"   Params: {evo_result['best_architecture']['params_count']:,}")
    
    # Differentiable NAS
    print("\n2. Differentiable NAS (DARTS-style)...")
    diff_nas = DifferentiableNAS(n_cells=4)
    diff_result = diff_nas.search(n_iterations=30)
    
    print(f"   Architecture: {diff_result['final_architecture']}")
    print(f"   Final loss: {diff_result['final_loss']:.4f}")
    
    return {
        "evolutionary": evo_result,
        "differentiable": diff_result
    }
