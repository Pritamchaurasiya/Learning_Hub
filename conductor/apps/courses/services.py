import logging
import re

from django.db.models import Avg, QuerySet, Q, F
from django.db import transaction
from django.core.cache import cache
from typing import Dict, Any, List, cast
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.core.exceptions import PaymentRequiredException
from apps.core.signals import user_enrolled
from .models import Course, Enrollment, Review

logger = logging.getLogger(__name__)


class CourseService:
    """Service layer for Course operations."""

    @staticmethod
    def enroll_user(user, course) -> "Enrollment":
        """Enroll a user in a course. Delegates to EnrollmentService."""
        return cast("Enrollment", EnrollmentService.enroll(user, course))

    @staticmethod
    def add_review(user, course, review_data: Dict[str, Any]) -> "Review":
        """Add a review for a course. Delegates to EnrollmentService."""
        result = EnrollmentService.add_review(user, course, review_data)
        if not isinstance(result, Review):
            raise TypeError("Expected Review instance")
        return result

    @staticmethod
    def get_course_reviews(course) -> QuerySet:
        """Get reviews for a course. Delegates to EnrollmentService."""
        return EnrollmentService.get_course_reviews(course)

    @staticmethod
    def get_user_enrollments(user) -> QuerySet:
        """Get enrollments for a user. Delegates to EnrollmentService."""
        return EnrollmentService.get_user_enrollments(user)

    @staticmethod
    def get_featured_courses() -> QuerySet:
        """Get featured courses."""
        return Course.objects.filter(
            is_published=True, is_featured=True
        ).select_related("instructor", "category")[:10]

    @staticmethod
    def search_courses(query: str) -> QuerySet:
        """
        Advanced search for courses using Postgres Full Text Search.
        Falls back to icontains if Postgres is not available.
        """
        from django.db import connection

        if not query:
            return Course.objects.filter(is_published=True)

        # Input validation: limit query length to prevent abuse
        query = query[:200].strip()

        # Generate safe cache key — strip anything that isn't alphanumeric/space/dash
        safe_query = re.sub(r'[^a-zA-Z0-9 _-]', '', query[:50])
        cache_key = f"course_search:{safe_query}"
        cached = cache.get(cache_key)
        if cached is not None:
            # Cached value is a list of sorted course IDs
            if isinstance(cached, list) and cached:
                from django.db.models import Case, When, Value, IntegerField
                preserved_order = Case(
                    *[When(pk=pk, then=Value(pos)) for pos, pk in enumerate(cached)],
                    output_field=IntegerField()
                )
                return Course.objects.filter(
                    id__in=cached
                ).select_related("instructor", "category").order_by(preserved_order)
            return Course.objects.none()

        is_postgres = 'postgresql' in connection.settings_dict['ENGINE']

        # 1. Keyword Search (Postgres Full Text)
        keyword_results = Course.objects.none()
        if is_postgres:
            from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank
            vector_config = SearchVector('title', weight='A') + \
                     SearchVector('short_description', weight='B') + \
                     SearchVector('description', weight='C')
            search_query = SearchQuery(query)
            keyword_results = Course.objects.annotate(
                rank=SearchRank(vector_config, search_query)
            ).filter(
                is_published=True,
                rank__gte=0.1
            ).select_related("instructor", "category")
        else:
            keyword_results = Course.objects.filter(
                Q(title__icontains=query) | 
                Q(description__icontains=query) |
                Q(short_description__icontains=query),
                is_published=True
            ).select_related("instructor", "category")

        # 2. Semantic/Vector Search
        try:
            from apps.ai_engine.vector_service import VectorService
            # Get semantic matches (CourseEmbedding -> ContentObject -> Course)
            # Note: This assumes CourseEmbedding links to Course or Module/Lesson
            # For simplicity, let's assume we search CourseEmbeddings and get related courses
            vector_matches = VectorService.search_similar_content(query, top_k=5)
            # vector_matches is a QuerySet of CourseEmbedding
            
            # Extract Course IDs from embeddings
            # Assuming content_object is Course. If it's Lesson, we'd need to traverse up.
            semantic_course_ids = []
            for em in vector_matches:
                if isinstance(em.content_object, Course):
                    semantic_course_ids.append(em.content_object.id)
                # Handle generic relation if needed later
            
            semantic_results = Course.objects.filter(id__in=semantic_course_ids, is_published=True)
            
        except Exception as e:
            # Fallback if AI/Vector fails
            logger.warning("Vector search failed: %s", e)
            semantic_results = Course.objects.none()

        # 3. Hybrid Fusion using Reciprocal Rank Fusion (RRF)
        # Score = 1 / (k + rank) where k is a constant (e.g., 60)
        rrf_k = 60
        scores = {}
        
        # Process Semantic Results (evaluate once)
        for rank, course in enumerate(semantic_results[:20]):
            scores[course.id] = scores.get(course.id, 0) + (1.0 / (rrf_k + rank + 1))
            
        # Process Keyword Results (evaluate once)
        for rank, course in enumerate(keyword_results[:20]):
            scores[course.id] = scores.get(course.id, 0) + (1.0 / (rrf_k + rank + 1))
            
        # Sort by RRF score and return as a proper QuerySet with preserved ordering
        sorted_course_ids = sorted(scores.keys(), key=lambda cid: scores[cid], reverse=True)
        if sorted_course_ids:
            from django.db.models import Case, When, Value, IntegerField
            preserved_order = Case(
                *[When(pk=pk, then=Value(pos)) for pos, pk in enumerate(sorted_course_ids)],
                output_field=IntegerField()
            )
            final_qs = Course.objects.filter(
                id__in=sorted_course_ids
            ).select_related("instructor", "category").order_by(preserved_order)
        else:
            final_qs = keyword_results[:20] if keyword_results.exists() else Course.objects.none()
        
        # Cache sorted IDs for 10 minutes (caching QuerySets directly is unreliable)
        cache.set(cache_key, list(sorted_course_ids), timeout=600)
        
        return final_qs


