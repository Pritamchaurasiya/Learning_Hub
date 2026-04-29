import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.courses.models import Course

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Course)
def generate_course_embedding(sender, instance, created, **kwargs):
    """
    Generate embedding for course description on save.
    Uses Celery for asynchronous processing.
    Guarded — embedding failure never prevents course save.
    """
    # Skip if using loaddata or raw
    if kwargs.get('raw', False):
        return

    try:
        from apps.ai_engine.tasks import update_course_embedding
        from django.db import transaction
        transaction.on_commit(lambda: update_course_embedding.delay(instance.id))
    except Exception as e:
        logger.error("Course embedding signal failed for course %s: %s", instance.id, e)
