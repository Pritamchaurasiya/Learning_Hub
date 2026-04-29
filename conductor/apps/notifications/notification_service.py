"""
Enhanced Notification Service for Learning Hub.

This module provides multi-channel notifications:
1. In-app notifications
2. Push notifications (Firebase)
3. Email notifications
4. WebSocket real-time updates
5. Notification preferences management
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import timedelta
from enum import Enum

from django.db import transaction
from django.utils import timezone
from django.core.cache import cache
from django.conf import settings

logger = logging.getLogger(__name__)


class NotificationType(Enum):
    """Types of notifications."""
    COURSE_ENROLLED = 'course_enrolled'
    LESSON_COMPLETE = 'lesson_complete'
    COURSE_COMPLETE = 'course_complete'
    BADGE_EARNED = 'badge_earned'
    LEVEL_UP = 'level_up'
    STREAK_REMINDER = 'streak_reminder'
    STREAK_AT_RISK = 'streak_at_risk'
    DISCOUNT_OFFER = 'discount_offer'
    NEW_COURSE = 'new_course'
    PAYMENT_SUCCESS = 'payment_success'
    PAYMENT_FAILED = 'payment_failed'
    COMMENT_REPLY = 'comment_reply'
    MENTION = 'mention'
    SYSTEM = 'system'


class NotificationChannel(Enum):
    """Notification delivery channels."""
    IN_APP = 'in_app'
    EMAIL = 'email'
    PUSH = 'push'
    WEBSOCKET = 'websocket'


class NotificationPriority(Enum):
    """Notification priority levels."""
    LOW = 'low'
    MEDIUM = 'medium'
    HIGH = 'high'
    URGENT = 'urgent'


class NotificationService:
    """
    Centralized notification service for multi-channel delivery.
    
    Features:
    - Multi-channel delivery (in-app, email, push, websocket)
    - User preference management
    - Batch notifications
    - Scheduled notifications
    - Notification templates
    """
    
    # Default channel mappings by notification type
    DEFAULT_CHANNELS = {
        NotificationType.BADGE_EARNED: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
        NotificationType.LEVEL_UP: [NotificationChannel.IN_APP, NotificationChannel.PUSH, NotificationChannel.WEBSOCKET],
        NotificationType.STREAK_REMINDER: [NotificationChannel.PUSH],
        NotificationType.STREAK_AT_RISK: [NotificationChannel.PUSH, NotificationChannel.EMAIL],
        NotificationType.PAYMENT_SUCCESS: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        NotificationType.PAYMENT_FAILED: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.PUSH],
        NotificationType.COURSE_COMPLETE: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.PUSH],
        NotificationType.DISCOUNT_OFFER: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        NotificationType.COMMENT_REPLY: [NotificationChannel.IN_APP],
        NotificationType.SYSTEM: [NotificationChannel.IN_APP],
    }
    
    # Templates for notifications
    TEMPLATES = {
        NotificationType.BADGE_EARNED: {
            'title': '🏆 New Badge Earned!',
            'body': 'Congratulations! You earned the "{badge_name}" badge.',
            'icon': 'badge',
        },
        NotificationType.LEVEL_UP: {
            'title': '🎉 Level Up!',
            'body': 'Amazing! You reached Level {level}!',
            'icon': 'level_up',
        },
        NotificationType.STREAK_REMINDER: {
            'title': '🔥 Keep Your Streak Alive!',
            'body': 'Complete any activity today to maintain your {streak_days}-day streak.',
            'icon': 'fire',
        },
        NotificationType.STREAK_AT_RISK: {
            'title': '⚠️ Streak at Risk!',
            'body': 'Your {streak_days}-day streak is about to break. Complete something now!',
            'icon': 'warning',
        },
        NotificationType.COURSE_COMPLETE: {
            'title': '🎓 Course Completed!',
            'body': 'You\'ve completed "{course_name}"! Ready for the next challenge?',
            'icon': 'graduation',
        },
        NotificationType.PAYMENT_SUCCESS: {
            'title': '✅ Payment Successful',
            'body': 'Your payment of ₹{amount} for "{item_name}" was successful.',
            'icon': 'payment',
        },
        NotificationType.PAYMENT_FAILED: {
            'title': '❌ Payment Failed',
            'body': 'Your payment for "{item_name}" could not be processed. Please try again.',
            'icon': 'error',
        },
    }
    
    @classmethod
    def send_notification(
        cls,
        user,
        notification_type: NotificationType,
        data: Dict[str, Any] = None,
        channels: List[NotificationChannel] = None,
        priority: NotificationPriority = NotificationPriority.MEDIUM,
        scheduled_for: timezone.datetime = None
    ) -> bool:
        """
        Send a notification through appropriate channels.
        
        Args:
            user: User to notify
            notification_type: Type of notification
            data: Template data
            channels: Override default channels
            priority: Notification priority
            scheduled_for: Schedule for later delivery
            
        Returns:
            bool: True if sent successfully
        """
        data = data or {}
        
        # Get template
        template = cls.TEMPLATES.get(notification_type, {
            'title': 'Notification',
            'body': str(data),
            'icon': 'notification',
        })
        
        # Format template
        title = template['title']
        body = template['body'].format(**data) if data else template['body']
        icon = template['icon']
        
        # Get channels
        if channels is None:
            channels = cls.DEFAULT_CHANNELS.get(notification_type, [NotificationChannel.IN_APP])
        
        # Apply user preferences
        channels = cls._filter_by_preferences(user, notification_type, channels)
        
        if not channels:
            logger.debug(f"No enabled channels for user {user.id}, type {notification_type}")
            return False
        
        # Handle scheduling
        if scheduled_for:
            return cls._schedule_notification(user, notification_type, data, channels, scheduled_for)
        
        # Send through each channel
        success = False
        for channel in channels:
            try:
                if channel == NotificationChannel.IN_APP:
                    cls._send_in_app(user, title, body, icon, notification_type, data)
                    success = True
                elif channel == NotificationChannel.EMAIL:
                    cls._send_email(user, title, body, notification_type, data)
                    success = True
                elif channel == NotificationChannel.PUSH:
                    cls._send_push(user, title, body, icon, data)
                    success = True
                elif channel == NotificationChannel.WEBSOCKET:
                    cls._send_websocket(user, title, body, notification_type, data)
                    success = True
            except Exception as e:
                logger.error(f"Failed to send {channel} notification to {user.id}: {e}")
        
        return success
    
    @classmethod
    def send_batch_notification(
        cls,
        users: List,
        notification_type: NotificationType,
        data: Dict[str, Any] = None
    ) -> int:
        """
        Send notification to multiple users.
        
        Args:
            users: List of users to notify
            notification_type: Type of notification
            data: Template data
            
        Returns:
            int: Number of successful sends
        """
        success_count = 0
        for user in users:
            if cls.send_notification(user, notification_type, data):
                success_count += 1
        
        logger.info(f"Batch notification: type={notification_type}, sent={success_count}/{len(users)}")
        return success_count
    
    @classmethod
    def get_user_notifications(
        cls,
        user,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[Dict]:
        """
        Get notifications for a user.
        """
        from apps.notifications.models import Notification
        
        queryset = Notification.objects.filter(user=user).order_by('-created_at')
        
        if unread_only:
            queryset = queryset.filter(is_read=False)
        
        notifications = queryset[:limit]
        
        return [
            {
                'id': str(n.id),
                'title': n.title,
                'message': n.message,
                'icon': n.icon,
                'type': n.notification_type,
                'data': n.data,
                'is_read': n.is_read,
                'created_at': n.created_at.isoformat(),
            }
            for n in notifications
        ]
    
    @classmethod
    def mark_as_read(cls, user, notification_id: str = None, mark_all: bool = False) -> int:
        """Mark notification(s) as read."""
        from apps.notifications.models import Notification
        
        if mark_all:
            return Notification.objects.filter(user=user, is_read=False).update(
                is_read=True,
                read_at=timezone.now()
            )
        elif notification_id:
            return Notification.objects.filter(id=notification_id, user=user).update(
                is_read=True,
                read_at=timezone.now()
            )
        return 0
    
    @classmethod
    def get_unread_count(cls, user) -> int:
        """Get unread notification count for a user."""
        cache_key = f"notification_count:{user.id}"
        count = cache.get(cache_key)
        
        if count is None:
            from apps.notifications.models import Notification
            count = Notification.objects.filter(user=user, is_read=False).count()
            cache.set(cache_key, count, timeout=60)
        
        return count
    
    # =========================================================================
    # PRIVATE METHODS
    # =========================================================================
    
    @classmethod
    def _filter_by_preferences(
        cls,
        user,
        notification_type: NotificationType,
        channels: List[NotificationChannel]
    ) -> List[NotificationChannel]:
        """Filter channels based on user preferences."""
        # Get user preferences from cache or database
        cache_key = f"notification_prefs:{user.id}"
        prefs = cache.get(cache_key)
        
        if prefs is None:
            try:
                from apps.notifications.models import NotificationPreference
                pref_obj = NotificationPreference.objects.get(user=user)
                prefs = {
                    'email_enabled': pref_obj.email_enabled,
                    'push_enabled': pref_obj.push_enabled,
                    'disabled_types': pref_obj.disabled_types or [],
                }
                cache.set(cache_key, prefs, timeout=300)
            except Exception:
                prefs = {
                    'email_enabled': True,
                    'push_enabled': True,
                    'disabled_types': [],
                }
        
        # Check if this type is disabled
        if notification_type.value in prefs.get('disabled_types', []):
            return []
        
        # Filter channels
        filtered = []
        for channel in channels:
            if channel == NotificationChannel.EMAIL and not prefs.get('email_enabled', True):
                continue
            if channel == NotificationChannel.PUSH and not prefs.get('push_enabled', True):
                continue
            filtered.append(channel)
        
        return filtered
    
    @classmethod
    def _send_in_app(cls, user, title: str, body: str, icon: str, 
                      notification_type: NotificationType, data: Dict):
        """Store in-app notification."""
        from apps.notifications.models import Notification
        
        Notification.objects.create(
            user=user,
            title=title,
            message=body,
            icon=icon,
            notification_type=notification_type.value,
            data=data
        )
        
        # Invalidate count cache
        cache.delete(f"notification_count:{user.id}")
        
        logger.debug(f"In-app notification sent to {user.id}: {title[:50]}")
    
    @classmethod
    def _send_email(cls, user, title: str, body: str, 
                    notification_type: NotificationType, data: Dict):
        """Send email notification."""
        from apps.core.email_service import EmailService
        
        # Only send if user has email
        if not user.email:
            return
        
        # Use email service
        EmailService.send_notification_email(
            to_email=user.email,
            subject=title,
            message=body,
            notification_type=notification_type.value
        )
        
        logger.debug(f"Email notification sent to {user.email}: {title[:50]}")
    
    @classmethod
    def _send_push(cls, user, title: str, body: str, icon: str, data: Dict):
        """Send push notification via Firebase."""
        # Check if user has FCM token
        fcm_token = getattr(user, 'fcm_token', None)
        if not fcm_token:
            return
        
        try:
            # Firebase integration would go here
            # firebase_admin.messaging.send(...)
            pass
        except Exception as e:
            logger.error(f"Push notification failed for {user.id}: {e}")
    
    @classmethod
    def _send_websocket(cls, user, title: str, body: str, 
                         notification_type: NotificationType, data: Dict):
        """Send real-time WebSocket notification."""
        try:
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer
            
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"user_{user.id}",
                    {
                        "type": "notification",
                        "data": {
                            "title": title,
                            "message": body,
                            "notification_type": notification_type.value,
                            "data": data,
                            "timestamp": timezone.now().isoformat()
                        }
                    }
                )
        except Exception as e:
            logger.warning(f"WebSocket notification failed for {user.id}: {e}")
    
    @classmethod
    def _schedule_notification(cls, user, notification_type: NotificationType,
                                data: Dict, channels: List, scheduled_for) -> bool:
        """Schedule a notification for later delivery."""
        from apps.notifications.models import Notification
        
        Notification.objects.create(
            user=user,
            title=cls.TEMPLATES.get(notification_type, {}).get('title', 'Notification'),
            message=cls.TEMPLATES.get(notification_type, {}).get('body', '').format(**data),
            notification_type=notification_type.value,
            data=data,
            scheduled_for=scheduled_for,
            is_sent=False
        )
        
        logger.info(f"Scheduled notification for {user.id} at {scheduled_for}")
        return True


class NotificationEventHandler:
    """
    Event handler for automatic notifications.
    
    Connect to signals to automatically trigger notifications.
    """
    
    @classmethod
    def on_badge_earned(cls, user, badge_name: str):
        """Handle badge earned event."""
        NotificationService.send_notification(
            user=user,
            notification_type=NotificationType.BADGE_EARNED,
            data={'badge_name': badge_name},
            priority=NotificationPriority.HIGH
        )
    
    @classmethod
    def on_level_up(cls, user, level: int):
        """Handle level up event."""
        NotificationService.send_notification(
            user=user,
            notification_type=NotificationType.LEVEL_UP,
            data={'level': level},
            priority=NotificationPriority.HIGH
        )
    
    @classmethod
    def on_course_complete(cls, user, course_name: str):
        """Handle course completion event."""
        NotificationService.send_notification(
            user=user,
            notification_type=NotificationType.COURSE_COMPLETE,
            data={'course_name': course_name},
            priority=NotificationPriority.MEDIUM
        )
    
    @classmethod
    def on_payment_success(cls, user, amount: float, item_name: str):
        """Handle successful payment event."""
        NotificationService.send_notification(
            user=user,
            notification_type=NotificationType.PAYMENT_SUCCESS,
            data={'amount': amount, 'item_name': item_name},
            priority=NotificationPriority.HIGH
        )
    
    @classmethod
    def on_payment_failed(cls, user, item_name: str):
        """Handle failed payment event."""
        NotificationService.send_notification(
            user=user,
            notification_type=NotificationType.PAYMENT_FAILED,
            data={'item_name': item_name},
            priority=NotificationPriority.URGENT
        )
