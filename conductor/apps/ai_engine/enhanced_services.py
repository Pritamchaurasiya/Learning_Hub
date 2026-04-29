# Enhanced AI Engine Services
"""
Optimized services with real-time ML integration and improved performance
"""

import asyncio
import logging
import hashlib
import time
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import json
import numpy as np
from django.apps import apps
from django.db.models import Q, Count, Avg, Prefetch
from django.core.cache import cache
from django.conf import settings
from prometheus_client import Counter, Histogram, Gauge
import redis.asyncio as redis

logger = logging.getLogger(__name__)

# Performance Metrics
RAG_REQUESTS = Counter('rag_requests_total', 'Total RAG requests', ['search_type', 'cache_hit'])
RAG_LATENCY = Histogram('rag_latency_seconds', 'RAG processing latency', ['search_type'])
USER_BEHAVIOR_TRACKING = Counter('user_behavior_tracking_total', 'User behavior tracking', ['action'])
COURSE_ANALYTICS_REQUESTS = Counter('course_analytics_requests_total', 'Course analytics requests')

class SearchType(Enum):
    SEMANTIC = "semantic"
    KEYWORD = "keyword"
    HYBRID = "hybrid"
    MULTIMODAL = "multimodal"

@dataclass
class ContentContext:
    content: str
    source_type: str
    source_id: int
    relevance_score: float
    metadata: Dict[str, Any]

