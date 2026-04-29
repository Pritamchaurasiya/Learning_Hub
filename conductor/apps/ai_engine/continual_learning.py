import math
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)


class ContinualLearningEngine:
    """
    Phase 71: Continual Learning & Catastrophic Forgetting.
    
    When a Neural Network learns Task B, it typically completely forgets Task A
    (Catastrophic Forgetting) because the weights are completely overwritten.
    
    Elastic Weight Consolidation (EWC) solves this. We calculate the Fisher 
    Information Matrix for Task A, which tells us which specific weights are 
    MOST IMPORTANT to remember Task A. We then add a penalty to the loss function 
    when learning Task B, preventing the network from updating those important weights.
    
    Loss_total = Loss_TaskB + (lambda/2) * sum( Fisher_i * (theta_i - theta_star_i)^2 )
    """
    
    def __init__(self, lambda_ewc: float = 0.5):
        # lambda controls how strongly we enforce remembering past tasks
        self.lambda_ewc = lambda_ewc
        # Store for optimal weights (theta_star) of past tasks
        self.past_task_weights = {}
        # Store for Fisher Information diagonals of past tasks
        self.fisher_diagonals = {}
        
    def _simulate_fisher_information(self, model_weights: Dict[str, float]) -> Dict[str, float]:
        """
        Simulates computing the diagonal of the Fisher Information Matrix.
        In real PyTorch/TF, this requires computing the squared gradients of 
        the log-likelihood over the dataset.
        Here we mock it: some weights are highly critical (high fisher), others are not.
        """
        fisher_info = {}
        import random
        random.seed(42) # Deterministic for simulation
        
        for name, weight in model_weights.items():
            # Mock: Randomly decide the importance of this parameter to the task
            importance = random.uniform(0.01, 1.0)
            fisher_info[name] = importance
            
        return fisher_info

    def register_completed_task(self, task_name: str, final_weights: Dict[str, float]):
        """
        Called after training on Task A completes. We freeze the optimal weights
        (theta_star) and compute the Fisher Information telling us *why* those
        weights were optimal.
        """
        self.past_task_weights[task_name] = final_weights.copy()
        
        # Calculate Fisher Information Matrix for this task
        fisher = self._simulate_fisher_information(final_weights)
        self.fisher_diagonals[task_name] = fisher
        
        logger.info(f"Registered completed task '{task_name}' for Continual Learning (EWC).")
        return {"task": task_name, "parameters_anchored": len(final_weights)}

    def calculate_ewc_penalty(self, current_weights: Dict[str, float]) -> float:
        """
        Calculates the EWC penalty term to add to the new task's loss function.
        If current weights drift far from critical past weights, the penalty skyrockets.
        """
        total_penalty = 0.0
        
        for past_task in self.past_task_weights.keys():
            theta_star = self.past_task_weights[past_task]
            fisher = self.fisher_diagonals[past_task]
            
            task_penalty = 0.0
            for param_name, current_w in current_weights.items():
                if param_name in theta_star and param_name in fisher:
                    # Penalty = Fisher_i * (Current_W - Past_Optimal_W)^2
                    drift_squared = (current_w - theta_star[param_name]) ** 2
                    task_penalty += fisher[param_name] * drift_squared
                    
            total_penalty += task_penalty
            
        return (self.lambda_ewc / 2.0) * total_penalty

    def simulate_training_step(self, new_task_weights: Dict[str, float], base_loss: float) -> Dict:
        """
        Simulates a forward/backward pass on a new task while applying EWC.
        """
        ewc_penalty = self.calculate_ewc_penalty(new_task_weights)
        total_loss = base_loss + ewc_penalty
        
        return {
            "base_task_loss": round(base_loss, 4),
            "ewc_penalty": round(ewc_penalty, 4),
            "total_loss": round(total_loss, 4),
            "status": "Regularized against catastrophic forgetting" if ewc_penalty > 0 else "No past tasks registered"
        }
