import logging
from celery import shared_task
from django.core.mail import EmailMultiAlternatives
from django.conf import settings

logger = logging.getLogger(__name__)

@shared_task(bind=True, queue="default", autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={'max_retries': 3})
def send_email_task(self, subject, body, to_email, html_content=None, from_email=None):
    """
    Async task to send email.
    """
    try:
        from_email = from_email or settings.DEFAULT_FROM_EMAIL
        
        email = EmailMultiAlternatives(
            subject=subject,
            body=body,
            from_email=from_email,
            to=[to_email]
        )
        
        if html_content:
            email.attach_alternative(html_content, "text/html")
            
        email.send(fail_silently=False)
        logger.info(f"Async email sent to {to_email}: {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send async email to {to_email}: {e}")
        return False
