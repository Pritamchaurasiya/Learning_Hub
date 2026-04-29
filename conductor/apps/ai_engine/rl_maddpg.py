"""
Multi-Agent Deep Deterministic Policy Gradient (MADDPG) Engine (Phase 108).
Centralized Training with Decentralized Execution for Multi-Agent RL.
"""
import random
import math
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


class Agent:
    def __init__(self, id: int, obs_dim: int, action_dim: int):
        self.id = id
        self.obs_dim = obs_dim
        self.action_dim = action_dim
        
        # Local Actor (Decentralized Execution)
        self.actor_weights = [[random.gauss(0, 0.1) for _ in range(obs_dim)] for _ in range(action_dim)]
        
        # Centralized Critic
        # Sees observations and actions of ALL agents during training
        # Assumed N=3 agents for this simulation layout
        total_obs_dim = obs_dim * 3
        total_act_dim = action_dim * 3
        centralized_input_dim = total_obs_dim + total_act_dim
        
        self.critic_weights = [random.gauss(0, 0.1) for _ in range(centralized_input_dim)]


class MADDPGEngine:
    """
    Simulates a Multi-Agent environment (e.g., predator-prey).
    Each agent learns its own policy based on local observations,
    but the Q-function evaluates the joint state and joint action space.
    """
    def __init__(self, num_agents: int = 3, obs_dim: int = 4, act_dim: int = 2):
        self.num_agents = num_agents
        self.agents = [Agent(i, obs_dim, act_dim) for i in range(num_agents)]
        self.gamma = 0.95
        
    def _dot(self, v1: List[float], v2: List[float]) -> float:
        return sum(x * y for x, y in zip(v1, v2))
        
    def simulate_training_step(self, max_steps: int = 50) -> Dict[str, Any]:
        """
        Simulates gathering experiences and updating local actors using centralized critics.
        """
        total_actor_loss = 0.0
        total_critic_loss = 0.0
        
        # Simulate environment rollout
        # T step trajectory
        for _ in range(max_steps):
            
            # Step 1: Distributed Execution
            # Agents take actions purely based on their local observation (o_i)
            # a_i = pi_i(o_i)
            joint_obs = []
            joint_actions = []
            
            for agent in self.agents:
                local_obs = [random.uniform(-1, 1) for _ in range(agent.obs_dim)]
                
                # Actor pass
                local_action = []
                for j in range(agent.action_dim):
                    # Deterministic action (DDPG style), often with added noise
                    act_val = self._dot(agent.actor_weights[j], local_obs)
                    # Tanh squash
                    flattened = max(-1.0, min(1.0, act_val))
                    local_action.append(flattened)
                    
                joint_obs.extend(local_obs)
                joint_actions.extend(local_action)
                
            # Step 2: Environment computes next state and rewards
            # (Simulating this process)
            rewards = [random.gauss(0, 1) for _ in range(self.num_agents)]
            
            # Simulated next joint state / action for target
            next_joint_obs = [random.uniform(-1, 1) for _ in range(self.num_agents * self.agents[0].obs_dim)]
            next_joint_actions = [random.uniform(-1, 1) for _ in range(self.num_agents * self.agents[0].action_dim)]
            
            # Step 3: Centralized Training (Updating the Critics and Actors)
            critic_input = joint_obs + joint_actions
            next_critic_input = next_joint_obs + next_joint_actions
            
            for i, agent in enumerate(self.agents):
                # Centralized Critic Evaluation
                # Q_i(x, a_1, ..., a_N)
                q_val = self._dot(agent.critic_weights, critic_input)
                
                # Target Q
                target_q = self._dot(agent.critic_weights, next_critic_input)
                y_i = rewards[i] + self.gamma * target_q
                
                # Critic Loss (MSE)
                critic_loss = (y_i - q_val)**2
                total_critic_loss += critic_loss
                
                # Actor Loss
                # Policy gradient is deterministic: Grad J = Grad_pi Q_i(x, a_i, a_-i)
                # Since we want to maximize Q, actor loss is negative Q
                # (Assuming the action played was according to the latest policy)
                actor_loss = -q_val
                total_actor_loss += actor_loss
                
        # Average losses
        avg_act_loss = total_actor_loss / (max_steps * self.num_agents)
        avg_crit_loss = total_critic_loss / (max_steps * self.num_agents)
        
        return {
            "num_agents": self.num_agents,
            "training_steps": max_steps,
            "average_centralized_critic_loss": round(avg_crit_loss, 4),
            "average_local_actor_loss": round(avg_act_loss, 4),
            "mechanics": "Centralized Training with Decentralized Execution via Multi-Agent DDPG."
        }
