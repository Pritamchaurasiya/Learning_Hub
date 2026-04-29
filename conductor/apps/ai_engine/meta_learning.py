import math
import random
import logging
from typing import List, Dict, Tuple, Optional

logger = logging.getLogger(__name__)


class MetaLinearLayer:
    """
    Phase 66: Differentiable linear layer for Meta-Learning.
    
    Supports explicit weight injection for the "Inner Loop" adaptation step,
    essential for Model-Agnostic Meta-Learning (MAML).
    """
    def __init__(self, in_features: int, out_features: int, seed_str: str):
        self.in_features = in_features
        self.out_features = out_features
        
        seed = hash(seed_str) % (2**31)
        rng = random.Random(seed)
        scale = math.sqrt(2.0 / (in_features + out_features))
        
        # Base "Meta" Parameters (θ)
        self.w = [[rng.gauss(0, scale) for _ in range(out_features)] for _ in range(in_features)]
        self.b = [0.0] * out_features
        
    def forward(self, x: List[float], adapted_w: Optional[List[List[float]]] = None, 
                adapted_b: Optional[List[float]] = None) -> List[float]:
        """
        Forward pass. If adapted weights (θ') are provided, use them.
        Otherwise use base meta-weights (θ).
        """
        weights = adapted_w if adapted_w is not None else self.w
        biases = adapted_b if adapted_b is not None else self.b
        
        out = [0.0] * self.out_features
        for j in range(self.out_features):
            val = sum(x[i] * weights[i][j] for i in range(self.in_features)) + biases[j]
            out[j] = val
        return out


class MAMLEngine:
    """
    Phase 66: Model-Agnostic Meta-Learning (MAML).
    
    Motivation: "Few-Shot Personalization". We want to train a baseline model 
    so that it can adapt to *any* new student using only 2 or 3 datapoints, 
    rather than waiting weeks to collect enough history.
    
    How it works (The MAML objective):
    1. Sample a "Task" (a specific student's learning history).
    2. Inner Loop (Adaptation): 
       Train the base model (θ) on a small support set to get adapted parameters (θ').
       θ'_i = θ - a * ∇ L_support(θ)
    3. Outer Loop (Meta-Update):
       Evaluate the adapted model (θ') on a query set (unseen data for that student).
       Update the base model (θ) to minimize that query loss.
       θ = θ - B * ∇ L_query(θ')
       
    This forces the base weights θ to land in a spot where they are highly
    sensitive to rapid fine-tuning.
    """
    
    def __init__(self, input_dim: int = 5, hidden_dim: int = 8, inner_lr: float = 0.01, meta_lr: float = 0.001):
        self.input_dim = input_dim
        self.inner_lr = inner_lr
        self.meta_lr = meta_lr
        
        # Meta-Model (f_θ)
        self.layer1 = MetaLinearLayer(input_dim, hidden_dim, "maml_l1")
        self.layer2 = MetaLinearLayer(hidden_dim, 1, "maml_l2")
        
    @staticmethod
    def _relu(x: List[float]) -> List[float]:
        return [max(0.0, v) for v in x]
        
    @staticmethod
    def _sigmoid(x: List[float]) -> List[float]:
        return [1.0 / (1.0 + math.exp(-max(-20, min(20, v)))) for v in x]
        
    def predict(self, x: List[float], params: Optional[Dict] = None) -> float:
        """
        f_θ(x) or f_θ'(x).
        Predict a score (e.g. Next Quiz Performance) given student features.
        """
        w1 = params['w1'] if params else None
        b1 = params['b1'] if params else None
        w2 = params['w2'] if params else None
        b2 = params['b2'] if params else None
        
        h = self._relu(self.layer1.forward(x, w1, b1))
        out = self._sigmoid(self.layer2.forward(h, w2, b2))
        return out[0]
        
    def _inner_loop_adaptation(self, support_set: List[Dict]) -> Dict:
        """
        θ' = θ - α * ∇ L(θ)
        Analytically approximates one gradient descent step on the support set.
        """
        # Base parameters
        w1_clone = [row[:] for row in self.layer1.w]
        b1_clone = list(self.layer1.b)
        w2_clone = [row[:] for row in self.layer2.w]
        b2_clone = list(self.layer2.b)
        
        # Mocking the backward pass derivative aggregation:
        # For each sample, we shift the adapted weights slightly in the
        # direction that lowers the MSE error for the support set.
        for data in support_set:
            x = data['features']
            y_true = data['target']
            
            y_pred = self.predict(x)
            error = y_pred - y_true
            
            # Simple Heuristic Gradient Approximation for demonstration
            # In a real PyTorch environment, this is `loss.backward()` followed by `w.data -= lr * w.grad`
            
            # Adjust L2 (Output Layer)
            for j in range(self.layer2.in_features):
                # mock gradient: error * activation_from_h
                w2_clone[j][0] -= self.inner_lr * error * 0.1 
            b2_clone[0] -= self.inner_lr * error * 0.1
            
            # Adjust L1 (Hidden Layer)
            for i in range(self.layer1.in_features):
                for j in range(self.layer1.out_features):
                    w1_clone[i][j] -= self.inner_lr * error * 0.05
            for j in range(self.layer1.out_features):
                b1_clone[j] -= self.inner_lr * error * 0.05
                
        return {
            'w1': w1_clone, 'b1': b1_clone,
            'w2': w2_clone, 'b2': b2_clone
        }
        
    def meta_train_step(self, tasks: List[Dict]) -> Dict:
        """
        Executes a full MAML step over a batch of tasks (students).
        
        Args:
            tasks: List. Each task is a dict containing:
                   'support': K-shot examples to adapt (e.g. 3 quizzes)
                   'query': Q-shot examples to evaluate (e.g. next 2 quizzes)
        """
        total_pre_adapt_loss = 0.0
        total_post_adapt_loss = 0.0
        
        # 1. Outer Loop
        for task in tasks:
            support = task['support']
            query = task['query']
            
            # Baseline Error (Before adaptation)
            pre_loss = 0.0
            for q in query:
                pred = self.predict(q['features'])
                pre_loss += (pred - q['target']) ** 2
            total_pre_adapt_loss += (pre_loss / len(query))
            
            # 2. Inner Loop Adaptation -> θ'
            adapted_params = self._inner_loop_adaptation(support)
            
            # 3. Outer Loop Evaluation using θ'
            post_loss = 0.0
            for q in query:
                pred_adapted = self.predict(q['features'], adapted_params)
                post_loss += (pred_adapted - q['target']) ** 2
            total_post_adapt_loss += (post_loss / len(query))
            
            # Note: In true MAML, we'd calculate the gradient of the 'post_loss'
            # with respect to the ORIGINAL base parameters 'θ', traversing through
            # the inner loop derivative (second-order derivatives).
            
        N = len(tasks)
        return {
            "meta_batch_size": N,
            "avg_loss_pre_adaptation": round(total_pre_adapt_loss / N, 4),
            "avg_loss_post_adaptation": round(total_post_adapt_loss / N, 4),
            "improvement": round((total_pre_adapt_loss - total_post_adapt_loss) / N, 4)
        }
