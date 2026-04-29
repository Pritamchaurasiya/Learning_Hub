"""
Phase 144: Mixture-of-Experts (MoE) Sparse Router

This is how models like GPT-4, Mixtral, and Switch Transformer scale to
trillions of parameters without proportional compute cost.

Architecture:
  Input → Gating Network → Top-K Expert Selection → Weighted Expert Outputs → Output

Key Insight: Only K out of N experts are activated per token, making the
compute cost O(K) instead of O(N) while maintaining O(N) model capacity.

Math:
  G(x) = TopK(Softmax(W_g · x + noise), k)
  y = Σ G(x)_i · E_i(x)  for i in TopK indices
"""
import math
import random
import logging
from typing import List, Dict, Any, Tuple
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


def softmax(logits: List[float]) -> List[float]:
    """Numerically stable softmax."""
    max_val = max(logits)
    exp_vals = [math.exp(x - max_val) for x in logits]
    total = sum(exp_vals)
    return [e / total for e in exp_vals]


class ExpertNetwork:
    """
    A single expert — a specialized feed-forward sub-network.
    Each expert learns to handle a different "type" of input
    (e.g., math questions vs. essay questions vs. code).
    """
    def __init__(self, input_dim: int, hidden_dim: int, output_dim: int, expert_id: int):
        self.expert_id = expert_id
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.output_dim = output_dim
        
        # Xavier initialization
        rng = random.Random(expert_id * 42)
        scale_1 = math.sqrt(2.0 / (input_dim + hidden_dim))
        scale_2 = math.sqrt(2.0 / (hidden_dim + output_dim))
        
        self.W1 = [[rng.gauss(0, scale_1) for _ in range(hidden_dim)] for _ in range(input_dim)]
        self.b1 = [0.0] * hidden_dim
        self.W2 = [[rng.gauss(0, scale_2) for _ in range(output_dim)] for _ in range(hidden_dim)]
        self.b2 = [0.0] * output_dim
        
        # Track how often this expert is used (for load balancing)
        self.usage_count = 0
    
    def forward(self, x: List[float]) -> List[float]:
        """Feed-forward: x → W1 → ReLU → W2 → output"""
        self.usage_count += 1
        
        # Hidden layer with ReLU
        hidden = [0.0] * self.hidden_dim
        for j in range(self.hidden_dim):
            val = self.b1[j]
            for i in range(self.input_dim):
                val += x[i] * self.W1[i][j]
            hidden[j] = max(0.0, val)  # ReLU
        
        # Output layer
        output = [0.0] * self.output_dim
        for j in range(self.output_dim):
            val = self.b2[j]
            for i in range(self.hidden_dim):
                val += hidden[i] * self.W2[i][j]
            output[j] = val
            
        return output


class GatingNetwork:
    """
    The Router / Gating Network.
    
    Learns which expert(s) should handle each input token.
    Uses a noisy top-K mechanism to ensure load balancing.
    
    Switch Transformer insight: K=1 (route to exactly 1 expert) is sufficient
    and maximally efficient. Mixtral uses K=2 for better quality.
    """
    def __init__(self, input_dim: int, num_experts: int, top_k: int = 2):
        self.input_dim = input_dim
        self.num_experts = num_experts
        self.top_k = min(top_k, num_experts)
        
        # Gating weights: maps input to expert logits
        rng = random.Random(777)
        scale = math.sqrt(2.0 / (input_dim + num_experts))
        self.W_gate = [[rng.gauss(0, scale) for _ in range(num_experts)] for _ in range(input_dim)]
        
        # Noise for load balancing (prevents expert collapse)
        self.noise_scale = 0.1
    
    def route(self, x: List[float], add_noise: bool = True) -> List[Tuple[int, float]]:
        """
        Route an input to the Top-K experts.
        
        Returns: List of (expert_index, gate_weight) tuples
        """
        # Compute raw logits
        logits = [0.0] * self.num_experts
        for j in range(self.num_experts):
            for i in range(self.input_dim):
                logits[j] += x[i] * self.W_gate[i][j]
        
        # Add noise for exploration & load balancing (training only)
        if add_noise:
            noise = [random.gauss(0, self.noise_scale) for _ in range(self.num_experts)]
            logits = [l + n for l, n in zip(logits, noise)]
        
        # Softmax over all experts
        probs = softmax(logits)
        
        # Top-K selection (sparse activation)
        indexed_probs = list(enumerate(probs))
        indexed_probs.sort(key=lambda x: x[1], reverse=True)
        top_k = indexed_probs[:self.top_k]
        
        # Re-normalize the top-K weights to sum to 1
        weight_sum = sum(w for _, w in top_k)
        normalized = [(idx, w / weight_sum) for idx, w in top_k]
        
        return normalized


