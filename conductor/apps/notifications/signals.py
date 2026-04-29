import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.dsa.models import Problem

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Problem)
def notify_new_problem(sender, instance, created, **kwargs):
    """
    Trigger notification when a new, active problem is created.
    Guarded — notification failure never prevents problem save.
    """
    if created and instance.is_active:
        try:
            from apps.notifications.tasks import notify_all_users_new_content
            notify_all_users_new_content.delay(instance.id, "problem")
        except Exception as e:
            logger.error("New problem notification signal failed for problem %s: %s",
                         instance.id, e)
