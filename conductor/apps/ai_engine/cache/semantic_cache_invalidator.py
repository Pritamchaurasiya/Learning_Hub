"""
Semantic Cache & Vector Embedding Invalidation Engine.

Ensures real-time cache consistency across L1 (Memory), L2 (Redis), and L3 (PostgreSQL SemanticCache)
layers whenever Courses, Modules, or Lessons are created, modified, or deleted.

Extended to support all content models: Courses, Modules, Lessons, Problems, Questions, Ebooks, etc.
"""

import logging
from typing import Optional, List
from django.db import transaction
from django.db.models.signals import post_save, post_delete
from django.core.cache import cache
from django.contrib.contenttypes.models import ContentType
from django.apps import apps

logger = logging.getLogger(__name__)


def _run_on_commit(fn):
    """Execute callable after the current database transaction commits, or immediately if none."""
    try:
        transaction.on_commit(fn)
    except Exception:
        fn()


# ============================================================================
# GENERIC CACHE INVALIDATION FOR ALL CONTENT MODELS
# ============================================================================

CONTENT_MODELS = [
    ("courses", "Course"),
    ("courses", "Module"),
    ("courses", "Lesson"),
    ("courses", "CourseResource"),
    ("dsa", "Problem"),
    ("test_engine", "Question"),
    ("ebooks", "Ebook"),
]


def invalidate_semantic_cache(sender, instance, **kwargs):
    """
    Generic cache invalidation for any content model.
    Clears CourseEmbedding entries and related search/recommendation caches.
    """
    try:
        model_label = f"{sender._meta.app_label}.{sender._meta.model_name}"
        logger.debug(f"Invalidating semantic cache for {model_label} #{instance.id}")

        # 1. Delete related CourseEmbedding entries
        CourseEmbedding = apps.get_model("ai_engine", "CourseEmbedding")
        deleted_count, _ = CourseEmbedding.objects.filter(
            content_type__app_label=sender._meta.app_label,
            content_type__model=sender._meta.model_name,
            object_id=str(instance.id),
        ).delete()

        if deleted_count:
            logger.info(
                f"Deleted {deleted_count} embeddings for {model_label} #{instance.id}"
            )

        # 2. Invalidate search caches that might contain this content
        invalidate_search_caches(sender, instance)

        # 3. Invalidate recommendation caches
        invalidate_recommendation_caches(sender, instance)

    except Exception as e:
        logger.error(f"Failed to invalidate semantic cache for {sender}: {e}")


def invalidate_search_caches(sender, instance):
    """Invalidate course/search related caches."""
    try:
        # Pattern-based cache deletion for search results
        cache.delete_pattern("course_search:*")
        cache.delete_pattern("rag_context:*")
        logger.debug(
            f"Invalidated search caches for {sender._meta.model_name} #{instance.id}"
        )
    except Exception as e:
        logger.warning(f"Failed to invalidate search caches: {e}")


def invalidate_recommendation_caches(sender, instance):
    """Invalidate personalized recommendation caches."""
    try:
        # Delete user recommendation caches
        cache.delete_pattern("recommendations:*")
        logger.debug(
            f"Invalidated recommendation caches for {sender._meta.model_name} #{instance.id}"
        )
    except Exception as e:
        logger.warning(f"Failed to invalidate recommendation caches: {e}")


def setup_content_model_signals():
    """
    Dynamically connect signals for all content models.
    Call this from AppConfig.ready()
    """
    for app_label, model_name in CONTENT_MODELS:
        try:
            model = apps.get_model(app_label, model_name)
            if model:
                # Use weak=False to prevent garbage collection of signal handlers
                post_save.connect(
                    invalidate_semantic_cache,
                    sender=model,
                    weak=False,
                    dispatch_uid=f"invalidate_cache_{app_label}_{model_name}_save",
                )
                post_delete.connect(
                    invalidate_semantic_cache,
                    sender=model,
                    weak=False,
                    dispatch_uid=f"invalidate_cache_{app_label}_{model_name}_delete",
                )
                logger.debug(
                    f"Connected cache invalidation signals for {app_label}.{model_name}"
                )
        except LookupError:
            logger.warning(
                f"Model {app_label}.{model_name} not found, skipping cache invalidation signal"
            )
        except Exception as e:
            logger.error(
                f"Failed to connect cache invalidation for {app_label}.{model_name}: {e}"
            )


