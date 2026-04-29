
from typing import List, Dict, Any, Optional
from django.contrib.contenttypes.models import ContentType
from django.db.models import Avg, F
from django.core.cache import cache
from pgvector.django import L2Distance

from apps.courses.models import Course, Enrollment
from apps.users.models import User
from apps.ai_engine.models import CourseEmbedding
from apps.ai_engine.ai_client import AIClient
import logging
import numpy as np

logger = logging.getLogger(__name__)

REC_CACHE_TIMEOUT = 600  # 10 minutes

class RecommendationService:
    """
    Service to provide smart course recommendations using RAG / Vectors.
    """

    @staticmethod
    def get_recommendations_for_user(user: User, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Get recommended courses based on user's past enrollments using Vector Similarity.
        Results are cached per-user to reduce DB/vector queries.
        """
        cache_key = f"recommendations_user_{user.id}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        # 1. Get user's enrolled courses ID
        enrolled_course_ids = list(
            Enrollment.objects.filter(user=user).values_list('course_id', flat=True)
        )

        if not enrolled_course_ids:
            result = RecommendationService._get_popular_courses(limit)
            cache.set(cache_key, result, timeout=REC_CACHE_TIMEOUT)
            return result

        # 2. Get Embeddings for these courses
        # We assume CourseEmbedding is linked to Course model
        course_ct = ContentType.objects.get_for_model(Course)
        
        user_vectors = CourseEmbedding.objects.filter(
            content_type=course_ct,
            object_id__in=enrolled_course_ids
        ).values_list('embedding', flat=True)

        if not user_vectors:
             # Fallback if no embeddings generated yet
            return RecommendationService._get_popular_courses(limit, exclude_ids=enrolled_course_ids)

        # 3. Compute Average User Vector (Centroid)
        # Convert to numpy for easy averaging
        # Note: In production, do this in DB if possible, but Django ORM for vector avg is tricky without raw SQL
        vectors = []
        for v in user_vectors:
            if v is not None:
                try:
                    # Handle both numpy arrays and list/array-like data
                    vectors.append(np.array(v))
                except (ValueError, TypeError) as e:
                    logger.warning(f"Failed to convert embedding vector: {e}")
                    continue
        
        if not vectors:
            result = RecommendationService._get_popular_courses(limit, exclude_ids=enrolled_course_ids)
            cache.set(cache_key, result, timeout=REC_CACHE_TIMEOUT)
            return result

        try:
            user_pref_vector = np.mean(vectors, axis=0).tolist()
        except ValueError as e:
            logger.error("Failed to compute mean vector: %s", e)
            result = RecommendationService._get_popular_courses(limit, exclude_ids=enrolled_course_ids)
            cache.set(cache_key, result, timeout=REC_CACHE_TIMEOUT)
            return result

        # 4. Vector Search for Similar Courses
        # Exclude enrolled
        candidates = CourseEmbedding.objects.filter(
            content_type=course_ct
        ).exclude(
            object_id__in=enrolled_course_ids
        ).order_by(
            L2Distance('embedding', user_pref_vector)
        )[:limit]
        
        # 5. Fetch Course Objects
        candidate_course_ids = [emb.object_id for emb in candidates]
        course_dict = Course.objects.in_bulk(candidate_course_ids)
        
        recommended_courses = []
        for c_id in candidate_course_ids:
            if c_id in course_dict:
                recommended_courses.append(course_dict[c_id])

        if len(recommended_courses) < limit:
             popular = RecommendationService._get_popular_courses(
                 limit - len(recommended_courses), 
                 exclude_ids=enrolled_course_ids + [c.id for c in recommended_courses]
             )
             recommended_courses.extend(popular)

        result = [
            {
                "id": c.id,
                "title": c.title,
                "description": c.description,
                "thumbnail": c.thumbnail.url if c.thumbnail else None,
                "reason": "AI matched your learning path"
            }
            for c in recommended_courses
        ]

        cache.set(cache_key, result, timeout=REC_CACHE_TIMEOUT)
        return result

    @staticmethod
    def _get_popular_courses(
        limit: int,
        exclude_ids: Optional[List[int]] = None,
    ) -> List[Dict[str, Any]]:
        """Get most enrolled courses as a fallback recommendation."""
        qs = Course.objects.all().order_by('-enrollment_count')
        if exclude_ids:
            qs = qs.exclude(id__in=exclude_ids)
        return [
            {
                "id": c.id,
                "title": c.title,
                "description": c.description,
                "thumbnail": c.thumbnail.url if c.thumbnail else None,
                "reason": "Popular among learners",
            }
            for c in qs[:limit]
        ]

    @staticmethod
    def invalidate_user_recommendations(user_id: int) -> None:
        """Invalidate cached recommendations when a user enrolls or completes a course."""
        cache.delete(f"recommendations_user_{user_id}")
