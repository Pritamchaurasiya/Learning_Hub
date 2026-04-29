"""
Event Bus Subscribers — Handlers for all EventBus event types.

Wired automatically by CoreConfig.ready() on app startup.
Each handler receives the full event payload dict published by EventBus.publish().
"""

import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


def on_user_registered(payload: Dict[str, Any]):
    """Handle user.registered event — welcome notification + audit."""
    data = payload.get("data", {})
    user_id = data.get("user_id")
    username = data.get("username", "New User")

    logger.info(f"[EventBus] User registered: {username} (id={user_id})")

    try:
        from apps.notifications.services import NotificationService
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.filter(id=user_id).first()
        if user:
            NotificationService.send_notification(
                user=user,
                title="Welcome to Learning Hub! 🎓",
                message=f"Hi {user.first_name or username}! Start exploring courses and level up your skills.",
                notification_type="system",
            )
    except Exception as e:
        logger.error(f"[EventBus] on_user_registered notification failed: {e}")

    # Audit log
    try:
        from apps.core.audit_service import AuditService, AuditAction
        AuditService.log(
            action=AuditAction.PROFILE_CREATED,
            resource_type="user",
            resource_id=str(user_id),
            resource_name=username,
        )
    except Exception as e:
        logger.error(f"[EventBus] on_user_registered audit failed: {e}")


def on_course_enrolled(payload: Dict[str, Any]):
    """Handle course.enrolled event — gamification XP + analytics."""
    data = payload.get("data", {})
    user_id = data.get("user_id")
    course_id = data.get("course_id")
    course_title = data.get("course_title", "Unknown Course")

    logger.info(f"[EventBus] Enrollment: user={user_id} → course={course_title}")

    # Award XP for enrollment
    try:
        from apps.gamification.services import GamificationService
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.filter(id=user_id).first()
        if user:
            GamificationService.award_xp(user, 50, reason=f"Enrolled in {course_title}")
    except Exception as e:
        logger.error(f"[EventBus] on_course_enrolled XP award failed: {e}")


def on_payment_completed(payload: Dict[str, Any]):
    """Handle payment.completed event — audit log + confirmation notification."""
    data = payload.get("data", {})
    user_id = data.get("user_id")
    amount = data.get("amount", 0)
    order_id = data.get("order_id", "N/A")

    logger.info(f"[EventBus] Payment completed: user={user_id}, amount={amount}, order={order_id}")

    try:
        from apps.core.audit_service import AuditService, AuditAction
        AuditService.log(
            action=AuditAction.PAYMENT_PROCESSED,
            resource_type="payment",
            resource_id=str(order_id),
            metadata={"amount": str(amount), "user_id": str(user_id)},
        )
    except Exception as e:
        logger.error(f"[EventBus] on_payment_completed audit failed: {e}")

    try:
        from apps.notifications.services import NotificationService
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.filter(id=user_id).first()
        if user:
            NotificationService.send_notification(
                user=user,
                title="Payment Confirmed ✅",
                message=f"Your payment of ₹{amount} (Order #{order_id}) was successful.",
                notification_type="system",
            )
    except Exception as e:
        logger.error(f"[EventBus] on_payment_completed notification failed: {e}")


def on_lesson_completed(payload: Dict[str, Any]):
    """Handle lesson.completed event — streak update + progress tracking."""
    data = payload.get("data", {})
    user_id = data.get("user_id")
    lesson_title = data.get("lesson_title", "Unknown Lesson")

    logger.info(f"[EventBus] Lesson completed: user={user_id}, lesson={lesson_title}")

    try:
        from apps.gamification.services import GamificationService
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.filter(id=user_id).first()
        if user:
            GamificationService.award_xp(user, 25, reason=f"Completed: {lesson_title}")
            GamificationService.update_streak(user)
    except Exception as e:
        logger.error(f"[EventBus] on_lesson_completed gamification failed: {e}")


def on_threat_detected(payload: Dict[str, Any]):
    """Handle security.threat_detected event — alert admins + log critical."""
    data = payload.get("data", {})
    threat_type = data.get("threat_type", "unknown")
    source_ip = data.get("source_ip", "unknown")
    details = data.get("details", "")

    logger.critical(
        f"🚨 [SECURITY] Threat detected: type={threat_type}, ip={source_ip}, details={details}"
    )

    try:
        from apps.core.audit_service import AuditService, AuditAction, AuditSeverity
        AuditService.log(
            action=AuditAction.SUSPICIOUS_ACTIVITY,
            resource_type="security",
            resource_id=source_ip,
            severity=AuditSeverity.CRITICAL,
            metadata={"threat_type": threat_type, "details": details},
        )
    except Exception as e:
        logger.error(f"[EventBus] on_threat_detected audit failed: {e}")

    # Notify all staff users
    try:
        from apps.notifications.services import NotificationService
        from django.contrib.auth import get_user_model
        User = get_user_model()
        for admin in User.objects.filter(is_staff=True):
            NotificationService.send_notification(
                user=admin,
                title="🚨 Security Alert",
                message=f"Threat detected: {threat_type} from {source_ip}. {details}",
                notification_type="alert",
            )
    except Exception as e:
        logger.error(f"[EventBus] on_threat_detected admin notification failed: {e}")


def on_system_alert(payload: Dict[str, Any]):
    """Handle system.alert event — log and notify admins."""
    data = payload.get("data", {})
    alert_message = data.get("message", "System alert triggered")
    severity = data.get("severity", "warning")

    logger.warning(f"[EventBus] System alert ({severity}): {alert_message}")

    try:
        from apps.notifications.services import NotificationService
        from django.contrib.auth import get_user_model
        User = get_user_model()
        for admin in User.objects.filter(is_staff=True)[:5]:  # Top 5 admins
            NotificationService.send_notification(
                user=admin,
                title=f"⚠️ System Alert ({severity.upper()})",
                message=alert_message,
                notification_type="alert",
            )
    except Exception as e:
        logger.error(f"[EventBus] on_system_alert notification failed: {e}")


def register_all_subscribers():
    """Register all event subscribers with the EventBus. Called from CoreConfig.ready()."""
    from apps.core.event_bus import EventBus, EventType

    EventBus.subscribe(EventType.USER_REGISTERED.value, on_user_registered)
    EventBus.subscribe(EventType.COURSE_ENROLLED.value, on_course_enrolled)
    EventBus.subscribe(EventType.PAYMENT_COMPLETED.value, on_payment_completed)
    EventBus.subscribe(EventType.LESSON_COMPLETED.value, on_lesson_completed)
    EventBus.subscribe(EventType.THREAT_DETECTED.value, on_threat_detected)
    EventBus.subscribe(EventType.SYSTEM_ALERT.value, on_system_alert)

    logger.info("[EventBus] All 6 subscribers registered successfully.")
