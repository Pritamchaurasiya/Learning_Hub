
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class NotificationService:
    """
    Omnichannel Notification Service.
    Supports: In-App, Email (Mock), Push (Mock).
    
    Enhanced with proper error handling and logging.
    """
    
    # Notification Types for categorization
    class NotificationType:
        GENERAL = 'general'
        ACHIEVEMENT = 'achievement'
        REMINDER = 'reminder'
        COURSE_UPDATE = 'course_update'
        CHALLENGE = 'challenge'
        SYSTEM = 'system'
    
    @staticmethod
    def send_notification(
        user,
        title,
        message,
        channels=None,
        action_url=None,
        notification_type='general',
        priority='normal'
    ):
        """
        Send notification to specified channels.
        
        Args:
            user: User instance
            title: Notification title
            message: Notification body
            channels: List of channels ['in_app', 'email', 'push']
            action_url: Optional deep link URL
            notification_type: Type for categorization
            priority: 'low', 'normal', 'high'
        
        Returns:
            dict with success status per channel
        """
        if channels is None:
            channels = ['in_app']
        
        results = {}
        
        # 1. In-App (WebSocket + DB)
        if 'in_app' in channels:
            results['in_app'] = NotificationService._send_in_app(
                user, title, message, action_url, notification_type
            )
        
        # 2. Email (Mock)
        if 'email' in channels:
            results['email'] = NotificationService._send_email(
                user, title, message
            )
        
        # 3. Push (Mock - FCM/APNS)
        if 'push' in channels:
            results['push'] = NotificationService._send_push(
                user, title, message, priority
            )
        
        return results
    
    @staticmethod
    def _send_in_app(user, title, message, action_url, notification_type):
        """Send in-app notification with WebSocket broadcast."""
        try:
            from apps.notifications.models import Notification
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            
            # Map the arguments to the Notification model fields
            # Notification has type and data (JSONField)
            notification = Notification.objects.create(
                user=user,
                title=title,
                message=message,
                type=notification_type if hasattr(Notification.Type, notification_type.upper()) else 'system',
                data={'action_url': action_url} if action_url else {}
            )
            
            # Real-time Push via WebSocket
            try:
                channel_layer = get_channel_layer()
                if channel_layer:
                    async_to_sync(channel_layer.group_send)(
                        f"user_{user.id}",
                        {
                            "type": "send_notification",
                            "data": {
                                "id": str(notification.id),
                                "title": title,
                                "message": message,
                                "action_url": action_url,
                                "type": notification_type
                            }
                        }
                    )
            except Exception as ws_error:
                logger.warning(f"WebSocket broadcast failed: {ws_error}")
            
            logger.info(f"[IN_APP] Notification sent to {user.username}: {title}")
            return True
            
        except Exception as e:
            logger.error(f"[IN_APP] Failed to send notification: {e}")
            return False
    
    @staticmethod
    def _send_email(user, title, message):
        """Send email notification (mock for now)."""
        try:
            if not user.email:
                logger.warning(f"[EMAIL] User {user.username} has no email")
                return False
            
            from apps.notifications.tasks import send_email_async
            send_email_async.delay(subject=title, message=message, recipient_list=[user.email])
            
            logger.info(f"[EMAIL] Queued to: {user.email} | Subject: {title}")
            return True
            
        except Exception as e:
            logger.error(f"[EMAIL] Failed to send: {e}")
            return False
    
    @staticmethod
    def _send_push(user, title, message, priority='normal'):
        """Send push notification (mock for now)."""
        try:
            from apps.notifications.tasks import send_push_async
            send_push_async.delay(user.id, title, message, priority)
            
            logger.info(f"[PUSH] Queued for User: {user.username} | Title: {title} | Priority: {priority}")
            return True
            
        except Exception as e:
            logger.error(f"[PUSH] Failed to send: {e}")
            return False
    
    @staticmethod
    def send_bulk_notification(users, title, message, channels=None):
        """
        Send notification to multiple users.
        
        Args:
            users: QuerySet or list of User instances
            title: Notification title
            message: Notification body
            channels: List of channels
        
        Returns:
            dict with success count per channel
        """
        if channels is None:
            channels = ['in_app']
        
        results = {'in_app': 0, 'email': 0, 'push': 0, 'total': 0}
        
        for user in users:
            channel_results = NotificationService.send_notification(
                user, title, message, channels
            )
            for channel, success in channel_results.items():
                if success:
                    results[channel] = results.get(channel, 0) + 1
            results['total'] += 1
        
        logger.info(f"[BULK] Sent {results['total']} notifications")
        return results

