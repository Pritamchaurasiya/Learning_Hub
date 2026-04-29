import structlog
import random

logger = structlog.get_logger(__name__)

class BioFeedbackService:
    """
    Integrates with wearable devices (Apple Watch, Oura) to 
    read physiological signals and adapt the learning experience.
    """

    @staticmethod
    def get_current_stress_level(user_id: str) -> float:
        """
        Returns a normalized stress score (0.0 to 1.0) based on HRV (Heart Rate Variability).
        """
        # Mock connection to wearable API
        hrv = random.randint(20, 100) # ms
        
        # Lower HRV = Higher Stress
        stress_score = 1.0 - (hrv / 100.0)
        logger.info(f"💓 User HRV: {hrv}ms -> Stress Level: {stress_score:.2f}")
        
        return stress_score

    @staticmethod
    def adapt_curriculum(stress_level: float):
        """
        Recommends curriculum changes based on physiological state.
        """
        if stress_level > 0.7:
             return {
                 "action": "pause_quiz",
                 "recommendation": "breathing_exercise",
                 "ui_message": "I sense you are stressed. Let's take a 2-minute breathing break."
             }
        elif stress_level < 0.2:
             return {
                 "action": "increase_difficulty",
                 "recommendation": "challenge_mode",
                 "ui_message": "You are in the flow! activating 'Challenge Mode'."
             }
        
        return {"action": "continue"}
