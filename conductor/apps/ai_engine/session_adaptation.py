"""
Session Adaptation Service

Uses Test-Time Adaptation (TTA) to dynamically adjust learning experience
based on real-time user performance within a session.

Key Features:
1. Entropy-based struggle detection
2. Adaptive difficulty scaling
3. Personalized concept reinforcement
"""

import logging
import math
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class SessionState:
    """Tracks user's current session state."""
    user_id: int
    session_id: str
    start_time: datetime = field(default_factory=datetime.now)
    
    # Performance tracking
    attempts: List[Dict] = field(default_factory=list)
    correct_count: int = 0
    total_count: int = 0
    
    # Adaptation state
    current_difficulty: float = 0.5  # 0=Easy, 1=Hard
    confidence_entropy: float = 1.0  # High = uncertain
    
    # Concept mastery
    concept_scores: Dict[str, float] = field(default_factory=dict)
    

class SessionAdapter:
    """
    Adapts learning session in real-time using TTA principles.
    
    - TENT (Entropy Minimization): Adjust when user shows high uncertainty
    - Pseudo-Labeling: Use confident predictions to reinforce learning
    """
    
    DIFFICULTY_LEVELS = ['EASY', 'MEDIUM', 'HARD']
    ADAPTATION_RATE = 0.1
    
    def __init__(self, user_id: int, session_id: str):
        self.state = SessionState(user_id=user_id, session_id=session_id)
        self._running_entropy = []
        
    def record_attempt(
        self,
        problem_id: int,
        is_correct: bool,
        time_taken_ms: int,
        difficulty: str,
        concepts: List[str]
    ) -> Dict:
        """
        Record an attempt and adapt session.
        
        Returns:
            Adaptation result with recommended next difficulty
        """
        self.state.total_count += 1
        if is_correct:
            self.state.correct_count += 1
            
        # Store attempt
        attempt = {
            'problem_id': problem_id,
            'correct': is_correct,
            'time_ms': time_taken_ms,
            'difficulty': difficulty,
            'concepts': concepts,
            'timestamp': datetime.now().isoformat()
        }
        self.state.attempts.append(attempt)
        
        # Update concept scores
        for concept in concepts:
            if concept not in self.state.concept_scores:
                self.state.concept_scores[concept] = 0.5
            
            # Exponential moving average
            current = self.state.concept_scores[concept]
            update = 1.0 if is_correct else 0.0
            self.state.concept_scores[concept] = (
                0.8 * current + 0.2 * update
            )
        
        # Compute entropy and adapt
        adaptation = self._adapt()
        
        return {
            'session_id': self.state.session_id,
            'current_accuracy': self.state.correct_count / max(1, self.state.total_count),
            'confidence_entropy': self.state.confidence_entropy,
            'recommended_difficulty': adaptation['next_difficulty'],
            'weak_concepts': adaptation['weak_concepts'],
            'message': adaptation['message']
        }
    
    def _adapt(self) -> Dict:
        """
        Core adaptation logic using TTA principles.
        
        1. Compute recent performance entropy
        2. Adjust difficulty based on entropy
        3. Identify weak concepts for reinforcement
        """
        # Compute entropy from recent attempts (last 5)
        recent = self.state.attempts[-5:]
        if len(recent) < 2:
            return {
                'next_difficulty': 'EASY',
                'weak_concepts': [],
                'message': 'Warming up...'
            }
        
        # Calculate correctness probability
        correct_count = sum(1 for a in recent if a['correct'])
        p_correct = correct_count / len(recent)
        
        # Entropy: H = -p*log(p) - (1-p)*log(1-p)
        if p_correct == 0 or p_correct == 1:
            entropy = 0.0
        else:
            entropy = -(
                p_correct * math.log2(p_correct) +
                (1 - p_correct) * math.log2(1 - p_correct)
            )
        
        self.state.confidence_entropy = entropy
        self._running_entropy.append(entropy)
        
        # Adaptation rules
        if entropy > 0.9:  # High uncertainty - user is struggling
            self.state.current_difficulty = max(0.0, self.state.current_difficulty - self.ADAPTATION_RATE)
            message = "Detected struggle. Adjusting to easier problems."
        elif entropy < 0.3 and p_correct > 0.8:  # Low entropy, high accuracy - mastery
            self.state.current_difficulty = min(1.0, self.state.current_difficulty + self.ADAPTATION_RATE)
            message = "Great progress! Increasing challenge."
        else:
            message = "Maintaining current difficulty."
        
        # Map difficulty to level
        if self.state.current_difficulty < 0.33:
            next_difficulty = 'EASY'
        elif self.state.current_difficulty < 0.66:
            next_difficulty = 'MEDIUM'
        else:
            next_difficulty = 'HARD'
        
        # Identify weak concepts (score < 0.5)
        weak_concepts = [
            concept for concept, score in self.state.concept_scores.items()
            if score < 0.5
        ]
        
        return {
            'next_difficulty': next_difficulty,
            'weak_concepts': weak_concepts[:3],  # Top 3
            'message': message
        }
    
    def get_session_summary(self) -> Dict:
        """Get comprehensive session summary."""
        duration = (datetime.now() - self.state.start_time).total_seconds()
        
        return {
            'session_id': self.state.session_id,
            'duration_seconds': duration,
            'total_attempts': self.state.total_count,
            'accuracy': self.state.correct_count / max(1, self.state.total_count),
            'avg_entropy': sum(self._running_entropy) / max(1, len(self._running_entropy)),
            'final_difficulty': self.state.current_difficulty,
            'concept_mastery': self.state.concept_scores,
            'weak_areas': [c for c, s in self.state.concept_scores.items() if s < 0.5],
            'strong_areas': [c for c, s in self.state.concept_scores.items() if s >= 0.8]
        }
    
    def get_next_problem_criteria(self) -> Dict:
        """
        Get criteria for selecting the next problem.
        
        Returns filtering criteria for problem selection.
        """
        summary = self._adapt()
        
        # Prefer problems that reinforce weak concepts
        return {
            'difficulty': summary['next_difficulty'],
            'preferred_concepts': summary['weak_concepts'],
            'avoid_recently_seen': [a['problem_id'] for a in self.state.attempts[-10:]]
        }


class SessionManager:
    """
    Manages multiple user sessions with TTA adaptation.
    """
    _sessions: Dict[str, SessionAdapter] = {}
    
    @classmethod
    def get_or_create_session(cls, user_id: int, session_id: str) -> SessionAdapter:
        """Get existing session or create new one."""
        key = f"{user_id}:{session_id}"
        
        if key not in cls._sessions:
            cls._sessions[key] = SessionAdapter(user_id, session_id)
            logger.info(f"Created new adaptive session: {key}")
        
        return cls._sessions[key]
    
    @classmethod
    def end_session(cls, user_id: int, session_id: str) -> Optional[Dict]:
        """End and cleanup session, returning summary."""
        key = f"{user_id}:{session_id}"
        
        if key in cls._sessions:
            summary = cls._sessions[key].get_session_summary()
            del cls._sessions[key]
            logger.info(f"Ended session {key}: {summary['total_attempts']} attempts")
            return summary
        
        return None
    
    @classmethod
    def get_active_sessions_count(cls) -> int:
        """Get number of active sessions."""
        return len(cls._sessions)
