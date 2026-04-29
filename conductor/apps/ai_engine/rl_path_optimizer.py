import math
import random
import logging
from typing import Dict, List, Tuple, Optional, Set
from collections import defaultdict

logger = logging.getLogger(__name__)


class QLearningPathOptimizer:
    """
    Phase 61: Q-Learning Adaptive Learning Path Optimizer.
    
    Models the learning journey as a Markov Decision Process (MDP):
    - STATE: Current knowledge profile (mastered topics, current difficulty)
    - ACTION: Next course/module to recommend
    - REWARD: Learning gain (mastery delta, engagement, completion)
    - TRANSITION: Move to new knowledge state after action
    
    Uses Tabular Q-Learning with ε-greedy exploration:
    Q(s,a) ← Q(s,a) + α[r + γ·max_a' Q(s',a') - Q(s,a)]
    
    Over time, the Q-table converges to the optimal policy π* that
    maximizes cumulative learning gain for each student state.
    """
    
    def __init__(
        self,
        learning_rate: float = 0.1,
        discount_factor: float = 0.95,
        epsilon: float = 0.2,
        epsilon_decay: float = 0.995,
        min_epsilon: float = 0.01
    ):
        self.alpha = learning_rate
        self.gamma = discount_factor
        self.epsilon = epsilon
        self.epsilon_decay = epsilon_decay
        self.min_epsilon = min_epsilon
        self.q_table: Dict[str, Dict[int, float]] = defaultdict(lambda: defaultdict(float))
        self.visit_count: Dict[str, Dict[int, int]] = defaultdict(lambda: defaultdict(int))
        self.episode_rewards: List[float] = []
    
    def _encode_state(self, mastery_levels: Dict[str, float],
                      current_difficulty: str) -> str:
        """
        Encode the student's knowledge state into a hashable string.
        
        Discretizes mastery into buckets: low (<0.4), mid (0.4-0.7), high (>0.7)
        """
        buckets = []
        for topic in sorted(mastery_levels.keys()):
            level = mastery_levels[topic]
            if level < 0.4:
                buckets.append('L')
            elif level < 0.7:
                buckets.append('M')
            else:
                buckets.append('H')
        
        return f"{'-'.join(buckets)}|{current_difficulty}"
    
    def select_action(self, state: str, available_actions: List[int]) -> int:
        """
        ε-greedy action selection.
        
        With probability ε: explore (random action).
        With probability 1-ε: exploit (best Q-value action).
        """
        if not available_actions:
            return -1
        
        if random.random() < self.epsilon:
            return random.choice(available_actions)
        
        # Exploit: select action with highest Q-value
        q_values = {a: self.q_table[state][a] for a in available_actions}
        max_q = max(q_values.values()) if q_values else 0
        best_actions = [a for a, q in q_values.items() if abs(q - max_q) < 1e-8]
        
        return random.choice(best_actions)
    
    def update(self, state: str, action: int, reward: float,
               next_state: str, available_next_actions: List[int]):
        """
        Q-Learning update rule:
        Q(s,a) ← Q(s,a) + α[r + γ·max_a' Q(s',a') - Q(s,a)]
        """
        current_q = self.q_table[state][action]
        
        # Max Q-value for next state
        if available_next_actions:
            max_next_q = max(
                self.q_table[next_state][a] for a in available_next_actions
            ) if available_next_actions else 0.0
        else:
            max_next_q = 0.0
        
        # Bellman update
        td_target = reward + self.gamma * max_next_q
        td_error = td_target - current_q
        self.q_table[state][action] = current_q + self.alpha * td_error
        
        # Track visits
        self.visit_count[state][action] += 1
        
        # Decay epsilon
        self.epsilon = max(self.min_epsilon, self.epsilon * self.epsilon_decay)
    
    def compute_reward(self, mastery_before: float, mastery_after: float,
                       time_spent_minutes: float, completed: bool) -> float:
        """
        Multi-factor reward function for learning path optimization.
        
        Rewards:
        + Mastery gain (primary signal)
        + Completion bonus
        + Efficiency bonus (high gain in short time)
        - Time penalty for excessive sessions
        """
        mastery_gain = mastery_after - mastery_before
        
        reward = mastery_gain * 10.0  # Primary: mastery improvement
        
        if completed:
            reward += 2.0  # Completion bonus
        
        # Efficiency: reward high gain per minute
        if time_spent_minutes > 0:
            efficiency = mastery_gain / (time_spent_minutes / 60.0)
            reward += min(efficiency * 0.5, 1.0)
        
        # Penalize excessively long sessions (diminishing returns)
        if time_spent_minutes > 120:
            reward -= (time_spent_minutes - 120) * 0.01
        
        return reward
    
    def get_optimal_path(self, initial_state: str,
                         all_courses: List[int], max_steps: int = 10) -> List[Dict]:
        """
        Generate the optimal learning path from a starting state
        by following the greedy policy (exploit only).
        """
        path = []
        state = initial_state
        visited: Set[int] = set()
        
        for step in range(max_steps):
            available = [c for c in all_courses if c not in visited]
            if not available:
                break
            
            # Greedy selection (no exploration)
            q_values = {a: self.q_table[state][a] for a in available}
            if not q_values or max(q_values.values()) == 0:
                break
            
            best_action = max(q_values, key=q_values.get)
            visited.add(best_action)
            
            path.append({
                'step': step + 1,
                'course_id': best_action,
                'expected_value': round(q_values[best_action], 4),
                'state': state
            })
            
            # Simulate state transition
            state = f"{state}_after_{best_action}"
        
        return path
    
    def train_from_history(self, interaction_history: List[Dict]):
        """
        Train Q-table from historical student interaction data.
        
        Each interaction should have:
        - mastery_levels: Dict[str, float]
        - difficulty: str
        - course_id: int
        - mastery_gain: float
        - time_minutes: float
        - completed: bool
        """
        total_reward = 0.0
        
        for i, interaction in enumerate(interaction_history):
            state = self._encode_state(
                interaction.get('mastery_levels', {}),
                interaction.get('difficulty', 'intermediate')
            )
            action = interaction['course_id']
            
            mastery_before = sum(interaction.get('mastery_levels', {}).values()) / max(1, len(interaction.get('mastery_levels', {})))
            mastery_after = mastery_before + interaction.get('mastery_gain', 0.0)
            
            reward = self.compute_reward(
                mastery_before, mastery_after,
                interaction.get('time_minutes', 30),
                interaction.get('completed', True)
            )
            total_reward += reward
            
            # Next state
            if i + 1 < len(interaction_history):
                next_interaction = interaction_history[i + 1]
                next_state = self._encode_state(
                    next_interaction.get('mastery_levels', {}),
                    next_interaction.get('difficulty', 'intermediate')
                )
                next_actions = [ih['course_id'] for ih in interaction_history[i + 1:]]
            else:
                next_state = f"{state}_terminal"
                next_actions = []
            
            self.update(state, action, reward, next_state, next_actions)
        
        self.episode_rewards.append(total_reward)
        
        return {
            'total_reward': round(total_reward, 4),
            'states_explored': len(self.q_table),
            'epsilon': round(self.epsilon, 4)
        }
    
    def get_statistics(self) -> Dict:
        """Return training statistics."""
        total_entries = sum(len(actions) for actions in self.q_table.values())
        
        return {
            'q_table_size': len(self.q_table),
            'total_q_entries': total_entries,
            'epsilon': round(self.epsilon, 4),
            'episodes_trained': len(self.episode_rewards),
            'avg_episode_reward': round(
                sum(self.episode_rewards) / max(1, len(self.episode_rewards)), 4
            ) if self.episode_rewards else 0.0,
            'learning_rate': self.alpha,
            'discount_factor': self.gamma
        }


class SARSAOptimizer(QLearningPathOptimizer):
    """
    SARSA (State-Action-Reward-State-Action) variant.
    
    Unlike Q-Learning which is off-policy (uses max Q for next state),
    SARSA is on-policy: it updates using the ACTUAL next action taken.
    
    Q(s,a) ← Q(s,a) + α[r + γ·Q(s',a') - Q(s,a)]
    
    SARSA is more conservative — it accounts for exploration noise
    in the update, making it safer for real student interactions.
    """
    
    def update_sarsa(self, state: str, action: int, reward: float,
                     next_state: str, next_action: int):
        """
        SARSA update: uses actual next action instead of max.
        """
        current_q = self.q_table[state][action]
        next_q = self.q_table[next_state][next_action]
        
        td_target = reward + self.gamma * next_q
        td_error = td_target - current_q
        self.q_table[state][action] = current_q + self.alpha * td_error
        
        self.visit_count[state][action] += 1
        self.epsilon = max(self.min_epsilon, self.epsilon * self.epsilon_decay)
