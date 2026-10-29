"""
Semantic Cache & Vector Embedding Invalidation Engine.

Ensures real-time cache consistency across L1 (Memory), L2 (Redis), and L3 (PostgreSQL SemanticCache)
layers whenever Courses, Modules, or Lessons are created, modified, or deleted.
"""

import logging
from typing import Optional, List
from django.db import transaction
from django.db.models.signals import post_save, post_delete
from django.core.cache import cache
from django.contrib.contenttypes.models import ContentType

logger = logging.getLogger(__name__)


def _run_on_commit(fn):
    """Execute callable after the current database transaction commits, or immediately if none."""
    try:
        transaction.on_commit(fn)
    except Exception:
        fn()


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
                CourseEmbedding.objects.filter(content_type=ct, object_id=course_id).delete()
            except Exception as err:
                logger.warning(f"Error purging CourseEmbedding for course {course_id}: {err}")

        logger.info(
            f"Semantic cache invalidated for course {course_id} "
            f"(deleted {deleted_count} semantic cache records, is_deletion={is_deletion})"
        )
    except Exception as e:
        logger.error(f"Error invalidating semantic cache for course {course_id}: {e}", exc_info=True)

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
            cache_keys.extend([
                f"course_modules:{course_id}",
                f"course_summary:{course_id}",
                f"course_embedding:{course_id}",
            ])

        for key in cache_keys:
            try:
                cache.delete(key)
            except Exception as e:
                logger.debug(f"Failed deleting cache key {key}: {e}")

        from apps.ai_engine.models import SemanticCache, CourseEmbedding
        
        if lesson_title and len(lesson_title.strip()) > 3:
            matching = SemanticCache.objects.filter(query_text__icontains=lesson_title.strip())
            count, _ = matching.delete()
            deleted_count += count

        if is_deletion:
            try:
                from apps.courses.models import Lesson
                ct = ContentType.objects.get_for_model(Lesson)
                CourseEmbedding.objects.filter(content_type=ct, object_id=lesson_id).delete()
            except Exception as err:
                logger.warning(f"Error purging CourseEmbedding for lesson {lesson_id}: {err}")

        logger.info(
            f"Semantic cache invalidated for lesson {lesson_id} (deleted {deleted_count} records)"
        )
    except Exception as e:
        logger.error(f"Error invalidating semantic cache for lesson {lesson_id}: {e}", exc_info=True)

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
        logger.error(f"Error invalidating cache for module {module_id}: {e}", exc_info=True)


# ============================================================================
# DJANGO SIGNAL HANDLERS
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


def register_cache_invalidation_signals():
    """Connect signal listeners to Course, Module, and Lesson models."""
    try:
        from apps.courses.models import Course, Module, Lesson

        post_save.connect(on_course_saved, sender=Course, dispatch_uid="ai_cache_course_save")
        post_delete.connect(on_course_deleted, sender=Course, dispatch_uid="ai_cache_course_delete")

        post_save.connect(on_module_saved, sender=Module, dispatch_uid="ai_cache_module_save")
        post_delete.connect(on_module_deleted, sender=Module, dispatch_uid="ai_cache_module_delete")

        post_save.connect(on_lesson_saved, sender=Lesson, dispatch_uid="ai_cache_lesson_save")
        post_delete.connect(on_lesson_deleted, sender=Lesson, dispatch_uid="ai_cache_lesson_delete")

        logger.info("Semantic cache invalidation signals registered successfully.")
    except Exception as e:
        logger.warning(f"Could not register semantic cache invalidation signals: {e}")
