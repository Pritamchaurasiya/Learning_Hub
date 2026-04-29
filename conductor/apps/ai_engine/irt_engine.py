"""
Item Response Theory (IRT) Engine

Psychometric analysis for Computer Adaptive Testing (CAT).
1. Ability Estimation (Theta) using Maximum Likelihood Estimation.
2. Item Characteristic Curve (ICC) - 3PL Model.
3. Adaptive Question Selection (Fisher Information).
"""

import logging
import math
import numpy as np
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class QuestionItem:
    id: str
    difficulty: float  # (b): Location parameter
    discrimination: float  # (a): Slope parameter
    guessing: float = 0.0  # (c): Lower asymptote


class IRTEngine:
    """
    Engine for Item Response Theory calculations.
    """
    
    # ==========================================================================
    # ITEM CHARACTERISTIC FUNCTIONS
    # ==========================================================================
    
    @classmethod
    def probability_correct(cls, theta: float, item: QuestionItem) -> float:
        """
        Calculate P(theta) using 3-Parameter Logistic Model (3PL).
        
        P(theta) = c + (1 - c) / (1 + e^(-a(theta - b)))
        """
        a = item.discrimination
        b = item.difficulty
        c = item.guessing
        
        # Logistic function
        exponent = -1.7 * a * (theta - b)
        
        # Avoid overflow
        if exponent > 20: 
            return c
        if exponent < -20: 
            return c + (1 - c)  # ~1.0 if c is small
            
        prob = c + (1 - c) / (1 + math.exp(exponent))
        return prob

    @classmethod
    def fisher_information(cls, theta: float, item: QuestionItem) -> float:
        """
        Calculate Fisher Information I(theta) for an item.
        Used to select the next most informative question.
        
        I(theta) = a^2 * ((P - c)^2 / (1 - c)^2) * ((1 - P) / P)
        """
        P = cls.probability_correct(theta, item)
        if P >= 1.0 or P <= item.guessing: return 0.001
        
        Q = 1 - P
        numerator = (P - item.guessing) ** 2
        denominator = (1 - item.guessing) ** 2
        
        info = (item.discrimination ** 2) * (numerator / denominator) * (Q / P)
        return info

    # ==========================================================================
    # ABILITY ESTIMATION (THETA)
    # ==========================================================================
    
    @classmethod
    def estimate_ability(cls, responses: List[Dict[str, Any]], items_map: Dict[str, QuestionItem]) -> float:
        """
        Estimate user ability (theta) based on responses using Likelihood method.
        Range typically -3.0 to +3.0.
        """
        # Simple iterative approximation (Newton-Raphson typically used)
        # Here using a simplified expected score matching or bounded search
        
        current_theta = 0.0
        learning_rate = 0.5
        
        # Simplified update rule
        for _ in range(5): # Iterations
            score_diff = 0.0
            info_sum = 0.0
            
            for resp in responses:
                item_id = resp['question_id']
                is_correct = 1.0 if resp['is_correct'] else 0.0
                item = items_map.get(item_id)
                
                if item:
                    P = cls.probability_correct(current_theta, item)
                    # Simple heuristic update direction
                    score_diff += (is_correct - P)
            
            # Dampened update
            current_theta += score_diff * learning_rate
            learning_rate *= 0.8
            
            # Clamp limits
            current_theta = max(-3.0, min(3.0, current_theta))
            
        return current_theta

    # ==========================================================================
    # ADAPTIVE SELECTION
    # ==========================================================================
    
    @classmethod
    def select_next_question(
        cls, 
        current_theta: float, 
        available_items: List[QuestionItem]
    ) -> Optional[QuestionItem]:
        """
        Select the item with highest Fisher Information at current ability estimate.
        """
        best_item = None
        max_info = -1.0
        
        for item in available_items:
            info = cls.fisher_information(current_theta, item)
            if info > max_info:
                max_info = info
                best_item = item
                
        return best_item

    # ==========================================================================
    # SIMULATION
    # ==========================================================================

    @classmethod
    def run_simulation(cls):
        """Test the engine logic."""
        # Setup pool
        pool = [
            QuestionItem("q1", -2.0, 1.0), # Very easy
            QuestionItem("q2", -1.0, 1.0), # Easy
            QuestionItem("q3", 0.0, 1.2),  # Medium
            QuestionItem("q4", 1.0, 1.5),  # Hard
            QuestionItem("q5", 2.0, 1.8),  # Very Hard
        ]
        
        # Simulate user with ability 1.2
        true_ability = 1.2
        estimated = 0.0
        responses = []
        
        # available
        remaining = {q.id: q for q in pool}
        
        for _ in range(3):
            # Select
            best = cls.select_next_question(estimated, list(remaining.values()))
            if not best: break
            
            # Answer
            p_correct = cls.probability_correct(true_ability, best)
            is_correct = np.random.random() < p_correct
            
            responses.append({'question_id': best.id, 'is_correct': is_correct})
            del remaining[best.id]
            
            # Re-estimate
            estimated = cls.estimate_ability(responses, {q.id: q for q in pool})
            
        return {"true": true_ability, "estimated": estimated, "responses": responses}
