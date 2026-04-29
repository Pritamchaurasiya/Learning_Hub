import math
import logging
from typing import List, Dict, Optional, Tuple
from collections import defaultdict
from datetime import datetime, timedelta
from django.utils import timezone

logger = logging.getLogger(__name__)


class SelfAttentionLayer:
    """
    Phase 56: A lightweight Self-Attention mechanism (single-head) for
    scoring the relative importance of historical student interactions.
    
    Instead of treating all past activities equally (like a simple average),
    Attention learns to weight recent, high-impact events exponentially 
    higher than stale, low-signal events.
    
    Math: Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) * V
    """
    
    def __init__(self, d_model: int = 8):
        """
        Args:
            d_model: Dimensionality of the feature embedding space.
        """
        self.d_model = d_model
        self.scale = math.sqrt(d_model)
    
    def _softmax(self, scores: List[float]) -> List[float]:
        """Numerically stable softmax."""
        max_score = max(scores) if scores else 0
        exp_scores = [math.exp(s - max_score) for s in scores]
        total = sum(exp_scores)
        if total == 0:
            return [1.0 / len(scores)] * len(scores)
        return [e / total for e in exp_scores]
    
    def compute_attention(
        self,
        query: List[float],
        keys: List[List[float]],
        values: List[float]
    ) -> Tuple[float, List[float]]:
        """
        Compute scaled dot-product attention.
        
        Args:
            query: The current state vector [d_model].
            keys: Historical event vectors [num_events x d_model].
            values: Scalar significance of each event [num_events].
            
        Returns:
            (attended_value, attention_weights)
        """
        if not keys:
            return 0.0, []
        
        # Dot product: Q . K_i
        scores = []
        for key in keys:
            dot = sum(q * k for q, k in zip(query, key))
            scores.append(dot / self.scale)
        
        # Softmax to get attention weights
        weights = self._softmax(scores)
        
        # Weighted sum of values
        attended = sum(w * v for w, v in zip(weights, values))
        
        return attended, weights


class EngagementPredictor:
    """
    Phase 56: Predicts the probability that a student will disengage (dropout)
    from their current learning path using Self-Attention over their 
    activity history.
    
    A high disengagement risk score triggers proactive notifications and
    adaptive content remediation.
    """
    
    # Feature indices in the embedding vector
    FEAT_TIME_DELTA = 0      # Time since last activity (hours)
    FEAT_SESSION_DUR = 1     # Session duration (minutes)
    FEAT_QUIZ_SCORE = 2      # Quiz score (0-1)
    FEAT_MODULES_VIEWED = 3  # Modules opened in session
    FEAT_STREAK = 4          # Current learning streak (days)
    FEAT_HOUR_OF_DAY = 5     # Hour of day (0-23, normalized)
    FEAT_DAY_OF_WEEK = 6     # Day of week (0-6, normalized)
    FEAT_COMPLETION_RATE = 7 # Course completion rate (0-1)
    
    D_MODEL = 8
    
    # Thresholds
    HIGH_RISK_THRESHOLD = 0.7
    MEDIUM_RISK_THRESHOLD = 0.4
    
    def __init__(self):
        self.attention = SelfAttentionLayer(d_model=self.D_MODEL)
    
    @classmethod
    def _extract_features(cls, activity: dict) -> List[float]:
        """
        Converts a raw activity record into a fixed-dimensional feature vector.
        """
        now = timezone.now()
        
        ts = activity.get('timestamp', now)
        if isinstance(ts, str):
            ts = datetime.fromisoformat(ts)
        
        time_delta_hours = max(0.01, (now - ts).total_seconds() / 3600.0)
        session_dur = activity.get('session_duration_min', 5.0)
        quiz_score = activity.get('quiz_score', 0.5)
        modules_viewed = activity.get('modules_viewed', 1)
        streak = activity.get('streak_days', 0)
        hour_of_day = ts.hour / 24.0
        day_of_week = ts.weekday() / 7.0
        completion_rate = activity.get('completion_rate', 0.0)
        
        return [
            min(time_delta_hours / 168.0, 1.0),   # Normalize to 1 week
            min(session_dur / 120.0, 1.0),          # Normalize to 2 hours
            quiz_score,
            min(modules_viewed / 10.0, 1.0),
            min(streak / 30.0, 1.0),                # Normalize to 30 days
            hour_of_day,
            day_of_week,
            completion_rate
        ]
    
    def predict_disengagement_risk(
        self,
        activity_history: List[dict]
    ) -> Dict[str, float]:
        """
        Calculates the student's dropout/disengagement risk score.
        
        Args:
            activity_history: Chronologically ordered list of activity dicts,
                each containing: timestamp, session_duration_min, quiz_score, 
                modules_viewed, streak_days, completion_rate.
                
        Returns:
            Dict with keys: risk_score, risk_level, attended_importance
        """
        if not activity_history:
            return {
                'risk_score': 0.5,
                'risk_level': 'unknown',
                'attention_weights': [],
                'recommendation': 'No activity data available.'
            }
        
        # 1. Extract feature embeddings for each activity
        keys = [self._extract_features(act) for act in activity_history]
        
        # 2. The "values" represent engagement signal strength per event
        # Higher session duration + quiz scores = more engaged
        values = []
        for act in activity_history:
            engagement_signal = (
                act.get('session_duration_min', 5) / 60.0 * 0.4 +
                act.get('quiz_score', 0.5) * 0.3 +
                act.get('completion_rate', 0.0) * 0.3
            )
            values.append(min(engagement_signal, 1.0))
        
        # 3. Query = most recent state (what does the student look like NOW?)
        query = keys[-1] if keys else [0.5] * self.D_MODEL
        
        # 4. Self-Attention: weight historical events by relevance to current state
        attended_engagement, attention_weights = self.attention.compute_attention(
            query=query, keys=keys, values=values
        )
        
        # 5. Compute risk score (inverse of attended engagement with recency bias)
        recency_penalty = keys[-1][self.FEAT_TIME_DELTA]  # Higher = longer since last visit
        streak_bonus = keys[-1][self.FEAT_STREAK]          # Higher = more consistent
        
        risk_score = (
            (1.0 - attended_engagement) * 0.5 +
            recency_penalty * 0.3 +
            (1.0 - streak_bonus) * 0.2
        )
        risk_score = max(0.01, min(0.99, risk_score))
        
        # 6. Classify risk level
        if risk_score >= self.HIGH_RISK_THRESHOLD:
            risk_level = 'high'
            recommendation = 'Student at high risk of dropout. Trigger push notification and generate remediation content.'
        elif risk_score >= self.MEDIUM_RISK_THRESHOLD:
            risk_level = 'medium'
            recommendation = 'Student showing early signs of disengagement. Schedule motivational nudge.'
        else:
            risk_level = 'low'
            recommendation = 'Student is actively engaged. No intervention needed.'
        
        return {
            'risk_score': round(risk_score, 4),
            'risk_level': risk_level,
            'attended_engagement': round(attended_engagement, 4),
            'attention_weights': [round(w, 4) for w in attention_weights],
            'recommendation': recommendation
        }
