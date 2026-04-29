"""
Background Tasks & Scheduled Jobs for Learning Hub.

This module defines Celery tasks for:
1. Gamification maintenance (weekly XP reset, streak processing)
2. Cache warming and invalidation
3. Analytics aggregation
4. Notification scheduling
5. Cleanup jobs
"""

from celery import shared_task
from django.utils import timezone
from django.db import transaction
from django.core.cache import cache
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# GAMIFICATION TASKS
# =============================================================================

@shared_task(name='gamification.reset_weekly_xp')
def reset_weekly_xp():
    """
    Reset weekly XP for all users.
    
    Schedule: Every Monday at 00:00 UTC
    """
    from apps.gamification.services import GamificationService
    
    logger.info("Starting weekly XP reset")
    GamificationService.reset_weekly_xp()
    logger.info("Weekly XP reset completed")
    
    return {'status': 'success', 'message': 'Weekly XP reset completed'}


@shared_task(name='gamification.process_streak_reminders')
def process_streak_reminders():
    """
    Send reminders to users who are about to lose their streak.
    
    Schedule: Every day at 20:00 UTC
    """
    from apps.gamification.models import Streak
    from apps.notifications.services import NotificationService
    
    today = timezone.now().date()
    
    # Find users who haven't been active today and have active streaks
    at_risk_users = Streak.objects.filter(
        last_activity_date=today - timedelta(days=1),
        current_streak__gte=3  # Only for streaks of 3+ days
    ).select_related('user')
    
    count = 0
    for streak in at_risk_users:
        NotificationService.send_notification(
            user=streak.user,
            title="🔥 Don't lose your streak!",
            message=f"You have a {streak.current_streak}-day streak. Complete any activity to keep it going!",
            notification_type='streak_reminder'
        )
        count += 1
    
    logger.info("Sent %d streak reminder notifications", count)
    return {'status': 'success', 'count': count}


@shared_task(name='gamification.check_achievements')
def check_achievements_batch():
    """
    Check and award achievements for active users.
    
    Schedule: Every 6 hours
    """
    from apps.users.models import User
    from apps.gamification.services import GamificationService
    
    # Get recently active users
    cutoff = timezone.now() - timedelta(hours=24)
    active_users = User.objects.filter(last_login__gte=cutoff)
    
    awarded = 0
    for user in active_users:
        achievements = GamificationService.check_achievements(user)
        awarded += len(achievements)
    
    logger.info("Checked %d users, awarded %d achievements", active_users.count(), awarded)
    return {'status': 'success', 'users_checked': active_users.count(), 'achievements_awarded': awarded}


# =============================================================================
# CACHE TASKS
# =============================================================================

@shared_task(name='cache.warm_leaderboard')
def warm_leaderboard_cache():
    """
    Pre-populate leaderboard cache.
    
    Schedule: Every 5 minutes
    """
    from apps.gamification.services import GamificationService
    
    # Warm different leaderboard configurations
    for period in ['all', 'weekly']:
        for limit in [10, 25, 50]:
            GamificationService.get_leaderboard(limit=limit, period=period)
    
    # Warm guild leaderboard
    GamificationService.get_guild_leaderboard(limit=10)
    
    logger.info("Leaderboard cache warmed")
    return {'status': 'success'}


@shared_task(name='cache.warm_courses')
def warm_course_cache():
    """
    Pre-populate course cache for homepage.
    
    Schedule: Every 15 minutes
    """
    from apps.courses.models import Course, Category
    from django.db.models import Count, Avg
    
    # Cache popular courses
    popular_courses = Course.objects.filter(
        is_published=True
    ).annotate(
        enrollment_count=Count('enrollments'),
        avg_rating=Avg('reviews__rating')
    ).order_by('-enrollment_count')[:20]
    
    cache.set('homepage:popular_courses', list(popular_courses.values(
        'id', 'title', 'slug', 'thumbnail', 'price', 'enrollment_count', 'avg_rating'
    )), timeout=900)  # 15 minutes
    
    # Cache categories
    categories = Category.objects.annotate(
        course_count=Count('courses')
    ).filter(course_count__gt=0)
    
    cache.set('homepage:categories', list(categories.values(
        'id', 'name', 'slug', 'icon', 'course_count'
    )), timeout=3600)  # 1 hour
    
    logger.info("Course cache warmed")
    return {'status': 'success'}


