from datetime import datetime
from typing import Dict, List
from django.db.models import F
from apps.courses.models import Enrollment

try:
    from apps.gamification.models import UserChallenge
except ImportError:
    UserChallenge = None

class KnowledgeTracer:
    """
    Phase 55: Deep Knowledge Tracing (DKT).
    
    A probabilistic engine that evaluates a user's mastery over specific concepts
    based on their historical interaction trajectory (quiz performance, viewing time,
    challenge completion).
    
    Outputs a mastery probability vector P(mastery|history) bounded [0.0, 1.0].
    """
    
    # Base prior probability of knowing a concept without any interaction
    PRIOR_KNOWLEDGE = 0.1 
    
    # The probability of guessing a question correctly despite not knowing the concept
    GUESS_RATE = 0.25
    
    # The probability of making a mistake (slipping) despite actually knowing the concept
    SLIP_RATE = 0.10
    
    # The probability of learning the concept after a single interaction
    LEARN_RATE = 0.15

    @classmethod
    def predict_mastery(cls, user_id: int, module_domain: str) -> float:
        """
        Calculate the Bayesian Knowledge Tracing probability of the user's current 
        mastery over a specific conceptual domain.
        
        Args:
            user_id (int): The ID of the student.
            module_domain (str): The specific semantic domain (e.g., 'python_basics').
            
        Returns:
            float: Mastery probability scalar [0.0, 1.0].
        """
        # 1. Fetch historical interactions related to this domain
        observations = []
        if UserChallenge is not None:
            try:
                recent_challenges = UserChallenge.objects.filter(
                    user_id=user_id,
                    challenge__title__icontains=module_domain
                ).order_by('completed_at')
                for ch in recent_challenges:
                    observations.append(ch.status == 'COMPLETED')
            except Exception:
                pass

        if not observations:
            try:
                from apps.dsa.models import Submission
                submissions = Submission.objects.filter(
                    user_id=user_id,
                    problem__title__icontains=module_domain
                ).order_by('created_at')
                for s in submissions:
                    observations.append(s.status == 'ACCEPTED')
            except Exception:
                pass

        if not observations:
            # Check Enrollment progress as a continuous mastery proxy
            try:
                enrollment = Enrollment.objects.filter(user_id=user_id, course__title__icontains=module_domain).first()
                if enrollment:
                    progress = float(enrollment.progress_percentage or 0) / 100.0
                    return max(cls.PRIOR_KNOWLEDGE, min(0.99, progress))
            except Exception:
                pass
            return cls.PRIOR_KNOWLEDGE
            
        # 2. Execute discrete Bayesian Knowledge Tracing Iterations
        current_mastery = cls.PRIOR_KNOWLEDGE
        
        for is_correct in observations:
            
            # Update step logic: 
            # P(L_t) = P(L_{t-1} | Obs) + (1 - P(L_{t-1} | Obs)) * Transition
            
            if is_correct:
                # Update given correct observation
                prob_correct_obs = (
                    current_mastery * (1 - cls.SLIP_RATE) + 
                    (1 - current_mastery) * cls.GUESS_RATE
                )
                posterior_mastery = (current_mastery * (1 - cls.SLIP_RATE)) / prob_correct_obs
            else:
                # Update given incorrect observation
                prob_incorrect_obs = (
                    current_mastery * cls.SLIP_RATE + 
                    (1 - current_mastery) * (1 - cls.GUESS_RATE)
                )
                posterior_mastery = (current_mastery * cls.SLIP_RATE) / prob_incorrect_obs
                
            # Apply learning transition
            current_mastery = posterior_mastery + (1 - posterior_mastery) * cls.LEARN_RATE
            
        # 3. Bound constraints
        final_mastery = max(0.01, min(0.99, current_mastery))
        
        return final_mastery
        
    @classmethod
    def analyze_global_gaps(cls, user_id: int) -> Dict[str, float]:
        """
        Scans all enrolled domains and returns the semantic entities where 
        Mastery < 0.6 (Needs Intervention).
        """
        weaknesses = {}
        
        # Pull distinct semantic topics from user enrollments
        enrollments = Enrollment.objects.filter(user_id=user_id).select_related('course')
        
        for enrollment in enrollments:
            # Assume course title / category acts as the primary domain
            domain = enrollment.course.title 
            
            score = cls.predict_mastery(user_id, domain)
            
            # If mastery is beneath the GenAI intervention threshold
            if score < 0.6:
                weaknesses[domain] = score
                
        return weaknesses
