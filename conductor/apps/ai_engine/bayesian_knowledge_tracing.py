"""
Phase 148: Bayesian Knowledge Tracing (BKT) + Optimal Spaced Repetition

BKT is a Hidden Markov Model (HMM) that tracks the probability a student
has "learned" a specific skill based on their observable performance.

This replaces naive spaced repetition (like Anki's SM-2) with a principled
Bayesian approach, personalized to each student-skill pair.

HMM Parameters:
  P(L0)     — Prior probability student knows the skill initially
  P(T)      — Probability of learning (transitioning from unknown → known)
  P(G)      — Probability of guessing correctly despite not knowing
  P(S)      — Probability of slipping (getting it wrong despite knowing)

Update Rule (Bayes' Theorem):
  If correct:
    P(L_t | correct) = P(L_{t-1}) * (1 - P(S)) / P(correct)
  If incorrect:
    P(L_t | incorrect) = P(L_{t-1}) * P(S) / P(incorrect)
    
  Then: P(L_t) = P(L_t | obs) + (1 - P(L_t | obs)) * P(T)
"""
import math
import random
import logging
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class BKTParams:
    """Parameters for a single skill's BKT model."""
    p_init: float = 0.3    # P(L0) — initial knowledge probability
    p_transit: float = 0.1  # P(T) — learning rate per opportunity
    p_guess: float = 0.2    # P(G) — blind guess probability
    p_slip: float = 0.1     # P(S) — careless error probability
    
    def validate(self) -> bool:
        """All probabilities must be in [0, 1]."""
        return all(0 <= p <= 1 for p in [self.p_init, self.p_transit, self.p_guess, self.p_slip])


@dataclass
class StudentSkillState:
    """Tracks a student's mastery of a specific skill."""
    student_id: str
    skill_id: str
    p_mastery: float = 0.3   # Current P(L)
    num_attempts: int = 0
    num_correct: int = 0
    history: List[Dict[str, Any]] = field(default_factory=list)
    last_review_time: float = 0.0


class BKTModel:
    """
    Bayesian Knowledge Tracing Engine.
    
    Updates mastery probability after each student interaction using
    Bayes' theorem with the BKT HMM parameters.
    """
    
    def __init__(self, params: Optional[BKTParams] = None):
        self.params = params or BKTParams()
        if not self.params.validate():
            raise ValueError("All BKT parameters must be in [0, 1]")
    
    def update(self, state: StudentSkillState, is_correct: bool) -> float:
        """
        Update the student's mastery probability using Bayes' theorem.
        
        Steps:
        1. Compute P(correct) or P(incorrect) given current state
        2. Apply Bayes' rule to get posterior P(L | observation)
        3. Apply learning transition: P(L_new) = P(L|obs) + (1 - P(L|obs)) * P(T)
        """
        p_l = state.p_mastery
        p_g = self.params.p_guess
        p_s = self.params.p_slip
        p_t = self.params.p_transit
        
        if is_correct:
            # P(correct) = P(L) * (1-P(S)) + P(¬L) * P(G)
            p_correct = p_l * (1 - p_s) + (1 - p_l) * p_g
            # P(L | correct) via Bayes
            p_l_given_obs = (p_l * (1 - p_s)) / (p_correct + 1e-10)
        else:
            # P(incorrect) = P(L) * P(S) + P(¬L) * (1-P(G))
            p_incorrect = p_l * p_s + (1 - p_l) * (1 - p_g)
            # P(L | incorrect) via Bayes
            p_l_given_obs = (p_l * p_s) / (p_incorrect + 1e-10)
        
        # Learning transition: even if not mastered, there's a probability of learning
        p_l_new = p_l_given_obs + (1 - p_l_given_obs) * p_t
        
        # Clamp to valid probability range
        p_l_new = max(0.0, min(1.0, p_l_new))
        
        # Update state
        state.p_mastery = p_l_new
        state.num_attempts += 1
        if is_correct:
            state.num_correct += 1
        
        state.history.append({
            "attempt": state.num_attempts,
            "correct": is_correct,
            "p_mastery_before": round(p_l, 4),
            "p_mastery_after": round(p_l_new, 4),
        })
        
        return p_l_new
    
    def predict_correct(self, state: StudentSkillState) -> float:
        """Predict probability the student will answer correctly."""
        p_l = state.p_mastery
        return p_l * (1 - self.params.p_slip) + (1 - p_l) * self.params.p_guess
    
    def is_mastered(self, state: StudentSkillState, threshold: float = 0.95) -> bool:
        """Check if the student has mastered this skill."""
        return state.p_mastery >= threshold


