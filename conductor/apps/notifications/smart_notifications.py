"""
Smart Notification System

AI-powered notification system that optimizes delivery timing and content
based on user behavior patterns and learning progress.

Key Features:
1. Optimal Timing - Send notifications when user is most likely to engage
2. Personalized Content - Tailor messages based on learning progress
3. Priority Management - Categorize and prioritize notifications
4. Engagement Tracking - Track open/dismiss rates for optimization
"""

import logging
from datetime import timedelta
from typing import Dict, Any, List, Optional
from enum import Enum

from django.utils import timezone
from django.db.models import Count, Avg
from django.core.cache import cache
from django.conf import settings

# Import SmartNotification from models.py to avoid duplicate definition
from apps.notifications.models import SmartNotification
from apps.users.models import User

logger = logging.getLogger(__name__)


class NotificationType(Enum):
    """Types of notifications."""
    LEARNING_REMINDER = 'learning_reminder'
    STREAK_ALERT = 'streak_alert'
    ACHIEVEMENT_UNLOCK = 'achievement_unlock'
    CHALLENGE_UPDATE = 'challenge_update'
    COURSE_UPDATE = 'course_update'
    SOCIAL = 'social'
    SYSTEM = 'system'
    AI_INSIGHT = 'ai_insight'


class NotificationPriority(Enum):
    """Notification priority levels."""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    URGENT = 4