class MixtureOfExperts:
    """
    Full MoE Layer — the core building block of models like Mixtral-8x7B.
    
    Architecture:
      1. Gating Network selects Top-K experts per input
      2. Each selected expert processes the input
      3. Outputs are weighted by gate probabilities and summed
    
    Load Balancing Loss:
      L_balance = N · Σ f_i · P_i
      Where f_i = fraction of tokens routed to expert i
            P_i = mean gate probability for expert i
      This loss penalizes routing all tokens to a single expert.
    """
    def __init__(self, input_dim: int = 16, hidden_dim: int = 32, output_dim: int = 16,
                 num_experts: int = 8, top_k: int = 2):
        self.num_experts = num_experts
        self.top_k = top_k
        self.input_dim = input_dim
        self.output_dim = output_dim
        
        # Create the expert pool
        self.experts = [
            ExpertNetwork(input_dim, hidden_dim, output_dim, expert_id=i)
            for i in range(num_experts)
        ]
        
        # Create the gating network
        self.gate = GatingNetwork(input_dim, num_experts, top_k)
        
        # Tracking
        self.total_tokens_processed = 0
        self.routing_history: List[List[int]] = []
    
    def forward(self, x: List[float]) -> List[float]:
        """
        Process a single token through the MoE layer.
        """
        self.total_tokens_processed += 1
        
        # 1. Route to Top-K experts
        routing = self.gate.route(x)
        self.routing_history.append([idx for idx, _ in routing])
        
        # 2. Compute weighted sum of expert outputs
        output = [0.0] * self.output_dim
        for expert_idx, gate_weight in routing:
            expert_output = self.experts[expert_idx].forward(x)
            for d in range(self.output_dim):
                output[d] += gate_weight * expert_output[d]
        
        return output
    
    def compute_load_balance_loss(self) -> float:
        """
        Auxiliary loss to encourage uniform expert utilization.
        
        L_balance = N · Σ (f_i · P_i)
        
        Where:
          f_i = fraction of tokens routed to expert i
          P_i = average gate probability assigned to expert i
        
        Perfect balance → L = 1.0
        Total collapse to 1 expert → L = N (heavily penalized)
        """
        if self.total_tokens_processed == 0:
            return 0.0
            
        fractions = [
            e.usage_count / self.total_tokens_processed
            for e in self.experts
        ]
        
        # Uniform distribution target
        uniform = 1.0 / self.num_experts
        
        # Imbalance metric
        loss = self.num_experts * sum(
            f * f for f in fractions
        )
        
        return round(loss, 4)
    
    def get_expert_utilization(self) -> Dict[str, Any]:
        """Report which experts are being used and how evenly."""
        total = max(1, self.total_tokens_processed)
        utilization = {
            f"expert_{i}": {
                "usage_count": e.usage_count,
                "usage_fraction": round(e.usage_count / total, 3)
            }
            for i, e in enumerate(self.experts)
        }
        return utilization
    
    def run_simulation(self, num_tokens: int = 100) -> Dict[str, Any]:
        """Run a full MoE simulation and return analytics."""
        # Generate diverse token embeddings
        for _ in range(num_tokens):
            token = [random.gauss(0, 1) for _ in range(self.input_dim)]
            self.forward(token)
        
        return {
            "architecture": f"MoE-{self.num_experts}x{self.experts[0].hidden_dim} (Top-{self.top_k})",
            "total_tokens": self.total_tokens_processed,
            "load_balance_loss": self.compute_load_balance_loss(),
            "expert_utilization": self.get_expert_utilization(),
            "active_params_per_token": f"{self.top_k}/{self.num_experts} experts ({round(100*self.top_k/self.num_experts)}%)",
            "insight": "Only a fraction of parameters are active per token, yielding O(K) compute with O(N) capacity."
        }


def run_moe_experiment() -> Dict[str, Any]:
    """Execution helper for ML pipeline."""
    moe = MixtureOfExperts(input_dim=16, hidden_dim=32, output_dim=16, num_experts=8, top_k=2)
    return moe.run_simulation(num_tokens=200)