class EnrollmentService:
    """
    Service layer for Enrollment operations.
    """
    
    @staticmethod
    def enroll(user, course) -> "Enrollment":
        """
        Enroll a user in a course.
        Raises ValidationError if already enrolled.
        Raises PaymentRequiredException if course is paid.
        """
        # Check if already enrolled
        if Enrollment.objects.filter(user=user, course=course).exists():
            raise ValidationError("Already enrolled in this course.")

        # Check if course requires payment
        if not course.is_free and course.price > 0:
            raise PaymentRequiredException("Payment required for this course.")

        # Atomic transaction
        enrollment: Enrollment
        with transaction.atomic():
            enrollment = Enrollment.objects.create(user=user, course=course)

            # Trigger signal
            user_enrolled.send(
                sender=Course, user=user, course=course, enrollment=enrollment
            )

            # Real-time Dashboard Update
            EnrollmentService._trigger_dashboard_update(course, enrollment)

        # Publish to EventBus (outside transaction — fire-and-forget)
        try:
            from apps.core.event_bus import EventBus
            EventBus.publish("course.enrolled", {
                "user_id": user.id,
                "username": user.username,
                "course_id": course.id,
                "course_title": course.title,
                "enrollment_id": enrollment.id,
            })
        except Exception:
            pass  # EventBus is non-critical

        return enrollment
        
    @staticmethod
    def _trigger_dashboard_update(course, enrollment):
        """
        Sends a real-time update to the instructor's dashboard via WebSockets.
        """
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            
            channel_layer = get_channel_layer()
            instructor_id = course.instructor.id
            group_name = f"instructor_dashboard_{instructor_id}"
            
            # Message payload
            message = {
                "type": "dashboard_update",
                "update_type": "sales_event",
                "data": {
                    "revenue_bump": float(course.price) if not course.is_free else 0,
                    "student_name": enrollment.user.username,
                    "course_title": course.title,
                    "message": f"New Student: {enrollment.user.username} enrolled in {course.title}!"
                }
            }
            
            async_to_sync(channel_layer.group_send)(group_name, message)
            
        except Exception as e:
            # Don't fail the transaction just because WS failed
            logger.warning("Error sending dashboard update: %s", e)

    @staticmethod
    def add_review(user, course, review_data: Dict[str, Any]) -> "Review":
        """
        Add a review for a course.
        Raises PermissionDenied if not enrolled, ValidationError if already reviewed.
        """
        enrollment_exists = Enrollment.objects.filter(user=user, course=course).exists()
        if not enrollment_exists:
            raise PermissionDenied("You must be enrolled to review this course.")

        if Review.objects.filter(user=user, course=course).exists():
            raise ValidationError("You have already reviewed this course.")

        with transaction.atomic():
            review = cast(
                Review, Review.objects.create(user=user, course=course, **review_data)
            )

            # Update agg stats
            avg = Review.objects.filter(course=course).aggregate(Avg("rating"))[
                "rating__avg"
            ]
            course.avg_rating = avg or 0
            course.review_count += 1
            course.save(update_fields=["avg_rating", "review_count"])

        return review

    @staticmethod
    def get_course_reviews(course) -> QuerySet:
        """Get approved reviews for a course."""
        return Review.objects.filter(course=course, is_approved=True).select_related("user")

    @staticmethod
    def get_user_enrollments(user) -> QuerySet:
        """Get enrollments for a user."""
        return Enrollment.objects.filter(user=user).select_related(
            "course", "course__instructor", "course__category"
        )


    @staticmethod
    def get_personalized_recommendations(user) -> List[Dict[str, Any]]:
        """
        Get recommendations using Neuro-Symbolic AI.
        Combines Neural (Embedding) + Symbolic (Logic Rules).
        """
        from apps.ai_engine.integrated_services import IntegratedAIService
        from django.db.models import F
        from django.db import connection, reset_queries
        from django.conf import settings
        
        # Enable query logging for debugging (only in DEBUG mode)
        if settings.DEBUG:
            reset_queries()
        
        # 1. Get Candidate Courses (Active, Not Enrolled)
        # FIX: Use select_related to avoid N+1 queries on category/instructor
        enrolled_ids = list(Enrollment.objects.filter(user=user).values_list('course_id', flat=True))
        candidates = list(Course.objects.filter(
            is_published=True
        ).exclude(
            id__in=enrolled_ids
        ).select_related(
            'category', 'instructor'
        )[:20])
        
        logger.debug("Recommendations query: %d candidates fetched with %d enrolled courses", len(candidates), len(enrolled_ids))
        
        # 2. Extract User Profile (Mock for now, would come from LearningProfile)
        user_profile = {
            'weaknesses': ['optimization', 'algorithms'], 
            'interests': ['ai', 'python']
        }
        
        ai_service = IntegratedAIService()
        scored_courses = []
        
        for course in candidates:
            # Extract Course Features (Mock)
            # In production, this would parse syllabus/tags
            course_features = {
                'topics': [course.category.slug] + course.title.lower().split()
            }
            
            # 3. Neuro-Symbolic Scoring
            try:
                sym_score = ai_service.get_semantic_recommendation_boost(user_profile, course_features)
            except Exception as e:
                logger.warning("AI recommendation scoring error: %s", e)
                sym_score = 0.0
            
            # Base Score (Popularity)
            base_score = (course.avg_rating * 0.5) + (min(course.enrollment_count, 100) / 100.0 * 0.5)
            
            final_score = (base_score * 0.7) + (sym_score * 0.3)
            
            scored_courses.append({
                'course': course,
                'score': final_score,
                'ai_reason': "Matches your learning goals" if sym_score > 0.5 else "Popular course"
            })
            
        # Sort by Score
        scored_courses.sort(key=lambda x: x['score'], reverse=True)
        
        if settings.DEBUG:
            logger.debug("Recommendations: %d queries executed for %d results", len(connection.queries), len(scored_courses))
        
        # Return top 5
        return scored_courses[:5]

    @staticmethod
    def get_course_analytics(course) -> Dict[str, Any]:
        """
        Get aggregated analytics for a specific course including engagement metrics.
        """
        from django.db.models import Avg, Count
        
        enrollments = Enrollment.objects.filter(course=course)
        total_enrollments = enrollments.count()
        
        # Calculate completion rate (percentage of students who finished)
        completed_enrollments = enrollments.filter(progress_percentage=100).count()
        completion_rate = (completed_enrollments / total_enrollments * 100) if total_enrollments > 0 else 0
        
        # Average progress
        avg_progress = enrollments.aggregate(Avg("progress_percentage"))["progress_percentage__avg"] or 0
        
        return {
            "total_enrollments": total_enrollments,
            "completion_rate": round(completion_rate, 2),
            "average_progress": round(avg_progress, 2),
            "avg_rating": course.avg_rating,
            "total_revenue": total_enrollments * float(course.price) if not course.is_free else 0
        }