class SpacedRepetitionScheduler:
    """
    Optimal Spaced Repetition using the Ebbinghaus Forgetting Curve.
    
    The forgetting curve is modeled as:
      R(t) = e^(-t/S)
    
    Where:
      R(t) = retention probability at time t
      S = stability (how long the memory lasts, increases with each review)
      t = time since last review
    
    The optimal review time is when R(t) drops below a target threshold (e.g., 0.85).
    """
    
    def __init__(self, target_retention: float = 0.85, initial_stability: float = 1.0):
        self.target_retention = target_retention
        self.initial_stability = initial_stability
    
    def compute_retention(self, time_elapsed: float, stability: float) -> float:
        """Compute current memory retention using exponential decay."""
        return math.exp(-time_elapsed / max(stability, 0.01))
    
    def compute_optimal_interval(self, stability: float) -> float:
        """
        Compute the optimal review interval in days.
        Solve R(t) = target for t:  t = -S * ln(target)
        """
        return -stability * math.log(self.target_retention)
    
    def update_stability(self, current_stability: float, grade: float, 
                         retrievability: float) -> float:
        """
        Update memory stability after a review.
        
        Higher grade (correct answer) → stability increases (memory strengthens)
        Retrieved from weak memory (low R) → stability increases MORE (desirable difficulty)
        """
        # Stability increase factor
        # Key insight: reviewing something you barely remember teaches more than
        # reviewing something fresh (the "desirable difficulty" principle)
        difficulty_bonus = 1.0 + (1.0 - retrievability)  # Higher bonus for harder recalls
        
        if grade >= 0.6:  # Correct-ish
            new_stability = current_stability * (1.0 + 0.5 * grade * difficulty_bonus)
        else:  # Incorrect — stability drops (memory resets partially)
            new_stability = current_stability * 0.5
        
        return max(0.5, new_stability)  # Minimum stability of 0.5 days
    
    def schedule_reviews(self, skills: List[Dict[str, Any]], current_time: float = 0.0) -> List[Dict[str, Any]]:
        """
        Generate a review schedule for multiple skills.
        Prioritizes skills closest to their forgetting threshold.
        """
        schedule = []
        
        for skill in skills:
            stability = skill.get("stability", self.initial_stability)
            last_review = skill.get("last_review", 0.0)
            time_elapsed = current_time - last_review
            
            retention = self.compute_retention(time_elapsed, stability)
            optimal_interval = self.compute_optimal_interval(stability)
            next_review = last_review + optimal_interval
            
            schedule.append({
                "skill_id": skill["skill_id"],
                "current_retention": round(retention, 3),
                "stability_days": round(stability, 2),
                "optimal_interval_days": round(optimal_interval, 2),
                "next_review_at": round(next_review, 2),
                "urgency": "REVIEW NOW" if retention < self.target_retention else "SCHEDULED",
            })
        
        # Sort by urgency (lowest retention first)
        schedule.sort(key=lambda x: x["current_retention"])
        return schedule


def run_bkt_experiment() -> Dict[str, Any]:
    """Full BKT + Spaced Repetition simulation."""
    # 1. BKT Simulation
    bkt = BKTModel(BKTParams(p_init=0.2, p_transit=0.15, p_guess=0.25, p_slip=0.1))
    state = StudentSkillState(student_id="student_42", skill_id="algebra_basics")
    
    # Simulate 10 practice attempts
    responses = [True, False, True, True, False, True, True, True, True, True]
    for correct in responses:
        bkt.update(state, correct)
    
    # 2. Spaced Repetition Scheduling
    scheduler = SpacedRepetitionScheduler(target_retention=0.85)
    skills = [
        {"skill_id": "algebra", "stability": 3.0, "last_review": 0.0},
        {"skill_id": "calculus", "stability": 1.5, "last_review": 1.0},
        {"skill_id": "geometry", "stability": 5.0, "last_review": 2.0},
        {"skill_id": "statistics", "stability": 0.8, "last_review": 3.0},
    ]
    schedule = scheduler.schedule_reviews(skills, current_time=4.0)
    
    return {
        "bkt_result": {
            "student": state.student_id,
            "skill": state.skill_id,
            "final_mastery": round(state.p_mastery, 4),
            "is_mastered": bkt.is_mastered(state),
            "attempts": state.num_attempts,
            "accuracy": round(state.num_correct / state.num_attempts, 3),
            "history": state.history,
        },
        "spaced_repetition": {
            "target_retention": 0.85,
            "schedule": schedule,
        },
        "insight": "BKT + Spaced Repetition creates a personalized, scientifically-optimal review schedule for each student-skill pair."
    }