@shared_task(name='cache.cleanup_expired')
def cleanup_expired_cache():
    """
    Clean up expired cache entries and temporary data.
    
    Schedule: Every hour
    """
    from apps.core.cache_service import CacheService
    
    # Clear local cache
    CacheService._local_cache.clear()
    
    # Log cache stats before reset
    stats = CacheService.get_stats()
    logger.info("Cache stats before cleanup: %s", stats)
    
    # Reset stats
    CacheService.clear_stats()
    
    return {'status': 'success', 'previous_stats': stats}


# =============================================================================
# ANALYTICS TASKS
# =============================================================================

@shared_task(name='analytics.aggregate_daily')
def aggregate_daily_analytics():
    """
    Aggregate daily analytics for reporting.
    
    Schedule: Every day at 01:00 UTC
    """
    from apps.users.models import User
    from apps.courses.models import Course, Enrollment, LessonCompletion
    from apps.dsa.models import Submission
    
    yesterday = timezone.now().date() - timedelta(days=1)
    
    # Calculate daily metrics
    metrics = {
        'date': yesterday.isoformat(),
        'new_users': User.objects.filter(date_joined__date=yesterday).count(),
        'active_users': User.objects.filter(last_login__date=yesterday).count(),
        'new_enrollments': Enrollment.objects.filter(created_at__date=yesterday).count(),
        'lessons_completed': LessonCompletion.objects.filter(completed_at__date=yesterday).count(),
        'dsa_submissions': Submission.objects.filter(created_at__date=yesterday).count(),
        'dsa_accepted': Submission.objects.filter(
            created_at__date=yesterday, status='AC'
        ).count(),
    }
    
    # Store in cache for dashboard
    cache_key = f"analytics:daily:{yesterday.isoformat()}"
    cache.set(cache_key, metrics, timeout=86400 * 30)  # 30 days
    
    logger.info("Daily analytics aggregated for %s: %s", yesterday, metrics)
    return {'status': 'success', 'metrics': metrics}


@shared_task(name='analytics.update_course_stats')
def update_course_statistics():
    """
    Update computed statistics for courses.
    
    Schedule: Every 30 minutes
    """
    from apps.courses.models import Course
    from django.db.models import Count, Avg, F
    
    courses = Course.objects.filter(is_published=True).annotate(
        new_enrollment_count=Count('enrollments'),
        new_avg_rating=Avg('reviews__rating'),
        new_review_count=Count('reviews')
    )
    
    updated = 0
    for course in courses:
        Course.objects.filter(id=course.id).update(
            enrollment_count=course.new_enrollment_count,
            average_rating=course.new_avg_rating or 0,
            review_count=course.new_review_count
        )
        updated += 1
    
    logger.info("Updated statistics for %d courses", updated)
    return {'status': 'success', 'courses_updated': updated}


# =============================================================================
# NOTIFICATION TASKS
# =============================================================================

@shared_task(name='notifications.send_digest')
def send_daily_digest():
    """
    Send daily learning digest to users who opted in.
    
    Schedule: Every day at 09:00 UTC
    """
    from apps.users.models import User
    from apps.notifications.services import NotificationService
    from apps.courses.models import Enrollment, LessonCompletion
    
    today = timezone.now().date()
    yesterday = today - timedelta(days=1)
    
    # Get users who have lessons to continue
    users_with_progress = Enrollment.objects.filter(
        progress_percentage__gt=0,
        progress_percentage__lt=100
    ).select_related('user', 'course').values('user', 'course__title').distinct()
    
    from apps.ai_engine.ai_client import AIClient

    count = 0
    for enrollment in users_with_progress:
        user_id = enrollment['user']
        course_title = enrollment['course__title']
        
        # Get sensitive user object for name
        user = User.objects.get(id=user_id)
        
        # Calculate basic metrics for AI
        completed_today = LessonCompletion.objects.filter(
            user_id=user_id, 
            completed_at__date=yesterday
        ).count()
        
        metrics = {
            'engagement_score': 0.8 if completed_today > 0 else 0.4, # Simplified logic
            'consistency_score': 'Good' if completed_today > 0 else 'Needs Work',
            'course_focus': course_title
        }

        # Generate personalized narrative
        narrative = AIClient.generate_learning_insight_narrative(
            user_name=user.first_name or "Learner",
            metrics=metrics
        )
        
        # In a real app, we would send an email here.
        # For now, we'll log it and maybe create a notification.
        NotificationService.send_notification(
            user=user,
            title=f"Your Daily Learning Digest: {course_title}",
            message=narrative,
            notification_type='system'
        )
        count += 1
    
    logger.info("Sent %d daily digest emails", count)
    return {'status': 'success', 'count': count}


