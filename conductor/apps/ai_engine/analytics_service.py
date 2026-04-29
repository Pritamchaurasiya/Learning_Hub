"""
Intelligent Learning Analytics Service

This module provides production-grade analytics for user learning behavior,
replacing the placeholder implementations with real, actionable intelligence.
"""

import logging
from datetime import timedelta
from typing import Dict, Any, List, Optional

from django.db.models import Count, Avg, Sum, F, Q
from django.db.models.functions import TruncHour, TruncDate, ExtractHour
from django.utils import timezone
from django.core.cache import cache
from django.contrib.contenttypes.models import ContentType

from .models import ActivityLog, LearningInsight, Challenge, ChallengeParticipant

logger = logging.getLogger(__name__)


class AnalyticsService:
    """
    Real-time and batch analytics for user learning behavior.
    
    Design Principles:
    1. All heavy computations are cached.
    2. Real-time tracking is lightweight (just DB inserts).
    3. Batch analytics run via Celery tasks (daily/hourly).
    """
    
    # ==========================================================================
    # ACTIVITY TRACKING (Real-time, lightweight)
    # ==========================================================================
    
    @classmethod
    def track_activity(
        cls,
        user,
        action: str,
        content_object=None,
        duration_seconds: int = 0,
        session_id: str = "",
        metadata: Dict[str, Any] = None,
        device_type: str = ""
    ) -> ActivityLog:
        """
        Track a user activity. This is the primary ingestion point.
        
        Args:
            user: The user performing the action
            action: ActionType enum value (e.g., 'lesson_view')
            content_object: Optional related object (Course, Lesson, etc.)
            duration_seconds: Time spent on the activity
            session_id: Browser/app session identifier
            metadata: Additional context (JSON)
            device_type: 'mobile', 'desktop', 'tablet'
        
        Returns:
            The created ActivityLog instance
        """
        log_data = {
            'user': user,
            'action': action,
            'duration_seconds': duration_seconds,
            'session_id': session_id,
            'metadata': metadata or {},
            'device_type': device_type,
        }
        
        if content_object:
            log_data['content_type'] = ContentType.objects.get_for_model(content_object)
            log_data['object_id'] = content_object.pk
        
        activity = ActivityLog.objects.create(**log_data)
        
        # Invalidate relevant caches
        cache.delete(f"user_stats:{user.id}")
        cache.delete(f"engagement_score:{user.id}")
        
        # Trigger real-time updates via WebSocket (if applicable)
        cls._broadcast_activity(user, action, content_object)
        
        # Update User Streak
        try:
            from apps.gamification.services import GamificationService
            GamificationService.check_streaks(user)
        except Exception as e:
            logger.error(f"Failed to update streak: {e}")
        
        return activity
    
    @staticmethod
    def _broadcast_activity(user, action: str, content_object=None):
        """Send real-time activity update via WebSocket."""
        try:
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer
            
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"user_feed_{user.id}",
                {
                    "type": "feed_event",
                    "event_type": "activity_tracked",
                    "data": {
                        "action": action,
                        "content": str(content_object) if content_object else None,
                        "timestamp": str(timezone.now())
                    }
                }
            )
        except Exception as e:
            logger.debug(f"WebSocket broadcast skipped: {e}")
    
    # ==========================================================================
    # ENGAGEMENT SCORING (Cached, computed on demand or daily)
    # ==========================================================================
    
    @classmethod
    def calculate_engagement_score(cls, user) -> float:
        """
        Calculate user engagement score (0.0 to 1.0).
        
        Factors:
        - Activity frequency (30%)
        - Session duration (25%)
        - Content diversity (20%)
        - Consistency (25%)
        """
        cache_key = f"engagement_score:{user.id}"
        cached_score = cache.get(cache_key)
        if cached_score is not None:
            return cached_score
        
        now = timezone.now()
        week_ago = now - timedelta(days=7)
        
        # Get activity stats for the last week
        activities = ActivityLog.objects.filter(
            user=user,
            created_at__gte=week_ago
        )
        
        if not activities.exists():
            return 0.0
        
        # Factor 1: Activity Frequency (0-1)
        # Benchmark: 50 activities/week = 1.0
        activity_count = activities.count()
        frequency_score = min(activity_count / 50, 1.0)
        
        # Factor 2: Session Duration (0-1)
        # Benchmark: 2 hours total/week = 1.0
        total_duration = activities.aggregate(total=Sum('duration_seconds'))['total'] or 0
        duration_score = min(total_duration / 7200, 1.0)
        
        # Factor 3: Content Diversity (0-1)
        # Count unique action types
        unique_actions = activities.values('action').distinct().count()
        diversity_score = min(unique_actions / 8, 1.0)  # 8 action types = max
        
        # Factor 4: Consistency (0-1)
        # How many unique days did user learn?
        unique_days = activities.annotate(
            date=TruncDate('created_at')
        ).values('date').distinct().count()
        consistency_score = min(unique_days / 7, 1.0)
        
        # Weighted Average
        engagement = (
            (frequency_score * 0.30) +
            (duration_score * 0.25) +
            (diversity_score * 0.20) +
            (consistency_score * 0.25)
        )
        
        engagement = round(engagement, 3)
        cache.set(cache_key, engagement, timeout=3600)  # 1 hour
        
        return engagement
    
    @classmethod
    def get_preferred_learning_time(cls, user) -> str:
        """
        Analyze when user is most active.
        
        Returns: 'morning', 'afternoon', 'evening', 'night'
        """
        cache_key = f"preferred_time:{user.id}"
        cached = cache.get(cache_key)
        if cached:
            return cached
        
        month_ago = timezone.now() - timedelta(days=30)
        
        # Group by hour and count
        hourly_activity = ActivityLog.objects.filter(
            user=user,
            created_at__gte=month_ago
        ).annotate(
            hour=ExtractHour('created_at')
        ).values('hour').annotate(
            count=Count('id')
        ).order_by('-count')
        
        if not hourly_activity:
            return 'evening'  # Default
        
        peak_hour = hourly_activity[0]['hour']
        
        if 5 <= peak_hour < 12:
            result = 'morning'
        elif 12 <= peak_hour < 17:
            result = 'afternoon'
        elif 17 <= peak_hour < 21:
            result = 'evening'
        else:
            result = 'night'
        
        cache.set(cache_key, result, timeout=86400)  # 24 hours
        return result
    
    # ==========================================================================
    # LEARNING INSIGHTS (Batch computed, AI-enhanced)
    # ==========================================================================
    
    @classmethod
    def generate_learning_insights(cls, user) -> LearningInsight:
        """
        Generate comprehensive learning insights for a user.
        Called by daily Celery task.
        """
        insight, created = LearningInsight.objects.get_or_create(user=user)
        
        # Calculate scores
        insight.engagement_score = cls.calculate_engagement_score(user)
        insight.preferred_time = cls.get_preferred_learning_time(user)
        
        # Calculate consistency score
        month_ago = timezone.now() - timedelta(days=30)
        active_days = ActivityLog.objects.filter(
            user=user,
            created_at__gte=month_ago
        ).annotate(date=TruncDate('created_at')).values('date').distinct().count()
        
        insight.consistency_score = round(active_days / 30, 2)
        
        # Calculate completion rate
        lessons_started = ActivityLog.objects.filter(
            user=user,
            action=ActivityLog.ActionType.LESSON_VIEW
        ).count()
        
        lessons_completed = ActivityLog.objects.filter(
            user=user,
            action=ActivityLog.ActionType.LESSON_COMPLETE
        ).count()
        
        if lessons_started > 0:
            insight.completion_rate = round(lessons_completed / lessons_started, 2)
        
        # Calculate total learning hours
        total_seconds = ActivityLog.objects.filter(
            user=user
        ).aggregate(total=Sum('duration_seconds'))['total'] or 0
        
        insight.total_learning_hours = round(total_seconds / 3600, 1)
        
        # Weekly average
        first_activity = ActivityLog.objects.filter(user=user).order_by('created_at').first()
        if first_activity:
            weeks_active = max(1, (timezone.now() - first_activity.created_at).days / 7)
            insight.weekly_average_hours = round(insight.total_learning_hours / weeks_active, 1)
        
        # Burnout risk calculation
        # High activity followed by sudden drop = risk
        # Recent engagement
        recent_engagement = cls.calculate_engagement_score(user)
        insight.burnout_risk = max(0, 0.8 - recent_engagement) if insight.engagement_score > 0.7 else 0
        
        # AI Narrative Generation
        try:
            from apps.ai_engine.ai_client import AIClient
            metrics = {
                'engagement_score': insight.engagement_score,
                'consistency_score': insight.consistency_score,
                'preferred_time': insight.preferred_time,
                'strength_areas': insight.strength_areas,
                'improvement_areas': insight.improvement_areas
            }
            insight.ai_narrative = AIClient.generate_learning_insight_narrative(user.username, metrics)
        except Exception as e:
            logger.error(f"Failed to generate AI narrative: {e}")
        
        insight.last_analyzed_at = timezone.now()
        insight.save()
        
        return insight
    
    # ==========================================================================
    # USER STATISTICS (For profiles and dashboards)
    # ==========================================================================
    
    @classmethod
    def get_user_stats(cls, user) -> Dict[str, Any]:
        """
        Get comprehensive user statistics.
        Cached for 1 hour.
        """
        cache_key = f"user_stats:{user.id}"
        cached = cache.get(cache_key)
        if cached:
            return cached
        
        now = timezone.now()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        
        all_activities = ActivityLog.objects.filter(user=user)
        week_activities = all_activities.filter(created_at__gte=week_ago)
        month_activities = all_activities.filter(created_at__gte=month_ago)
        
        stats = {
            # Totals
            'total_activities': all_activities.count(),
            'total_learning_hours': round(
                (all_activities.aggregate(total=Sum('duration_seconds'))['total'] or 0) / 3600, 1
            ),
            
            # Weekly
            'weekly_activities': week_activities.count(),
            'weekly_learning_hours': round(
                (week_activities.aggregate(total=Sum('duration_seconds'))['total'] or 0) / 3600, 1
            ),
            
            # Monthly
            'monthly_activities': month_activities.count(),
            'monthly_learning_hours': round(
                (month_activities.aggregate(total=Sum('duration_seconds'))['total'] or 0) / 3600, 1
            ),
            
            # Breakdown by action
            'lessons_completed': all_activities.filter(
                action=ActivityLog.ActionType.LESSON_COMPLETE
            ).count(),
            'quizzes_completed': all_activities.filter(
                action=ActivityLog.ActionType.QUIZ_COMPLETE
            ).count(),
            'ai_questions_asked': all_activities.filter(
                action=ActivityLog.ActionType.AI_QUESTION
            ).count(),
            'code_submissions': all_activities.filter(
                action=ActivityLog.ActionType.CODE_SUBMIT
            ).count(),
            
            # Engagement
            'engagement_score': cls.calculate_engagement_score(user),
            'preferred_time': cls.get_preferred_learning_time(user),
        }
        
        cache.set(cache_key, stats, timeout=3600)
        return stats


