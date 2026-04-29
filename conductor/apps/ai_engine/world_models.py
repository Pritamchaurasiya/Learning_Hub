"""
World Models Module (Phase 30).
Predictive world modeling for imagination-based planning.
"""
import logging
import random
import math
from typing import List, Dict, Any, Optional, Tuple, Callable
from dataclasses import dataclass, field
from collections import deque

logger = logging.getLogger(__name__)


@dataclass
class State:
    """Environment state representation."""
    features: Dict[str, float]
    timestamp: int = 0
    
    def to_vector(self) -> List[float]:
        return list(self.features.values())
    
    @classmethod
    def from_vector(cls, keys: List[str], values: List[float], timestamp: int = 0) -> 'State':
        return cls(dict(zip(keys, values)), timestamp)


@dataclass 
class Action:
    """Action representation."""
    name: str
    params: Dict[str, float] = field(default_factory=dict)


@dataclass
class Transition:
    """State transition record."""
    state: State
    action: Action
    next_state: State
    reward: float
    done: bool = False


class DynamicsModel:
    """Neural network-style dynamics model (simplified)."""
    
    def __init__(self, state_dim: int, action_dim: int, hidden_dim: int = 64):
        self.state_dim = state_dim
        self.action_dim = action_dim
        self.hidden_dim = hidden_dim
        
        # Simplified weights
        self.w1 = [[random.gauss(0, 0.1) for _ in range(state_dim + action_dim)] 
                   for _ in range(hidden_dim)]
        self.w2 = [[random.gauss(0, 0.1) for _ in range(hidden_dim)] 
                   for _ in range(state_dim)]
        
        self.training_data: List[Tuple[List[float], List[float]]] = []
    
    def _relu(self, x: float) -> float:
        return max(0, x)
    
    def _forward(self, state_action: List[float]) -> List[float]:
        """Forward pass through the model."""
        # Hidden layer
        hidden = []
        for row in self.w1:
            activation = sum(w * x for w, x in zip(row, state_action))
            hidden.append(self._relu(activation))
        
        # Output layer
        output = []
        for row in self.w2:
            activation = sum(w * h for w, h in zip(row, hidden))
            output.append(activation)
        
        return output
    
    def predict(self, state: State, action: Action) -> State:
        """Predict next state given current state and action."""
        state_vec = state.to_vector()
        action_vec = [hash(action.name) % 10 / 10.0] + list(action.params.values())
        action_vec = action_vec[:self.action_dim] + [0] * (self.action_dim - len(action_vec))
        
        input_vec = state_vec + action_vec
        delta = self._forward(input_vec)
        
        # Next state = current + predicted delta
        next_vec = [s + d * 0.1 for s, d in zip(state_vec, delta)]
        
        return State.from_vector(list(state.features.keys()), next_vec, state.timestamp + 1)
    
    def train(self, transitions: List[Transition], lr: float = 0.01):
        """Train on collected transitions."""
        for trans in transitions:
            state_vec = trans.state.to_vector()
            action_vec = [hash(trans.action.name) % 10 / 10.0]
            action_vec = action_vec[:self.action_dim] + [0] * (self.action_dim - len(action_vec))
            
            input_vec = state_vec + action_vec
            target = trans.next_state.to_vector()
            
            # Store for batch training
            self.training_data.append((input_vec, target))
        
        # Simple gradient update (simplified)
        for inp, target in self.training_data[-len(transitions):]:
            pred = self._forward(inp)
            error = [t - p for t, p in zip(target, pred)]
            
            # Update weights (very simplified SGD)
            for i, row in enumerate(self.w2):
                for j in range(len(row)):
                    self.w2[i][j] += lr * error[i] * 0.01


class RewardPredictor:
    """Predicts rewards from states."""
    
    def __init__(self, state_dim: int):
        self.weights = [random.gauss(0, 0.1) for _ in range(state_dim)]
        self.bias = 0.0
    
    def predict(self, state: State) -> float:
        """Predict reward for a state."""
        vec = state.to_vector()
        return sum(w * v for w, v in zip(self.weights, vec)) + self.bias
    
    def train(self, states: List[State], rewards: List[float], lr: float = 0.01):
        """Train reward predictor."""
        for state, reward in zip(states, rewards):
            vec = state.to_vector()
            pred = self.predict(state)
            error = reward - pred
            
            for i in range(len(self.weights)):
                self.weights[i] += lr * error * vec[i]
            self.bias += lr * error


