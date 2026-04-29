import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import GroupMembership

logger = logging.getLogger(__name__)


@receiver(post_save, sender=GroupMembership)
def trigger_welcome_email(sender, instance, created, **kwargs):
    """
    Listens for new GroupMembership creations.
    When a user joins a group, fires an async welcome email.
    Fully guarded — task scheduling failure never prevents membership save.
    """
    if created and instance.role == 'member':
        try:
            from .tasks import send_group_welcome_email
            send_group_welcome_email.delay(instance.user.email, instance.group.name)
        except Exception as e:
            logger.error("Welcome email signal failed for user %s group %s: %s",
                         instance.user_id, instance.group_id, e)
