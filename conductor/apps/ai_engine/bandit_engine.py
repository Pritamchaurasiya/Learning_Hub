import math
import random
import logging
from typing import Dict, List, Optional, Tuple
from collections import defaultdict

logger = logging.getLogger(__name__)


class BanditArm:
    """Represents a single arm (content variant) in the bandit."""
    
    def __init__(self, arm_id: str, name: str = ""):
        self.arm_id = arm_id
        self.name = name or arm_id
        self.pulls = 0
        self.total_reward = 0.0
        self.reward_squared = 0.0
        # Thompson Sampling priors (Beta distribution)
        self.alpha = 1.0  # successes + 1
        self.beta_param = 1.0  # failures + 1
    
    @property
    def mean_reward(self) -> float:
        return self.total_reward / max(1, self.pulls)
    
    @property
    def variance(self) -> float:
        if self.pulls < 2:
            return 1.0
        mean = self.mean_reward
        return self.reward_squared / self.pulls - mean ** 2
    
    def update(self, reward: float):
        self.pulls += 1
        self.total_reward += reward
        self.reward_squared += reward ** 2
        # Update Beta distribution for Thompson Sampling
        if reward > 0.5:
            self.alpha += reward
        else:
            self.beta_param += (1.0 - reward)


class UCB1Bandit:
    """
    Phase 61: Upper Confidence Bound (UCB1) Multi-Armed Bandit.
    
    Balances exploration-exploitation by selecting the arm with the
    highest upper confidence bound:
    
    UCB(a) = μ_a + c * √(ln(N) / n_a)
    
    Where:
    - μ_a = empirical mean reward of arm a
    - N = total pulls across all arms
    - n_a = pulls of arm a
    - c = exploration parameter (√2 by default)
    
    Use case: A/B testing course content variants, UI layouts,
    quiz formats to find what maximizes engagement.
    """
    
    def __init__(self, exploration_param: float = 1.414):
        self.c = exploration_param
        self.arms: Dict[str, BanditArm] = {}
        self.total_pulls = 0
    
    def add_arm(self, arm_id: str, name: str = ""):
        self.arms[arm_id] = BanditArm(arm_id, name)
    
    def select_arm(self) -> str:
        """Select arm with highest UCB1 score."""
        if not self.arms:
            return ""
        
        # Pull each arm at least once
        for arm_id, arm in self.arms.items():
            if arm.pulls == 0:
                return arm_id
        
        best_arm = None
        best_ucb = -float('inf')
        
        for arm_id, arm in self.arms.items():
            exploitation = arm.mean_reward
            exploration = self.c * math.sqrt(math.log(self.total_pulls) / arm.pulls)
            ucb = exploitation + exploration
            
            if ucb > best_ucb:
                best_ucb = ucb
                best_arm = arm_id
        
        return best_arm or ""
    
    def update(self, arm_id: str, reward: float):
        """Update arm statistics after observing reward."""
        if arm_id in self.arms:
            self.arms[arm_id].update(reward)
            self.total_pulls += 1
    
    def get_results(self) -> Dict:
        """Get current bandit statistics."""
        results = []
        for arm_id, arm in self.arms.items():
            results.append({
                'arm_id': arm.arm_id,
                'name': arm.name,
                'pulls': arm.pulls,
                'mean_reward': round(arm.mean_reward, 4),
                'total_reward': round(arm.total_reward, 4),
                'ucb_score': round(
                    arm.mean_reward + self.c * math.sqrt(
                        math.log(max(1, self.total_pulls)) / max(1, arm.pulls)
                    ), 4
                )
            })
        
        results.sort(key=lambda x: x['mean_reward'], reverse=True)
        
        return {
            'total_pulls': self.total_pulls,
            'arms': results,
            'best_arm': results[0]['arm_id'] if results else None,
            'algorithm': 'UCB1'
        }


