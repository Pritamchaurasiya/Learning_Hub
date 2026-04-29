
from django.utils import timezone
from datetime import timedelta
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

class ReviewService:
    """
    Spaced Repetition System (SRS) Service.
    Implements a simplified SuperMemo-2 (SM-2) algorithm.
    """

    @staticmethod
    def calculate_next_review(quality: int, previous_interval: int, repetitions: int, ease_factor: float):
        """
        SM-2 Algorithm Implementation.
        
        Args:
            quality: 0-5 rating (0=blackout, 5=perfect)
            previous_interval: Days since last review
            repetitions: Number of successful reviews in a row
            ease_factor: Difficulty multiplier (starts at 2.5)
            
        Returns:
            (next_interval, new_repetitions, new_ease_factor)
        """
        if quality < 3:
            # If user forgot, reset repetitions and interval
            return 1, 0, ease_factor
        
        # Calculate new ease factor
        new_ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        new_ease_factor = max(1.3, new_ease_factor) # Minimum EF is 1.3

        # Calculate new repetitions
        new_repetitions = repetitions + 1

        # Calculate next interval
        if new_repetitions == 1:
            next_interval = 1
        elif new_repetitions == 2:
            next_interval = 6
        else:
            next_interval = round(previous_interval * new_ease_factor)

        return next_interval, new_repetitions, new_ease_factor

    @staticmethod
    def get_due_items(user_id: int) -> List[Dict[str, Any]]:
        """
        Get items due for review today.
        This would query a Flashcard/ReviewItem model.
        For Phase 9 prototype, we return mock data based on user's completed modules.
        """
        # In a real app, query: ReviewItem.objects.filter(user_id=user_id, next_review__lte=timezone.now())
        
        return [
            {
                "id": "1",
                "question": "What is the time complexity of QuickSort?",
                "answer": "O(n log n) average, O(n^2) worst case.",
                "topic": "Algorithms"
            },
            {
                "id": "2",
                "question": "Explain 'Provider' in Flutter.",
                "answer": "A wrapper around InheritedWidget to make state management easier.",
                "topic": "Flutter"
            }
        ]