class ChallengeService:
    """
    Service for managing gamification challenges.
    """
    
    @classmethod
    def get_active_challenges(cls) -> List[Challenge]:
        """Get all currently active challenges."""
        now = timezone.now()
        return Challenge.objects.filter(
            is_active=True,
            starts_at__lte=now,
            ends_at__gte=now
        ).order_by('-starts_at')
    
    @classmethod
    def join_challenge(cls, user, challenge: Challenge) -> ChallengeParticipant:
        """Enroll user in a challenge."""
        participant, created = ChallengeParticipant.objects.get_or_create(
            user=user,
            challenge=challenge
        )
        
        if created:
            challenge.participant_count = F('participant_count') + 1
            challenge.save(update_fields=['participant_count'])
            challenge.refresh_from_db()
        
        return participant
    
    @classmethod
    def update_challenge_progress(cls, user, action: str, count: int = 1):
        """
        Update progress for all active challenges that match the action.
        Called automatically when activities are tracked.
        """
        now = timezone.now()
        
        # Get user's active participations
        participations = ChallengeParticipant.objects.filter(
            user=user,
            is_completed=False,
            challenge__is_active=True,
            challenge__starts_at__lte=now,
            challenge__ends_at__gte=now
        ).select_related('challenge')
        
        from apps.gamification.services import GamificationService
        
        for participation in participations:
            challenge = participation.challenge
            requirements = challenge.requirements
            
            # Check if action matches
            if requirements.get('action') == action:
                participation.progress = F('progress') + count
                participation.save(update_fields=['progress'])
                participation.refresh_from_db()
                
                # Check completion
                target = requirements.get('count', 1)
                if participation.progress >= target:
                    participation.is_completed = True
                    participation.completed_at = now
                    participation.save(update_fields=['is_completed', 'completed_at'])
                    
                    # Update challenge stats
                    challenge.completion_count = F('completion_count') + 1
                    challenge.save(update_fields=['completion_count'])
                    
                    # Award rewards
                    GamificationService.award_xp(user, challenge.xp_reward, f"Challenge: {challenge.title}")
                    
                    if challenge.badge_reward:
                        GamificationService.award_badge(user, challenge.badge_reward.name)
    
    @classmethod
    def get_user_challenge_stats(cls, user) -> Dict[str, Any]:
        """Get challenge statistics for a user."""
        participations = ChallengeParticipant.objects.filter(user=user)
        
        return {
            'total_joined': participations.count(),
            'total_completed': participations.filter(is_completed=True).count(),
            'active_challenges': participations.filter(
                is_completed=False,
                challenge__is_active=True,
                challenge__ends_at__gte=timezone.now()
            ).count(),
            'total_xp_from_challenges': sum(
                p.challenge.xp_reward for p in participations.filter(is_completed=True)
            )
        }
