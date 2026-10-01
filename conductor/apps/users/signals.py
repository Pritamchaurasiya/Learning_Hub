"""
Domain event signals for Users app.
"""

import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)
User = get_user_model()


@receiver(post_save, sender=User)
def on_user_created(sender, instance, created, **kwargs):
    """
    Handle post-creation side effects:
    - Log audit entry
    - Initialize streak and gamification profile
    """
    if created:
        logger.info("New user account created: %s (%s)", instance.email, instance.id)
        # Attempt to award initial signup XP via gamification
        try:
            from apps.gamification.services import GamificationService
            GamificationService.award_xp(instance, 50, reason="Account Registration Bonus")
        except Exception:
            pass
