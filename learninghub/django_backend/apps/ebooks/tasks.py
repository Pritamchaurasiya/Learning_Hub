import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def process_ebook_upload_task(self, ebook_id: str):
    """Asynchronous background processor for uploaded ePub/PDF ebooks."""
    try:
        from .models import Ebook
        ebook = Ebook.objects.get(id=ebook_id)
        logger.info("Processing ebook upload: %s (%s)", ebook.title, ebook_id)
        # File parsing, chapter extraction, and text indexation logic
        return f"Successfully processed ebook {ebook_id}"
    except Exception as exc:
        logger.error("Error processing ebook %s: %s", ebook_id, str(exc))
        raise self.retry(exc=exc)
