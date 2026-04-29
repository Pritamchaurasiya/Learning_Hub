# ML Integration Middleware
"""
Real-time ML integration with core Django features
"""

import asyncio
import json
import logging
import time
from typing import Dict, Any, Optional, List
from django.utils import timezone
from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from prometheus_client import Counter, Histogram, Gauge
import redis.asyncio as redis

logger = logging.getLogger(__name__)

# ML Integration Metrics
from prometheus_client import REGISTRY, Counter, Histogram, Gauge

try:
    ML_INTEGRATION_REQUESTS = Counter('ml_integration_requests_total', 'ML integration requests', ['feature'])
    ML_INTEGRATION_LATENCY = Histogram('ml_integration_latency_seconds', 'ML integration latency', ['feature'])
    PERSONALIZATION_APPLIED = Counter('personalization_applied_total', 'Personalization applied', ['type'])
    REALTIME_FEATURES_ACTIVE = Gauge('realtime_features_active', 'Active real-time features')
except ValueError:
    ML_INTEGRATION_REQUESTS = REGISTRY._names_to_collectors.get('ml_integration_requests_total')
    ML_INTEGRATION_LATENCY = REGISTRY._names_to_collectors.get('ml_integration_latency_seconds')
    PERSONALIZATION_APPLIED = REGISTRY._names_to_collectors.get('personalization_applied_total')
    REALTIME_FEATURES_ACTIVE = REGISTRY._names_to_collectors.get('realtime_features_active')

