"""
Advanced Analytics Dashboard Service

Provides real-time learning analytics, insights, and metrics for
both learners and instructors. Powers comprehensive dashboards.

Features:
1. Real-time activity metrics
2. Learning velocity tracking
3. Engagement heatmaps
4. Predictive analytics
5. Cohort analysis
6. Instructor performance metrics
"""

import logging
from datetime import timedelta, date
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
from collections import defaultdict

from django.utils import timezone
from django.db.models import (
    Count, Avg, Sum, F, Q, 
    ExpressionWrapper, FloatField,
    Case, When, Value
)
from django.db.models.functions import TruncDate, TruncWeek, TruncHour, ExtractHour
from django.core.cache import cache

logger = logging.getLogger(__name__)


class MetricTimeRange(Enum):
    """Time ranges for metrics."""
    TODAY = "today"
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"
    YEAR = "year"
    ALL_TIME = "all_time"


@dataclass
class ProgressMetric:
    """Represents a progress metric with trend."""
    current: float
    previous: float
    trend_percent: float
    trend_direction: str  # 'up', 'down', 'stable'


class AdvancedAnalyticsService:
    """
    Comprehensive analytics service for learning platform.
    """
    
    # Cache timeouts
    CACHE_SHORT = 300      # 5 min for real-time data
    CACHE_MEDIUM = 1800    # 30 min for aggregated data
    CACHE_LONG = 3600      # 1 hour for historical data
    
    # ==========================================================================
    # LEARNER ANALYTICS
    # ==========================================================================
    
    @classmethod
    def get_learner_dashboard(cls, user) -> Dict[str, Any]:
        """
        Get comprehensive dashboard data for a learner.
        
        Returns all metrics needed for a complete dashboard view.
        """
        cache_key = f"learner_dashboard:{user.id}"
        cached = cache.get(cache_key)
        if cached:
            return cached
        
        data = {
            'overview': cls._get_learner_overview(user),
            'learning_velocity': cls._get_learning_velocity(user),
            'skill_progress': cls._get_skill_progress(user),
            'activity_heatmap': cls._get_activity_heatmap(user),
            'streak_info': cls._get_streak_info(user),
            'achievements_progress': cls._get_achievements_progress(user),
            'recommendations': cls._get_quick_recommendations(user),
            'generated_at': timezone.now().isoformat()
        }
        
        cache.set(cache_key, data, timeout=cls.CACHE_SHORT)
        return data
    
    @classmethod
    def _get_learner_overview(cls, user) -> Dict[str, Any]:
        """Get overview metrics for learner."""
        from apps.courses.models import Enrollment, Lesson
        from apps.ai_engine.models import ActivityLog
        from apps.gamification.models import UserXP
        
        # Enrollment stats
        enrollments = Enrollment.objects.filter(user=user)
        total_enrolled = enrollments.count()
        completed = enrollments.filter(progress_percentage=100).count()
        avg_progress = enrollments.aggregate(avg=Avg('progress_percentage'))['avg'] or 0
        
        # XP & Level
        try:
            profile = UserXP.objects.get(user=user)
            total_xp = profile.total_xp
            level = profile.level
        except UserXP.DoesNotExist:
            total_xp = 0
            level = 1
        
        # Time spent (from activity logs)
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        
        time_this_week = ActivityLog.objects.filter(
            user=user,
            created_at__date__gte=week_ago
        ).aggregate(total=Sum('metadata__duration_minutes'))['total'] or 0
        
        return {
            'courses_enrolled': total_enrolled,
            'courses_completed': completed,
            'average_progress': round(avg_progress, 1),
            'total_xp': total_xp,
            'current_level': level,
            'time_this_week_minutes': time_this_week,
            'completion_rate': round((completed / total_enrolled * 100) if total_enrolled > 0 else 0, 1)
        }
    
    @classmethod
    def _get_learning_velocity(cls, user) -> Dict[str, Any]:
        """
        Calculate learning velocity - lessons/week over time.
        """
        from apps.ai_engine.models import ActivityLog
        
        now = timezone.now()
        weeks_data = []
        
        for i in range(8):  # Last 8 weeks
            week_start = now - timedelta(weeks=i+1)
            week_end = now - timedelta(weeks=i)
            
            lessons_completed = ActivityLog.objects.filter(
                user=user,
                action=ActivityLog.ActionType.LESSON_COMPLETE,
                created_at__gte=week_start,
                created_at__lt=week_end
            ).count()
            
            weeks_data.append({
                'week': f"Week {8-i}",
                'lessons': lessons_completed,
                'date_range': f"{week_start.date().isoformat()} to {week_end.date().isoformat()}"
            })
        
        weeks_data.reverse()
        
        # Calculate velocity trend
        recent_avg = sum(w['lessons'] for w in weeks_data[-4:]) / 4 if weeks_data else 0
        older_avg = sum(w['lessons'] for w in weeks_data[:4]) / 4 if weeks_data else 0
        
        if older_avg > 0:
            velocity_change = ((recent_avg - older_avg) / older_avg) * 100
        else:
            velocity_change = 0
        
        return {
            'weekly_data': weeks_data,
            'current_velocity': round(recent_avg, 1),
            'velocity_change_percent': round(velocity_change, 1),
            'trend': 'up' if velocity_change > 5 else ('down' if velocity_change < -5 else 'stable')
        }
    
    @classmethod
    def _get_skill_progress(cls, user) -> List[Dict[str, Any]]:
        """Get progress by skill/category."""
        from apps.courses.models import Enrollment, Category
        
        skills = []
        categories = Category.objects.filter(
            courses__enrollments__user=user
        ).distinct()[:10]
        
        for category in categories:
            enrollments = Enrollment.objects.filter(
                user=user,
                course__category=category
            )
            
            avg_progress = enrollments.aggregate(avg=Avg('progress_percentage'))['avg'] or 0
            course_count = enrollments.count()
            
            skills.append({
                'skill': category.name,
                'progress': round(avg_progress, 1),
                'courses': course_count,
                'icon': category.icon or '📚'
            })
        
        # Sort by progress descending
        skills.sort(key=lambda x: x['progress'], reverse=True)
        
        return skills
    
    @classmethod
    def _get_activity_heatmap(cls, user, days: int = 365) -> Dict[str, int]:
        """
        Generate activity heatmap data (GitHub-style contribution graph).
        """
        from apps.ai_engine.models import ActivityLog
        
        start_date = timezone.now() - timedelta(days=days)
        
        daily = ActivityLog.objects.filter(
            user=user,
            created_at__gte=start_date
        ).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            count=Count('id')
        ).order_by('date')
        
        return {
            item['date'].isoformat(): item['count']
            for item in daily
        }
    
    @classmethod
    def _get_streak_info(cls, user) -> Dict[str, Any]:
        """Get streak information."""
        from apps.gamification.models import UserXP, Streak
        
        try:
            # Try to get streak info from Streak model first
            streak = Streak.objects.get(user=user)
            return {
                'current_streak': streak.current_streak,
                'longest_streak': streak.longest_streak,
                'streak_active': streak.current_streak > 0,
                'last_activity_date': streak.last_activity_date.isoformat() if streak.last_activity_date else None
            }
        except Streak.DoesNotExist:
            # Fallback to UserXP if Streak doesn't exist
            try:
                profile = UserXP.objects.get(user=user)
                return {
                    'current_streak': profile.current_streak,
                    'longest_streak': profile.current_streak,  # UserXP doesn't have longest_streak
                    'streak_active': profile.current_streak > 0,
                    'last_activity_date': profile.last_activity_date.isoformat() if profile.last_activity_date else None
                }
            except UserXP.DoesNotExist:
                return {
                    'current_streak': 0,
                    'longest_streak': 0,
                    'streak_active': False,
                    'last_activity_date': None
                }
    
    @classmethod
    def _get_achievements_progress(cls, user) -> Dict[str, Any]:
        """Get achievements summary."""
        from apps.gamification.models import Badge, UserBadge
        
        total_badges = Badge.objects.count()
        earned_badges = UserBadge.objects.filter(user=user).count()
        
        recent_badges = UserBadge.objects.filter(user=user).select_related('badge').order_by('-earned_at')[:5]
        
        return {
            'total_available': total_badges,
            'earned': earned_badges,
            'progress_percent': round((earned_badges / total_badges * 100) if total_badges > 0 else 0, 1),
            'recent': [
                {
                    'name': ub.badge.name,
                    'icon': ub.badge.icon,
                    'earned_at': ub.earned_at.isoformat()
                }
                for ub in recent_badges
            ]
        }
    
    @classmethod
    def _get_quick_recommendations(cls, user) -> List[Dict[str, Any]]:
        """Get quick action recommendations."""
        recommendations = []
        
        # Check for incomplete courses
        from apps.courses.models import Enrollment
        
        almost_done = Enrollment.objects.filter(
            user=user,
            progress_percentage__gte=75,
            progress_percentage__lt=100
        ).select_related('course')[:3]
        
        for enrollment in almost_done:
            recommendations.append({
                'type': 'complete_course',
                'title': f"Finish {enrollment.course.title}",
                'description': f"You're {enrollment.progress_percentage}% done!",
                'action_url': f"/courses/{enrollment.course.slug}",
                'priority': 'high'
            })
        
        # Check streak
        streak_info = cls._get_streak_info(user)
        if not streak_info['streak_active']:
            recommendations.append({
                'type': 'maintain_streak',
                'title': "Start a learning streak!",
                'description': "Complete one lesson to begin your streak.",
                'action_url': "/learn",
                'priority': 'medium'
            })
        
        return recommendations[:5]
    
    # ==========================================================================
    # INSTRUCTOR ANALYTICS
    # ==========================================================================
    
    @classmethod
    def get_instructor_dashboard(cls, instructor) -> Dict[str, Any]:
        """
        Get comprehensive dashboard for an instructor.
        """
        cache_key = f"instructor_dashboard:{instructor.id}"
        cached = cache.get(cache_key)
        if cached:
            return cached
        
        data = {
            'overview': cls._get_instructor_overview(instructor),
            'course_performance': cls._get_course_performance(instructor),
            'revenue_analytics': cls._get_revenue_analytics(instructor),
            'student_engagement': cls._get_student_engagement(instructor),
            'review_summary': cls._get_review_summary(instructor),
            'generated_at': timezone.now().isoformat()
        }
        
        cache.set(cache_key, data, timeout=cls.CACHE_MEDIUM)
        return data
    
    @classmethod
    def _get_instructor_overview(cls, instructor) -> Dict[str, Any]:
        """Get overview metrics for instructor."""
        from apps.courses.models import Course, Enrollment, Review
        
        courses = Course.objects.filter(instructor=instructor)
        total_courses = courses.count()
        published_courses = courses.filter(is_published=True).count()
        
        total_students = Enrollment.objects.filter(
            course__instructor=instructor
        ).values('user').distinct().count()
        
        avg_rating = Review.objects.filter(
            course__instructor=instructor
        ).aggregate(avg=Avg('rating'))['avg'] or 0
        
        return {
            'total_courses': total_courses,
            'published_courses': published_courses,
            'total_students': total_students,
            'average_rating': round(avg_rating, 2),
            'total_reviews': Review.objects.filter(course__instructor=instructor).count()
        }
    
    @classmethod
    def _get_course_performance(cls, instructor) -> List[Dict[str, Any]]:
        """Get performance metrics for each course."""
        from apps.courses.models import Course, Enrollment, Review
        
        courses = Course.objects.filter(
            instructor=instructor,
            is_published=True
        ).annotate(
            student_count=Count('enrollments'),
            avg_progress=Avg('enrollments__progress_percentage'),
            avg_rating=Avg('reviews__rating'),
            review_count=Count('reviews')
        ).order_by('-student_count')[:10]
        
        return [
            {
                'course_id': str(c.id),
                'title': c.title,
                'students': c.student_count,
                'avg_progress': round(c.avg_progress or 0, 1),
                'avg_rating': round(c.avg_rating or 0, 2),
                'reviews': c.review_count,
                'completion_rate': cls._calculate_course_completion_rate(c)
            }
            for c in courses
        ]
    
    @classmethod
    def _calculate_course_completion_rate(cls, course) -> float:
        """Calculate completion rate for a course."""
        from apps.courses.models import Enrollment
        
        total = Enrollment.objects.filter(course=course).count()
        completed = Enrollment.objects.filter(
            course=course,
            progress_percentage=100
        ).count()
        
        return round((completed / total * 100) if total > 0 else 0, 1)
    
    @classmethod
    def _get_revenue_analytics(cls, instructor) -> Dict[str, Any]:
        """Get revenue analytics for instructor."""
        from apps.payments.models import Payment
        
        now = timezone.now()
        this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_month_start = (this_month_start - timedelta(days=1)).replace(day=1)
        
        # This month revenue
        this_month = Payment.objects.filter(
            course__instructor=instructor,
            status='completed',
            created_at__gte=this_month_start
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # Last month revenue
        last_month = Payment.objects.filter(
            course__instructor=instructor,
            status='completed',
            created_at__gte=last_month_start,
            created_at__lt=this_month_start
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # Growth
        growth = ((this_month - last_month) / last_month * 100) if last_month > 0 else 0
        
        return {
            'this_month': float(this_month),
            'last_month': float(last_month),
            'growth_percent': round(growth, 1),
            'currency': 'INR'
        }
    
    @classmethod
    def _get_student_engagement(cls, instructor) -> Dict[str, Any]:
        """Get student engagement metrics."""
        from apps.ai_engine.models import ActivityLog
        from apps.courses.models import Course
        
        course_ids = Course.objects.filter(
            instructor=instructor
        ).values_list('id', flat=True)
        
        now = timezone.now()
        week_ago = now - timedelta(days=7)
        
        # Hourly activity distribution
        hourly = ActivityLog.objects.filter(
            metadata__course_id__in=list(course_ids),
            created_at__gte=week_ago
        ).annotate(
            hour=ExtractHour('created_at')
        ).values('hour').annotate(
            count=Count('id')
        ).order_by('hour')
        
        hourly_data = {i: 0 for i in range(24)}
        for item in hourly:
            hourly_data[item['hour']] = item['count']
        
        # Peak hour
        peak_hour = max(hourly_data, key=hourly_data.get) if hourly_data else 18
        
        return {
            'hourly_distribution': hourly_data,
            'peak_hour': peak_hour,
            'peak_hour_label': f"{peak_hour}:00 - {(peak_hour+1)%24}:00"
        }
    
    @classmethod
    def _get_review_summary(cls, instructor) -> Dict[str, Any]:
        """Get review summary with rating distribution."""
        from apps.courses.models import Review
        
        reviews = Review.objects.filter(course__instructor=instructor)
        
        distribution = {i: 0 for i in range(1, 6)}
        for rating in reviews.values_list('rating', flat=True):
            distribution[int(rating)] = distribution.get(int(rating), 0) + 1
        
        recent = reviews.select_related('user', 'course').order_by('-created_at')[:5]
        
        return {
            'distribution': distribution,
            'total': reviews.count(),
            'recent': [
                {
                    'rating': r.rating,
                    'comment': r.comment[:100] if r.comment else '',
                    'user': r.user.first_name or r.user.username,
                    'course': r.course.title,
                    'date': r.created_at.isoformat()
                }
                for r in recent
            ]
        }
    
    # ==========================================================================
    # PLATFORM ANALYTICS (Admin)
    # ==========================================================================
    
    @classmethod
    def get_platform_metrics(cls) -> Dict[str, Any]:
        """
        Get platform-wide metrics for admin dashboard.
        """
        from apps.users.models import User
        from apps.courses.models import Course, Enrollment
        from apps.payments.models import Payment
        
        now = timezone.now()
        today = now.date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        return {
            'users': {
                'total': User.objects.count(),
                'new_this_week': User.objects.filter(date_joined__date__gte=week_ago).count(),
                'active_this_week': User.objects.filter(last_login_at__date__gte=week_ago).count()
            },
            'courses': {
                'total': Course.objects.count(),
                'published': Course.objects.filter(is_published=True).count(),
                'new_this_month': Course.objects.filter(created_at__date__gte=month_ago).count()
            },
            'enrollments': {
                'total': Enrollment.objects.count(),
                'new_this_week': Enrollment.objects.filter(created_at__date__gte=week_ago).count()
            },
            'revenue': {
                'this_month': float(Payment.objects.filter(
                    status='completed',
                    created_at__date__gte=month_ago
                ).aggregate(total=Sum('amount'))['total'] or 0)
            },
            'generated_at': now.isoformat()
        }


# ==========================================================================
# RECOMMENDATION ENGINE
# ==========================================================================

class RecommendationEngine:
    """
    AI-powered course recommendation engine using collaborative filtering
    and content-based filtering.
    """
    
    CACHE_TIMEOUT = 1800  # 30 minutes
    
    @classmethod
    def get_personalized_recommendations(
        cls, 
        user, 
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get personalized course recommendations for a user.
        
        Algorithm:
        1. Content-based: Similar to courses user liked
        2. Collaborative: What similar users enrolled in
        3. Trending: Popular courses in user's categories
        4. Gap-filling: Courses for knowledge gaps
        """
        cache_key = f"recommendations:{user.id}:{limit}"
        cached = cache.get(cache_key)
        if cached:
            return cached
        
        recommendations = []
        
        # Get user's enrolled course IDs to exclude
        from apps.courses.models import Enrollment, Course
        enrolled_ids = set(Enrollment.objects.filter(
            user=user
        ).values_list('course_id', flat=True))
        
        # 1. Content-based recommendations
        content_recs = cls._content_based(user, enrolled_ids, limit=5)
        recommendations.extend(content_recs)
        
        # 2. Collaborative filtering
        collab_recs = cls._collaborative_filtering(user, enrolled_ids, limit=3)
        recommendations.extend(collab_recs)
        
        # 3. Trending in user's categories
        trending = cls._trending_in_categories(user, enrolled_ids, limit=2)
        recommendations.extend(trending)
        
        # Deduplicate by course_id
        seen = set()
        unique_recs = []
        for rec in recommendations:
            if rec['course_id'] not in seen:
                seen.add(rec['course_id'])
                unique_recs.append(rec)
        
        result = unique_recs[:limit]
        cache.set(cache_key, result, timeout=cls.CACHE_TIMEOUT)
        return result
    
    @classmethod
    def _content_based(
        cls, 
        user, 
        exclude_ids: set, 
        limit: int
    ) -> List[Dict[str, Any]]:
        """
        Content-based filtering using course categories and difficulty.
        """
        from apps.courses.models import Enrollment, Course, Review
        
        # Get user's preferred categories and difficulty
        enrollments = Enrollment.objects.filter(user=user).select_related('course')
        
        # Count category preferences
        category_counts = defaultdict(int)
        difficulty_counts = defaultdict(int)
        
        for enrollment in enrollments:
            if enrollment.course.category:
                category_counts[enrollment.course.category_id] += 1
            difficulty_counts[enrollment.course.difficulty] += 1
        
        if not category_counts:
            return []
        
        # Get top categories
        top_categories = sorted(
            category_counts.items(), 
            key=lambda x: x[1], 
            reverse=True
        )[:3]
        top_category_ids = [c[0] for c in top_categories]
        
        # Get preferred difficulty
        preferred_difficulty = max(difficulty_counts.items(), key=lambda x: x[1])[0] if difficulty_counts else 'intermediate'
        
        # Find similar courses
        similar_courses = Course.objects.filter(
            is_published=True,
            category_id__in=top_category_ids,
            difficulty=preferred_difficulty
        ).exclude(
            id__in=exclude_ids
        ).annotate(
            avg_rating=Avg('reviews__rating'),
            student_count=Count('enrollments')
        ).order_by('-avg_rating', '-student_count')[:limit]
        
        return [
            {
                'course_id': str(c.id),
                'title': c.title,
                'thumbnail': c.thumbnail.url if c.thumbnail else None,
                'rating': round(c.avg_rating or 0, 2),
                'students': c.student_count,
                'reason': 'Based on your interests',
                'score': 0.9
            }
            for c in similar_courses
        ]
    
    @classmethod
    def _collaborative_filtering(
        cls, 
        user, 
        exclude_ids: set, 
        limit: int
    ) -> List[Dict[str, Any]]:
        """
        Collaborative filtering - find what similar users enrolled in.
        """
        from apps.courses.models import Enrollment, Course
        
        # Find users with similar enrollments
        user_courses = set(Enrollment.objects.filter(
            user=user
        ).values_list('course_id', flat=True))
        
        if not user_courses:
            return []
        
        # Find users who enrolled in same courses
        similar_users = Enrollment.objects.filter(
            course_id__in=user_courses
        ).exclude(
            user=user
        ).values('user').annotate(
            overlap=Count('course')
        ).filter(
            overlap__gte=2  # At least 2 common courses
        ).order_by('-overlap')[:50]
        
        similar_user_ids = [u['user'] for u in similar_users]
        
        if not similar_user_ids:
            return []
        
        # Get courses those users enrolled in
        recommended_course_ids = Enrollment.objects.filter(
            user_id__in=similar_user_ids
        ).exclude(
            course_id__in=user_courses
        ).exclude(
            course_id__in=exclude_ids
        ).values('course').annotate(
            popularity=Count('id')
        ).order_by('-popularity')[:limit]
        
        course_ids = [c['course'] for c in recommended_course_ids]
        courses = Course.objects.filter(id__in=course_ids)
        
        return [
            {
                'course_id': str(c.id),
                'title': c.title,
                'thumbnail': c.thumbnail.url if c.thumbnail else None,
                'rating': 0,
                'students': 0,
                'reason': 'Popular with similar learners',
                'score': 0.8
            }
            for c in courses
        ]
    
    @classmethod
    def _trending_in_categories(
        cls, 
        user, 
        exclude_ids: set, 
        limit: int
    ) -> List[Dict[str, Any]]:
        """
        Get trending courses in user's preferred categories.
        """
        from apps.courses.models import Enrollment, Course
        
        # Get user's categories
        user_category_ids = Enrollment.objects.filter(
            user=user
        ).values_list('course__category_id', flat=True).distinct()
        
        if not user_category_ids:
            # Fallback to globally trending
            user_category_ids = None
        
        now = timezone.now()
        week_ago = now - timedelta(days=7)
        
        # Trending = most enrollments this week
        query = Course.objects.filter(is_published=True)
        
        if user_category_ids:
            query = query.filter(category_id__in=user_category_ids)
        
        trending = query.exclude(
            id__in=exclude_ids
        ).annotate(
            recent_enrollments=Count(
                'enrollments',
                filter=Q(enrollments__created_at__gte=week_ago)
            )
        ).filter(
            recent_enrollments__gt=0
        ).order_by('-recent_enrollments')[:limit]
        
        return [
            {
                'course_id': str(c.id),
                'title': c.title,
                'thumbnail': c.thumbnail.url if c.thumbnail else None,
                'rating': 0,
                'students': c.recent_enrollments,
                'reason': 'Trending this week',
                'score': 0.7
            }
            for c in trending
        ]
    
    @classmethod
    def get_similar_courses(cls, course_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Get courses similar to a specific course.
        """
        from apps.courses.models import Course
        
        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return []
        
        similar = Course.objects.filter(
            is_published=True,
            category=course.category,
            difficulty=course.difficulty
        ).exclude(
            id=course.id
        ).annotate(
            avg_rating=Avg('reviews__rating'),
            student_count=Count('enrollments')
        ).order_by('-avg_rating')[:limit]
        
        return [
            {
                'course_id': str(c.id),
                'title': c.title,
                'thumbnail': c.thumbnail.url if c.thumbnail else None,
                'rating': round(c.avg_rating or 0, 2),
                'students': c.student_count
            }
            for c in similar
        ]
