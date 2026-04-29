"""
Preference Learning (RLHF / DPO)

Human feedback alignment:
1. Reward modeling from preferences (Bradley-Terry model).
2. PPO-style training simulation.
3. Direct Preference Optimization (DPO).

Note: This module provides the architectural components for preference learning.
In a production setting, this would wrap HuggingFace TRL or similar libraries.
Here we implement the core logic from scratch for educational/architectural demonstration.
"""

import logging
import random
import json
import os
import math
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, asdict
from django.conf import settings
from apps.ai_engine.ai_client import AIClient

logger = logging.getLogger(__name__)


@dataclass
class PreferencePair:
    prompt: str
    chosen: str
    rejected: str
    metadata: Dict = None


class RewardModel:
    """Reward model trained on human preferences."""
    def __init__(self, input_dim: int = 384, hidden_dim: int = 64, model_path: str = "reward_model.json"):
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.model_path = os.path.join(settings.BASE_DIR, "data", model_path)
        
        # Simple MLP weights (mock initialization, replacing random gaussian to be deterministic/loadable)
        self.W1 = [[0.01 for _ in range(input_dim)] for _ in range(hidden_dim)]
        self.W2 = [0.01 for _ in range(hidden_dim)]
        self.lr = 0.01
        
        self.load()

    def forward(self, x: List[float]) -> float:
        """Compute reward score."""
        if not x: return 0.0
        
        hidden = []
        for i in range(self.hidden_dim):
            h = sum(self.W1[i][j] * x[j] for j in range(len(x)))
            hidden.append(math.tanh(h))
        
        reward = sum(self.W2[i] * hidden[i] for i in range(self.hidden_dim))
        return reward

    def preference_loss(self, chosen_reward: float, rejected_reward: float) -> float:
        """
        Bradley-Terry loss: -log(sigmoid(r_chosen - r_rejected))
        """
        diff = chosen_reward - rejected_reward
        try:
            prob = 1 / (1 + math.exp(-diff))
        except OverflowError:
            prob = 1.0 if diff > 0 else 0.0 
            
        return -math.log(prob + 1e-10)

    def train_step(self, chosen_embedding: List[float], rejected_embedding: List[float]) -> float:
        """Single training step on preference pair."""
        r_chosen = self.forward(chosen_embedding)
        r_rejected = self.forward(rejected_embedding)
        loss = self.preference_loss(r_chosen, r_rejected)
        
        # Simple Gradient Descent (Manual for demonstration)
        # dL/diff = - (1 - sigmoid(diff))
        try:
            sigmoid = 1 / (1 + math.exp(-(r_chosen - r_rejected)))
        except OverflowError:
            sigmoid = 1.0 if (r_chosen - r_rejected) > 0 else 0.0
            
        grad_diff = -(1 - sigmoid)
        
        # Update weights ( Simplified backprop for W2 only)
        # dL/dW2 = dL/diff * (h_chosen - h_rejected)
        # h calculation repeated (inefficient but clear)
        h_chosen = [math.tanh(sum(self.W1[i][j] * chosen_embedding[j] for j in range(len(chosen_embedding)))) for i in range(self.hidden_dim)]
        h_rejected = [math.tanh(sum(self.W1[i][j] * rejected_embedding[j] for j in range(len(rejected_embedding)))) for i in range(self.hidden_dim)]
        
        for i in range(self.hidden_dim):
            grad_w2 = grad_diff * (h_chosen[i] - h_rejected[i])
            self.W2[i] -= self.lr * grad_w2
            
        return loss

    def save(self):
        """Save model weights."""
        data = {
            "W1": self.W1,
            "W2": self.W2,
            "config": {"input_dim": self.input_dim, "hidden_dim": self.hidden_dim}
        }
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        try:
            with open(self.model_path, 'w') as f:
                json.dump(data, f)
        except Exception as e:
            logger.error(f"Failed to save reward model: {e}")

    def load(self):
        """Load model weights."""
        if not os.path.exists(self.model_path):
            return
        try:
            with open(self.model_path, 'r') as f:
                data = json.load(f)
                self.W1 = data["W1"]
                self.W2 = data["W2"]
        except Exception as e:
            logger.error(f"Failed to load reward model: {e}")


