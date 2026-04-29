import logging
from django.dispatch import receiver
from django.db.models.signals import post_save
from apps.courses.models import LessonCompletion
from apps.dsa.models import Submission
from .services import GamificationService

from django.contrib.auth import get_user_model
from .models import UserXP, Streak

User = get_user_model()
logger = logging.getLogger(__name__)

@receiver(post_save, sender=User)
def create_user_gamification_profiles(sender, instance, created, **kwargs):
    if created:
        try:
            UserXP.objects.get_or_create(user=instance)
            Streak.objects.get_or_create(user=instance)
        except Exception as e:
            logger.error("Failed to create gamification profiles for user %s: %s", instance.id, e)

@receiver(post_save, sender=LessonCompletion)
def on_lesson_completed(sender, instance, created, **kwargs):
    if created:
        try:
            GamificationService.award_xp(instance.user, 50, "Lesson Completed")
            GamificationService.check_streaks(instance.user)
        except Exception as e:
            logger.error("Signal on_lesson_completed failed for user %s: %s", instance.user_id, e)


@receiver(post_save, sender=Submission)
def on_dsa_submission(sender, instance, created, **kwargs):
    # Status 'AC' = Accepted (from Submission.Status choices)
    if created and instance.status == Submission.Status.ACCEPTED:
        try:
            GamificationService.award_xp(instance.user, 100, "DSA Problem Solved")
            GamificationService.check_streaks(instance.user)
        except Exception as e:
            logger.error("Signal on_dsa_submission failed for user %s: %s", instance.user_id, e)