class WorldModel:
    """Complete world model with dynamics and reward prediction."""
    
    def __init__(self, state_keys: List[str], n_actions: int = 4):
        self.state_keys = state_keys
        self.state_dim = len(state_keys)
        self.n_actions = n_actions
        
        self.dynamics = DynamicsModel(self.state_dim, 1, hidden_dim=32)
        self.reward_model = RewardPredictor(self.state_dim)
        
        self.experience: deque = deque(maxlen=1000)
        self.actions = [Action(f"action_{i}") for i in range(n_actions)]
    
    def observe(self, transition: Transition):
        """Record an observed transition."""
        self.experience.append(transition)
    
    def learn(self):
        """Learn from collected experience."""
        if len(self.experience) < 10:
            return
        
        transitions = list(self.experience)[-100:]
        self.dynamics.train(transitions)
        
        states = [t.state for t in transitions]
        rewards = [t.reward for t in transitions]
        self.reward_model.train(states, rewards)
    
    def imagine(self, start_state: State, action_sequence: List[Action]) -> List[Tuple[State, float]]:
        """Imagine future trajectory given action sequence."""
        trajectory = []
        current = start_state
        
        for action in action_sequence:
            next_state = self.dynamics.predict(current, action)
            reward = self.reward_model.predict(next_state)
            trajectory.append((next_state, reward))
            current = next_state
        
        return trajectory
    
    def plan(self, start_state: State, horizon: int = 5, n_rollouts: int = 10) -> List[Action]:
        """Plan using imagination (random shooting)."""
        best_actions = None
        best_reward = float('-inf')
        
        for _ in range(n_rollouts):
            actions = [random.choice(self.actions) for _ in range(horizon)]
            trajectory = self.imagine(start_state, actions)
            
            total_reward = sum(r for _, r in trajectory)
            
            if total_reward > best_reward:
                best_reward = total_reward
                best_actions = actions
        
        return best_actions


class MBRLAgent:
    """Model-Based Reinforcement Learning Agent."""
    
    def __init__(self, state_keys: List[str], n_actions: int = 4):
        self.world_model = WorldModel(state_keys, n_actions)
        self.total_steps = 0
        self.episode_rewards: List[float] = []
    
    def act(self, state: State, explore: bool = True) -> Action:
        """Select action using world model planning."""
        if explore and random.random() < 0.2:
            return random.choice(self.world_model.actions)
        
        plan = self.world_model.plan(state, horizon=5, n_rollouts=5)
        return plan[0] if plan else random.choice(self.world_model.actions)
    
    def step(self, transition: Transition):
        """Process a transition."""
        self.world_model.observe(transition)
        self.total_steps += 1
        
        # Learn periodically
        if self.total_steps % 10 == 0:
            self.world_model.learn()
    
    def run_episode(self, env: 'SimpleEnv', max_steps: int = 100) -> float:
        """Run one episode."""
        state = env.reset()
        total_reward = 0.0
        
        for _ in range(max_steps):
            action = self.act(state)
            next_state, reward, done = env.step(action)
            
            transition = Transition(state, action, next_state, reward, done)
            self.step(transition)
            
            total_reward += reward
            state = next_state
            
            if done:
                break
        
        self.episode_rewards.append(total_reward)
        return total_reward


class SimpleEnv:
    """Simple environment for testing."""
    
    def __init__(self):
        self.state_keys = ["x", "y", "velocity"]
        self.state = None
        self.goal = {"x": 5.0, "y": 5.0}
        self.max_steps = 100
        self.current_step = 0
    
    def reset(self) -> State:
        """Reset environment."""
        self.state = State({
            "x": random.uniform(-1, 1),
            "y": random.uniform(-1, 1),
            "velocity": 0.0
        })
        self.current_step = 0
        return self.state
    
    def step(self, action: Action) -> Tuple[State, float, bool]:
        """Take a step in the environment."""
        # Apply action
        dx = 0.1 * (hash(action.name) % 4 - 1.5)
        dy = 0.1 * ((hash(action.name) // 4) % 4 - 1.5)
        
        new_x = self.state.features["x"] + dx
        new_y = self.state.features["y"] + dy
        velocity = math.sqrt(dx**2 + dy**2)
        
        self.state = State({
            "x": new_x,
            "y": new_y,
            "velocity": velocity
        }, self.current_step + 1)
        
        # Calculate reward (distance to goal)
        dist = math.sqrt(
            (new_x - self.goal["x"])**2 + 
            (new_y - self.goal["y"])**2
        )
        reward = -dist / 10.0  # Negative distance as reward
        
        self.current_step += 1
        done = dist < 0.5 or self.current_step >= self.max_steps
        
        return self.state, reward, done


def run_world_model_experiment(n_episodes: int = 20) -> Dict[str, Any]:
    """Run world model experiment."""
    print("=== World Model Experiment ===")
    
    env = SimpleEnv()
    agent = MBRLAgent(env.state_keys, n_actions=4)
    
    rewards = []
    for ep in range(n_episodes):
        reward = agent.run_episode(env)
        rewards.append(reward)
        
        if (ep + 1) % 5 == 0:
            avg = sum(rewards[-5:]) / 5
            print(f"Episode {ep + 1}: Avg Reward = {avg:.3f}")
    
    # Test imagination
    test_state = env.reset()
    trajectory = agent.world_model.imagine(
        test_state,
        [Action("action_0"), Action("action_1"), Action("action_2")]
    )
    
    return {
        "n_episodes": n_episodes,
        "final_avg_reward": sum(rewards[-5:]) / 5,
        "total_steps": agent.total_steps,
        "imagination_horizon": len(trajectory),
        "learned_dynamics": True
    }