class DirectPreferenceOptimization:
    """
    DPO: Direct Preference Optimization.
    Bypasses reward modeling by directly optimizing on preferences.
    """
    def __init__(self, dim: int = 384, beta: float = 0.1, model_path: str = "dpo_policy.json"):
        self.dim = dim
        self.beta = beta
        self.model_path = os.path.join(settings.BASE_DIR, "data", model_path)
        
        # Linear policy for demonstration (maps embedding to logit score)
        self.policy = [0.0 for _ in range(dim)]
        self.ref_policy = [0.0 for _ in range(dim)] # Initial/Frozen reference
        self.lr = 0.001
        
        self._ensure_data_dir()

    def _ensure_data_dir(self):
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)

    def log_ratio(self, x: List[float], policy_weights: List[float]) -> float:
        """Log probability proxy under linear policy."""
        # For a language model, this would be sum(log_probs).
        # Here we use a linear score as a proxy for 'unnormalized log prob'.
        if not x: return 0.0
        return sum(xi * pi for xi, pi in zip(x, policy_weights))

    def dpo_loss(self, chosen: List[float], rejected: List[float]) -> float:
        """
        DPO loss: -log(sigmoid(beta * (log_pi(y_w) - log_pi_ref(y_w) - log_pi(y_l) + log_pi_ref(y_l))))
        """
        # Log ratios
        log_pi_chosen = self.log_ratio(chosen, self.policy)
        log_ref_chosen = self.log_ratio(chosen, self.ref_policy)
        log_pi_rejected = self.log_ratio(rejected, self.policy)
        log_ref_rejected = self.log_ratio(rejected, self.ref_policy)
        
        # implicit rewards
        # r_chosen = beta * (log_pi_chosen - log_ref_chosen)
        # r_rejected = beta * (log_pi_rejected - log_ref_rejected)
        
        limit_diff = (log_pi_chosen - log_ref_chosen) - (log_pi_rejected - log_ref_rejected)
        
        # Sigmoid and loss
        try:
            prob = 1 / (1 + math.exp(-self.beta * limit_diff))
        except OverflowError:
            prob = 1.0 if limit_diff > 0 else 0.0
            
        return -math.log(prob + 1e-10)

    def train_step(self, chosen: List[float], rejected: List[float]) -> float:
        """Single DPO training step."""
        loss = self.dpo_loss(chosen, rejected)
        
        # Analytic gradient for linear policy:
        # grad = -beta * (1 - sigmoid) * (chosen - rejected)
        limit_diff = (self.log_ratio(chosen, self.policy) - self.log_ratio(chosen, self.ref_policy)) - \
                     (self.log_ratio(rejected, self.policy) - self.log_ratio(rejected, self.ref_policy))
        try:
            sigmoid = 1 / (1 + math.exp(-self.beta * limit_diff))
        except OverflowError:
            sigmoid = 1.0 if limit_diff > 0 else 0.0
            
        coeff = -self.beta * (1 - sigmoid)
        
        for i in range(self.dim):
            grad = coeff * (chosen[i] - rejected[i])
            self.policy[i] -= self.lr * grad # Gradient Descent
        
        return loss


class PreferenceLearning:
    """Complete preference learning system."""
    def __init__(self, dim: int = 384, method: str = 'dpo'):
        self.dim = dim
        self.method = method
        self.embedder = AIClient # Use static methods
        
        if method == 'rlhf':
            self.reward_model = RewardModel(dim)
        else:
            self.dpo = DirectPreferenceOptimization(dim)

    def train(self, preferences: List[PreferencePair]) -> float:
        """Train on preference dataset."""
        total_loss = 0.0
        count = 0 
        
        for pref in preferences:
            try:
                # Use real embeddings
                chosen_emb = self.embedder.generate_embedding(pref.chosen)
                rejected_emb = self.embedder.generate_embedding(pref.rejected)
                
                # Check dim match (simple truncation/padding handling)
                chosen_emb = self._adjust_dim(chosen_emb)
                rejected_emb = self._adjust_dim(rejected_emb)
                
                if self.method == 'rlhf':
                    loss = self.reward_model.train_step(chosen_emb, rejected_emb)
                else:
                    loss = self.dpo.train_step(chosen_emb, rejected_emb)
                
                total_loss += loss
                count += 1
            except Exception as e:
                logger.error(f"Training step failed: {e}")
        
        if self.method == 'rlhf':
            self.reward_model.save()
            
        return total_loss / count if count > 0 else 0.0

    def _adjust_dim(self, vec: List[float]) -> List[float]:
        """Ensure vector matches model dimension."""
        if len(vec) == self.dim:
            return vec
        elif len(vec) > self.dim:
            return vec[:self.dim]
        else:
            return vec + [0.0] * (self.dim - len(vec))
