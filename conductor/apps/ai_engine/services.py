"""
AI Engine Services.
Includes RAG, user behavior analytics, and course analytics services.
"""

import logging
import hashlib
from django.apps import apps
from django.db.models import Q, Count, Avg
from django.core.cache import cache

logger = logging.getLogger(__name__)


class RAGService:
    """
    Retrieval-Augmented Generation Service.
    Finds relevant context from the database to feed into the AI.
    """

    @classmethod
    def get_context_for_query(cls, query: str, limit: int = 3) -> str:
        """
        Retrieves relevant text context for a given query.
        Uses keyword search with optional vector search fallback.
        Cached for 1 hour to reduce DB load.
        """
        # Cache Key Generation
        query_hash = hashlib.md5(query.lower().encode()).hexdigest()
        cache_key = f"rag_context:{query_hash}:{limit}"
        
        cached_context = cache.get(cache_key)
        if cached_context:
            return cached_context

        Course = apps.get_model('courses', 'Course')
        Problem = apps.get_model('dsa', 'Problem')
        
        context = []
        seen_content = set()

        # 1. Vector Search (Semantic) - Try first if available
        try:
            from apps.ai_engine.vector_service import VectorService
            semantic_hits = VectorService.search_similar_content(query, top_k=10) # Over-fetch for auth filtering
            
            for hit in semantic_hits:
                # CRITICAL SECURITY FIX: Filter GenericForeignKey hits by publish/active state
                obj = hit.content_object
                if hasattr(obj, 'is_published') and not obj.is_published:
                    continue
                if hasattr(obj, 'is_active') and not obj.is_active:
                    continue

                text = hit.chunk_text
                if text and text not in seen_content:
                    context.append(f"Context (Semantic): {text}")
                    seen_content.add(text)
                    
                if len(context) >= limit:
                    break
        except Exception as e:
            logger.warning(f"Vector search unavailable: {e}")

        # Extract Keywords for Fallback Search
        stop_words = {"how", "do", "i", "a", "an", "the", "what", "is", "where", "can", "find", "for", "to", "of", "and", "in", "it", "with", "my", "on"}
        # Clean query: lowercase, remove basic punctuation
        clean_query = query.lower().replace('?', '').replace('.', '').replace(',', '')
        keywords = [word for word in clean_query.split() if word not in stop_words and len(word) > 2]

        if keywords:
            # 2. Keyword Search (Courses)
            course_q = Q()
            for kw in keywords:
                course_q |= Q(title__icontains=kw) | Q(description__icontains=kw)
            
            # CRITICAL SECURITY FIX: Only expose published courses to RAG
            relevant_courses = Course.objects.filter(course_q, is_published=True).distinct()[:limit]
            
            for course in relevant_courses:
                text = f"Course: {course.title}\nDescription: {course.description}"
                if text not in seen_content:
                    context.append(text)
                    seen_content.add(text)

            # 3. Search DSA Problems (Keyword)
            problem_q = Q()
            for kw in keywords:
                problem_q |= Q(title__icontains=kw) | Q(description__icontains=kw)
                
            # CRITICAL SECURITY FIX: Only expose active problems to RAG
            relevant_problems = Problem.objects.filter(problem_q, is_active=True).distinct()[:limit]
            
            for problem in relevant_problems:
                text = f"Problem: {problem.title}\nDescription: {problem.description}"
                if text not in seen_content:
                    context.append(text)
                    seen_content.add(text)

        if not context:
            result = "No specific course or problem context found. Answer based on general knowledge."
        else:
            result = "Relevant Context from Learning Hub:\n" + "\n\n".join(context)
            
        # Cache Result
        cache.set(cache_key, result, timeout=3600)  # 1 Hour
        
        return result


