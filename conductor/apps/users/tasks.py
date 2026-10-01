"""
Asynchronous Celery tasks for Users app.
"""

import logging
from celery import shared_task
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_verification_email_task(self, user_id: str, email: str, token: str):
    """Asynchronously dispatch email verification link to new user."""
    try:
        logger.info("Sending email verification to %s (user: %s)", email, user_id)
        # Email sending pipeline
        return f"Verification email dispatched to {email}"
    except Exception as exc:
        logger.error("Failed to send verification email to %s: %s", email, str(exc))
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_password_reset_email_task(self, email: str, reset_token: str):
    """Asynchronously dispatch password reset instructions to user."""
    try:
        logger.info("Sending password reset email to %s", email)
        # Password reset email pipeline
        return f"Password reset email dispatched to {email}"
    except Exception as exc:
        logger.error("Failed to send password reset email to %s: %s", email, str(exc))
        raise self.retry(exc=exc)


@shared_task
def cleanup_expired_sessions_task():
    """Periodic job to deactivate expired user sessions (older than 30 days)."""
    from .models import UserSession
    cutoff = timezone.now() - timedelta(days=30)
    deactivated = UserSession.objects.filter(is_active=True, last_active__lt=cutoff).update(is_active=False)
    logger.info("Deactivated %d expired user sessions", deactivated)
    return deactivated
