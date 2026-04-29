import math
import random
import logging
import hashlib
from typing import List, Dict, Tuple, Optional, Any, Callable
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


# =============================================================================
# NEURAL ARCHITECTURE SEARCH (NAS) CONTROLLER
# =============================================================================

@dataclass
class ArchitectureSpec:
    """Specification for a candidate neural architecture."""
    arch_id: str
    layers: List[Dict[str, Any]]
    performance_score: float = 0.0
    param_count: int = 0
    latency_ms: float = 0.0
    
    def to_dict(self) -> Dict:
        return {
            'arch_id': self.arch_id,
            'layers': self.layers,
            'performance_score': round(self.performance_score, 6),
            'param_count': self.param_count,
            'latency_ms': round(self.latency_ms, 2)
        }


class SearchSpace:
    """
    Defines the Neural Architecture Search space.
    
    Operations available at each layer position:
    - Linear (Dense) with variable hidden units
    - Activation functions (ReLU, GELU, Swish, Tanh)
    - Skip connections (Residual)
    - Dropout rates
    - Layer normalization
    """
    
    LAYER_TYPES = ['linear', 'linear', 'linear', 'skip_connection']
    HIDDEN_UNITS = [16, 32, 64, 128, 256]
    ACTIVATIONS = ['relu', 'gelu', 'swish', 'tanh', 'leaky_relu']
    DROPOUT_RATES = [0.0, 0.1, 0.2, 0.3, 0.5]
    USE_LAYER_NORM = [True, False]
    
    @classmethod
    def sample_architecture(cls, min_layers: int = 2, max_layers: int = 6) -> List[Dict]:
        """Sample a random architecture from the search space."""
        num_layers = random.randint(min_layers, max_layers)
        layers = []
        
        for i in range(num_layers):
            layer_type = random.choice(cls.LAYER_TYPES)
            
            if layer_type == 'skip_connection':
                layers.append({
                    'type': 'skip_connection',
                    'from_layer': max(0, i - random.randint(1, 2))
                })
            else:
                layers.append({
                    'type': 'linear',
                    'hidden_units': random.choice(cls.HIDDEN_UNITS),
                    'activation': random.choice(cls.ACTIVATIONS),
                    'dropout': random.choice(cls.DROPOUT_RATES),
                    'layer_norm': random.choice(cls.USE_LAYER_NORM)
                })
        
        return layers
    
    @classmethod
    def mutate_architecture(cls, layers: List[Dict], mutation_rate: float = 0.3) -> List[Dict]:
        """Mutate an existing architecture with small perturbations."""
        mutated = []
        
        for layer in layers:
            new_layer = dict(layer)
            
            if random.random() < mutation_rate and layer['type'] == 'linear':
                # Mutate one property
                mutation_target = random.choice(['hidden_units', 'activation', 'dropout'])
                if mutation_target == 'hidden_units':
                    new_layer['hidden_units'] = random.choice(cls.HIDDEN_UNITS)
                elif mutation_target == 'activation':
                    new_layer['activation'] = random.choice(cls.ACTIVATIONS)
                elif mutation_target == 'dropout':
                    new_layer['dropout'] = random.choice(cls.DROPOUT_RATES)
            
            mutated.append(new_layer)
        
        # Chance to add or remove a layer
        if random.random() < 0.2 and len(mutated) < 6:
            mutated.append({
                'type': 'linear',
                'hidden_units': random.choice(cls.HIDDEN_UNITS),
                'activation': random.choice(cls.ACTIVATIONS),
                'dropout': random.choice(cls.DROPOUT_RATES),
                'layer_norm': random.choice(cls.USE_LAYER_NORM)
            })
        elif random.random() < 0.1 and len(mutated) > 2:
            mutated.pop(random.randint(0, len(mutated) - 1))
        
        return mutated


