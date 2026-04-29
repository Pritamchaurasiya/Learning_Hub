import math
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)


class ActiveLearningEngine:
    """
    Phase 70: Active Learning (Uncertainty Sampling).
    
    Motivation: Labeling data (e.g. grading essays, tagging student intent)
    is expensive and time-consuming. Instead of randomly picking items to label,
    the model should ask the human "Oracle" (Teacher) only for the labels of 
    the examples it is MOST confused about.
    
    This drastically reduces the annotation budget while accelerating model accuracy.
    """
    
    def __init__(self, num_classes: int = 3):
        self.num_classes = num_classes
        
    def _calculate_entropy(self, probabilities: List[float]) -> float:
        """
        Shannon Entropy: H(X) = -sum( p(x) * log(p(x)) )
        High Entropy = High Uncertainty (Model is confused).
        """
        entropy = 0.0
        for p in probabilities:
            if p > 0:
                entropy -= p * math.log(p, 2)
        return entropy
        
    def _calculate_margin(self, probabilities: List[float]) -> float:
        """
        Margin Sampling: P(y_1 | x) - P(y_2 | x)
        Difference between the top 2 most likely classes.
        Low Margin = High Uncertainty (Model is torn between two choices).
        """
        if len(probabilities) < 2:
            return 1.0 # Certain by default
            
        sorted_probs = sorted(probabilities, reverse=True)
        return sorted_probs[0] - sorted_probs[1]
        
    def execute_query_strategy(self, unlabeled_pool: List[Dict], batch_size: int = 5, strategy: str = "entropy") -> Dict:
        """
        Evaluates the unlabeled pool and selects the top `batch_size` items
        that the model is most uncertain about. These are sent to the "Oracle" (Human).
        
        Args:
            unlabeled_pool: List of items dict containing 'id' and 'predicted_probs'.
            strategy: "entropy" (maximize) or "margin" (minimize).
        """
        scored_pool = []
        
        for item in unlabeled_pool:
            probs = item.get('predicted_probs', [])
            
            # Simple fallback validation
            if not probs or len(probs) != self.num_classes:
                # uniform distribution if no valid predictions exist
                probs = [1.0 / self.num_classes] * self.num_classes 
                
            if strategy == "entropy":
                score = self._calculate_entropy(probs)
            elif strategy == "margin":
                score = self._calculate_margin(probs)
            else:
                raise ValueError("Valid strategies are 'entropy' and 'margin'.")
                
            scored_pool.append({
                "item_id": item.get('id', 'unknown'),
                "probabilities": [round(p, 4) for p in probs],
                "uncertainty_score": round(score, 4)
            })
            
        # Sort the pool based on the strategy
        if strategy == "entropy":
            # We want HIGH entropy (most confused)
            scored_pool.sort(key=lambda x: x['uncertainty_score'], reverse=True)
        elif strategy == "margin":
            # We want LOW margin (closest decision boundary)
            scored_pool.sort(key=lambda x: x['uncertainty_score'], reverse=False)
            
        # Select the top K items for annotation
        selected_batch = scored_pool[:batch_size]
        
        return {
            "strategy_used": strategy,
            "pool_evaluated": len(unlabeled_pool),
            "selected_batch_size": len(selected_batch),
            "items_to_annotate_by_oracle": selected_batch
        }