@shared_task(name='notifications.process_scheduled')
def process_scheduled_notifications():
    """
    Process and send scheduled notifications.
    
    Schedule: Every 5 minutes
    """
    from apps.notifications.models import Notification
    from apps.notifications.services import NotificationService
    
    now = timezone.now()
    
    # Get pending scheduled notifications
    pending = Notification.objects.filter(
        scheduled_for__lte=now,
        is_sent=False
    )
    
    count = 0
    for notification in pending:
        try:
            NotificationService.send_notification(
                user=notification.user,
                title=notification.title,
                message=notification.message,
                notification_type=notification.notification_type
            )
            notification.is_sent = True
            notification.sent_at = now
            notification.save(update_fields=['is_sent', 'sent_at'])
            count += 1
        except Exception as e:
            logger.error("Failed to send notification %s: %s", notification.id, e)
    
    logger.info("Processed %d scheduled notifications", count)
    return {'status': 'success', 'count': count}


# =============================================================================
# CLEANUP TASKS
# =============================================================================

@shared_task(name='cleanup.old_audit_logs')
def cleanup_old_audit_logs():
    """
    Clean up audit logs older than retention period.
    
    Schedule: Every day at 03:00 UTC
    """
    from apps.core.models import AuditLog
    
    retention_days = 90  # Keep logs for 90 days
    cutoff = timezone.now() - timedelta(days=retention_days)
    
    deleted, _ = AuditLog.objects.filter(created_at__lt=cutoff).delete()
    
    logger.info("Deleted %d audit logs older than %d days", deleted, retention_days)
    return {'status': 'success', 'deleted': deleted}


@shared_task(name='cleanup.expired_tokens')
def cleanup_expired_tokens():
    """
    Clean up expired password reset tokens.
    
    Schedule: Every day at 04:00 UTC
    """
    from apps.users.models import PasswordResetToken
    
    now = timezone.now()
    deleted, _ = PasswordResetToken.objects.filter(expires_at__lt=now).delete()
    
    logger.info("Deleted %d expired password reset tokens", deleted)
    return {'status': 'success', 'deleted': deleted}


@shared_task(name='cleanup.inactive_sessions')
def cleanup_inactive_sessions():
    """
    Clean up inactive user sessions.
    
    Schedule: Every day at 05:00 UTC
    """
    from django.contrib.sessions.models import Session
    
    now = timezone.now()
    deleted, _ = Session.objects.filter(expire_date__lt=now).delete()
    
    logger.info("Deleted %d expired sessions", deleted)
    return {'status': 'success', 'deleted': deleted}


# =============================================================================
# AI TASKS
# =============================================================================

@shared_task(name='ai.process_pending_reviews')
def process_pending_code_reviews():
    """
    Process pending DSA submissions for AI code review.
    
    Schedule: Every 2 minutes
    """
    from apps.dsa.models import Submission
    from apps.ai_engine.ai_client import AIClient
    
    # Get submissions without AI feedback
    pending = Submission.objects.filter(
        ai_feedback__isnull=True,
        status='AC'  # Only review accepted solutions
    ).order_by('created_at')[:10]
    
    count = 0
    for submission in pending:
        try:
            feedback = AIClient.generate_code_review(
                problem_title=submission.problem.title,
                problem_description=submission.problem.description,
                code=submission.code
            )
            if feedback:
                submission.ai_feedback = feedback
                submission.save(update_fields=['ai_feedback'])
                count += 1
        except Exception as e:
            logger.error("Failed to generate review for submission %s: %s", submission.id, e)
    
    logger.info("Processed %d pending code reviews", count)
    return {'status': 'success', 'count': count}


# =============================================================================
# HEALTH CHECK TASK
# =============================================================================

@shared_task(name='system.health_check')
def system_health_check():
    """
    Perform system health check and alert if issues.
    
    Schedule: Every 5 minutes
    """
    from apps.core.health_check import HealthCheckService
    
    health = HealthCheckService.get_health(detailed=True)
    
    if health['status'] != 'healthy':
        logger.warning("System health degraded: %s", health)
        # Could trigger alerting here
    
    # Store health history
    cache_key = f"health_history:{timezone.now().strftime('%Y%m%d%H%M')}"
    cache.set(cache_key, health, timeout=86400)  # Keep for 24 hours
    
    return health
