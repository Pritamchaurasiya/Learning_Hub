"""
Phase 166: Energy-Based Models (Modern Continuous Hopfield Networks)
Dense associative memory models that define an energy surface over states.
Modern Hopfield Networks (Dense Associative Memory) have been proven 
to be mathematically equivalent to the Attention mechanism in Transformers!
"""
import math
import random
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class ContinuousHopfieldNetwork:
    """A modern Hopfield Network with continuous states.
    Energy E(x) = -log_sum_exp(beta * x^T W) + 0.5 * ||x||^2
    """
    def __init__(self, state_dim: int = 8, num_patterns: int = 4, beta: float = 1.0, seed: int = 42):
        self.state_dim = state_dim
        self.rng = random.Random(seed)
        self.beta = beta # Inverse temperature (softmax sharpness)
        
        # Stored memory patterns (the "Keys" and "Values" in attention terms)
        self.memory_patterns = []
        for _ in range(num_patterns):
            # Random bipolar-like floats
            pattern = [self.rng.uniform(-1.0, 1.0) for _ in range(state_dim)]
            # Normalize pattern
            norm = math.sqrt(sum(p**2 for p in pattern))
            self.memory_patterns.append([p/norm for p in pattern])

    def retrieve(self, query: List[float]) -> List[float]:
        """
        One step of state update: x^{next} = X * softmax(beta * X^T * x)
        X is the matrix of memory patterns.
        """
        # 1. Compute dot products (similarity/energy) between query and all patterns
        # This is strictly equivalent to Query * Key^T
        dots = []
        for pattern in self.memory_patterns:
            dot = sum(q * p for q, p in zip(query, pattern))
            dots.append(dot)
            
        # 2. Softmax (The Softmin part of the Energy derivative)
        max_dot = max(dots) # numerical stability
        exps = [math.exp(self.beta * (d - max_dot)) for d in dots]
        sum_exps = sum(exps)
        softmax_weights = [e / sum_exps for e in exps]
        
        # 3. Retrieve (Weighted sum of patterns)
        # This is strictly equivalent to Attention_Weights * Value
        retrieved_state = [0.0] * self.state_dim
        for i, weight in enumerate(softmax_weights):
            for d in range(self.state_dim):
                retrieved_state[d] += weight * self.memory_patterns[i][d]
                
        return retrieved_state, softmax_weights

def run_hopfield_experiment() -> Dict[str, Any]:
    net = ContinuousHopfieldNetwork(state_dim=8, num_patterns=3, beta=5.0)
    
    # Take a corrupted version of pattern 0
    target_pattern = net.memory_patterns[0]
    corrupted_query = [p + random.gauss(0, 0.3) for p in target_pattern]
    
    # Retrieve
    retrieved, attention_weights = net.retrieve(corrupted_query)
    
    # Verify distance to target vs corrupted
    dist_corrupted = math.sqrt(sum((t - c)**2 for t, c in zip(target_pattern, corrupted_query)))
    dist_retrieved = math.sqrt(sum((t - r)**2 for t, r in zip(target_pattern, retrieved)))
    
    return {
        "paradigm": "Energy-Based Models (Continuous Hopfield)",
        "memory_capacity": len(net.memory_patterns),
        "state_dimensions": net.state_dim,
        "corruption_distance": round(dist_corrupted, 4),
        "retrieval_distance": round(dist_retrieved, 4),
        "attention_weights": [round(w, 4) for w in attention_weights],
        "insight": "Modern Continuous Hopfield networks define an energy landscape where deep valleys correspond to stored memories. They possess dense associative memory (exponential capacity). A stunning 2021 mathematical proof showed they are exactly the Attention mechanism driving Transformers."
    }