def setup_ai_engine_signals():
    """Set up signals for AI Engine models that affect caching."""
    try:
        # Invalidate cache when user preferences change
        UserPreferences = apps.get_model("ai_engine", "UserPreferences")
        if UserPreferences:
            post_save.connect(
                lambda sender, instance, **kwargs: cache.delete(
                    f"ai_user_prefs:{instance.user_id}"
                ),
                sender=UserPreferences,
                weak=False,
                dispatch_uid="invalidate_user_prefs",
            )

        # Invalidate cache when learning insight is updated
        LearningInsight = apps.get_model("ai_engine", "LearningInsight")
        if LearningInsight:
            post_save.connect(
                lambda sender, instance, **kwargs: cache.delete(
                    f"learning_insight:{instance.user_id}"
                ),
                sender=LearningInsight,
                weak=False,
                dispatch_uid="invalidate_learning_insight",
            )

        logger.debug("Connected AI Engine cache invalidation signals")
    except Exception as e:
        logger.error(f"Failed to connect AI Engine signals: {e}")


# ============================================================================
# SPECIFIC HANDLERS FOR COURSE, MODULE, LESSON (DETAILED CACHE KEYS)
# ============================================================================


def invalidate_semantic_cache_for_course(
    course_id: int,
    course_title: Optional[str] = None,
    course_slug: Optional[str] = None,
    is_deletion: bool = False,
) -> int:
    """
    Invalidates all L1/L2 cache entries and L3 SemanticCache database rows
    associated with a specific course.

    Returns the count of deleted SemanticCache rows.
    """
    deleted_count = 0
    try:
        # 1. Invalidate explicit Redis / Django cache keys
        cache_keys = [
            f"course_embedding:{course_id}",
            f"course_summary:{course_id}",
            f"course_details:{course_id}",
            f"course_modules:{course_id}",
            f"semantic_cache:course_{course_id}",
            f"ai_recommendations:course:{course_id}",
        ]
        for key in cache_keys:
            try:
                cache.delete(key)
            except Exception as e:
                logger.debug(f"Failed deleting cache key {key}: {e}")

        # 2. Invalidate L3 SemanticCache entries mentioning title/slug
        from apps.ai_engine.models import SemanticCache, CourseEmbedding

        filter_queries = []
        if course_title and len(course_title.strip()) > 3:
            filter_queries.append(course_title.strip())
        if course_slug and len(course_slug.strip()) > 3:
            filter_queries.append(course_slug.strip())

        for query_frag in filter_queries:
            matching = SemanticCache.objects.filter(query_text__icontains=query_frag)
            count, _ = matching.delete()
            deleted_count += count

        # 3. If deleting the course, purge orphan CourseEmbedding entries
        if is_deletion:
            try:
                from apps.courses.models import Course

                ct = ContentType.objects.get_for_model(Course)
                CourseEmbedding.objects.filter(
                    content_type=ct, object_id=course_id
                ).delete()
            except Exception as err:
                logger.warning(
                    f"Error purging CourseEmbedding for course {course_id}: {err}"
                )

        logger.info(
            f"Semantic cache invalidated for course {course_id} "
            f"(deleted {deleted_count} semantic cache records, is_deletion={is_deletion})"
        )
    except Exception as e:
        logger.error(
            f"Error invalidating semantic cache for course {course_id}: {e}",
            exc_info=True,
        )

    return deleted_count


