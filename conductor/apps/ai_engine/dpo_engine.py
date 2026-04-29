"""
Phase 161: Direct Preference Optimization (DPO)
A robust, mathematical alternative to PPO for RLHF.
Instead of training a separate reward model and using unstable RL,
DPO defines a loss function that works directly on the language model's policy 
using binary preferences (chosen vs. rejected).

Loss: -log σ( β * log( π_theta(y_w|x)/π_ref(y_w|x) ) - β * log( π_theta(y_l|x)/π_ref(y_l|x) ) )
"""
import math
import random
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class DPOEngine:
    def __init__(self, beta: float = 0.1, seed: int = 42):
        self.beta = beta  # KL control penalty parameter
        self.rng = random.Random(seed)
        
    def _simulated_log_prob(self, is_chosen: bool, adaptation_step: int) -> float:
        """Simulate log probability of a token sequence given the policy."""
        # As adaptation progresses, the policy assigns higher probability to chosen, lower to rejected
        base_lp = -15.0
        shift = (adaptation_step * 0.5) if is_chosen else -(adaptation_step * 0.5)
        # Add noise
        noise = self.rng.gauss(0, 1.0)
        return base_lp + shift + noise

    def compute_dpo_loss(self, pi_theta_w: float, pi_ref_w: float, pi_theta_l: float, pi_ref_l: float) -> float:
        """
        Compute Direct Preference Optimization Loss.
        w = winning (chosen) response
        l = losing (rejected) response
        """
        # Implicit reward of chosen response
        r_w = self.beta * (pi_theta_w - pi_ref_w)
        # Implicit reward of rejected response
        r_l = self.beta * (pi_theta_l - pi_ref_l)
        
        # Log sigmoid of the difference
        # -log(sigmoid(r_w - r_l))
        diff = r_w - r_l
        
        # Sigmoid: 1 / (1 + exp(-diff))
        # -log(sigmoid) = log(1 + exp(-diff))
        # Using softplus for stability: softplus(-diff)
        loss = math.log(1 + math.exp(-diff))
        return loss

    def train_step(self, step: int) -> Dict[str, float]:
        """Simulate one step of DPO training."""
        # Simulated log probabilities
        pi_ref_w = self._simulated_log_prob(True, 0) # Reference model doesn't adapt
        pi_ref_l = self._simulated_log_prob(False, 0)
        
        pi_theta_w = self._simulated_log_prob(True, step) # Active policy adapts
        pi_theta_l = self._simulated_log_prob(False, step)
        
        loss = self.compute_dpo_loss(pi_theta_w, pi_ref_w, pi_theta_l, pi_ref_l)
        
        implicit_reward_margin = self.beta * ((pi_theta_w - pi_ref_w) - (pi_theta_l - pi_ref_l))
        
        return {
            "step": step,
            "loss": loss,
            "implicit_reward_margin": implicit_reward_margin,
            "chosen_logprob_shift": pi_theta_w - pi_ref_w,
            "rejected_logprob_shift": pi_theta_l - pi_ref_l
        }

def run_dpo_experiment() -> Dict[str, Any]:
    engine = DPOEngine(beta=0.1)
    
    # Simulate a mini training trajectory
    trajectory = []
    for step in range(1, 6):
        res = engine.train_step(step)
        trajectory.append({
            "step": step,
            "loss": round(res["loss"], 4),
            "margin": round(res["implicit_reward_margin"], 4)
        })
        
    final_stats = trajectory[-1]
    
    return {
        "paradigm": "Direct Preference Optimization (DPO)",
        "beta_parameter": engine.beta,
        "training_trajectory": trajectory,
        "final_loss": final_stats["loss"],
        "final_margin": final_stats["margin"],
        "insight": "DPO aligns language models to human preferences directly via binary cross-entropy, completely bypassing the unstable, computationally expensive PPO reinforcement learning loop."
    }
