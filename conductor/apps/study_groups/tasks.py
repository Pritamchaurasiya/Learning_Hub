from celery import shared_task
import logging

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    queue='default',
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={'max_retries': 3},
)
def send_group_welcome_email(self, user_email, group_name):
    """
    Sends a welcome email asynchronously when a user joins a study group.
    Uses retry with exponential backoff for SMTP transient failures.
    """
    logger.info("CELERY TASK START: Sending Welcome Email to %s for group %s", user_email, group_name)

    try:
        from django.core.mail import send_mail
        from django.conf import settings

        send_mail(
            subject=f"Welcome to {group_name}!",
            message=f"You have successfully joined the study group '{group_name}'. Start collaborating now!",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user_email],
            fail_silently=False,
        )
        logger.info("CELERY TASK COMPLETE: Welcome Email sent to %s", user_email)
        return True
    except Exception as e:
        logger.error("CELERY TASK FAILED: Welcome Email to %s: %s", user_email, e)
        raise  # Let autoretry handle it