def invalidate_semantic_cache_for_lesson(
    lesson_id: int,
    lesson_title: Optional[str] = None,
    course_id: Optional[int] = None,
    is_deletion: bool = False,
) -> int:
    """
    Invalidates cache entries when a lesson is updated or removed.
    """
    deleted_count = 0
    try:
        cache_keys = [
            f"lesson_content:{lesson_id}",
            f"lesson_embedding:{lesson_id}",
        ]
        if course_id:
            cache_keys.extend(
                [
                    f"course_modules:{course_id}",
                    f"course_summary:{course_id}",
                    f"course_embedding:{course_id}",
                ]
            )

        for key in cache_keys:
            try:
                cache.delete(key)
            except Exception as e:
                logger.debug(f"Failed deleting cache key {key}: {e}")

        from apps.ai_engine.models import SemanticCache, CourseEmbedding

        if lesson_title and len(lesson_title.strip()) > 3:
            matching = SemanticCache.objects.filter(
                query_text__icontains=lesson_title.strip()
            )
            count, _ = matching.delete()
            deleted_count += count

        if is_deletion:
            try:
                from apps.courses.models import Lesson

                ct = ContentType.objects.get_for_model(Lesson)
                CourseEmbedding.objects.filter(
                    content_type=ct, object_id=lesson_id
                ).delete()
            except Exception as err:
                logger.warning(
                    f"Error purging CourseEmbedding for lesson {lesson_id}: {err}"
                )

        logger.info(
            f"Semantic cache invalidated for lesson {lesson_id} (deleted {deleted_count} records)"
        )
    except Exception as e:
        logger.error(
            f"Error invalidating semantic cache for lesson {lesson_id}: {e}",
            exc_info=True,
        )

    return deleted_count


def invalidate_semantic_cache_for_module(
    module_id: int,
    course_id: Optional[int] = None,
) -> None:
    """
    Invalidates module and parent course cached structures.
    """
    try:
        if course_id:
            cache.delete(f"course_modules:{course_id}")
            cache.delete(f"course_details:{course_id}")
        cache.delete(f"module_details:{module_id}")
    except Exception as e:
        logger.error(
            f"Error invalidating cache for module {module_id}: {e}", exc_info=True
        )


# ============================================================================
# DJANGO SIGNAL HANDLERS FOR SPECIFIC MODELS
# ============================================================================


def on_course_saved(sender, instance, created, **kwargs):
    if kwargs.get("raw", False):
        return
    _run_on_commit(
        lambda: invalidate_semantic_cache_for_course(
            course_id=instance.id,
            course_title=instance.title,
            course_slug=getattr(instance, "slug", None),
            is_deletion=False,
        )
    )


def on_course_deleted(sender, instance, **kwargs):
    invalidate_semantic_cache_for_course(
        course_id=instance.id,
        course_title=instance.title,
        course_slug=getattr(instance, "slug", None),
        is_deletion=True,
    )


def on_module_saved(sender, instance, created, **kwargs):
    if kwargs.get("raw", False):
        return
    course_id = instance.course_id if hasattr(instance, "course_id") else None
    _run_on_commit(
        lambda: invalidate_semantic_cache_for_module(
            module_id=instance.id,
            course_id=course_id,
        )
    )


def on_module_deleted(sender, instance, **kwargs):
    course_id = instance.course_id if hasattr(instance, "course_id") else None
    invalidate_semantic_cache_for_module(
        module_id=instance.id,
        course_id=course_id,
    )


def on_lesson_saved(sender, instance, created, **kwargs):
    if kwargs.get("raw", False):
        return
    course_id = None
    try:
        if hasattr(instance, "module") and instance.module:
            course_id = instance.module.course_id
    except Exception:
        pass

    _run_on_commit(
        lambda: invalidate_semantic_cache_for_lesson(
            lesson_id=instance.id,
            lesson_title=instance.title,
            course_id=course_id,
            is_deletion=False,
        )
    )


def on_lesson_deleted(sender, instance, **kwargs):
    course_id = None
    try:
        if hasattr(instance, "module") and instance.module:
            course_id = instance.module.course_id
    except Exception:
        pass

    invalidate_semantic_cache_for_lesson(
        lesson_id=instance.id,
        lesson_title=instance.title,
        course_id=course_id,
        is_deletion=True,
    )


# ============================================================================
# REGISTRATION FUNCTION
# ============================================================================


def register_cache_invalidation_signals():
    """Connect signal listeners to all content models."""
    try:
        # Register generic signals for all content models
        setup_content_model_signals()
        setup_ai_engine_signals()

        # Register specific detailed handlers for Course, Module, Lesson
        from apps.courses.models import Course, Module, Lesson

        post_save.connect(
            on_course_saved, sender=Course, dispatch_uid="ai_cache_course_save"
        )
        post_delete.connect(
            on_course_deleted, sender=Course, dispatch_uid="ai_cache_course_delete"
        )

        post_save.connect(
            on_module_saved, sender=Module, dispatch_uid="ai_cache_module_save"
        )
        post_delete.connect(
            on_module_deleted, sender=Module, dispatch_uid="ai_cache_module_delete"
        )

        post_save.connect(
            on_lesson_saved, sender=Lesson, dispatch_uid="ai_cache_lesson_save"
        )
        post_delete.connect(
            on_lesson_deleted, sender=Lesson, dispatch_uid="ai_cache_lesson_delete"
        )

        logger.info(
            "Semantic cache invalidation signals registered successfully (generic + specific)."
        )
    except Exception as e:
        logger.warning(f"Could not register semantic cache invalidation signals: {e}")


