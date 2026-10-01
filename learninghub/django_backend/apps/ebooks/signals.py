import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import EbookReadingProgress

logger = logging.getLogger(__name__)


@receiver(post_save, sender=EbookReadingProgress)
def on_ebook_progress_saved(sender, instance, created, **kwargs):
    """Trigger analytics update when student reads an ebook."""
    if instance.is_completed:
        logger.info("User %s completed ebook %s", instance.user_id, instance.ebook_id)
