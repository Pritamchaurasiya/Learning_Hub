"""
Signals for the Discussions app.
"""
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import DiscussionThread, DiscussionReply
from apps.gamification.services import GamificationService

logger = logging.getLogger(__name__)


@receiver(post_save, sender=DiscussionThread)
def on_discussion_created(sender, instance, created, **kwargs):
    """
    Award XP when a user creates a new discussion.
    """
    if created:
        try:
            GamificationService.award_xp(instance.author, 10, "Started a Discussion")
            GamificationService.check_streaks(instance.author)
        except Exception as e:
            logger.error("Signal on_discussion_created failed: %s", e)


@receiver(post_save, sender=DiscussionReply)
def on_comment_created(sender, instance, created, **kwargs):
    """
    Award XP when a user comments on a discussion.
    """
    if created:
        try:
            GamificationService.award_xp(instance.author, 5, "Commented on Discussion")
        except Exception as e:
            logger.error("Signal on_comment_created XP award failed: %s", e)

        # Notify Discussion Author (if different from commenter)
        if instance.thread.author != instance.author:
            try:
                from apps.core.event_bus import EventBus
                EventBus.publish("discussion.commented", {
                    "discussion_id": str(instance.thread.id),
                    "comment_id": str(instance.id),
                    "author_id": instance.thread.author.id,
                    "commenter_id": instance.author.id
                })
            except Exception as e:
                logger.error("Signal on_comment_created EventBus failed: %s", e)
