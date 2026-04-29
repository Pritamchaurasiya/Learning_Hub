"""
Signal handlers for cache invalidation and other async operations.
"""

from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.core.cache import cache
import logging

from apps.core.signals import user_enrolled, cache_invalidated, cache_bookmarks_changed
from apps.core.cache import clear_user_cache, clear_course_cache

logger = logging.getLogger(__name__)


def _safe_delete_pattern(pattern):
    """Safely call cache.delete_pattern if available (Redis only)."""
    if hasattr(cache, 'delete_pattern'):
        cache.delete_pattern(pattern)
    else:
        # LocMemCache and other backends don't support pattern deletion.
        # This is acceptable; pattern-based invalidation is a Redis optimisation.
        pass


@receiver(cache_invalidated)
def handle_cache_invalidation(sender, user_id=None, course_id=None, **kwargs):
    """Handle cache invalidation signals."""
    if user_id:
        clear_user_cache(user_id)
    if course_id:
        clear_course_cache(course_id)


@receiver(cache_bookmarks_changed)
def handle_bookmark_cache_clear(sender, **kwargs):
    """Clear dashboard cache when bookmarks change."""
    # Get user_id from kwargs if provided
    user_id = kwargs.get('user_id')
    if user_id:
        cache_key = f"dashboard:home:user_{user_id}"
        cache.delete(cache_key)


@receiver(post_save, sender='users.Bookmark')
def bookmark_saved_handler(sender, instance, created, **kwargs):
    """Clear user dashboard cache when bookmark is added/updated."""
    cache_key = f"dashboard:home:user_{instance.user_id}"
    cache.delete(cache_key)
    
    # Also clear bookmarks list cache
    _safe_delete_pattern(f"api:*bookmarks*user_{instance.user_id}*")


@receiver(post_delete, sender='users.Bookmark')
def bookmark_deleted_handler(sender, instance, **kwargs):
    """Clear user dashboard cache when bookmark is removed."""
    cache_key = f"dashboard:home:user_{instance.user_id}"
    cache.delete(cache_key)
    
    # Also clear bookmarks list cache
    _safe_delete_pattern(f"api:*bookmarks*user_{instance.user_id}*")


@receiver(post_save, sender='courses.Enrollment')
def enrollment_saved_handler(sender, instance, created, **kwargs):
    """Clear user dashboard cache when enrollment changes."""
    cache_key = f"dashboard:home:user_{instance.user_id}"
    cache.delete(cache_key)
    
    # Clear course cache
    clear_course_cache(str(instance.course_id))


@receiver(post_save, sender='courses.Course')
def course_saved_handler(sender, instance, created, **kwargs):
    """Clear featured courses cache when course is updated."""
    # Clear featured courses cache
    _safe_delete_pattern("api:*featured_courses*")
    _safe_delete_pattern("api:*courses*list*")
    
    # Clear specific course cache
    clear_course_cache(str(instance.id))


@receiver(post_save, sender='quiz.QuizAttempt')
def quiz_attempt_saved_handler(sender, instance, created, **kwargs):
    """Clear quiz stats cache when attempt is saved."""
    if created:
        # Clear user's quiz stats cache
        cache.delete(f"api:quiz_stats:user_{instance.user_id}")
        
        # Clear dashboard cache
        clear_user_cache(instance.user_id)


@receiver(user_enrolled)
def handle_user_enrolled(sender, user, course, enrollment, **kwargs):
    """Handle user enrollment signal."""
    # Clear relevant caches
    clear_user_cache(user.id)
    clear_course_cache(str(course.id))
