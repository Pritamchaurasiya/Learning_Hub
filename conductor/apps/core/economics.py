import random
import structlog
from typing import Dict

logger = structlog.get_logger(__name__)

class PricingAgent:
    """
    Autonomous Economic Agent that optimizes course pricing using 
    Reinforcement Learning (simulated Epsilon-Greedy strategy).
    """
    
    def __init__(self, course_id: str, base_price: float):
        self.course_id = course_id
        self.base_price = base_price
        self.epsilon = 0.1 # Exploration rate
        self.q_table = {} # State -> Action -> Value
        self.current_price = base_price

    def get_optimal_price(self, demand_signal: float) -> float:
        """
        Decides the price for the next hour based on current demand elasticity.
        """
        # Quantize demand into states (Low, Medium, High)
        state = "medium"
        if demand_signal < 0.3: state = "low"
        elif demand_signal > 0.7: state = "high"
        
        # Epsilon-Greedy Action Selection
        if random.random() < self.epsilon:
            # Explore: Random price adjustment
            action = random.choice([-0.1, 0.0, 0.1]) # -10%, 0%, +10%
            logger.info(f"🎲 Exploring price action: {action*100}%")
        else:
            # Exploit: Best known action (mocked)
            action = 0.05 if state == "high" else -0.05
            logger.info(f"🧠 Exploiting price action: {action*100}% based on {state} demand")

        # Apply action
        new_price = self.base_price * (1.0 + action)
        self.current_price = round(new_price, 2)
        
        return self.current_price

    def update_policy(self, revenue_generated: float):
        """
        Updates the Q-Table based on the reward (revenue).
        """
        # RL update logic would go here (Q-Learning)
        pass
