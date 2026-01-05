"""
Notification Service Layer.
"""

from .models import Notification


class NotificationService:
    @staticmethod
    def create_notification(
        user, title, message, type=Notification.Type.SYSTEM, data=None
    ):
        """Create an in-app notification."""
        return Notification.objects.create(
            user=user, title=title, message=message, type=type, data=data or {}
        )
