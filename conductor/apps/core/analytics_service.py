"""
Advanced Analytics Service for Learning Hub.

This module provides comprehensive analytics:
1. User engagement metrics
2. Course performance tracking
3. Learning progression analysis
4. Revenue analytics
5. Real-time dashboard data
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import timedelta
from collections import defaultdict

from django.db.models import Count, Sum, Avg, F, Q, Value
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth
from django.utils import timezone
from django.core.cache import cache

logger = logging.getLogger(__name__)


class AnalyticsService:
    """
    Comprehensive analytics service for the Learning Hub.
    """
    
    CACHE_PREFIX = "analytics:"
    CACHE_TTL = 300  # 5 minutes
    
    # =========================================================================
    # USER ANALYTICS
    # =========================================================================
    
    @classmethod
    def get_user_dashboard_stats(cls, user) -> Dict[str, Any]:
        """
        Get personalized dashboard statistics for a user.
        """
        from apps.courses.models import Enrollment, LessonCompletion
        from apps.dsa.models import Submission
        from apps.gamification.models import UserXP, Streak
        
        cache_key = f"{cls.CACHE_PREFIX}user:{user.id}:dashboard"
        cached = cache.get(cache_key)
        if cached:
            return cached
        
        # Course stats
        enrollments = Enrollment.objects.filter(user=user)
        in_progress = enrollments.filter(progress_percentage__lt=100).count()
        completed = enrollments.filter(progress_percentage=100).count()
        
        # Learning time (estimate based on completions)
        lessons_completed = LessonCompletion.objects.filter(user=user).count()
        estimated_hours = lessons_completed * 0.25  # 15 min average per lesson
        
        # DSA stats
        submissions = Submission.objects.filter(user=user)
        problems_solved = submissions.filter(status='AC').values('problem').distinct().count()
        total_submissions = submissions.count()
        
        # Gamification
        try:
            xp = UserXP.objects.get(user=user)
            streak = Streak.objects.get(user=user)
            xp_data = {
                'total_xp': xp.total_xp,
                'level': xp.level,
                'weekly_xp': xp.weekly_xp,
                'current_streak': streak.current_streak,
                'longest_streak': streak.longest_streak,
            }
        except Exception:
            xp_data = {
                'total_xp': 0,
                'level': 1,
                'weekly_xp': 0,
                'current_streak': 0,
                'longest_streak': 0,
            }
        
        # Recent activity
        recent_completions = LessonCompletion.objects.filter(
            user=user
        ).order_by('-completed_at')[:5]
        
        result = {
            'courses': {
                'enrolled': enrollments.count(),
                'in_progress': in_progress,
                'completed': completed,
            },
            'learning': {
                'lessons_completed': lessons_completed,
                'estimated_hours': round(estimated_hours, 1),
            },
            'dsa': {
                'problems_solved': problems_solved,
                'total_submissions': total_submissions,
                'success_rate': round((problems_solved / max(total_submissions, 1)) * 100, 1),
            },
            'gamification': xp_data,
            'recent_activity': [
                {
                    'lesson': c.lesson.title,
                    'course': c.lesson.module.course.title if c.lesson.module else None,
                    'completed_at': c.completed_at.isoformat(),
                }
                for c in recent_completions
            ],
        }
        
        cache.set(cache_key, result, timeout=cls.CACHE_TTL)
        return result
    
    @classmethod
    def get_user_learning_trends(cls, user, days: int = 30) -> Dict[str, Any]:
        """
        Get learning trends for a user over time.
        """
        from apps.courses.models import LessonCompletion
        from apps.dsa.models import Submission
        
        start_date = timezone.now() - timedelta(days=days)
        
        # Daily lesson completions
        completions = LessonCompletion.objects.filter(
            user=user,
            completed_at__gte=start_date
        ).annotate(
            date=TruncDate('completed_at')
        ).values('date').annotate(
            count=Count('id')
        ).order_by('date')
        
        # Daily submissions
        submissions = Submission.objects.filter(
            user=user,
            created_at__gte=start_date
        ).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            total=Count('id'),
            accepted=Count('id', filter=Q(status='AC'))
        ).order_by('date')
        
        return {
            'period_days': days,
            'completions': list(completions),
            'submissions': list(submissions),
        }
    
    # =========================================================================
    # PLATFORM ANALYTICS (Admin)
    # =========================================================================
    
    @classmethod
    def get_platform_overview(cls) -> Dict[str, Any]:
        """
        Get platform-wide overview statistics.
        """
        from apps.users.models import User
        from apps.courses.models import Course, Enrollment
        from apps.dsa.models import Problem, Submission
        
        cache_key = f"{cls.CACHE_PREFIX}platform:overview"
        cached = cache.get(cache_key)
        if cached:
            return cached
        
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        # User stats
        total_users = User.objects.count()
        active_today = User.objects.filter(last_login__date=today).count()
        active_week = User.objects.filter(last_login__date__gte=week_ago).count()
        new_users_month = User.objects.filter(date_joined__date__gte=month_ago).count()
        
        # Course stats
        total_courses = Course.objects.filter(is_published=True).count()
        total_enrollments = Enrollment.objects.count()
        enrollments_month = Enrollment.objects.filter(created_at__date__gte=month_ago).count()
        
        # DSA stats
        total_problems = Problem.objects.filter(is_active=True).count()
        total_submissions = Submission.objects.count()
        submissions_today = Submission.objects.filter(created_at__date=today).count()
        
        result = {
            'users': {
                'total': total_users,
                'active_today': active_today,
                'active_week': active_week,
                'new_this_month': new_users_month,
            },
            'courses': {
                'total': total_courses,
                'total_enrollments': total_enrollments,
                'enrollments_this_month': enrollments_month,
            },
            'dsa': {
                'total_problems': total_problems,
                'total_submissions': total_submissions,
                'submissions_today': submissions_today,
            },
            'generated_at': timezone.now().isoformat(),
        }
        
        cache.set(cache_key, result, timeout=cls.CACHE_TTL)
        return result
    
    @classmethod
    def get_revenue_analytics(cls, days: int = 30) -> Dict[str, Any]:
        """
        Get revenue analytics for the platform.
        """
        from apps.payments.models import Payment
        
        start_date = timezone.now() - timedelta(days=days)
        
        # Daily revenue
        daily = Payment.objects.filter(
            status='completed',
            created_at__gte=start_date
        ).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            revenue=Sum('amount'),
            count=Count('id')
        ).order_by('date')
        
        # Total revenue
        total = Payment.objects.filter(
            status='completed',
            created_at__gte=start_date
        ).aggregate(
            total_revenue=Sum('amount'),
            total_transactions=Count('id')
        )
        
        # By payment method
        by_method = Payment.objects.filter(
            status='completed',
            created_at__gte=start_date
        ).values('payment_method').annotate(
            revenue=Sum('amount'),
            count=Count('id')
        )
        
        return {
            'period_days': days,
            'total_revenue': float(total['total_revenue'] or 0),
            'total_transactions': total['total_transactions'] or 0,
            'daily': list(daily),
            'by_method': list(by_method),
        }
    
    @classmethod
    def get_course_analytics(cls, course_id) -> Dict[str, Any]:
        """
        Get detailed analytics for a specific course.
        """
        from apps.courses.models import Course, Enrollment, LessonCompletion
        from apps.courses.models import CourseReview
        
        cache_key = f"{cls.CACHE_PREFIX}course:{course_id}"
        cached = cache.get(cache_key)
        if cached:
            return cached
        
        enrollments = Enrollment.objects.filter(course_id=course_id)
        
        # Enrollment stats
        total = enrollments.count()
        completed = enrollments.filter(progress_percentage=100).count()
        in_progress = enrollments.filter(
            progress_percentage__gt=0,
            progress_percentage__lt=100
        ).count()
        
        # Average progress
        avg_progress = enrollments.aggregate(avg=Avg('progress_percentage'))['avg'] or 0
        
        # Completion rate
        completion_rate = (completed / max(total, 1)) * 100
        
        # Ratings
        reviews = CourseReview.objects.filter(course_id=course_id)
        avg_rating = reviews.aggregate(avg=Avg('rating'))['avg'] or 0
        rating_distribution = reviews.values('rating').annotate(count=Count('id'))
        
        # Enrollment trend (last 30 days)
        month_ago = timezone.now() - timedelta(days=30)
        enrollment_trend = enrollments.filter(
            created_at__gte=month_ago
        ).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(count=Count('id')).order_by('date')
        
        result = {
            'enrollments': {
                'total': total,
                'completed': completed,
                'in_progress': in_progress,
                'not_started': total - completed - in_progress,
            },
            'progress': {
                'average': round(avg_progress, 1),
                'completion_rate': round(completion_rate, 1),
            },
            'ratings': {
                'average': round(avg_rating, 2),
                'count': reviews.count(),
                'distribution': list(rating_distribution),
            },
            'trend': list(enrollment_trend),
        }
        
        cache.set(cache_key, result, timeout=cls.CACHE_TTL)
        return result
    
    @classmethod
    def get_dsa_analytics(cls) -> Dict[str, Any]:
        """
        Get DSA problem solving analytics.
        """
        from apps.dsa.models import Problem, Submission
        
        cache_key = f"{cls.CACHE_PREFIX}dsa:overview"
        cached = cache.get(cache_key)
        if cached:
            return cached
        
        # Submissions by difficulty
        by_difficulty = Submission.objects.values(
            'problem__difficulty'
        ).annotate(
            total=Count('id'),
            accepted=Count('id', filter=Q(status='AC'))
        )
        
        # Submissions by topic
        by_topic = Submission.objects.values(
            'problem__topic'
        ).annotate(
            total=Count('id'),
            accepted=Count('id', filter=Q(status='AC'))
        ).order_by('-total')[:10]
        
        # Most solved problems
        most_solved = Problem.objects.annotate(
            solve_count=Count('submissions', filter=Q(submissions__status='AC'))
        ).order_by('-solve_count')[:10]
        
        # Hardest problems (lowest acceptance rate)
        hardest = Problem.objects.annotate(
            total_submissions=Count('submissions'),
            accepted=Count('submissions', filter=Q(submissions__status='AC'))
        ).filter(total_submissions__gte=10).annotate(
            acceptance_rate=F('accepted') * 100 / F('total_submissions')
        ).order_by('acceptance_rate')[:10]
        
        result = {
            'by_difficulty': list(by_difficulty),
            'by_topic': list(by_topic),
            'most_solved': [
                {'title': p.title, 'solves': p.solve_count}
                for p in most_solved
            ],
            'hardest': [
                {
                    'title': p.title,
                    'acceptance_rate': round(getattr(p, 'acceptance_rate', 0), 1)
                }
                for p in hardest
            ],
        }
        
        cache.set(cache_key, result, timeout=cls.CACHE_TTL)
        return result


class RealTimeMetrics:
    """
    Real-time metrics for live dashboard.
    """
    
    @classmethod
    def get_live_stats(cls) -> Dict[str, Any]:
        """Get real-time platform statistics."""
        from apps.users.models import User
        from apps.courses.models import LessonCompletion
        from apps.dsa.models import Submission
        
        now = timezone.now()
        hour_ago = now - timedelta(hours=1)
        
        return {
            'active_users_hour': User.objects.filter(
                last_login__gte=hour_ago
            ).count(),
            'lessons_completed_hour': LessonCompletion.objects.filter(
                completed_at__gte=hour_ago
            ).count(),
            'submissions_hour': Submission.objects.filter(
                created_at__gte=hour_ago
            ).count(),
            'timestamp': now.isoformat(),
        }
    
    @classmethod
    def get_activity_feed(cls, limit: int = 20) -> List[Dict]:
        """Get recent platform activity for live feed."""
        from apps.courses.models import Enrollment, LessonCompletion
        from apps.dsa.models import Submission
        
        activities = []
        
        # Recent enrollments
        enrollments = Enrollment.objects.select_related(
            'user', 'course'
        ).order_by('-created_at')[:10]
        
        for e in enrollments:
            activities.append({
                'type': 'enrollment',
                'user': e.user.display_name or e.user.username,
                'course': e.course.title,
                'timestamp': e.created_at.isoformat(),
            })
        
        # Recent completions
        completions = LessonCompletion.objects.select_related(
            'user', 'lesson'
        ).order_by('-completed_at')[:10]
        
        for c in completions:
            activities.append({
                'type': 'lesson_complete',
                'user': c.user.display_name or c.user.username,
                'lesson': c.lesson.title,
                'timestamp': c.completed_at.isoformat(),
            })
        
        # Recent successful submissions
        submissions = Submission.objects.filter(
            status='AC'
        ).select_related('user', 'problem').order_by('-created_at')[:10]
        
        for s in submissions:
            activities.append({
                'type': 'problem_solved',
                'user': s.user.display_name or s.user.username,
                'problem': s.problem.title,
                'timestamp': s.created_at.isoformat(),
            })
        
        # Sort by timestamp and limit
        activities.sort(key=lambda x: x['timestamp'], reverse=True)
        return activities[:limit]
