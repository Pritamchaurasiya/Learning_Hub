"""
Hindsight Experience Replay (HER) Engine (Phase 109).
Sparse-reward reinforcement learning mimicking human failure relabeling.
"""
import random
import math
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


class HEREngine:
    """
    Simulates Hindsight Experience Replay.
    When a robot fails to reach a target goal, HER relabels the trajectory
    as if the state it ACTUALLY reached was the intended target goal all along.
    This creates dense learning signals out of sparse/failed trajectories.
    """
    def __init__(self, state_dim: int = 3, goal_dim: int = 3):
        self.state_dim = state_dim
        self.goal_dim = goal_dim
        
        # E.g., a robotic arm trying to reach a coordinate (x, y, z)
        # Replay buffer holding standard tuples: (state, action, reward, next_state, goal)
        self.buffer = []
        
    def _calculate_sparse_reward(self, current_state: List[float], goal: List[float]) -> float:
        """
        Sparse reward: 0 if at goal (within threshold), -1 otherwise.
        """
        dist = math.sqrt(sum((c - g)**2 for c, g in zip(current_state, goal)))
        return 0.0 if dist < 0.05 else -1.0

    def simulate_episode(self, episode_length: int = 20) -> Dict[str, Any]:
        """
        Simulates an episode of attempting to reach a target goal, failing, 
        and then retroactively labeling the failure as a success.
        """
        # 1. Define true intended target goal
        true_goal = [random.uniform(0.5, 1.0) for _ in range(self.goal_dim)]
        
        # 2. Simulate standard trajectory (Actor attempts and fails)
        trajectory = []
        current_state = [0.0 for _ in range(self.state_dim)] # Start at origin
        
        for t in range(episode_length):
            # Take a random/exploratory action
            action = [random.uniform(-0.1, 0.1) for _ in range(self.goal_dim)]
            
            # Next state
            next_state = [c + a for c, a in zip(current_state, action)]
            
            # Standard sparse reward (Almost certainly -1.0 for a random policy)
            reward = self._calculate_sparse_reward(next_state, true_goal)
            
            trajectory.append({
                "state": current_state,
                "action": action,
                "reward": reward,
                "next_state": next_state,
                "goal": true_goal
            })
            
            current_state = next_state
            
        # Store standard experience
        self.buffer.extend(trajectory)
        
        # 3. HINDSIGHT EXPIERENCE REPLAY (Relabeling)
        # Take the final state reached in the trajectory
        final_achieved_state = trajectory[-1]["next_state"]
        
        hindsight_relabeled_transitions = 0
        
        # Relabel the failed trajectory transitions
        for transition in trajectory:
            # We treat the final state we accidentally arrived at as the NEW goal
            fake_target_goal = list(final_achieved_state)
            
            # Recalculate reward under the fake goal mapping
            relabeled_reward = self._calculate_sparse_reward(transition["next_state"], fake_target_goal)
            
            # Create the synthetic experience
            synthetic_transition = {
                "state": transition["state"],
                "action": transition["action"],
                "reward": relabeled_reward,
                "next_state": transition["next_state"],
                "goal": fake_target_goal  # The crucial change
            }
            
            # If the relabeled reward is 0 (Success), we successfully mined learning signal
            if relabeled_reward == 0.0:
                hindsight_relabeled_transitions += 1
                
            self.buffer.append(synthetic_transition)
            
        return {
            "episode_length": episode_length,
            "true_goal": [round(g, 3) for g in true_goal],
            "actual_final_state": [round(s, 3) for s in final_achieved_state],
            "standard_buffer_size": len(self.buffer) // 2,
            "hindsight_buffer_size": len(self.buffer),
            "synthetic_successes_mined": hindsight_relabeled_transitions,
            "mechanics": "Goal-Conditioned Reinforcement Learning with Sparse Reward Future-State Relabeling."
        }
