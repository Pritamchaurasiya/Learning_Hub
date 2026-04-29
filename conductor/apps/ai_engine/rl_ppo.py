"""
Proximal Policy Optimization (PPO) Engine (Phase 106).
Simulates an Actor-Critic architecture with clipped surrogate objective for stable RL.
"""
import random
import math
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


class PPOEngine:
    """
    Simulates a PPO training step.
    PPO improves upon standard Policy Gradients by preventing excessively large 
    policy updates through a clipped probability ratio.
    """
    def __init__(self, state_dim: int = 4, action_dim: int = 2):
        self.state_dim = state_dim
        self.action_dim = action_dim
        
        # Actor Network (Policy)
        self.W_actor = [[random.gauss(0, 0.1) for _ in range(state_dim)] for _ in range(action_dim)]
        
        # Critic Network (Value Function)
        self.W_critic = [random.gauss(0, 0.1) for _ in range(state_dim)]
        
        self.epsilon = 0.2     # Clipping parameter
        self.gamma = 0.99      # Discount factor
        self.lam = 0.95        # GAE lambda
        
    def _dot(self, v1: List[float], v2: List[float]) -> float:
        return sum(x * y for x, y in zip(v1, v2))
        
    def _softmax(self, logits: List[float]) -> List[float]:
        max_l = max(logits)
        exps = [math.exp(l - max_l) for l in logits]
        sum_e = sum(exps)
        return [e / sum_e for e in exps]
        
    def get_action_probs(self, state: List[float]) -> List[float]:
        logits = [self._dot(row, state) for row in self.W_actor]
        return self._softmax(logits)
        
    def get_value(self, state: List[float]) -> float:
        return self._dot(self.W_critic, state)

    def simulate_training_step(self, num_steps: int = 10) -> Dict[str, Any]:
        """
        Simulates gathering trajectories and computing the Clipped Objective.
        """
        # 1. Gather simulated trajectory
        states = [[random.uniform(-1, 1) for _ in range(self.state_dim)] for _ in range(num_steps)]
        actions = []
        old_probs = []
        rewards = []
        values = []
        
        for s in states:
            probs = self.get_action_probs(s)
            val = self.get_value(s)
            
            # Sample action
            r = random.random()
            if r < probs[0]:
                act = 0
            else:
                act = 1
                
            actions.append(act)
            old_probs.append(probs[act])
            values.append(val)
            
            # Simulated reward function (e.g. cartpole balancing)
            reward = 1.0 if abs(s[0]) < 0.5 else -1.0
            rewards.append(reward)
            
        # 2. Compute Generalized Advantage Estimation (GAE)
        advantages = [0.0] * num_steps
        returns = [0.0] * num_steps
        gae = 0.0
        
        # Next value is 0 for terminal
        next_val = 0.0 
        
        for t in reversed(range(num_steps)):
            delta = rewards[t] + self.gamma * next_val - values[t]
            gae = delta + self.gamma * self.lam * gae
            advantages[t] = gae
            returns[t] = advantages[t] + values[t]
            next_val = values[t]
            
        # Normalize advantages
        adv_mean = sum(advantages) / num_steps
        adv_var = sum((a - adv_mean)**2 for a in advantages) / num_steps
        adv_std = math.sqrt(adv_var) + 1e-8
        advantages = [(a - adv_mean) / adv_std for a in advantages]
        
        # 3. Compute Simulated Clipped Surrogate Objective
        clipped_losses = []
        for t in range(num_steps):
            # Simulate a new policy that shifted slightly
            new_prob = old_probs[t] * random.uniform(0.9, 1.1) 
            
            # Ratio pi_theta / pi_theta_old
            ratio = new_prob / (old_probs[t] + 1e-8)
            
            surr1 = ratio * advantages[t]
            surr2 = max(1.0 - self.epsilon, min(1.0 + self.epsilon, ratio)) * advantages[t]
            
            # Policy objective is to MAXIMIZE surrogate, so loss is negative
            loss = -min(surr1, surr2)
            clipped_losses.append(loss)
            
        avg_loss = sum(clipped_losses) / num_steps
        
        # 4. Simulate Critic Loss (MSE)
        critic_loss = sum((returns[t] - values[t])**2 for t in range(num_steps)) / num_steps
        
        return {
            "trajectory_steps": num_steps,
            "average_advantage": round(adv_mean, 4),
            "simulated_policy_loss": round(avg_loss, 4),
            "simulated_value_loss": round(critic_loss, 4),
            "mechanics": "Actor-Critic architecture with Clipped Surrogate Objective and Generalized Advantage Estimation (GAE)."
        }
