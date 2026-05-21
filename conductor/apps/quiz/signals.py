import logging
from django.dispatch import receiver
from django.db.models.signals import post_save
from apps.quiz.models import QuizAttempt

logger = logging.getLogger(__name__)


@receiver(post_save, sender=QuizAttempt)
def on_quiz_attempt_completed(sender, instance, created, **kwargs):
    if instance.status == "completed" and instance.is_passed:
        try:
            from apps.gamification.services import GamificationService

            # Award XP proportional to the score or a fixed amount.
            xp_reward = 100  # Default XP for passing
            if instance.percentage_score >= 90:
                xp_reward = 150
            GamificationService.award_xp(
                instance.user, xp_reward, f"Passed Quiz: {instance.quiz.title}"
            )
            GamificationService.check_streaks(instance.user)
            logger.info(
                f"Awarded {xp_reward} XP to {instance.user} for passing quiz {instance.quiz.title}"
            )
        except Exception as e:
            logger.error(
                "Failed to award XP on quiz completion for user %s: %s",
                instance.user.id,
                e,
            )
