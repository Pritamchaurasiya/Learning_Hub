# Database Query Optimization for ML Features
"""
Optimized database queries with prefetching, indexing, and performance improvements
"""

from django.db import models
from django.db.models import Q, Count, Avg, Sum, Max, Min, StdDev, Variance, Prefetch, F, Func, Value
from django.db.models.functions import Coalesce, Greatest, Least, Cast, Extract
from django.db.models.expressions import RawSQL
from django.core.cache import cache
from django.conf import settings
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from django.utils import timezone

logger = logging.getLogger(__name__)

class OptimizedMLQueryManager:
    """
    Optimized query manager for ML features with performance improvements.
    """
    
    def __init__(self):
        self.cache_timeout = 1800  # 30 minutes
        self._create_optimized_indexes()
    
    def _create_optimized_indexes(self):
        """Create optimized database indexes for ML queries."""
        # These would be created via migrations in production
        index_definitions = [
            # User behavior indexes
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activitylog_user_timestamp ON ai_engine_activitylog(user_id, timestamp DESC)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activitylog_user_action ON ai_engine_activitylog(user_id, action)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activitylog_action_timestamp ON ai_engine_activitylog(action, timestamp DESC)",
            
            # Course analytics indexes
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enrollment_user_progress ON courses_enrollment(user_id, progress_percentage)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enrollment_course_progress ON courses_enrollment(course_id, progress_percentage)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enrollment_completed ON courses_enrollment(progress_percentage, completed_at)",
            
            # Vector search indexes
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courseembedding_content_type ON ai_engine_courseembedding(content_type_id, object_id)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courseembedding_vector ON ai_engine_courseembedding USING ivfflat (embedding vector_cosine_ops)",
            
            # Performance tracking indexes
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_userperformance_user_date ON ai_engine_userperformance(user_id, date)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_userengagement_user_date ON ai_engine_userengagement(user_id, date)",
            
            # Composite indexes for complex queries
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enrollment_user_course_progress ON courses_enrollment(user_id, course_id, progress_percentage)",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activitylog_user_action_timestamp ON ai_engine_activitylog(user_id, action, timestamp DESC)",
        ]
        
        # Log index creation for migration purposes
        for index_sql in index_definitions:
            logger.info(f"Index to create: {index_sql}")
    
    def get_optimized_user_profile(self, user_id: int) -> Dict[str, Any]:
        """
        Get optimized user profile with minimal database queries.
        """
        cache_key = f"optimized_user_profile:{user_id}"
        cached_profile = cache.get(cache_key)
        if cached_profile:
            return cached_profile
        
        try:
            from apps.users.models import User
            from apps.courses.models import Enrollment
            from apps.ai_engine.models import ActivityLog, UserProfile, UserPerformance
            
            # Single optimized query with all necessary data
            user_data = User.objects.filter(id=user_id).annotate(
                # Enrollment statistics
                total_enrollments=Count('enrollments'),
                completed_enrollments=Count('enrollments', filter=Q(enrollments__progress_percentage=100)),
                avg_progress=Avg('enrollments__progress_percentage'),
                
                # Recent activity count
                recent_activities=Count(
                    'activitylog',
                    filter=Q(activitylog__timestamp__gte=timezone.now() - timedelta(days=30))
                ),
                
                # Performance metrics
                avg_performance_score=Avg(
                    'userperformance__performance_score',
                    filter=Q(userperformance__date__gte=timezone.now() - timedelta(days=90))
                ),
                
                # Engagement metrics
                total_engagement=Sum('userengagement__total_actions'),
                avg_session_duration=Avg('userengagement__session_duration')
            ).first()
            
            if not user_data:
                return {}
            
            # Get detailed learning patterns with optimized query
            learning_patterns = self._get_learning_patterns_optimized(user_id)
            
            # Get preferences with single query
            preferences = self._get_user_preferences_optimized(user_id)
            
            profile = {
                'user_id': user_id,
                'username': user_data.username,
                'email': user_data.email,
                'total_enrollments': user_data.total_enrollments or 0,
                'completed_enrollments': user_data.completed_enrollments or 0,
                'completion_rate': (user_data.completed_enrollments / max(user_data.total_enrollments, 1)) * 100,
                'avg_progress': user_data.avg_progress or 0,
                'recent_activities': user_data.recent_activities or 0,
                'avg_performance_score': user_data.avg_performance_score or 0,
                'total_engagement': user_data.total_engagement or 0,
                'avg_session_duration': user_data.avg_session_duration or 0,
                'learning_patterns': learning_patterns,
                'preferences': preferences,
                'last_updated': timezone.now().isoformat()
            }
            
            # Cache the result
            cache.set(cache_key, profile, timeout=self.cache_timeout)
            
            return profile
            
        except Exception as e:
            logger.error(f"Optimized user profile error: {e}")
            return {}
    
    def _get_learning_patterns_optimized(self, user_id: int) -> Dict[str, Any]:
        """Get learning patterns with optimized queries."""
        try:
            from apps.ai_engine.models import ActivityLog
            
            # Single query for all activity patterns
            patterns = ActivityLog.objects.filter(user_id=user_id).aggregate(
                # Activity by type
                video_count=Count('id', filter=Q(action='video_watched')),
                lesson_count=Count('id', filter=Q(action='lesson_completed')),
                quiz_count=Count('id', filter=Q(action='quiz_attempted')),
                project_count=Count('id', filter=Q(action='project_completed')),
                
                # Time patterns
                avg_session_time=Avg(Cast(RawSQL("metadata->>'session_duration'", models.IntegerField()), models.IntegerField())),
                total_learning_time=Sum(Cast(RawSQL("metadata->>'session_duration'", models.IntegerField()), models.IntegerField())),
                
                # Performance patterns
                avg_quiz_score=Avg(Cast(RawSQL("metadata->>'score'", models.FloatField()), models.FloatField())),
                best_quiz_score=Max(Cast(RawSQL("metadata->>'score'", models.FloatField()), models.FloatField())),
                
                # Time of day patterns
                preferred_hour=ExtractHour('timestamp', output_field=models.IntegerField()),
                
                # Recent activity
                last_activity=Max('timestamp')
            )
            
            # Calculate learning style from patterns
            total_activities = (patterns['video_count'] or 0) + (patterns['lesson_count'] or 0) + \
                              (patterns['quiz_count'] or 0) + (patterns['project_count'] or 0)
            
            learning_style = 'mixed'
            if total_activities > 0:
                video_ratio = (patterns['video_count'] or 0) / total_activities
                lesson_ratio = (patterns['lesson_count'] or 0) / total_activities
                project_ratio = (patterns['project_count'] or 0) / total_activities
                
                if video_ratio > 0.4:
                    learning_style = 'visual'
                elif lesson_ratio > 0.4:
                    learning_style = 'reading'
                elif project_ratio > 0.3:
                    learning_style = 'kinesthetic'
            
            return {
                'learning_style': learning_style,
                'activity_counts': {
                    'video': patterns['video_count'] or 0,
                    'lesson': patterns['lesson_count'] or 0,
                    'quiz': patterns['quiz_count'] or 0,
                    'project': patterns['project_count'] or 0
                },
                'time_patterns': {
                    'avg_session_time': patterns['avg_session_time'] or 0,
                    'total_learning_time': patterns['total_learning_time'] or 0,
                    'preferred_hour': patterns['preferred_hour'] or 14
                },
                'performance_patterns': {
                    'avg_quiz_score': patterns['avg_quiz_score'] or 0,
                    'best_quiz_score': patterns['best_quiz_score'] or 0
                },
                'last_activity': patterns['last_activity']
            }
            
        except Exception as e:
            logger.error(f"Learning patterns optimization error: {e}")
            return {}
    
    def _get_user_preferences_optimized(self, user_id: int) -> Dict[str, Any]:
        """Get user preferences with optimized query."""
        try:
            from apps.ai_engine.models import UserPreferences
            
            preferences = UserPreferences.objects.filter(user_id=user_id).aggregate(
                preferred_difficulty=Coalesce('preferred_difficulty', Value('intermediate')),
                preferred_format=Coalesce('preferred_format', Value('video')),
                preferred_duration=Coalesce('preferred_duration', Value(60)),
                notification_frequency=Coalesce('notification_frequency', Value('daily')),
                auto_advance=Coalesce('auto_advance', Value(True)),
                show_hints=Coalesce('show_hints', Value(True))
            )
            
            return preferences
            
        except Exception as e:
            logger.error(f"User preferences optimization error: {e}")
            return {}
    
    def get_optimized_course_analytics(self, course_id: int) -> Dict[str, Any]:
        """
        Get optimized course analytics with minimal queries.
        """
        cache_key = f"optimized_course_analytics:{course_id}"
        cached_analytics = cache.get(cache_key)
        if cached_analytics:
            return cached_analytics
        
        try:
            from apps.courses.models import Course, Enrollment
            
            # Single comprehensive query
            course_analytics = Course.objects.filter(id=course_id).annotate(
                # Enrollment metrics
                total_enrollments=Count('enrollments'),
                active_enrollments=Count('enrollments', filter=Q(enrollments__progress_percentage__gt=0, enrollments__progress_percentage__lt=100)),
                completed_enrollments=Count('enrollments', filter=Q(enrollments__progress_percentage=100)),
                
                # Progress metrics
                avg_progress=Avg('enrollments__progress_percentage'),
                median_progress=self._median_query('enrollments__progress_percentage'),
                
                # Time metrics
                avg_completion_time=Avg('enrollments__completion_time'),
                total_learning_time=Sum('enrollments__total_time_spent'),
                
                # Rating metrics
                avg_rating=Avg('enrollments__rating'),
                rating_count=Count('enrollments', filter=Q(enrollments__rating__isnull=False)),
                
                # Engagement metrics
                total_interactions=Sum('enrollments__total_interactions'),
                avg_session_duration=Avg('enrollments__avg_session_duration'),
                
                # Recent activity
                recent_enrollments=Count('enrollments', filter=Q(enrollments__enrolled_at__gte=timezone.now() - timedelta(days=30))),
                recent_completions=Count('enrollments', filter=Q(enrollments__completed_at__gte=timezone.now() - timedelta(days=30)))
            ).first()
            
            if not course_analytics:
                return {}
            
            # Calculate additional metrics
            completion_rate = (course_analytics.completed_enrollments / max(course_analytics.total_enrollments, 1)) * 100
            engagement_rate = (course_analytics.active_enrollments / max(course_analytics.total_enrollments, 1)) * 100
            
            # Get performance distribution with optimized query
            performance_distribution = self._get_performance_distribution_optimized(course_id)
            
            analytics = {
                'course_id': course_id,
                'enrollment_metrics': {
                    'total_enrollments': course_analytics.total_enrollments,
                    'active_enrollments': course_analytics.active_enrollments,
                    'completed_enrollments': course_analytics.completed_enrollments,
                    'completion_rate': completion_rate,
                    'engagement_rate': engagement_rate,
                    'recent_enrollments': course_analytics.recent_enrollments,
                    'recent_completions': course_analytics.recent_completions
                },
                'progress_metrics': {
                    'avg_progress': course_analytics.avg_progress or 0,
                    'median_progress': course_analytics.median_progress or 0,
                    'avg_completion_time': course_analytics.avg_completion_time or 0,
                    'total_learning_time': course_analytics.total_learning_time or 0
                },
                'rating_metrics': {
                    'avg_rating': course_analytics.avg_rating or 0,
                    'rating_count': course_analytics.rating_count or 0
                },
                'engagement_metrics': {
                    'total_interactions': course_analytics.total_interactions or 0,
                    'avg_session_duration': course_analytics.avg_session_duration or 0
                },
                'performance_distribution': performance_distribution,
                'calculated_metrics': {
                    'difficulty_level': self._assess_course_difficulty(course_analytics),
                    'popularity_trend': self._calculate_popularity_trend(course_analytics),
                    'quality_score': self._calculate_quality_score(course_analytics)
                },
                'last_updated': timezone.now().isoformat()
            }
            
            # Cache the result
            cache.set(cache_key, analytics, timeout=self.cache_timeout)
            
            return analytics
            
        except Exception as e:
            logger.error(f"Optimized course analytics error: {e}")
            return {}
    
    def _median_query(self, field):
        """Create median query for PostgreSQL."""
        return RawSQL(
            f"PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY {field})",
            (),
            output_field=models.FloatField()
        )
    
    def _get_performance_distribution_optimized(self, course_id: int) -> Dict[str, Any]:
        """Get performance distribution with optimized query."""
        try:
            from apps.courses.models import Enrollment
            
            # Single query for performance distribution
            distribution = Enrollment.objects.filter(course_id=course_id).aggregate(
                excellent=Count('id', filter=Q(progress_percentage__gte=90)),
                good=Count('id', filter=Q(progress_percentage__gte=75, progress_percentage__lt=90)),
                average=Count('id', filter=Q(progress_percentage__gte=60, progress_percentage__lt=75)),
                below_average=Count('id', filter=Q(progress_percentage__gte=40, progress_percentage__lt=60)),
                poor=Count('id', filter=Q(progress_percentage__lt=40)),
                
                # Rating distribution
                five_star=Count('id', filter=Q(rating=5)),
                four_star=Count('id', filter=Q(rating=4)),
                three_star=Count('id', filter=Q(rating=3)),
                two_star=Count('id', filter=Q(rating=2)),
                one_star=Count('id', filter=Q(rating=1))
            )
            
            total = sum(distribution[key] for key in ['excellent', 'good', 'average', 'below_average', 'poor'])
            
            return {
                'progress_distribution': {
                    'excellent': distribution['excellent'],
                    'good': distribution['good'],
                    'average': distribution['average'],
                    'below_average': distribution['below_average'],
                    'poor': distribution['poor'],
                    'percentages': {
                        'excellent': (distribution['excellent'] / max(total, 1)) * 100,
                        'good': (distribution['good'] / max(total, 1)) * 100,
                        'average': (distribution['average'] / max(total, 1)) * 100,
                        'below_average': (distribution['below_average'] / max(total, 1)) * 100,
                        'poor': (distribution['poor'] / max(total, 1)) * 100
                    }
                },
                'rating_distribution': {
                    '5_star': distribution['five_star'],
                    '4_star': distribution['four_star'],
                    '3_star': distribution['three_star'],
                    '2_star': distribution['two_star'],
                    '1_star': distribution['one_star']
                }
            }
            
        except Exception as e:
            logger.error(f"Performance distribution optimization error: {e}")
            return {}
    
    def _assess_course_difficulty(self, analytics) -> str:
        """Assess course difficulty based on analytics."""
        try:
            avg_progress = analytics.avg_progress or 0
            completion_rate = (analytics.completed_enrollments / max(analytics.total_enrollments, 1)) * 100
            
            if avg_progress > 80 and completion_rate > 70:
                return 'beginner'
            elif avg_progress > 60 and completion_rate > 50:
                return 'intermediate'
            elif avg_progress > 40 and completion_rate > 30:
                return 'advanced'
            else:
                return 'expert'
                
        except Exception as e:
            logger.error(f"Difficulty assessment error: {e}")
            return 'intermediate'
    
    def _calculate_popularity_trend(self, analytics) -> str:
        """Calculate popularity trend based on analytics."""
        try:
            recent_enrollments = analytics.recent_enrollments or 0
            total_enrollments = analytics.total_enrollments or 1
            
            if recent_enrollments > total_enrollments * 0.1:  # More than 10% in last 30 days
                return 'trending_up'
            elif recent_enrollments < total_enrollments * 0.05:  # Less than 5% in last 30 days
                return 'trending_down'
            else:
                return 'stable'
                
        except Exception as e:
            logger.error(f"Popularity trend calculation error: {e}")
            return 'stable'
    
    def _calculate_quality_score(self, analytics) -> float:
        """Calculate quality score based on multiple factors."""
        try:
            # Normalize factors
            completion_rate = (analytics.completed_enrollments / max(analytics.total_enrollments, 1)) * 100
            avg_rating = analytics.avg_rating or 0
            engagement_rate = (analytics.active_enrollments / max(analytics.total_enrollments, 1)) * 100
            
            # Weighted score
            quality_score = (
                (completion_rate / 100) * 0.3 +
                (avg_rating / 5) * 0.4 +
                (engagement_rate / 100) * 0.3
            )
            
            return round(quality_score, 2)
            
        except Exception as e:
            logger.error(f"Quality score calculation error: {e}")
            return 0.5
    
    def get_optimized_recommendations(self, user_id: int, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get optimized recommendations with minimal database queries.
        """
        cache_key = f"optimized_recommendations:{user_id}:{limit}"
        cached_recommendations = cache.get(cache_key)
        if cached_recommendations:
            return cached_recommendations
        
        try:
            from apps.courses.models import Course, Enrollment, Category
            from apps.ai_engine.models import UserPreferences
            
            # Single query for user data and preferences
            user_data = User.objects.filter(id=user_id).prefetch_related(
                Prefetch('enrollments', queryset=Enrollment.objects.select_related('course'))
            ).annotate(
                enrolled_categories=Count('enrollments__course__category', distinct=True),
                completed_courses=Count('enrollments', filter=Q(enrollments__progress_percentage=100))
            ).first()
            
            if not user_data:
                return []
            
            # Get user preferences
            preferences = UserPreferences.objects.filter(user_id=user_id).first()
            
            # Get completed course IDs
            completed_course_ids = [
                enrollment.course.id for enrollment in user_data.enrollments.all()
                if enrollment.progress_percentage == 100
            ]
            
            # Get enrolled category IDs
            enrolled_category_ids = [
                enrollment.course.category.id for enrollment in user_data.enrollments.all()
                if enrollment.course.category
            ]
            
            # Optimized recommendation query
            recommendations = Course.objects.filter(
                is_published=True
            ).exclude(
                id__in=completed_course_ids
            ).annotate(
                # Popularity metrics
                enrollment_count=Count('enrollments'),
                completion_rate=Avg('enrollments__progress_percentage'),
                avg_rating=Avg('enrollments__rating'),
                
                # Relevance metrics
                category_match=Case(
                    When(category_id__in=enrolled_category_ids, then=Value(1)),
                    default=Value(0),
                    output_field=models.IntegerField()
                ),
                difficulty_match=Case(
                    When(difficulty=preferences.preferred_difficulty if preferences else 'intermediate', then=Value(1)),
                    default=Value(0),
                    output_field=models.IntegerField()
                )
            ).order_by(
                # Custom ordering for recommendations
                F('category_match').desc(),
                F('difficulty_match').desc(),
                F('enrollment_count').desc(),
                F('avg_rating').desc(nulls_last=True)
            )[:limit]
            
            # Format recommendations
            formatted_recommendations = []
            for course in recommendations:
                recommendation_score = self._calculate_recommendation_score(course, user_data, preferences)
                
                formatted_recommendations.append({
                    'id': course.id,
                    'title': course.title,
                    'description': course.description,
                    'category': course.category.name if course.category else None,
                    'difficulty': course.difficulty,
                    'estimated_duration': course.estimated_duration,
                    'recommendation_score': recommendation_score,
                    'recommendation_reason': self._get_recommendation_reason(course, user_data, preferences),
                    'popularity_metrics': {
                        'enrollment_count': course.enrollment_count,
                        'completion_rate': course.completion_rate or 0,
                        'avg_rating': course.avg_rating or 0
                    }
                })
            
            # Cache the result
            cache.set(cache_key, formatted_recommendations, timeout=self.cache_timeout)
            
            return formatted_recommendations
            
        except Exception as e:
            logger.error(f"Optimized recommendations error: {e}")
            return []
    
    def _calculate_recommendation_score(self, course, user_data, preferences) -> float:
        """Calculate recommendation score for a course."""
        try:
            score = 0.5  # Base score
            
            # Category relevance
            if course.category and course.category.id in user_data.enrolled_categories:
                score += 0.2
            
            # Difficulty preference
            if preferences and course.difficulty == preferences.preferred_difficulty:
                score += 0.15
            
            # Popularity
            if course.enrollment_count > 0:
                score += min(0.1, course.enrollment_count / 100)
            
            # Rating
            if course.avg_rating:
                score += (course.avg_rating / 5) * 0.1
            
            return min(1.0, score)
            
        except Exception as e:
            logger.error(f"Recommendation score calculation error: {e}")
            return 0.5
    
    def _get_recommendation_reason(self, course, user_data, preferences) -> str:
        """Get recommendation reason for a course."""
        reasons = []
        
        if course.category and course.category.id in user_data.enrolled_categories:
            reasons.append("matches your interests")
        
        if preferences and course.difficulty == preferences.preferred_difficulty:
            reasons.append("matches your skill level")
        
        if course.enrollment_count > 50:
            reasons.append("popular with learners")
        
        if course.avg_rating and course.avg_rating > 4.0:
            reasons.append("highly rated")
        
        return ", ".join(reasons) if reasons else "recommended for you"
    
    def get_optimized_activity_feed(self, user_id: int, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Get optimized activity feed with minimal queries.
        """
        cache_key = f"optimized_activity_feed:{user_id}:{limit}"
        cached_feed = cache.get(cache_key)
        if cached_feed:
            return cached_feed
        
        try:
            from apps.ai_engine.models import ActivityLog
            from apps.users.models import User
            
            # Single optimized query with joins
            activities = ActivityLog.objects.filter(
                user_id=user_id
            ).select_related('user').order_by('-timestamp')[:limit]
            
            # Format activities
            formatted_activities = []
            for activity in activities:
                formatted_activities.append({
                    'id': activity.id,
                    'action': activity.action,
                    'timestamp': activity.timestamp.isoformat(),
                    'metadata': activity.metadata or {},
                    'user': {
                        'id': activity.user.id,
                        'username': activity.user.username
                    }
                })
            
            # Cache the result
            cache.set(cache_key, formatted_activities, timeout=300)  # 5 minutes
            
            return formatted_activities
            
        except Exception as e:
            logger.error(f"Optimized activity feed error: {e}")
            return []
    
    def get_optimized_learning_stats(self, user_id: int) -> Dict[str, Any]:
        """
        Get optimized learning statistics with minimal queries.
        """
        cache_key = f"optimized_learning_stats:{user_id}"
        cached_stats = cache.get(cache_key)
        if cached_stats:
            return cached_stats
        
        try:
            from apps.courses.models import Enrollment
            from apps.ai_engine.models import ActivityLog, UserPerformance
            
            # Single comprehensive query
            stats = User.objects.filter(id=user_id).annotate(
                # Enrollment stats
                total_enrollments=Count('enrollments'),
                active_enrollments=Count('enrollments', filter=Q(enrollments__progress_percentage__gt=0, enrollments__progress_percentage__lt=100)),
                completed_enrollments=Count('enrollments', filter=Q(enrollments__progress_percentage=100)),
                
                # Progress stats
                avg_progress=Avg('enrollments__progress_percentage'),
                total_time_spent=Sum('enrollments__total_time_spent'),
                
                # Activity stats
                total_activities=Count('activitylog'),
                recent_activities=Count('activitylog', filter=Q(activitylog__timestamp__gte=timezone.now() - timedelta(days=30))),
                
                # Performance stats
                avg_performance_score=Avg('userperformance__performance_score'),
                best_performance_score=Max('userperformance__performance_score'),
                
                # Engagement stats
                total_engagement=Sum('userengagement__total_actions'),
                avg_session_duration=Avg('userengagement__session_duration')
            ).first()
            
            if not stats:
                return {}
            
            # Calculate additional metrics
            completion_rate = (stats.completed_enrollments / max(stats.total_enrollments, 1)) * 100
            engagement_rate = (stats.active_enrollments / max(stats.total_enrollments, 1)) * 100
            
            # Get learning streak
            learning_streak = self._calculate_learning_streak(user_id)
            
            # Get skill progression
            skill_progression = self._get_skill_progression_optimized(user_id)
            
            learning_stats = {
                'user_id': user_id,
                'enrollment_stats': {
                    'total_enrollments': stats.total_enrollments,
                    'active_enrollments': stats.active_enrollments,
                    'completed_enrollments': stats.completed_enrollments,
                    'completion_rate': completion_rate,
                    'engagement_rate': engagement_rate
                },
                'progress_stats': {
                    'avg_progress': stats.avg_progress or 0,
                    'total_time_spent': stats.total_time_spent or 0,
                    'avg_time_per_course': (stats.total_time_spent or 0) / max(stats.total_enrollments, 1)
                },
                'activity_stats': {
                    'total_activities': stats.total_activities or 0,
                    'recent_activities': stats.recent_activities or 0,
                    'activity_frequency': self._calculate_activity_frequency(user_id)
                },
                'performance_stats': {
                    'avg_performance_score': stats.avg_performance_score or 0,
                    'best_performance_score': stats.best_performance_score or 0,
                    'performance_trend': self._calculate_performance_trend(user_id)
                },
                'engagement_stats': {
                    'total_engagement': stats.total_engagement or 0,
                    'avg_session_duration': stats.avg_session_duration or 0,
                    'learning_streak': learning_streak
                },
                'skill_progression': skill_progression,
                'achievements': self._get_user_achievements_optimized(user_id),
                'last_updated': timezone.now().isoformat()
            }
            
            # Cache the result
            cache.set(cache_key, learning_stats, timeout=self.cache_timeout)
            
            return learning_stats
            
        except Exception as e:
            logger.error(f"Optimized learning stats error: {e}")
            return {}
    
    def _calculate_learning_streak(self, user_id: int) -> int:
        """Calculate current learning streak."""
        try:
            from apps.ai_engine.models import ActivityLog
            
            # Get recent activity dates
            recent_dates = ActivityLog.objects.filter(
                user_id=user_id,
                action__in=['lesson_completed', 'quiz_completed', 'course_completed']
            ).dates('timestamp', 'day').order_by('-timestamp')[:30]
            
            if not recent_dates:
                return 0
            
            # Calculate consecutive days
            streak = 0
            current_date = timezone.now().date()
            
            for date_obj in recent_dates:
                if date_obj.date() == current_date:
                    streak += 1
                    current_date -= timedelta(days=1)
                elif date_obj.date() == current_date:
                    streak += 1
                    current_date -= timedelta(days=1)
                else:
                    break
            
            return streak
            
        except Exception as e:
            logger.error(f"Learning streak calculation error: {e}")
            return 0
    
    def _calculate_activity_frequency(self, user_id: int) -> str:
        """Calculate activity frequency."""
        try:
            from apps.ai_engine.models import ActivityLog
            
            # Get activity count in last 30 days
            recent_count = ActivityLog.objects.filter(
                user_id=user_id,
                timestamp__gte=timezone.now() - timedelta(days=30)
            ).count()
            
            if recent_count >= 20:
                return 'daily'
            elif recent_count >= 10:
                return 'weekly'
            elif recent_count >= 4:
                return 'bi_weekly'
            else:
                return 'monthly'
                
        except Exception as e:
            logger.error(f"Activity frequency calculation error: {e}")
            return 'unknown'
    
    def _calculate_performance_trend(self, user_id: int) -> str:
        """Calculate performance trend."""
        try:
            from apps.ai_engine.models import UserPerformance
            
            # Get recent performance scores
            recent_scores = UserPerformance.objects.filter(
                user_id=user_id,
                date__gte=timezone.now() - timedelta(days=90)
            ).order_by('date').values_list('performance_score', flat=True)
            
            if len(recent_scores) < 3:
                return 'insufficient_data'
            
            # Calculate trend
            first_half = recent_scores[:len(recent_scores)//2]
            second_half = recent_scores[len(recent_scores)//2:]
            
            first_avg = sum(first_half) / len(first_half)
            second_avg = sum(second_half) / len(second_half)
            
            if second_avg > first_avg + 5:
                return 'improving'
            elif second_avg < first_avg - 5:
                return 'declining'
            else:
                return 'stable'
                
        except Exception as e:
            logger.error(f"Performance trend calculation error: {e}")
            return 'unknown'
    
    def _get_skill_progression_optimized(self, user_id: int) -> Dict[str, Any]:
        """Get skill progression with optimized query."""
        try:
            from apps.courses.models import Enrollment
            from apps.ai_engine.models import UserPerformance
            
            # Get skill progression data
            progression = Enrollment.objects.filter(user_id=user_id).annotate(
                category_name=F('course__category__name')
            ).values('category_name').annotate(
                courses_completed=Count('id', filter=Q(progress_percentage=100)),
                avg_progress=Avg('progress_percentage'),
                total_time=Sum('total_time_spent')
            ).order_by('-courses_completed')[:10]
            
            return {
                'skills': list(progression),
                'total_skills': len(progression),
                'mastered_skills': len([p for p in progression if p['courses_completed'] >= 3])
            }
            
        except Exception as e:
            logger.error(f"Skill progression optimization error: {e}")
            return {'skills': [], 'total_skills': 0, 'mastered_skills': 0}
    
    def _get_user_achievements_optimized(self, user_id: int) -> List[Dict[str, Any]]:
        """Get user achievements with optimized query."""
        try:
            from apps.gamification.models import Achievement, UserAchievement
            
            # Get user achievements with single query
            achievements = UserAchievement.objects.filter(
                user_id=user_id
            ).select_related('achievement').annotate(
                achievement_name=F('achievement__name'),
                achievement_description=F('achievement__description'),
                achievement_points=F('achievement__points')
            ).values('achievement_name', 'achievement_description', 'achievement_points', 'earned_at')
            
            return list(achievements)
            
        except Exception as e:
            logger.error(f"User achievements optimization error: {e}")
            return []
    
    def clear_optimization_cache(self, pattern: str = None):
        """Clear optimization cache."""
        try:
            if pattern:
                # Clear cache matching pattern
                # This would require Redis pattern matching
                pass
            else:
                # Clear all optimization cache
                cache.clear()
                
        except Exception as e:
            logger.error(f"Cache clearing error: {e}")

# Global optimized query manager
optimized_query_manager = OptimizedMLQueryManager()