class EnhancedRAGService:
    """
    Enhanced Retrieval-Augmented Generation Service.
    Optimized for real-time performance with multi-modal support.
    """
    
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self.cache_ttl = 3600  # 1 hour
        try:
            asyncio.get_running_loop()
            asyncio.create_task(self._initialize_redis())
        except RuntimeError:
            pass # No running event loop, it will be initialized later on first use if needed
    
    async def _initialize_redis(self):
        """Initialize Redis connection for caching."""
        try:
            self.redis_client = redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
            await self.redis_client.ping()
            logger.info("Enhanced RAG service connected to Redis")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
    
    @classmethod
    async def get_context_for_query(cls, query: str, limit: int = 3, 
                                   search_type: SearchType = SearchType.HYBRID,
                                   user_id: Optional[int] = None) -> str:
        """
        Enhanced context retrieval with real-time optimization.
        Supports multiple search types and user personalization.
        """
        start_time = time.time()
        
        # Generate cache key with user personalization
        query_hash = hashlib.md5(f"{query.lower()}:{limit}:{search_type.value}:{user_id or 'anonymous'}".encode()).hexdigest()
        cache_key = f"rag_context_v2:{query_hash}"
        
        # Try cache first
        cached_context = cache.get(cache_key)
        if cached_context:
            RAG_REQUESTS.labels(search_type=search_type.value, cache_hit="true").inc()
            return cached_context
        
        # Perform search based on type
        try:
            if search_type == SearchType.SEMANTIC:
                context = await cls._semantic_search(query, limit, user_id)
            elif search_type == SearchType.KEYWORD:
                context = await cls._keyword_search(query, limit, user_id)
            elif search_type == SearchType.HYBRID:
                context = await cls._hybrid_search(query, limit, user_id)
            elif search_type == SearchType.MULTIMODAL:
                context = await cls._multimodal_search(query, limit, user_id)
            else:
                context = await cls._keyword_search(query, limit, user_id)
            
            # Cache result
            cache.set(cache_key, context, timeout=cls.cache_ttl)
            
            # Update metrics
            RAG_REQUESTS.labels(search_type=search_type.value, cache_hit="false").inc()
            RAG_LATENCY.labels(search_type=search_type.value).observe(time.time() - start_time)
            
            return context
            
        except Exception as e:
            logger.error(f"Enhanced RAG search error: {e}")
            return "No relevant context found due to an error. Please try again."
    
    @classmethod
    async def _semantic_search(cls, query: str, limit: int, user_id: Optional[int] = None) -> str:
        """Semantic search using vector embeddings."""
        try:
            from apps.ai_engine.vector_service import VectorService
            from apps.ai_engine.enhanced_rag import enhanced_rag_service
            
            # Use enhanced RAG if available
            if hasattr(enhanced_rag_service, 'search_engine'):
                search_result = await enhanced_rag_service.search_engine.search(
                    query=query,
                    search_type=SearchType.SEMANTIC,
                    limit=limit
                )
                
                if search_result.chunks:
                    context_parts = []
                    for chunk in search_result.chunks:
                        context_parts.append(f"[{chunk.modality.value}] {chunk.content}")
                    
                    return "Enhanced Semantic Context:\n" + "\n\n".join(context_parts)
            
            # Fallback to original vector search
            semantic_hits = VectorService.search_similar_content(query, top_k=limit * 2)
            
            context = []
            seen_content = set()
            
            for hit in semantic_hits:
                if len(context) >= limit:
                    break
                    
                obj = hit.content_object
                if hasattr(obj, 'is_published') and not obj.is_published:
                    continue
                if hasattr(obj, 'is_active') and not obj.is_active:
                    continue
                
                text = hit.chunk_text
                if text and text not in seen_content:
                    context.append(f"Semantic: {text}")
                    seen_content.add(text)
            
            if not context:
                return "No semantic context found."
            
            return "Semantic Context:\n" + "\n\n".join(context)
            
        except Exception as e:
            logger.error(f"Semantic search error: {e}")
            return "Semantic search unavailable."
    
    @classmethod
    async def _keyword_search(cls, query: str, limit: int, user_id: Optional[int] = None) -> str:
        """Optimized keyword search with database optimization."""
        try:
            Course = apps.get_model('courses', 'Course')
            Problem = apps.get_model('dsa', 'Problem')
            
            context = []
            seen_content = set()
            
            # Extract keywords
            stop_words = {"how", "do", "i", "a", "an", "the", "what", "is", "where", "can", "find", "for", "to", "of", "and", "in", "it", "with", "my", "on"}
            clean_query = query.lower().replace('?', '').replace('.', '').replace(',', '')
            keywords = [word for word in clean_query.split() if word not in stop_words and len(word) > 2]
            
            if not keywords:
                return "No keywords found for search."
            
            # Optimized database queries with prefetch
            course_q = Q()
            for kw in keywords:
                course_q |= Q(title__icontains=kw) | Q(description__icontains=kw)
            
            # Use select_related and prefetch_related for optimization
            relevant_courses = Course.objects.filter(
                course_q, is_published=True
            ).select_related('category').prefetch_related('enrollments')[:limit]
            
            for course in relevant_courses:
                text = f"Course: {course.title}\nDescription: {course.description}"
                if text not in seen_content:
                    context.append(text)
                    seen_content.add(text)
            
            # Search DSA Problems with optimization
            problem_q = Q()
            for kw in keywords:
                problem_q |= Q(title__icontains=kw) | Q(description__icontains=kw)
            
            relevant_problems = Problem.objects.filter(
                problem_q, is_active=True
            ).select_related('category')[:limit]
            
            for problem in relevant_problems:
                text = f"Problem: {problem.title}\nDescription: {problem.description}"
                if text not in seen_content:
                    context.append(text)
                    seen_content.add(text)
            
            if not context:
                return "No keyword context found."
            
            return "Keyword Context:\n" + "\n\n".join(context)
            
        except Exception as e:
            logger.error(f"Keyword search error: {e}")
            return "Keyword search unavailable."
    
    @classmethod
    async def _hybrid_search(cls, query: str, limit: int, user_id: Optional[int] = None) -> str:
        """Hybrid search combining semantic and keyword results."""
        try:
            # Run both searches in parallel
            semantic_task = asyncio.create_task(cls._semantic_search(query, limit // 2, user_id))
            keyword_task = asyncio.create_task(cls._keyword_search(query, limit // 2, user_id))
            
            semantic_result, keyword_result = await asyncio.gather(semantic_task, keyword_task)
            
            # Combine results
            combined_context = []
            
            if semantic_result and "Semantic Context:" in semantic_result:
                combined_context.append(semantic_result)
            
            if keyword_result and "Keyword Context:" in keyword_result:
                combined_context.append(keyword_result)
            
            if not combined_context:
                return "No hybrid context found."
            
            return "Hybrid Context:\n" + "\n\n".join(combined_context)
            
        except Exception as e:
            logger.error(f"Hybrid search error: {e}")
            return "Hybrid search unavailable."
    
    @classmethod
    async def _multimodal_search(cls, query: str, limit: int, user_id: Optional[int] = None) -> str:
        """Multi-modal search across different content types."""
        try:
            from apps.ai_engine.enhanced_rag import enhanced_rag_service
            
            if hasattr(enhanced_rag_service, 'search_engine'):
                search_result = await enhanced_rag_service.search_engine.search(
                    query=query,
                    search_type=SearchType.MULTIMODAL,
                    limit=limit
                )
                
                if search_result.chunks:
                    context_parts = []
                    for chunk in search_result.chunks:
                        context_parts.append(f"[{chunk.modality.value.upper()}] {chunk.content}")
                    
                    return "Multi-modal Context:\n" + "\n\n".join(context_parts)
            
            return "Multi-modal search not available."
            
        except Exception as e:
            logger.error(f"Multi-modal search error: {e}")
            return "Multi-modal search unavailable."

class EnhancedUserBehaviorService:
    """
    Enhanced user behavior tracking with real-time analytics and ML integration.
    """
    
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        try:
            asyncio.get_running_loop()
            asyncio.create_task(self._initialize_redis())
        except RuntimeError:
            pass
    
    async def _initialize_redis(self):
        """Initialize Redis connection for real-time tracking."""
        try:
            self.redis_client = redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
            await self.redis_client.ping()
            logger.info("Enhanced User Behavior service connected to Redis")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
    
    @staticmethod
    async def track_activity(user, action: str, metadata: Optional[Dict[str, Any]] = None):
        """
        Enhanced activity tracking with real-time processing.
        """
        try:
            from apps.ai_engine.models import ActivityLog
            
            # Create activity log
            activity = await ActivityLog.objects.acreate(
                user=user,
                action=action,
                metadata=metadata or {}
            )
            
            # Update real-time metrics
            USER_BEHAVIOR_TRACKING.labels(action=action).inc()
            
            # Trigger real-time personalization updates
            await EnhancedUserBehaviorService._update_user_profile(user, action, metadata)
            
            logger.info(f"Tracked activity: {action} for user {user.id}")
            
        except Exception as e:
            logger.error(f"Failed to track activity: {e}")
    
    @staticmethod
    async def _update_user_profile(user, action: str, metadata: Optional[Dict[str, Any]] = None):
        """Update user profile based on activity for real-time personalization."""
        try:
            # Update learning patterns
            if action in ['lesson_completed', 'quiz_passed', 'course_enrolled']:
                await EnhancedUserBehaviorService._update_learning_patterns(user, action, metadata)
            
            # Update engagement metrics
            await EnhancedUserBehaviorService._update_engagement_metrics(user, action, metadata)
            
            # Update preferences
            await EnhancedUserBehaviorService._update_preferences(user, action, metadata)
            
        except Exception as e:
            logger.error(f"Failed to update user profile: {e}")
    
    @staticmethod
    async def _update_learning_patterns(user, action: str, metadata: Optional[Dict[str, Any]] = None):
        """Update learning patterns for personalization."""
        try:
            from apps.ai_engine.models import UserProfile
            
            profile, created = await UserProfile.objects.aget_or_create(user=user)
            
            # Update learning statistics
            if action == 'lesson_completed':
                profile.lessons_completed += 1
                if metadata and 'course_id' in metadata:
                    profile.courses_interacted.add(metadata['course_id'])
            
            elif action == 'quiz_passed':
                profile.quizzes_passed += 1
                if metadata and 'score' in metadata:
                    profile.average_quiz_score = (
                        (profile.average_quiz_score * (profile.quizzes_passed - 1) + metadata['score']) /
                        profile.quizzes_passed
                    )
            
            elif action == 'course_enrolled':
                profile.courses_enrolled += 1
                if metadata and 'category_id' in metadata:
                    profile.preferred_categories.add(metadata['category_id'])
            
            await profile.asave()
            
        except Exception as e:
            logger.error(f"Failed to update learning patterns: {e}")
    
    @staticmethod
    async def _update_engagement_metrics(user, action: str, metadata: Optional[Dict[str, Any]] = None):
        """Update engagement metrics."""
        try:
            from apps.ai_engine.models import UserEngagement
            
            engagement, created = await UserEngagement.objects.aget_or_create(
                user=user,
                date=timezone.now().date()
            )
            
            # Update engagement metrics
            engagement.total_actions += 1
            
            if action in ['lesson_started', 'video_watched', 'quiz_attempted']:
                engagement.learning_actions += 1
            
            elif action in ['discussion_posted', 'comment_added', 'study_group_joined']:
                engagement.social_actions += 1
            
            engagement.last_activity = timezone.now()
            await engagement.asave()
            
        except Exception as e:
            logger.error(f"Failed to update engagement metrics: {e}")
    
    @staticmethod
    async def _update_preferences(user, action: str, metadata: Optional[Dict[str, Any]] = None):
        """Update user preferences for personalization."""
        try:
            from apps.ai_engine.models import UserPreferences
            
            preferences, created = await UserPreferences.objects.aget_or_create(user=user)
            
            # Update preferences based on activity
            if action == 'course_enrolled' and metadata:
                if 'difficulty' in metadata:
                    preferences.preferred_difficulty = metadata['difficulty']
                if 'duration' in metadata:
                    preferences.preferred_duration = metadata['duration']
            
            elif action == 'lesson_completed' and metadata:
                if 'format' in metadata:
                    preferences.preferred_format = metadata['format']
            
            await preferences.asave()
            
        except Exception as e:
            logger.error(f"Failed to update preferences: {e}")
    
    @staticmethod
    async def analyze_behavior(user) -> Dict[str, Any]:
        """
        Enhanced behavior analysis with ML insights.
        """
        try:
            from apps.courses.models import Enrollment
            from apps.ai_engine.models import UserProfile, UserEngagement
            
            # Get user profile
            try:
                profile = await UserProfile.objects.aget(user=user)
            except UserProfile.DoesNotExist:
                profile = None
            
            # Get enrollment data with optimization
            enrollments = await Enrollment.objects.filter(user=user).prefetch_related('course').acount()
            total = enrollments.count()
            completed = enrollments.filter(progress_percentage=100).acount()
            
            # Get engagement data
            engagement_data = await UserEngagement.objects.filter(user=user).aaggregate(
                total_actions=Count('id'),
                learning_actions=Count('id', filter=Q(action__in=['lesson_started', 'video_watched', 'quiz_attempted'])),
                social_actions=Count('id', filter=Q(action__in=['discussion_posted', 'comment_added', 'study_group_joined'])),
                avg_session_time=Avg('session_duration')
            )
            
            # Calculate engagement score
            engagement_score = 0
            if profile:
                engagement_score = min(1.0, (
                    profile.lessons_completed * 0.3 +
                    profile.quizzes_passed * 0.2 +
                    profile.courses_enrolled * 0.1 +
                    (engagement_data['total_actions'] or 0) * 0.01
                ))
            
            # Learning patterns
            learning_patterns = {
                "preferred_time": await EnhancedUserBehaviorService._get_preferred_time(user),
                "learning_style": await EnhancedUserBehaviorService._detect_learning_style(user),
                "difficulty_preference": profile.preferred_difficulty if profile else "intermediate",
                "format_preference": profile.preferred_format if profile else "video"
            }
            
            # Predictions
            predictions = await EnhancedUserBehaviorService._generate_predictions(user, profile, enrollment_data)
            
            return {
                "engagement_score": engagement_score,
                "total_enrollments": total,
                "completed_enrollments": completed,
                "completion_rate": (completed / total * 100) if total > 0 else 0,
                "learning_patterns": learning_patterns,
                "engagement_metrics": engagement_data,
                "predictions": predictions,
                "personalization_ready": profile is not None
            }
            
        except Exception as e:
            logger.error(f"Behavior analysis error: {e}")
            return {
                "engagement_score": 0,
                "error": str(e)
            }
    
    @staticmethod
    async def _get_preferred_time(user) -> str:
        """Analyze user's preferred learning time."""
        try:
            from apps.ai_engine.models import ActivityLog
            
            # Get activity patterns by hour
            activities = await ActivityLog.objects.filter(user=user).aextra(
                hour=ExtractHour('timestamp')
            ).values('hour').annotate(count=Count('id')).order_by('-count')
            
            if activities:
                peak_hour = activities[0]['hour']
                if 6 <= peak_hour < 12:
                    return "morning"
                elif 12 <= peak_hour < 18:
                    return "afternoon"
                elif 18 <= peak_hour < 22:
                    return "evening"
                else:
                    return "night"
            
            return "evening"  # Default
            
        except Exception as e:
            logger.error(f"Preferred time analysis error: {e}")
            return "evening"
    
    @staticmethod
    async def _detect_learning_style(user) -> str:
        """Detect user's learning style based on behavior."""
        try:
            from apps.ai_engine.models import ActivityLog
            
            # Analyze activity patterns
            video_activities = await ActivityLog.objects.filter(
                user=user, action='video_watched'
            ).acount()
            
            reading_activities = await ActivityLog.objects.filter(
                user=user, action='lesson_completed'
            ).acount()
            
            quiz_activities = await ActivityLog.objects.filter(
                user=user, action='quiz_attempted'
            ).acount()
            
            total = video_activities + reading_activities + quiz_activities
            
            if total == 0:
                return "visual"  # Default
            
            video_ratio = video_activities / total
            reading_ratio = reading_activities / total
            quiz_ratio = quiz_activities / total
            
            if video_ratio > 0.4:
                return "visual"
            elif reading_ratio > 0.4:
                return "reading"
            elif quiz_ratio > 0.3:
                return "kinesthetic"
            else:
                return "mixed"
            
        except Exception as e:
            logger.error(f"Learning style detection error: {e}")
            return "visual"
    
    @staticmethod
    async def _generate_predictions(user, profile, enrollment_data) -> Dict[str, Any]:
        """Generate ML-based predictions for user."""
        try:
            predictions = {}
            
            # Completion prediction
            if enrollment_data['total_enrollments'] > 0:
                completion_rate = enrollment_data['completed_enrollments'] / enrollment_data['total_enrollments']
                predictions['course_completion_likelihood'] = min(1.0, completion_rate + 0.1)
            else:
                predictions['course_completion_likelihood'] = 0.5
            
            # Engagement prediction
            if profile:
                predictions['engagement_trend'] = 'increasing' if profile.lessons_completed > 5 else 'stable'
                predictions['dropout_risk'] = 'low' if profile.engagement_score > 0.7 else 'medium'
            else:
                predictions['engagement_trend'] = 'unknown'
                predictions['dropout_risk'] = 'medium'
            
            # Learning velocity prediction
            if profile and profile.lessons_completed > 0:
                predictions['learning_velocity'] = 'fast' if profile.lessons_completed > 20 else 'normal'
            else:
                predictions['learning_velocity'] = 'normal'
            
            return predictions
            
        except Exception as e:
            logger.error(f"Prediction generation error: {e}")
            return {}

class EnhancedCourseAnalyticsService:
    """
    Enhanced course analytics with real-time insights and ML integration.
    """
    
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        try:
            asyncio.get_running_loop()
            asyncio.create_task(self._initialize_redis())
        except RuntimeError:
            pass
    
    async def _initialize_redis(self):
        """Initialize Redis connection for real-time analytics."""
        try:
            self.redis_client = redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
            await self.redis_client.ping()
            logger.info("Enhanced Course Analytics service connected to Redis")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
    
    @staticmethod
    async def get_course_insights(course) -> Dict[str, Any]:
        """
        Enhanced course insights with real-time data and ML predictions.
        """
        try:
            from apps.courses.models import Enrollment
            
            # Get enrollment data with optimization
            enrollments = await Enrollment.objects.filter(course=course).prefetch_related('user').acount()
            
            # Calculate metrics
            total_enrollments = enrollments
            active_students = await Enrollment.objects.filter(
                course=course, progress_percentage__gt=0, progress_percentage__lt=100
            ).acount()
            
            completed_students = await Enrollment.objects.filter(
                course=course, progress_percentage=100
            ).acount()
            
            # Calculate completion rate
            completion_rate = (completed_students / total_enrollments * 100) if total_enrollments > 0 else 0
            
            # Calculate average progress
            avg_progress = await Enrollment.objects.filter(course=course).aaggregate(
                avg=Avg('progress_percentage')
            )['avg'] or 0
            
            # Get rating data
            avg_rating = getattr(course, 'avg_rating', 0) or 0
            
            # Generate insights
            insights = {
                "total_enrollments": total_enrollments,
                "active_students": active_students,
                "completed_students": completed_students,
                "completion_rate": completion_rate,
                "average_progress": avg_progress,
                "average_rating": avg_rating,
                "engagement_score": min(1.0, (active_students / max(total_enrollments, 1)) * 2),
                "difficulty_level": await EnhancedCourseAnalyticsService._assess_difficulty(course),
                "popularity_trend": await EnhancedCourseAnalyticsService._calculate_popularity_trend(course),
                "recommendation_score": await EnhancedCourseAnalyticsService._calculate_recommendation_score(course),
                "ml_insights": await EnhancedCourseAnalyticsService._generate_ml_insights(course)
            }
            
            COURSE_ANALYTICS_REQUESTS.inc()
            return insights
            
        except Exception as e:
            logger.error(f"Course insights error: {e}")
            return {"error": str(e)}
    
    @staticmethod
    async def _assess_difficulty(course) -> str:
        """Assess course difficulty based on completion rates and time."""
        try:
            from apps.courses.models import Enrollment
            
            # Get completion and time data
            enrollments = await Enrollment.objects.filter(course=course).aaggregate(
                avg_completion_time=Avg('completion_time'),
                completion_rate=Avg('progress_percentage')
            )
            
            completion_rate = enrollments['completion_rate'] or 0
            avg_time = enrollments['avg_completion_time'] or 0
            
            # Assess difficulty
            if completion_rate > 80 and avg_time < 3600:  # 1 hour
                return "beginner"
            elif completion_rate > 60 and avg_time < 7200:  # 2 hours
                return "intermediate"
            elif completion_rate > 40:
                return "advanced"
            else:
                return "expert"
                
        except Exception as e:
            logger.error(f"Difficulty assessment error: {e}")
            return "intermediate"
    
    @staticmethod
    async def _calculate_popularity_trend(course) -> str:
        """Calculate popularity trend based on recent enrollments."""
        try:
            from apps.courses.models import Enrollment
            from datetime import timedelta
            
            # Get recent vs older enrollments
            now = timezone.now()
            recent_enrollments = await Enrollment.objects.filter(
                course=course,
                enrolled_at__gte=now - timedelta(days=30)
            ).acount()
            
            older_enrollments = await Enrollment.objects.filter(
                course=course,
                enrolled_at__gte=now - timedelta(days=60),
                enrolled_at__lt=now - timedelta(days=30)
            ).acount()
            
            if older_enrollments == 0:
                return "stable"
            
            growth_rate = (recent_enrollments - older_enrollments) / older_enrollments
            
            if growth_rate > 0.2:
                return "trending_up"
            elif growth_rate < -0.2:
                return "trending_down"
            else:
                return "stable"
                
        except Exception as e:
            logger.error(f"Popularity trend calculation error: {e}")
            return "stable"
    
    @staticmethod
    async def _calculate_recommendation_score(course) -> float:
        """Calculate recommendation score using ML insights."""
        try:
            # Base score from completion rate and rating
            completion_score = min(1.0, course.completion_rate / 100) if hasattr(course, 'completion_rate') else 0.5
            rating_score = min(1.0, (course.avg_rating or 0) / 5) if hasattr(course, 'avg_rating') else 0.5
            
            # Engagement score
            engagement_score = min(1.0, (course.active_students or 0) / max(course.total_enrollments or 1, 1))
            
            # Calculate weighted score
            recommendation_score = (
                completion_score * 0.3 +
                rating_score * 0.4 +
                engagement_score * 0.3
            )
            
            return round(recommendation_score, 2)
            
        except Exception as e:
            logger.error(f"Recommendation score calculation error: {e}")
            return 0.5
    
    @staticmethod
    async def _generate_ml_insights(course) -> Dict[str, Any]:
        """Generate ML-based insights for the course."""
        try:
            insights = {}
            
            # Learning effectiveness
            insights['learning_effectiveness'] = await EnhancedCourseAnalyticsService._assess_learning_effectiveness(course)
            
            # Content quality prediction
            insights['content_quality'] = await EnhancedCourseAnalyticsService._predict_content_quality(course)
            
            # Student success factors
            insights['success_factors'] = await EnhancedCourseAnalyticsService._identify_success_factors(course)
            
            # Improvement recommendations
            insights['recommendations'] = await EnhancedCourseAnalyticsService._generate_improvement_recommendations(course)
            
            return insights
            
        except Exception as e:
            logger.error(f"ML insights generation error: {e}")
            return {}
    
    @staticmethod
    async def _assess_learning_effectiveness(course) -> str:
        """Assess learning effectiveness based on student outcomes."""
        try:
            # Simplified effectiveness assessment
            completion_rate = getattr(course, 'completion_rate', 0)
            avg_rating = getattr(course, 'avg_rating', 0)
            
            if completion_rate > 80 and avg_rating > 4.0:
                return "high"
            elif completion_rate > 60 and avg_rating > 3.0:
                return "medium"
            else:
                return "low"
                
        except Exception as e:
            logger.error(f"Learning effectiveness assessment error: {e}")
            return "medium"
    
    @staticmethod
    async def _predict_content_quality(course) -> float:
        """Predict content quality using ML features."""
        try:
            # Simplified quality prediction
            features = {
                'description_length': len(course.description or ''),
                'has_prerequisites': bool(course.prerequisites),
                'has_objectives': bool(course.objectives),
                'rating_count': getattr(course, 'rating_count', 0)
            }
            
            # Simple scoring based on features
            score = 0.5  # Base score
            
            if features['description_length'] > 100:
                score += 0.1
            if features['has_prerequisites']:
                score += 0.1
            if features['has_objectives']:
                score += 0.1
            if features['rating_count'] > 10:
                score += 0.2
            
            return min(1.0, score)
            
        except Exception as e:
            logger.error(f"Content quality prediction error: {e}")
            return 0.5
    
    @staticmethod
    async def _identify_success_factors(course) -> List[str]:
        """Identify factors contributing to student success."""
        try:
            factors = []
            
            # Analyze what correlates with success
            if getattr(course, 'completion_rate', 0) > 70:
                factors.append("clear_learning_objectives")
            
            if getattr(course, 'avg_rating', 0) > 4.0:
                factors.append("engaging_content")
            
            if getattr(course, 'active_students', 0) > getattr(course, 'total_enrollments', 0) * 0.8:
                factors.append("interactive_elements")
            
            return factors or ["standard_structure"]
            
        except Exception as e:
            logger.error(f"Success factors identification error: {e}")
            return ["standard_structure"]
    
    @staticmethod
    async def _generate_improvement_recommendations(course) -> List[str]:
        """Generate improvement recommendations using ML insights."""
        try:
            recommendations = []
            
            # Based on performance metrics
            if getattr(course, 'completion_rate', 0) < 50:
                recommendations.append("improve_content_clarity")
                recommendations.append("add_interactive_elements")
            
            if getattr(course, 'avg_rating', 0) < 3.5:
                recommendations.append("enhance_video_quality")
                recommendations.append("update_examples")
            
            if getattr(course, 'active_students', 0) < getattr(course, 'total_enrollments', 0) * 0.5:
                recommendations.append("increase_engagement")
                recommendations.append("add_community_features")
            
            return recommendations or ["maintain_current_quality"]
            
        except Exception as e:
            logger.error(f"Improvement recommendations generation error: {e}")
            return ["maintain_current_quality"]

# Enhanced service instances
enhanced_rag_service = EnhancedRAGService()
enhanced_user_behavior_service = EnhancedUserBehaviorService()
enhanced_course_analytics_service = EnhancedCourseAnalyticsService()

# Backward compatibility aliases
RAGService = EnhancedRAGService
UserBehaviorService = EnhancedUserBehaviorService
CourseAnalyticsService = EnhancedCourseAnalyticsService