class MLIntegrationMiddleware(MiddlewareMixin):
    """
    Middleware for real-time ML integration with Django features.
    Provides personalization, recommendations, and analytics.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.redis_client: Optional[redis.Redis] = None
        self._initialize_redis()
        self._active_features = set()
    
    async def _initialize_redis(self):
        """Initialize Redis connection for real-time features."""
        try:
            self.redis_client = redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
            await self.redis_client.ping()
            logger.info("ML Integration Middleware connected to Redis")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
    
    def __call__(self, request):
        """Process request with ML integration."""
        start_time = time.time()
        
        # Add ML context to request
        request.ml_context = self._get_ml_context(request)
        
        # Process request
        response = self.get_response(request)
        
        # Add ML headers
        self._add_ml_headers(response, request.ml_context)
        
        # Update metrics
        processing_time = time.time() - start_time
        ML_INTEGRATION_LATENCY.labels(feature='middleware').observe(processing_time)
        
        return response
    
    def _get_ml_context(self, request) -> Dict[str, Any]:
        """Get ML context for the request."""
        context = {
            'user_id': None,
            'session_id': None,
            'personalization_enabled': False,
            'recommendations': [],
            'analytics_enabled': True,
            'real_time_features': []
        }
        
        # Get user information
        if hasattr(request, 'user') and request.user.is_authenticated:
            context['user_id'] = request.user.id
            context['personalization_enabled'] = True
            context['session_id'] = f"user_{request.user.id}"
        else:
            # Generate anonymous session ID
            session_key = getattr(request, 'session', {}).get('session_key', '')
            if session_key:
                context['session_id'] = f"anon_{session_key[:8]}"
            else:
                context['session_id'] = f"anon_{hash(request.META.get('REMOTE_ADDR', ''))}"
        
        return context
    
    def _add_ml_headers(self, response, ml_context: Dict[str, Any]):
        """Add ML-related headers to response."""
        if hasattr(response, 'set_cookie'):
            response['X-ML-Personalization'] = str(ml_context['personalization_enabled'])
            response['X-ML-Session-ID'] = ml_context['session_id']
            response['X-ML-Features'] = ','.join(ml_context['real_time_features'])

class RealTimeMLIntegration:
    """
    Real-time ML integration service for Django features.
    """
    
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self._initialize_redis()
    
    def _initialize_redis(self):
        """Initialize Redis connection."""
        try:
            self.redis_client = redis.from_url(
                getattr(settings, 'REDIS_URL', 'redis://localhost:6379'),
                encoding="utf-8",
                decode_responses=True
            )
            # await self.redis_client.ping()
            logger.info("Real-time ML Integration connected to Redis")
        except Exception as e:
            logger.error(f"Failed to initialize Redis for ML Integration: {str(e)}")
    
    async def personalize_course_list(self, user_id: Optional[int], courses: List[Dict]) -> List[Dict]:
        """
        Personalize course list using ML insights.
        """
        try:
            start_time = time.time()
            
            if not user_id:
                # For anonymous users, sort by popularity
                return sorted(courses, key=lambda x: x.get('enrollment_count', 0), reverse=True)
            
            # Get user profile
            user_profile = await self._get_user_profile(user_id)
            if not user_profile:
                return courses
            
            # Personalize based on user preferences
            personalized_courses = []
            
            for course in courses:
                # Calculate personalization score
                score = await self._calculate_course_score(user_profile, course)
                course['personalization_score'] = score
                course['personalization_reason'] = self._get_personalization_reason(user_profile, course)
                personalized_courses.append(course)
            
            # Sort by personalization score
            personalized_courses.sort(key=lambda x: x['personalization_score'], reverse=True)
            
            PERSONALIZATION_APPLIED.labels(type='course_list').inc()
            ML_INTEGRATION_LATENCY.labels(feature='course_personalization').observe(time.time() - start_time)
            
            return personalized_courses
            
        except Exception as e:
            logger.error(f"Course list personalization error: {e}")
            return courses
    
    async def _get_user_profile(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get user profile for personalization."""
        try:
            # Try to get from cache first
            cache_key = f"user_profile:{user_id}"
            cached_profile = cache.get(cache_key)
            if cached_profile:
                return cached_profile
            
            # Get from database
            from apps.ai_engine.models import UserProfile, UserPreferences
            
            try:
                profile = await UserProfile.objects.aget(user_id=user_id)
                preferences = await UserPreferences.objects.aget(user_id=user_id)
                
                user_profile = {
                    'learning_style': profile.learning_style if hasattr(profile, 'learning_style') else 'visual',
                    'preferred_difficulty': preferences.preferred_difficulty if preferences else 'intermediate',
                    'preferred_format': preferences.preferred_format if preferences else 'video',
                    'preferred_categories': list(preferences.preferred_categories.all().values_list('id', flat=True)) if preferences else [],
                    'completed_courses': list(profile.courses_completed.all().values_list('id', flat=True)) if profile else [],
                    'engagement_score': profile.engagement_score if hasattr(profile, 'engagement_score') else 0.5,
                    'learning_velocity': profile.learning_velocity if hasattr(profile, 'learning_velocity') else 'normal'
                }
                
                # Cache for 30 minutes
                cache.set(cache_key, user_profile, timeout=1800)
                return user_profile
                
            except (UserProfile.DoesNotExist, UserPreferences.DoesNotExist):
                return None
                
        except Exception as e:
            logger.error(f"User profile retrieval error: {e}")
            return None
    
    async def _calculate_course_score(self, user_profile: Dict[str, Any], course: Dict[str, Any]) -> float:
        """Calculate personalization score for a course."""
        try:
            score = 0.5  # Base score
            
            # Category preference
            if 'category_id' in course and course['category_id'] in user_profile.get('preferred_categories', []):
                score += 0.2
            
            # Difficulty preference
            if 'difficulty' in course and course['difficulty'] == user_profile.get('preferred_difficulty', 'intermediate'):
                score += 0.15
            
            # Format preference
            if 'format' in course and course['format'] == user_profile.get('preferred_format', 'video'):
                score += 0.1
            
            # Learning style match
            if 'learning_style_match' in course:
                score += 0.1
            
            # Avoid completed courses
            if 'id' in course and course['id'] in user_profile.get('completed_courses', []):
                score -= 0.3
            
            return min(1.0, max(0.0, score))
            
        except Exception as e:
            logger.error(f"Course score calculation error: {e}")
            return 0.5
    
    def _get_personalization_reason(self, user_profile: Dict[str, Any], course: Dict[str, Any]) -> str:
        """Get reason for personalization."""
        reasons = []
        
        if 'category_id' in course and course['category_id'] in user_profile.get('preferred_categories', []):
            reasons.append("matches your interests")
        
        if 'difficulty' in course and course['difficulty'] == user_profile.get('preferred_difficulty', 'intermediate'):
            reasons.append("matches your skill level")
        
        if 'format' in course and course['format'] == user_profile.get('preferred_format', 'video'):
            reasons.append("matches your learning format")
        
        return ", ".join(reasons) if reasons else "recommended for you"
    
    async def get_real_time_recommendations(self, user_id: Optional[int], context: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Get real-time recommendations using ML.
        """
        try:
            start_time = time.time()
            
            # Generate cache key
            cache_key = f"recommendations:{user_id or 'anonymous'}:{context}:{limit}"
            cached_recommendations = cache.get(cache_key)
            if cached_recommendations:
                return cached_recommendations
            
            recommendations = []
            
            if user_id:
                # Get personalized recommendations
                recommendations = await self._get_user_recommendations(user_id, context, limit)
            else:
                # Get popular recommendations for anonymous users
                recommendations = await self._get_popular_recommendations(context, limit)
            
            # Cache for 15 minutes
            cache.set(cache_key, recommendations, timeout=900)
            
            ML_INTEGRATION_LATENCY.labels(feature='recommendations').observe(time.time() - start_time)
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Real-time recommendations error: {e}")
            return []
    
    async def _get_user_recommendations(self, user_id: int, context: str, limit: int) -> List[Dict[str, Any]]:
        """Get personalized recommendations for user."""
        try:
            from apps.ai_engine.enhanced_services import enhanced_rag_service
            
            # Use enhanced RAG for context-aware recommendations
            query = f"Recommend {context} for user {user_id}"
            
            # Get context from RAG
            rag_context = await enhanced_rag_service.get_context_for_query(query, limit=limit)
            
            # Parse recommendations from context
            recommendations = self._parse_recommendations_from_context(rag_context, context)
            
            # Add real-time data
            for rec in recommendations:
                rec['real_time_score'] = await self._calculate_real_time_score(rec, user_id)
                rec['recommended_at'] = timezone.now().isoformat()
            
            return recommendations[:limit]
            
        except Exception as e:
            logger.error(f"User recommendations error: {e}")
            return []
    
    async def _get_popular_recommendations(self, context: str, limit: int) -> List[Dict[str, Any]]:
        """Get popular recommendations for anonymous users."""
        try:
            # Get popular items based on context
            if context == 'courses':
                from apps.courses.models import Course
                
                popular_courses = await Course.objects.filter(
                    is_published=True
                ).annotate(
                    enrollment_count=Count('enrollments')
                ).order_by('-enrollment_count')[:limit]
                
                recommendations = []
                for course in popular_courses:
                    recommendations.append({
                        'id': course.id,
                        'title': course.title,
                        'type': 'course',
                        'popularity_score': course.enrollment_count,
                        'reason': 'popular with other learners'
                    })
                
                return recommendations
            
            return []
            
        except Exception as e:
            logger.error(f"Popular recommendations error: {e}")
            return []
    
    def _parse_recommendations_from_context(self, context: str, query_context: str) -> List[Dict[str, Any]]:
        """Parse recommendations from RAG context."""
        recommendations = []
        
        # Simple parsing - in production, this would be more sophisticated
        lines = context.split('\n')
        
        for line in lines:
            if 'Course:' in line:
                title = line.replace('Course:', '').strip()
                recommendations.append({
                    'title': title,
                    'type': 'course',
                    'reason': 'based on your interests'
                })
            elif 'Problem:' in line:
                title = line.replace('Problem:', '').strip()
                recommendations.append({
                    'title': title,
                    'type': 'problem',
                    'reason': 'matches your skill level'
                })
        
        return recommendations
    
    async def _calculate_real_time_score(self, recommendation: Dict[str, Any], user_id: int) -> float:
        """Calculate real-time score for recommendation."""
        try:
            # Get real-time engagement data
            engagement_key = f"engagement:{recommendation.get('id', 0)}:{recommendation.get('type', 'unknown')}"
            
            if self.redis_client:
                # Get recent engagement
                recent_views = await self.redis_client.get(f"{engagement_key}:views") or "0"
                recent_completions = await self.redis_client.get(f"{engagement_key}:completions") or "0"
                
                # Calculate engagement score
                views = int(recent_views)
                completions = int(recent_completions)
                
                engagement_score = min(1.0, (views * 0.01 + completions * 0.1))
                
                # Combine with existing score
                base_score = recommendation.get('popularity_score', 0.5) / 100  # Normalize
                
                return (base_score * 0.7 + engagement_score * 0.3)
            
            return recommendation.get('popularity_score', 0.5) / 100
            
        except Exception as e:
            logger.error(f"Real-time score calculation error: {e}")
            return 0.5
    
    async def track_user_interaction(self, user_id: Optional[int], item_id: int, item_type: str, action: str):
        """
        Track user interaction for real-time personalization.
        """
        try:
            if not self.redis_client:
                return
            
            # Track interaction
            interaction_key = f"interaction:{user_id or 'anonymous'}:{item_type}:{item_id}"
            await self.redis_client.incr(interaction_key)
            await self.redis_client.expire(interaction_key, 86400)  # 24 hours
            
            # Track engagement
            engagement_key = f"engagement:{item_id}:{item_type}"
            
            if action == 'view':
                await self.redis_client.incr(f"{engagement_key}:views")
            elif action == 'complete':
                await self.redis_client.incr(f"{engagement_key}:completions")
            elif action == 'like':
                await self.redis_client.incr(f"{engagement_key}:likes")
            
            await self.redis_client.expire(f"{engagement_key}:views", 3600)  # 1 hour
            await self.redis_client.expire(f"{engagement_key}:completions", 3600)
            await self.redis_client.expire(f"{engagement_key}:likes", 3600)
            
            # Update user profile asynchronously
            if user_id:
                asyncio.create_task(self._update_user_profile_async(user_id, item_type, action))
            
        except Exception as e:
            logger.error(f"User interaction tracking error: {e}")
    
    async def _update_user_profile_async(self, user_id: int, item_type: str, action: str):
        """Update user profile asynchronously."""
        try:
            from apps.ai_engine.enhanced_services import enhanced_user_behavior_service
            
            # Get user
            from apps.users.models import User
            user = await User.objects.aget(id=user_id)
            
            # Track activity
            await enhanced_user_behavior_service.track_activity(
                user=user,
                action=f"{item_type}_{action}",
                metadata={'item_type': item_type, 'timestamp': timezone.now().isoformat()}
            )
            
        except Exception as e:
            logger.error(f"Async user profile update error: {e}")

# Global ML integration instance
ml_integration = RealTimeMLIntegration()

# Django template context processor
def ml_context_processor(request):
    """Add ML context to all templates."""
    context = {
        'ml_enabled': True,
        'personalization_enabled': False,
        'real_time_recommendations': []
    }
    
    if hasattr(request, 'ml_context'):
        context.update(request.ml_context)
    
    return context

# Template tags for ML features
from django import template
from django.utils.safestring import mark_safe

register = template.Library()

@register.simple_tag
def get_ml_recommendations(user, context='general', limit=5):
    """Template tag for getting ML recommendations."""
    try:
        # This would be async in a real implementation
        # For now, return empty list
        return []
    except Exception as e:
        logger.error(f"Template recommendations error: {e}")
        return []

@register.filter
def format_personalization_reason(reason):
    """Format personalization reason for display."""
    if not reason:
        return "Recommended for you"
    
    # Capitalize first letter
    return reason[0].upper() + reason[1:] if reason else "Recommended for you"

@register.simple_tag
def is_ml_feature_enabled(feature_name):
    """Check if ML feature is enabled."""
    enabled_features = getattr(settings, 'ML_ENABLED_FEATURES', [])
    return feature_name in enabled_features