class UserBehaviorService:
    """Service for tracking and analyzing user behavior."""
    
    @staticmethod
    def track_activity(user, action, metadata=None):
        """Track a user action."""
        try:
            from apps.ai_engine.models import ActivityLog
            ActivityLog.objects.create(
                user=user,
                action=action,
                metadata=metadata or {}
            )
            logger.info(f"User {user.id} performed action: {action}")
        except Exception as e:
            logger.error(f"Failed to track activity: {e}")
    
    @staticmethod
    def analyze_behavior(user):
        """Analyze user behavior patterns."""
        Enrollment = apps.get_model('courses', 'Enrollment')
        
        enrollments = Enrollment.objects.filter(user=user)
        total = enrollments.count()
        completed = enrollments.filter(progress_percentage=100).count()
        
        return {
            "engagement_score": min(1.0, completed / max(total, 1)),
            "preferred_time": "evening",
            "total_enrollments": total,
            "completed_enrollments": completed,
        }
    
    @staticmethod
    def get_user_learning_stats(user):
        """Get learning statistics for a user."""
        Enrollment = apps.get_model('courses', 'Enrollment')
        
        enrollments = Enrollment.objects.filter(user=user)
        total_courses = enrollments.count()
        completed_courses = enrollments.filter(progress_percentage=100).count()
        
        # Calculate average progress
        avg_progress = enrollments.aggregate(avg=Avg('progress_percentage'))['avg'] or 0
        
        # Calculate completion rate
        completion_rate = (completed_courses / total_courses * 100) if total_courses > 0 else 0
        
        return {
            "total_courses": total_courses,
            "completed_courses": completed_courses,
            "completion_rate": completion_rate,
            "average_progress": avg_progress,
        }

    @staticmethod
    def predict_course_completion(user, course):
        """
        Predict likelihood of course completion based on user history.
        Returns a probability between 0 and 1.
        """
        Enrollment = apps.get_model('courses', 'Enrollment')
        
        # Get user's completion history
        past_enrollments = Enrollment.objects.filter(user=user)
        total = past_enrollments.count()
        completed = past_enrollments.filter(progress_percentage=100).count()
        
        if total == 0:
            # No history - neutral prediction
            return 0.5
        
        # Basic prediction: completion rate with category bonus
        base_rate = completed / total
        
        # Boost if user has completed courses in same category
        same_category_completed = past_enrollments.filter(
            course__category=course.category,
            progress_percentage=100
        ).count()
        
        category_bonus = 0.1 if same_category_completed > 0 else 0
        
        return min(1.0, base_rate + category_bonus)


class CourseAnalyticsService:
    """Service for analyzing course performance."""

    @staticmethod
    def get_course_insights(course):
        """Get insights for a specific course."""
        enrollment_count = course.enrollments.count() if hasattr(course, 'enrollments') else 0
        
        return {
            "views": enrollment_count * 5,  # Estimated views
            "enrollments": enrollment_count,
            "rating": course.avg_rating if hasattr(course, 'avg_rating') else 0,
        }

    @staticmethod
    def get_course_performance(course):
        """Get comprehensive performance metrics for a course."""
        Enrollment = apps.get_model('courses', 'Enrollment')
        
        enrollments = Enrollment.objects.filter(course=course)
        total_enrollments = enrollments.count()
        completed = enrollments.filter(progress_percentage=100).count()
        active_students = enrollments.filter(progress_percentage__gt=0, progress_percentage__lt=100).count()
        
        # Calculate average progress
        avg_progress = enrollments.aggregate(avg=Avg('progress_percentage'))['avg'] or 0
        
        # Calculate completion rate
        completion_rate = (completed / total_enrollments * 100) if total_enrollments > 0 else 0
        
        return {
            "total_enrollments": total_enrollments,
            "active_students": active_students,
            "completed_students": completed,
            "completion_rate": completion_rate,
            "average_progress": avg_progress,
            "average_rating": getattr(course, 'avg_rating', 0) or 0,
        }

    @staticmethod
    def get_popular_categories(limit=5):
        """Get most popular course categories by enrollment count."""
        Category = apps.get_model('courses', 'Category')
        
        categories = Category.objects.annotate(
            course_count=Count('courses'),
        ).filter(
            is_active=True
        ).order_by('-course_count')[:limit]
        
        return [
            {
                "id": cat.id,
                "name": cat.name,
                "slug": cat.slug,
                "course_count": cat.course_count,
            }
            for cat in categories
        ]


class ContentService:
    """Service for content-related AI tasks like summarization."""

    @staticmethod
    def summarize_text(text: str) -> str:
        """
        Summarizes the given text using an AI model.
        Mocks the call to the AI model for now.
        """
        logger.info(f"Summarizing text of length {len(text)}")

        if not text:
            return ""

        try:
            from .ai_client import AIClient
            prompt = (
                "You are an expert technical editor. Summarize the following content "
                "into a concise, highly readable summary (under 300 words). "
                f"Extract the core concepts clearly:\\n\\n{text}"
            )
            summary = AIClient.generate_text(prompt)
            return summary or "Summary unavailable."
        except Exception as e:
            logger.error(f"Summarization failed: {e}")
            return "Failed to generate summary due to an internal error."