# ============================================================================
# MANUAL CACHE INVALIDATION UTILITIES
# ============================================================================


class SemanticCacheManager:
    """Utilities for manual semantic cache management."""

    @staticmethod
    def invalidate_for_content(app_label: str, model_name: str, object_id: str):
        """Manually invalidate cache for specific content."""
        try:
            CourseEmbedding = apps.get_model("ai_engine", "CourseEmbedding")
            deleted_count, _ = CourseEmbedding.objects.filter(
                content_type__app_label=app_label,
                content_type__model=model_name,
                object_id=object_id,
            ).delete()

            invalidate_search_caches(None, None)
            invalidate_recommendation_caches(None, None)

            logger.info(
                f"Manually invalidated {deleted_count} embeddings for {app_label}.{model_name}#{object_id}"
            )
            return deleted_count
        except Exception as e:
            logger.error(f"Manual cache invalidation failed: {e}")
            return 0

    @staticmethod
    def invalidate_all_embeddings():
        """Clear all semantic cache embeddings (use with caution)."""
        try:
            CourseEmbedding = apps.get_model("ai_engine", "CourseEmbedding")
            deleted_count, _ = CourseEmbedding.objects.all().delete()
            cache.delete_pattern("course_search:*")
            cache.delete_pattern("rag_context:*")
            cache.delete_pattern("recommendations:*")
            logger.warning(f"Cleared ALL embeddings ({deleted_count} deleted)")
            return deleted_count
        except Exception as e:
            logger.error(f"Full cache clear failed: {e}")
            return 0

    @staticmethod
    def get_cache_stats():
        """Get statistics about semantic cache."""
        try:
            CourseEmbedding = apps.get_model("ai_engine", "CourseEmbedding")
            total = CourseEmbedding.objects.count()

            # Count by content type
            from django.db.models import Count

            by_type = (
                CourseEmbedding.objects.values(
                    "content_type__app_label", "content_type__model"
                )
                .annotate(count=Count("id"))
                .order_by("-count")
            )

            return {
                "total_embeddings": total,
                "by_content_type": list(by_type),
            }
        except Exception as e:
            logger.error(f"Failed to get cache stats: {e}")
            return {"error": str(e)}

    @staticmethod
    def rebuild_embeddings_for_model(app_label: str, model_name: str):
        """Rebuild embeddings for all instances of a model."""
        try:
            model = apps.get_model(app_label, model_name)
            if not model:
                return 0

            from apps.ai_engine.vector_service import VectorService

            count = 0
            for instance in model.objects.all():
                text = SemanticCacheManager._get_text_for_instance(instance)
                if text:
                    VectorService.store_content_embedding(instance, text)
                    count += 1

            logger.info(f"Rebuilt {count} embeddings for {app_label}.{model_name}")
            return count
        except Exception as e:
            logger.error(f"Embedding rebuild failed: {e}")
            return 0

    @staticmethod
    def _get_text_for_instance(instance):
        """Extract text content from various model types for embedding."""
        model_name = instance.__class__.__name__

        if model_name == "Course":
            return f"{instance.title}. {instance.description}. {instance.short_description}"
        elif model_name == "Module":
            return f"{instance.title}. {instance.description}"
        elif model_name == "Lesson":
            return f"{instance.title}. {instance.text_content}"
        elif model_name == "Problem":
            return f"{instance.title}. {instance.description}"
        elif model_name == "Question":
            return f"{instance.text}. {instance.explanation}"
        elif model_name == "Ebook":
            return f"{instance.title}. {instance.description}"

        # Fallback: try common fields
        for field in ["title", "name", "text", "content", "description"]:
            if hasattr(instance, field):
                value = getattr(instance, field)
                if value:
                    return str(value)

        return None