class EvolutionaryNASController:
    """
    Phase 59: Evolutionary Neural Architecture Search Controller.
    
    Uses a tournament-selection evolutionary algorithm to efficiently
    search the architecture space:
    
    1. Initialize a POPULATION of random architectures.
    2. EVALUATE each architecture's fitness (accuracy proxy).
    3. SELECT top performers via tournament selection.
    4. CROSSOVER pairs of high-performing architectures.
    5. MUTATE offspring to maintain diversity.
    6. Repeat for N generations.
    
    This is the same paradigm used by Google Brain's AmoebaNet and
    ENAS (Efficient Neural Architecture Search).
    """
    
    def __init__(
        self,
        population_size: int = 20,
        num_generations: int = 10,
        tournament_size: int = 5,
        mutation_rate: float = 0.3,
        elite_fraction: float = 0.1
    ):
        self.population_size = population_size
        self.num_generations = num_generations
        self.tournament_size = tournament_size
        self.mutation_rate = mutation_rate
        self.elite_count = max(1, int(population_size * elite_fraction))
        self.population: List[ArchitectureSpec] = []
        self.best_architecture: Optional[ArchitectureSpec] = None
        self.history: List[Dict] = []
    
    def _generate_arch_id(self, layers: List[Dict]) -> str:
        """Generate a unique ID for an architecture."""
        content = str(layers).encode()
        return hashlib.md5(content).hexdigest()[:12]
    
    def _estimate_param_count(self, layers: List[Dict]) -> int:
        """Estimate parameter count for an architecture."""
        params = 0
        prev_units = 8  # Input dimension
        
        for layer in layers:
            if layer['type'] == 'linear':
                units = layer['hidden_units']
                params += prev_units * units + units  # weights + bias
                if layer.get('layer_norm'):
                    params += 2 * units  # gamma + beta
                prev_units = units
        
        return params
    
    def _evaluate_fitness(self, arch: ArchitectureSpec,
                          fitness_fn: Optional[Callable] = None) -> float:
        """
        Evaluate architecture fitness. Uses a proxy function that
        estimates quality based on architectural properties.
        """
        if fitness_fn:
            return fitness_fn(arch)
        
        # Proxy fitness based on architectural heuristics
        score = 0.0
        
        linear_layers = [l for l in arch.layers if l['type'] == 'linear']
        skip_layers = [l for l in arch.layers if l['type'] == 'skip_connection']
        
        # Depth bonus (deeper = potentially more expressive)
        depth_score = min(len(linear_layers) / 4.0, 1.0) * 0.25
        
        # Skip connections help gradient flow
        skip_bonus = min(len(skip_layers) / 2.0, 1.0) * 0.15
        
        # Penalize too much dropout (regularization overkill)
        avg_dropout = sum(l.get('dropout', 0) for l in linear_layers) / max(1, len(linear_layers))
        dropout_penalty = max(0, avg_dropout - 0.3) * 0.5
        
        # Prefer GELU and Swish over plain ReLU (modern activations)
        modern_acts = sum(1 for l in linear_layers if l.get('activation') in ('gelu', 'swish'))
        activation_bonus = (modern_acts / max(1, len(linear_layers))) * 0.2
        
        # Parameter efficiency
        param_efficiency = 1.0 / (1.0 + arch.param_count / 10000.0) * 0.15
        
        # Layer norm usage
        ln_count = sum(1 for l in linear_layers if l.get('layer_norm'))
        ln_bonus = (ln_count / max(1, len(linear_layers))) * 0.1
        
        # Add noise for realism
        noise = random.gauss(0, 0.05)
        
        score = depth_score + skip_bonus - dropout_penalty + activation_bonus + param_efficiency + ln_bonus + noise
        return max(0.01, min(1.0, score))
    
    def _tournament_select(self) -> ArchitectureSpec:
        """Select an architecture via tournament selection."""
        candidates = random.sample(self.population, min(self.tournament_size, len(self.population)))
        return max(candidates, key=lambda a: a.performance_score)
    
    def _crossover(self, parent_a: ArchitectureSpec,
                   parent_b: ArchitectureSpec) -> List[Dict]:
        """Single-point crossover between two parent architectures."""
        layers_a = parent_a.layers
        layers_b = parent_b.layers
        
        min_len = min(len(layers_a), len(layers_b))
        if min_len < 2:
            return list(layers_a)
        
        cross_point = random.randint(1, min_len - 1)
        child_layers = layers_a[:cross_point] + layers_b[cross_point:]
        
        return child_layers
    
    def search(self, fitness_fn: Optional[Callable] = None) -> Dict:
        """
        Execute the full evolutionary NAS loop.
        
        Returns:
            Dict with best_architecture, search_history, and statistics.
        """
        # 1. Initialize random population
        self.population = []
        for _ in range(self.population_size):
            layers = SearchSpace.sample_architecture()
            arch_id = self._generate_arch_id(layers)
            arch = ArchitectureSpec(
                arch_id=arch_id,
                layers=layers,
                param_count=self._estimate_param_count(layers)
            )
            arch.performance_score = self._evaluate_fitness(arch, fitness_fn)
            self.population.append(arch)
        
        # 2. Evolutionary loop
        for gen in range(self.num_generations):
            # Sort by fitness
            self.population.sort(key=lambda a: a.performance_score, reverse=True)
            
            # Elite preservation
            next_gen = self.population[:self.elite_count]
            
            # Generate offspring
            while len(next_gen) < self.population_size:
                parent_a = self._tournament_select()
                parent_b = self._tournament_select()
                
                child_layers = self._crossover(parent_a, parent_b)
                child_layers = SearchSpace.mutate_architecture(child_layers, self.mutation_rate)
                
                child = ArchitectureSpec(
                    arch_id=self._generate_arch_id(child_layers),
                    layers=child_layers,
                    param_count=self._estimate_param_count(child_layers)
                )
                child.performance_score = self._evaluate_fitness(child, fitness_fn)
                next_gen.append(child)
            
            self.population = next_gen
            
            # Track best
            gen_best = max(self.population, key=lambda a: a.performance_score)
            if self.best_architecture is None or gen_best.performance_score > self.best_architecture.performance_score:
                self.best_architecture = gen_best
            
            self.history.append({
                'generation': gen,
                'best_score': round(gen_best.performance_score, 6),
                'avg_score': round(sum(a.performance_score for a in self.population) / len(self.population), 6),
                'best_params': gen_best.param_count
            })
            
            logger.info(
                "NAS Gen %d: best=%.4f, avg=%.4f, params=%d",
                gen, gen_best.performance_score,
                self.history[-1]['avg_score'], gen_best.param_count
            )
        
        return {
            'best_architecture': self.best_architecture.to_dict() if self.best_architecture else {},
            'total_architectures_evaluated': self.population_size * self.num_generations,
            'convergence_history': self.history,
            'final_population_size': len(self.population)
        }