class ThompsonSamplingBandit:
    """
    Phase 61: Thompson Sampling Multi-Armed Bandit.
    
    Uses Bayesian posterior sampling for exploration:
    1. Maintain a Beta(α, β) distribution for each arm.
    2. Sample θ_a ~ Beta(α_a, β_a) for each arm.
    3. Select the arm with the highest sampled θ.
    4. Update the posterior based on observed reward.
    
    Thompson Sampling is:
    - Provably optimal (Bayesian regret bound)
    - Naturally handles the explore-exploit tradeoff
    - Works with delayed rewards
    
    Use case: Optimizing quiz difficulty, content type selection,
    notification timing, and tutoring strategies.
    """
    
    def __init__(self):
        self.arms: Dict[str, BanditArm] = {}
        self.total_pulls = 0
    
    def add_arm(self, arm_id: str, name: str = ""):
        self.arms[arm_id] = BanditArm(arm_id, name)
    
    def _sample_beta(self, alpha: float, beta: float) -> float:
        """Sample from Beta distribution using Box-Muller approximation."""
        # Use gamma distribution to sample beta
        # Beta(a,b) = Gamma(a) / (Gamma(a) + Gamma(b))
        def sample_gamma(shape: float) -> float:
            if shape < 1:
                return sample_gamma(1 + shape) * (random.random() ** (1.0 / shape))
            d = shape - 1.0 / 3.0
            c = 1.0 / math.sqrt(9.0 * d)
            while True:
                x = random.gauss(0, 1)
                v = (1 + c * x) ** 3
                if v > 0:
                    u = random.random()
                    if u < 1 - 0.0331 * (x ** 2) ** 2:
                        return d * v
                    if math.log(u) < 0.5 * x ** 2 + d * (1 - v + math.log(v)):
                        return d * v
        
        x = sample_gamma(alpha)
        y = sample_gamma(beta)
        return x / (x + y) if (x + y) > 1e-10 else 0.5
    
    def select_arm(self) -> str:
        """Select arm by Thompson Sampling from posterior."""
        if not self.arms:
            return ""
        
        best_arm = None
        best_sample = -float('inf')
        
        for arm_id, arm in self.arms.items():
            # Sample from posterior Beta distribution
            sample = self._sample_beta(arm.alpha, arm.beta_param)
            
            if sample > best_sample:
                best_sample = sample
                best_arm = arm_id
        
        return best_arm or ""
    
    def update(self, arm_id: str, reward: float):
        """Update arm posterior after observing reward."""
        if arm_id in self.arms:
            self.arms[arm_id].update(reward)
            self.total_pulls += 1
    
    def get_results(self) -> Dict:
        """Get current bandit statistics with posterior info."""
        results = []
        for arm_id, arm in self.arms.items():
            expected = arm.alpha / (arm.alpha + arm.beta_param)
            results.append({
                'arm_id': arm.arm_id,
                'name': arm.name,
                'pulls': arm.pulls,
                'mean_reward': round(arm.mean_reward, 4),
                'posterior_alpha': round(arm.alpha, 2),
                'posterior_beta': round(arm.beta_param, 2),
                'posterior_mean': round(expected, 4)
            })
        
        results.sort(key=lambda x: x['posterior_mean'], reverse=True)
        
        return {
            'total_pulls': self.total_pulls,
            'arms': results,
            'best_arm': results[0]['arm_id'] if results else None,
            'algorithm': 'Thompson Sampling'
        }


class EpsilonGreedyBandit:
    """
    Phase 61: ε-Greedy Multi-Armed Bandit.
    
    Simplest bandit strategy:
    - With probability ε: random arm (explore)
    - With probability 1-ε: best arm so far (exploit)
    
    With ε-decay, converges to pure exploitation over time.
    """
    
    def __init__(self, epsilon: float = 0.1, decay: float = 0.999):
        self.epsilon = epsilon
        self.decay = decay
        self.arms: Dict[str, BanditArm] = {}
        self.total_pulls = 0
    
    def add_arm(self, arm_id: str, name: str = ""):
        self.arms[arm_id] = BanditArm(arm_id, name)
    
    def select_arm(self) -> str:
        if not self.arms:
            return ""
        
        if random.random() < self.epsilon:
            return random.choice(list(self.arms.keys()))
        
        return max(self.arms.keys(), key=lambda k: self.arms[k].mean_reward)
    
    def update(self, arm_id: str, reward: float):
        if arm_id in self.arms:
            self.arms[arm_id].update(reward)
            self.total_pulls += 1
            self.epsilon *= self.decay


class ContentOptimizer:
    """
    Orchestrates multiple bandit algorithms for content A/B optimization.
    
    Compares UCB1, Thompson Sampling, and ε-Greedy to find the best
    content variant for maximizing student engagement.
    """
    
    @classmethod
    def run_optimization(
        cls,
        variants: List[Dict[str, str]],
        interaction_data: Optional[List[Tuple[str, float]]] = None,
        n_simulated_rounds: int = 100
    ) -> Dict:
        """
        Run all three bandit algorithms and compare.
        
        Args:
            variants: List of {'id': ..., 'name': ...} content variants.
            interaction_data: Optional List of (arm_id, reward) historical data.
            n_simulated_rounds: Rounds to simulate if no data provided.
        """
        ucb = UCB1Bandit()
        thompson = ThompsonSamplingBandit()
        eps_greedy = EpsilonGreedyBandit()
        
        for v in variants:
            ucb.add_arm(v['id'], v.get('name', ''))
            thompson.add_arm(v['id'], v.get('name', ''))
            eps_greedy.add_arm(v['id'], v.get('name', ''))
        
        if interaction_data:
            for arm_id, reward in interaction_data:
                ucb.update(arm_id, reward)
                thompson.update(arm_id, reward)
                eps_greedy.update(arm_id, reward)
        else:
            # Simulate interactions with hidden reward rates
            true_rates = {v['id']: random.uniform(0.2, 0.8) for v in variants}
            
            for _ in range(n_simulated_rounds):
                for bandit in [ucb, thompson, eps_greedy]:
                    arm = bandit.select_arm()
                    reward = 1.0 if random.random() < true_rates.get(arm, 0.5) else 0.0
                    bandit.update(arm, reward)
        
        return {
            'ucb1': ucb.get_results(),
            'thompson_sampling': thompson.get_results(),
            'epsilon_greedy': {
                'total_pulls': eps_greedy.total_pulls,
                'arms': [
                    {
                        'arm_id': a.arm_id,
                        'name': a.name,
                        'pulls': a.pulls,
                        'mean_reward': round(a.mean_reward, 4)
                    }
                    for a in eps_greedy.arms.values()
                ],
                'algorithm': 'ε-Greedy'
            },
            'recommendation': 'Thompson Sampling is generally preferred for educational content optimization due to natural exploration and Bayesian regret guarantees.'
        }
