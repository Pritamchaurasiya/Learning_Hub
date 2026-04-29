"""
Reinforcement Learning Engine

Deep Q-Learning implementation:
1. Q-Table for small state spaces.
2. Neural Network for complex environments.
3. Experience Replay for sample efficiency.
"""

import logging
import random
from typing import List, Dict, Any, Tuple, Optional
from collections import deque
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class Experience:
    state: List[float]
    action: int
    reward: float
    next_state: List[float]
    done: bool


class ReplayBuffer:
    """
    Experience Replay for sample-efficient learning.
    """
    def __init__(self, capacity: int = 10000):
        self.buffer = deque(maxlen=capacity)
        
    def push(self, exp: Experience):
        self.buffer.append(exp)
        
    def sample(self, batch_size: int) -> List[Experience]:
        return random.sample(list(self.buffer), min(batch_size, len(self.buffer)))
    
    def __len__(self):
        return len(self.buffer)


class QLearningAgent:
    """
    Tabular Q-Learning Agent.
    """
    def __init__(self, n_states: int, n_actions: int, lr: float = 0.1, gamma: float = 0.99, epsilon: float = 1.0):
        self.n_actions = n_actions
        self.lr = lr
        self.gamma = gamma
        self.epsilon = epsilon
        self.epsilon_decay = 0.995
        self.epsilon_min = 0.01
        self.q_table: Dict[int, List[float]] = {}
        
        for s in range(n_states):
            self.q_table[s] = [0.0] * n_actions

    def select_action(self, state: int) -> int:
        """Epsilon-greedy action selection."""
        if random.random() < self.epsilon:
            return random.randint(0, self.n_actions - 1)
        return self._argmax(self.q_table.get(state, [0.0] * self.n_actions))

    def _argmax(self, values: List[float]) -> int:
        return max(range(len(values)), key=lambda i: values[i])

    def update(self, state: int, action: int, reward: float, next_state: int, done: bool):
        """Q-value update using Bellman equation."""
        current_q = self.q_table[state][action]
        max_next_q = max(self.q_table.get(next_state, [0.0] * self.n_actions)) if not done else 0
        target = reward + self.gamma * max_next_q
        self.q_table[state][action] = current_q + self.lr * (target - current_q)
        
        # Decay epsilon
        if self.epsilon > self.epsilon_min:
            self.epsilon *= self.epsilon_decay


class DeepQNetwork:
    """
    Neural Network based Q-Learning (Simplified).
    """
    def __init__(self, state_dim: int, n_actions: int):
        self.state_dim = state_dim
        self.n_actions = n_actions
        # Mock weights (In production: use PyTorch/TensorFlow)
        self.weights = [[random.gauss(0, 0.1) for _ in range(state_dim)] for _ in range(n_actions)]
        self.replay = ReplayBuffer()
        self.gamma = 0.99
        self.lr = 0.001
        self.epsilon = 1.0

    def predict(self, state: List[float]) -> List[float]:
        """Forward pass: Q(s, a) for all actions."""
        q_values = []
        for action_weights in self.weights:
            q = sum(s * w for s, w in zip(state, action_weights))
            q_values.append(q)
        return q_values

    def select_action(self, state: List[float]) -> int:
        if random.random() < self.epsilon:
            return random.randint(0, self.n_actions - 1)
        q_values = self.predict(state)
        return q_values.index(max(q_values))

    def train_step(self, batch_size: int = 32):
        if len(self.replay) < batch_size:
            return
        batch = self.replay.sample(batch_size)
        for exp in batch:
            q_target = exp.reward
            if not exp.done:
                q_target += self.gamma * max(self.predict(exp.next_state))
            # Gradient descent (mock)
            current_q = self.predict(exp.state)[exp.action]
            error = q_target - current_q
            for i in range(len(self.weights[exp.action])):
                self.weights[exp.action][i] += self.lr * error * exp.state[i]
