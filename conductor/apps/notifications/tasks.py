import logging
import os
from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)

def _get_fcm_client():
    """Initialize and return Firebase Admin SDK client for FCM."""
    # Check if FCM is configured
    fcm_credentials = getattr(settings, 'FCM_CREDENTIALS', None)
    if not fcm_credentials:
        # Try to get from environment variable path
        fcm_path = os.getenv('FCM_CREDENTIALS_PATH')
        if fcm_path and os.path.exists(fcm_path):
            import json
            try:
                with open(fcm_path, 'r') as f:
                    fcm_credentials = json.load(f)
            except Exception as e:
                logger.warning("Failed to load FCM credentials: %s", e)
                return None
        else:
            return None
    
    try:
        import firebase_admin
        from firebase_admin import messaging
        
        if not firebase_admin._apps:
            if isinstance(fcm_credentials, dict):
                firebase_admin.initialize_app(
                    credentials=firebase_admin.credentials.Certificate(fcm_credentials)
                )
            else:
                # Try default credentials
                firebase_admin.initialize_app()
        return messaging
    except ImportError:
        logger.warning("firebase-admin package not installed. Push notifications will be mocked.")
        return None
    except Exception as e:
        logger.warning("Failed to initialize Firebase: %s", e)
        return None


@shared_task(name="send_email_async", bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={'max_retries': 3})
def send_email_async(self, subject, message, recipient_list):
    """
    Asynchronously send an email.
    
    Args:
        subject: Email subject
        message: Email body
        recipient_list: List of recipient email addresses
    """
    try:
        if not isinstance(recipient_list, list):
            recipient_list = [recipient_list]
            
        logger.info("Sending email async: %s to %s", subject, recipient_list)
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipient_list,
            fail_silently=False,
        )
        return True
    except Exception as e:
        logger.error("Failed to send email async: %s", e)
        return False

@shared_task(name="send_push_async", bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={'max_retries': 3})
def send_push_async(self, user_id, title, message, priority="normal"):
    """
    Asynchronously send a push notification via FCM.
    
    Uses Firebase Cloud Messaging when available, falls back to mock logging.
    """
    try:
        from django.contrib.auth import get_user_model
        from apps.notifications.models import DeviceToken
        
        # Get user's active device tokens
        device_tokens = DeviceToken.objects.filter(
            user_id=user_id,
            is_active=True
        ).values_list('token', flat=True)
        
        if not device_tokens:
            logger.debug("No device tokens found for user %s", user_id)
            return False
        
        # Try to use FCM
        messaging = _get_fcm_client()
        
        if messaging:
            # Build message for each token
            for token in device_tokens:
                message = messaging.Message(
                    notification=messaging.Notification(
                        title=title,
                        body=message,
                    ),
                    token=token,
                    priority=messaging.NormalPriority if priority == 'normal' else messaging.HighPriority,
                )
                try:
                    response = messaging.send(message)
                    logger.info("FCM push sent successfully: %s", response)
                except Exception as e:
                    logger.error("FCM send error for token %s...: %s", token[:20], e)
            return True
        else:
            # Fallback: Log the notification (mock mode)
            logger.info("[MOCK] Push notification: %s to user %s (tokens: %d)", title, user_id, len(device_tokens))
            return True
            
    except Exception as e:
        logger.error("Failed to send push async: %s", e)
        return False

@shared_task(name="notify_all_users_new_content", bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={'max_retries': 2})
def notify_all_users_new_content(self, problem_id, content_type="problem"):
    """
    Asynchronously fan-out notifications for new content.
    """
    try:
        from django.contrib.auth import get_user_model
        from apps.notifications.services import NotificationService
        user_model = get_user_model()
        
        # Query active users
        users = user_model.objects.filter(is_active=True)[:100] # Limit for performance mock
        
        title = f"New {content_type.capitalize()} Available!"
        message = f"Check out the latest {content_type} we just added."
        
        NotificationService.send_bulk_notification(
            users=users,
            title=title,
            message=message,
            channels=['in_app', 'push']
        )
        logger.info("Fanned out new %s notification for ID %s", content_type, problem_id)
        return True
    except Exception as e:
        logger.error("Failed to notify all users for new content: %s", e)
        return False