class SmartNotificationService:
    """
    Service for creating and managing smart notifications.
    """
    
    # ==========================================================================
    # NOTIFICATION CREATION
    # ==========================================================================
    
    @classmethod
    def create_notification(
        cls,
        user,
        title: str,
        body: str,
        notification_type: NotificationType,
        priority: NotificationPriority = NotificationPriority.NORMAL,
        data: Dict = None,
        action_url: str = "",
        image_url: str = "",
        schedule_optimal: bool = True
    ) -> SmartNotification:
        """
        Create a smart notification with optional optimal timing.
        
        Args:
            user: Target user
            title: Notification title
            body: Notification body text
            notification_type: Type enum
            priority: Priority enum
            data: Additional metadata
            action_url: Deep link when tapped
            image_url: Optional image
            schedule_optimal: If True, schedule for optimal engagement time
            
        Returns:
            Created SmartNotification instance
        """
        scheduled_for = None
        
        if schedule_optimal:
            scheduled_for = cls._calculate_optimal_time(user)
        
        notification = SmartNotification.objects.create(
            user=user,
            title=title,
            body=body,
            notification_type=notification_type.value,
            priority=priority.value,
            data=data or {},
            action_url=action_url,
            image_url=image_url,
            scheduled_for=scheduled_for
        )
        
        logger.info(f"Created notification {notification.id} for user {user.id}")
        
        # If no scheduling, send immediately
        if not schedule_optimal:
            cls._send_notification(notification)
        
        return notification
    
    @classmethod
    def _calculate_optimal_time(cls, user) -> timezone.datetime:
        """
        Calculate optimal notification time based on user activity patterns.
        
        Algorithm:
        1. Analyze user's most active hours from ActivityLog
        2. Avoid spam by ensuring minimum gap between notifications
        3. Consider timezone and local time
        """
        from apps.ai_engine.models import ActivityLog
        from django.db.models.functions import ExtractHour
        
        cache_key = f"optimal_notification_time:{user.id}"
        cached = cache.get(cache_key)
        if cached:
            return cached
        
        now = timezone.now()
        
        # Analyze activity patterns (last 30 days)
        month_ago = now - timedelta(days=30)
        
        hourly_activity = ActivityLog.objects.filter(
            user=user,
            created_at__gte=month_ago
        ).annotate(
            hour=ExtractHour('created_at')
        ).values('hour').annotate(
            count=Count('id')
        ).order_by('-count')
        
        peak_hour = 18  # Default to 6 PM
        
        if hourly_activity:
            peak_hour = hourly_activity[0]['hour']
        
        # Calculate next occurrence of peak hour
        optimal_time = now.replace(hour=peak_hour, minute=0, second=0, microsecond=0)
        
        if optimal_time <= now:
            optimal_time += timedelta(days=1)
        
        # Check for recent notifications (avoid spam)
        recent_notification = SmartNotification.objects.filter(
            user=user,
            sent_at__gte=now - timedelta(hours=4)
        ).exists()
        
        if recent_notification:
            optimal_time += timedelta(hours=4)
        
        cache.set(cache_key, optimal_time, timeout=3600)
        return optimal_time
    
    @classmethod
    def _send_notification(cls, notification: SmartNotification):
        """
        Send notification through appropriate channel.
        """
        try:
            # WebSocket for real-time in-app
            cls._send_websocket(notification)
            
            # Push notification (if enabled)
            if cls._should_send_push(notification.user):
                cls._send_push(notification)
            
            notification.is_sent = True
            notification.sent_at = timezone.now()
            notification.save(update_fields=['is_sent', 'sent_at'])
            
        except Exception as e:
            logger.error(f"Failed to send notification {notification.id}: {e}")
    
    @staticmethod
    def _send_websocket(notification: SmartNotification):
        """Send via WebSocket."""
        try:
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer
            
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"user_notifications_{notification.user.id}",
                {
                    "type": "notification_event",
                    "data": {
                        "id": str(notification.id),
                        "title": notification.title,
                        "body": notification.body,
                        "type": notification.notification_type,
                        "priority": notification.priority,
                        "action_url": notification.action_url,
                        "created_at": notification.created_at.isoformat()
                    }
                }
            )
        except Exception as e:
            logger.debug(f"WebSocket send skipped: {e}")
    
    @staticmethod
    def _send_push(notification: SmartNotification):
        """Send push notification (placeholder for FCM/APNS integration)."""
        # TODO: Integrate with Firebase Cloud Messaging or APNS
        logger.info(f"Push notification queued for {notification.user.id}: {notification.title}")
    
    @staticmethod
    def _should_send_push(user) -> bool:
        """Check if user has push notifications enabled."""
        preferences = getattr(user, 'preferences', {}) or {}
        return preferences.get('push_enabled', True)
    
    # ==========================================================================
    # SMART NOTIFICATION GENERATORS
    # ==========================================================================
    
    @classmethod
    def send_learning_reminder(cls, user) -> Optional[SmartNotification]:
        """
        Send intelligent learning reminder based on user's schedule and streak.
        """
        from apps.gamification.models import UserXP, Streak
        
        # Check if user already learned today
        from apps.ai_engine.models import ActivityLog
        
        today = timezone.now().date()
        learned_today = ActivityLog.objects.filter(
            user=user,
            created_at__date=today,
            action__in=['lesson_view', 'lesson_complete', 'quiz_complete']
        ).exists()
        
        if learned_today:
            return None  # Don't remind if already active
        
        # Get streak info
        streak = 0
        try:
            streak_obj = Streak.objects.get(user=user)
            streak = streak_obj.current_streak
        except Streak.DoesNotExist:
            try:
                xp = UserXP.objects.get(user=user)
                streak = xp.current_streak
            except UserXP.DoesNotExist:
                pass
        
        # Generate personalized message
        if streak > 0:
            title = f"🔥 Keep your {streak}-day streak alive!"
            body = f"Just 5 minutes of learning today will extend your amazing streak to {streak + 1} days!"
        else:
            title = "📚 Time for a quick learning session?"
            body = "Spend just 5 minutes today and start building a new streak!"
        
        return cls.create_notification(
            user=user,
            title=title,
            body=body,
            notification_type=NotificationType.LEARNING_REMINDER,
            priority=NotificationPriority.NORMAL,
            action_url="/learn",
            schedule_optimal=True
        )
    
    @classmethod
    def send_streak_at_risk(cls, user, current_streak: int) -> SmartNotification:
        """
        Urgent notification when streak is about to be lost.
        """
        return cls.create_notification(
            user=user,
            title=f"⚠️ Your {current_streak}-day streak is at risk!",
            body=f"Complete just one lesson in the next 2 hours to save your streak!",
            notification_type=NotificationType.STREAK_ALERT,
            priority=NotificationPriority.URGENT,
            action_url="/learn",
            schedule_optimal=False  # Send immediately
        )
    
    @classmethod
    def send_achievement_unlock(
        cls, 
        user, 
        achievement_name: str, 
        xp_reward: int
    ) -> SmartNotification:
        """
        Celebrate achievement unlock.
        """
        return cls.create_notification(
            user=user,
            title=f"🏆 Achievement Unlocked: {achievement_name}!",
            body=f"Congratulations! You earned {xp_reward} XP!",
            notification_type=NotificationType.ACHIEVEMENT_UNLOCK,
            priority=NotificationPriority.HIGH,
            action_url="/profile/achievements",
            schedule_optimal=False  # Immediate celebration
        )
    
    @classmethod
    def send_challenge_reminder(
        cls, 
        user, 
        challenge_title: str, 
        hours_remaining: int
    ) -> SmartNotification:
        """
        Remind about ending challenge.
        """
        return cls.create_notification(
            user=user,
            title=f"⏰ Challenge ending soon: {challenge_title}",
            body=f"Only {hours_remaining} hours left! Complete it now to earn rewards!",
            notification_type=NotificationType.CHALLENGE_UPDATE,
            priority=NotificationPriority.HIGH,
            action_url="/challenges",
            schedule_optimal=False
        )
    
    @classmethod
    def send_ai_insight(cls, user, insight: str) -> SmartNotification:
        """
        Send AI-generated learning insight.
        """
        return cls.create_notification(
            user=user,
            title="💡 AI Learning Insight",
            body=insight[:200],  # Truncate if too long
            notification_type=NotificationType.AI_INSIGHT,
            priority=NotificationPriority.NORMAL,
            data={'full_insight': insight},
            action_url="/insights",
            schedule_optimal=True
        )

    @classmethod
    def send_new_challenge_alert(cls, user, problem_title: str, difficulty: str) -> SmartNotification:
        """
        Alert user about a new DSA problem/challenge.
        """
        diff_emoji = "🔥" if difficulty == "HARD" else "⚡"
        return cls.create_notification(
            user=user,
            title=f"{diff_emoji} New Challenge: {problem_title}",
            body=f"A new {difficulty.lower()} problem has been added. Can you solve it?",
            notification_type=NotificationType.CHALLENGE_UPDATE,
            priority=NotificationPriority.NORMAL,
            action_url="/dsa",
            schedule_optimal=True # Send at optimal time to increase engagement
        )
    
    # ==========================================================================
    # NOTIFICATION RETRIEVAL
    # ==========================================================================
    
    @classmethod
    def get_user_notifications(
        cls,
        user,
        unread_only: bool = False,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Get notifications for a user.
        """
        queryset = SmartNotification.objects.filter(
            user=user,
            is_dismissed=False
        )
        
        if unread_only:
            queryset = queryset.filter(is_read=False)
        
        notifications = queryset[:limit]
        
        return [
            {
                'id': str(n.id),
                'title': n.title,
                'body': n.body,
                'type': n.notification_type,
                'priority': n.priority,
                'is_read': n.is_read,
                'action_url': n.action_url,
                'image_url': n.image_url,
                'data': n.data,
                'created_at': n.created_at.isoformat(),
                'read_at': n.read_at.isoformat() if n.read_at else None
            }
            for n in notifications
        ]
    
    @classmethod
    def get_unread_count(cls, user) -> int:
        """Get count of unread notifications."""
        return SmartNotification.objects.filter(
            user=user,
            is_read=False,
            is_dismissed=False
        ).count()
    
    @classmethod
    def mark_all_read(cls, user):
        """Mark all notifications as read."""
        SmartNotification.objects.filter(
            user=user,
            is_read=False
        ).update(
            is_read=True,
            read_at=timezone.now()
        )
    
    # ==========================================================================
    # ANALYTICS & OPTIMIZATION
    # ==========================================================================
    
    @classmethod
    def get_engagement_stats(cls, user) -> Dict[str, Any]:
        """
        Get notification engagement statistics for a user.
        """
        notifications = SmartNotification.objects.filter(user=user)
        
        total = notifications.count()
        read = notifications.filter(is_read=True).count()
        dismissed = notifications.filter(is_dismissed=True).count()
        
        read_rate = read / total if total > 0 else 0
        dismiss_rate = dismissed / total if total > 0 else 0
        
        # By type breakdown
        type_stats = notifications.values('notification_type').annotate(
            count=Count('id'),
            read_count=Count('id', filter=models.Q(is_read=True))
        )
        
        return {
            'total_notifications': total,
            'read_count': read,
            'dismissed_count': dismissed,
            'read_rate': round(read_rate, 2),
            'dismiss_rate': round(dismiss_rate, 2),
            'by_type': list(type_stats)
        }


# ==========================================================================
# CELERY TASKS
# ==========================================================================

def process_scheduled_notifications():
    """
    Celery task to process scheduled notifications.
    Should run every minute.
    """
    now = timezone.now()
    
    pending = SmartNotification.objects.filter(
        is_sent=False,
        scheduled_for__lte=now
    )
    
    for notification in pending:
        SmartNotificationService._send_notification(notification)
    
    logger.info(f"Processed {pending.count()} scheduled notifications")


def send_daily_learning_reminders():
    """
    Celery task to send daily learning reminders.
    Should run once per day.
    """
    from apps.users.models import User
    from apps.ai_engine.models import ActivityLog
    
    # Get users who haven't learned today
    today = timezone.now().date()
    
    active_users = User.objects.filter(
        is_active=True,
        last_login_at__gte=timezone.now() - timedelta(days=7)  # Active in last week
    )
    
    for user in active_users:
        learned_today = ActivityLog.objects.filter(
            user=user,
            created_at__date=today
        ).exists()
        
        if not learned_today:
            SmartNotificationService.send_learning_reminder(user)
    
    logger.info(f"Sent learning reminders to eligible users")


def check_streak_risks():
    """
    Celery task to check for streaks at risk.
    Should run every 30 minutes.
    """
    from apps.gamification.models import Streak
    from apps.ai_engine.models import ActivityLog
    
    now = timezone.now()
    today = now.date()
    hours_left = 24 - now.hour
    
    if hours_left > 4:  # Only alert when < 4 hours left
        return
    
    streaks = Streak.objects.filter(
        current_streak__gt=5  # Only for meaningful streaks
    ).select_related('user')
    
    for streak in streaks:
        learned_today = ActivityLog.objects.filter(
            user=streak.user,
            created_at__date=today
        ).exists()
        
        if not learned_today:
            SmartNotificationService.send_streak_at_risk(
                streak.user, 
                streak.current_streak
            )
