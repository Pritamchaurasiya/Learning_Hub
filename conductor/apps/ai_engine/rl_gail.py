"""
Generative Adversarial Imitation Learning (GAIL) Engine (Phase 119).
Merges Generative Adversarial Networks (GAN) with Inverse Reinforcement Learning (IRL).
"""
import random
import math
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


class GAILEngine:
    """
    Simulates GAIL. 
    Instead of manually defining a reward function, GAIL trains a Discriminator (D) 
    to distinguish between Expert trajectories and the learner Policy's (Generator) trajectories.
    The learner Policy (G) then uses RL (e.g. TRPO/PPO) to maximize the "confusion" of the Discriminator.
    When D can no longer tell the difference, G has perfectly imitated the expert.
    """
    def __init__(self, state_dim: int = 4, action_dim: int = 2):
        self.state_dim = state_dim
        self.action_dim = action_dim
        
        # Generator (Actor Policy Net): pi_theta(a|s)
        self.generator_weights = [[random.gauss(0, 0.1) for _ in range(state_dim)] for _ in range(action_dim)]
        
        # Discriminator (Reward Net): D_phi(s, a) -> [0, 1] probability it came from expert
        self.discriminator_weights = [random.gauss(0, 0.1) for _ in range(state_dim + action_dim)]
        
        self.lr_g = 0.01
        self.lr_d = 0.05

    def _sigmoid(self, x: float) -> float:
        try:
            return 1.0 / (1.0 + math.exp(-x))
        except OverflowError:
            return 0.0 if x < 0 else 1.0

    def _dot(self, v1: List[float], v2: List[float]) -> float:
        return sum(x * y for x, y in zip(v1, v2))

    def _get_generator_action(self, state: List[float]) -> List[float]:
        # Simulating a deterministic continuous action (e.g. DDPG style for simplicity)
        return [math.tanh(self._dot(row, state)) for row in self.generator_weights]

    def _discriminator_score(self, state: List[float], action: List[float]) -> float:
        # D(s, a) -> Probability it's from expert
        features = state + action
        logits = self._dot(self.discriminator_weights, features)
        return self._sigmoid(logits)

    def simulate_gail_iteration(self, batch_size: int = 32) -> Dict[str, Any]:
        """
        Simulates an alternating GAN-style update:
        1. Discriminator Ascends: maximize log(D(expert)) + log(1 - D(generator))
        2. Generator Ascends (Policy step): maximize log(D(generator))
        """
        d_loss_total = 0.0
        g_loss_total = 0.0
        expert_scores = []
        generator_scores = []
        
        # 1. Gather simulated data
        expert_states = [[random.gauss(0.5, 0.2) for _ in range(self.state_dim)] for _ in range(batch_size)]
        expert_actions = [[random.gauss(0.8, 0.1) for _ in range(self.action_dim)] for _ in range(batch_size)]
        
        generator_states = [[random.gauss(-0.5, 0.2) for _ in range(self.state_dim)] for _ in range(batch_size)]
        generator_actions = [self._get_generator_action(s) for s in generator_states]
        
        # 2. Discriminator Update
        for es, ea, gs, ga in zip(expert_states, expert_actions, generator_states, generator_actions):
            # D(expert) should be 1
            d_exp = self._discriminator_score(es, ea)
            expert_scores.append(d_exp)
            
            # D(generator) should be 0
            d_gen = self._discriminator_score(gs, ga)
            generator_scores.append(d_gen)
            
            # Binary Cross Entropy Loss for D
            # L_D = -[log(D(exp)) + log(1 - D(gen))]
            loss_d = -(math.log(d_exp + 1e-8) + math.log(1.0 - d_gen + 1e-8))
            d_loss_total += loss_d
            
            # Update Discriminator (Simplified gradient simulation)
            features_exp = es + ea
            features_gen = gs + ga
            
            # D tries to increase score for expert, decrease for generator
            for i in range(len(self.discriminator_weights)):
                grad_d_exp = (1.0 - d_exp) * features_exp[i]
                grad_d_gen = -d_gen * features_gen[i]
                self.discriminator_weights[i] += self.lr_d * (grad_d_exp + grad_d_gen)
                
        # 3. Generator (Policy) Update via RL proxy
        # In actual GAIL, we'd run PPO/TRPO using reward = -log(1 - D(s, a)) or log(D(s, a))
        # We simulate the Generator shifting its weights to increase D(s, a)
        for gs, ga in zip(generator_states, generator_actions):
            d_gen = self._discriminator_score(gs, ga)
            
            # Generator wants to Maximize D(gen), meaning min -log(D(gen))
            loss_g = -math.log(d_gen + 1e-8)
            g_loss_total += loss_g
            
            # Shift generator weights towards expert actions to confuse D
            for a_idx in range(self.action_dim):
                for s_idx in range(self.state_dim):
                    # Pseudo-gradient: move actions towards the positive feature space
                    self.generator_weights[a_idx][s_idx] += self.lr_g * (d_gen * gs[s_idx])
                    
        avg_d_loss = d_loss_total / batch_size
        avg_g_loss = g_loss_total / batch_size
        avg_exp_score = sum(expert_scores) / batch_size
        avg_gen_score = sum(generator_scores) / batch_size
        
        return {
            "batch_size": batch_size,
            "discriminator_loss": round(avg_d_loss, 4),
            "generator_loss": round(avg_g_loss, 4),
            "avg_discriminator_score_expert": round(avg_exp_score, 4),
            "avg_discriminator_score_generator": round(avg_gen_score, 4),
            "mechanics": "Generative Adversarial Imitation Learning (GAIL). The Generator (Policy) attempts to mimic expert demonstrations highly enough to fool the Discriminator (Reward Function) passing judgment."
        }
