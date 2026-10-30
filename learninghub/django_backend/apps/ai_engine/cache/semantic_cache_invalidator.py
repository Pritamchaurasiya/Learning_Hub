"""
Semantic Cache Invalidation Signals

Automatically invalidates semantic cache entries when related content is updated.
Uses Django signals to detect content changes and clear relevant cache entries.
"""

import logging
from typing import List
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.conf import settings

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    redis = None

logger = logging.getLogger(__name__)

# Cache key patterns
SEMANTIC_CACHE_PREFIX = "semantic_cache:"
COURSE_CONTENT_PREFIX = "course_content:"
PROBLEM_CONTENT_PREFIX = "problem_content:"
TEST_CONTENT_PREFIX = "test_content:"


class SemanticCacheInvalidator:
    """
    Handles invalidation of semantic cache when content changes.

    Uses Redis SCAN to find and delete keys matching patterns.
    """

    def __init__(self):
        self.redis_url = getattr(settings, 'REDIS_URL', 'redis://localhost:6379/0')
        if REDIS_AVAILABLE:
            try:
                self.redis = redis.from_url(
                    self.redis_url,
                    decode_responses=True,
                    max_connections=10,
                )
                self.redis.ping()
                self._available = True
            except Exception as e:
                logger.warning(f"Redis not available for cache invalidation: {e}")
                self._available = False
        else:
            self._available = False

    def invalidate_by_pattern(self, pattern: str) -> int:
        """Invalidate all cache keys matching pattern."""
        if not self._available:
            return 0

        try:
            count = 0
            cursor = 0
            while True:
                cursor, keys = self.redis.scan(cursor, match=pattern, count=100)
                if keys:
                    self.redis.delete(*keys)
                    count += len(keys)
                if cursor == 0:
                    break
            return count
        except Exception as e:
            logger.error(f"Failed to invalidate cache pattern {pattern}: {e}")
            return 0

    def invalidate_course_cache(self, course_id: str) -> int:
        """Invalidate all cache related to a course."""
        patterns = [
            f"{SEMANTIC_CACHE_PREFIX}*course*{course_id}*",
            f"{COURSE_CONTENT_PREFIX}{course_id}*",
            f"{SEMANTIC_CACHE_PREFIX}*crs-{course_id}*",
        ]
        total = 0
        for pattern in patterns:
            total += self.invalidate_by_pattern(pattern)
        return total

    def invalidate_problem_cache(self, problem_id: str) -> int:
        """Invalidate all cache related to a problem."""
        patterns = [
            f"{SEMANTIC_CACHE_PREFIX}*problem*{problem_id}*",
            f"{PROBLEM_CONTENT_PREFIX}{problem_id}*",
            f"{SEMANTIC_CACHE_PREFIX}*prob-{problem_id}*",
        ]
        total = 0
        for pattern in patterns:
            total += self.invalidate_by_pattern(pattern)
        return total

    def invalidate_test_cache(self, test_id: str) -> int:
        """Invalidate all cache related to a test."""
        patterns = [
            f"{SEMANTIC_CACHE_PREFIX}*test*{test_id}*",
            f"{TEST_CONTENT_PREFIX}{test_id}*",
            f"{SEMANTIC_CACHE_PREFIX}*test-{test_id}*",
        ]
        total = 0
        for pattern in patterns:
            total += self.invalidate_by_pattern(pattern)
        return total

    def invalidate_user_cache(self, user_id: str) -> int:
        """Invalidate all cache related to a user."""
        pattern = f"{SEMANTIC_CACHE_PREFIX}*user*{user_id}*"
        return self.invalidate_by_pattern(pattern)

    def invalidate_all(self) -> int:
        """Invalidate all semantic cache entries (use with caution)."""
        return self.invalidate_by_pattern(f"{SEMANTIC_CACHE_PREFIX}*")


# Global instance
_cache_invalidator = None


def get_cache_invalidator() -> SemanticCacheInvalidator:
    """Get or create the global cache invalidator instance."""
    global _cache_invalidator
    if _cache_invalidator is None:
        _cache_invalidator = SemanticCacheInvalidator()
    return _cache_invalidator


# =========================================================================
# DJANGO SIGNALS - Auto-invalidation on model changes
# =========================================================================

@receiver(post_save, sender='courses.Course')
@receiver(post_delete, sender='courses.Course')
def invalidate_course_cache(sender, instance, **kwargs):
    """Invalidate cache when course is created/updated/deleted."""
    invalidator = get_cache_invalidator()
    count = invalidator.invalidate_course_cache(instance.id)
    if count > 0:
        logger.info(f"Invalidated {count} cache entries for course {instance.id}")


@receiver(post_save, sender='courses.Chapter')
@receiver(post_delete, sender='courses.Chapter')
def invalidate_chapter_cache(sender, instance, **kwargs):
    """Invalidate cache when chapter is created/updated/deleted."""
    invalidator = get_cache_invalidator()
    count = invalidator.invalidate_course_cache(instance.course_id)
    if count > 0:
        logger.info(f"Invalidated {count} cache entries for course {instance.course_id} (chapter change)")


@receiver(post_save, sender='courses.Lesson')
@receiver(post_delete, sender='courses.Lesson')
def invalidate_lesson_cache(sender, instance, **kwargs):
    """Invalidate cache when lesson is created/updated/deleted."""
    invalidator = get_cache_invalidator()
    count = invalidator.invalidate_course_cache(instance.chapter.course_id)
    if count > 0:
        logger.info(f"Invalidated {count} cache entries for course {instance.chapter.course_id} (lesson change)")


@receiver(post_save, sender='problems.Problem')
@receiver(post_delete, sender='problems.Problem')
def invalidate_problem_cache(sender, instance, **kwargs):
    """Invalidate cache when problem is created/updated/deleted."""
    invalidator = get_cache_invalidator()
    count = invalidator.invalidate_problem_cache(instance.id)
    if count > 0:
        logger.info(f"Invalidated {count} cache entries for problem {instance.id}")


@receiver(post_save, sender='tests_engine.Test')
@receiver(post_delete, sender='tests_engine.Test')
def invalidate_test_cache(sender, instance, **kwargs):
    """Invalidate cache when test is created/updated/deleted."""
    invalidator = get_cache_invalidator()
    count = invalidator.invalidate_test_cache(instance.id)
    if count > 0:
        logger.info(f"Invalidated {count} cache entries for test {instance.id}")


@receiver(post_save, sender='tests_engine.Question')
@receiver(post_delete, sender='tests_engine.Question')
def invalidate_question_cache(sender, instance, **kwargs):
    """Invalidate cache when question is created/updated/deleted."""
    invalidator = get_cache_invalidator()
    count = invalidator.invalidate_test_cache(instance.test_id)
    if count > 0:
        logger.info(f"Invalidated {count} cache entries for test {instance.test_id} (question change)")


@receiver(post_save, sender='tests_engine.TestSection')
@receiver(post_delete, sender='tests_engine.TestSection')
def invalidate_test_section_cache(sender, instance, **kwargs):
    """Invalidate cache when test section is created/updated/deleted."""
    invalidator = get_cache_invalidator()
    count = invalidator.invalidate_test_cache(instance.test_id)
    if count > 0:
        logger.info(f"Invalidated {count} cache entries for test {instance.test_id} (section change)")


# Ebook content invalidation
@receiver(post_save, sender='ebooks.Ebook')
@receiver(post_delete, sender='ebooks.Ebook')
def invalidate_ebook_cache(sender, instance, **kwargs):
    """Invalidate cache when ebook is created/updated/deleted."""
    invalidator = get_cache_invalidator()
    pattern = f"{SEMANTIC_CACHE_PREFIX}*ebook*{instance.id}*"
    count = invalidator.invalidate_by_pattern(pattern)
    if count > 0:
        logger.info(f"Invalidated {count} cache entries for ebook {instance.id}")


@receiver(post_save, sender='ebooks.Chapter')
@receiver(post_delete, sender='ebooks.Chapter')
def invalidate_ebook_chapter_cache(sender, instance, **kwargs):
    """Invalidate cache when ebook chapter is created/updated/deleted."""
    invalidator = get_cache_invalidator()
    pattern = f"{SEMANTIC_CACHE_PREFIX}*ebook*{instance.ebook_id}*"
    count = invalidator.invalidate_by_pattern(pattern)
    if count > 0:
        logger.info(f"Invalidated {count} cache entries for ebook {instance.ebook_id} (chapter change)")


# User-related cache invalidation
@receiver(post_save, sender='users.User')
def invalidate_user_cache(sender, instance, **kwargs):
    """Invalidate user-specific cache on profile update."""
    invalidator = get_cache_invalidator()
    count = invalidator.invalidate_user_cache(instance.id)
    if count > 0:
        logger.info(f"Invalidated {count} cache entries for user {instance.id}")


# =========================================================================
# CACHE KEY GENERATION UTILITIES
# =========================================================================

def generate_semantic_cache_key(query: str, context: dict = None) -> str:
    """Generate a consistent cache key for semantic queries."""
    import hashlib
    import json

    # Normalize query
    normalized_query = query.strip().lower()

    # Include relevant context
    context_str = ""
    if context:
        # Sort keys for consistency
        context_items = sorted(context.items())
        context_str = json.dumps(context_items, sort_keys=True)

    # Create hash
    content = f"{normalized_query}:{context_str}"
    key_hash = hashlib.sha256(content.encode()).hexdigest()[:32]

    return f"{SEMANTIC_CACHE_PREFIX}{key_hash}"


def get_cached_semantic_response(query: str, context: dict = None):
    """Retrieve cached semantic response if available."""
    from django.core.cache import cache

    key = generate_semantic_cache_key(query, context)
    return cache.get(key)


def set_cached_semantic_response(query: str, response: dict, context: dict = None, timeout: int = 3600):
    """Cache semantic response."""
    from django.core.cache import cache

    key = generate_semantic_cache_key(query, context)
    cache.set(key, response, timeout=timeout)


# =========================================================================
# ADMIN UTILITIES
# =========================================================================

def get_cache_stats() -> dict:
    """Get semantic cache statistics."""
    invalidator = get_cache_invalidator()
    if not invalidator._available:
        return {"status": "unavailable", "message": "Redis not connected"}

    try:
        info = invalidator.redis.info("memory")
        stats = {
            "status": "connected",
            "memory_used": info.get("used_memory_human", "unknown"),
            "connected_clients": info.get("connected_clients", 0),
        }

        # Count semantic cache keys
        cursor = 0
        total_keys = 0
        while True:
            cursor, keys = invalidator.redis.scan(cursor, match=f"{SEMANTIC_CACHE_PREFIX}*", count=1000)
            total_keys += len(keys)
            if cursor == 0:
                break

        stats["semantic_cache_entries"] = total_keys
        return stats
    except Exception as e:
        return {"status": "error", "message": str(e)}


def manual_invalidate_course(course_id: str) -> dict:
    """Manually invalidate cache for a specific course (admin utility)."""
    invalidator = get_cache_invalidator()
    count = invalidator.invalidate_course_cache(course_id)
    return {"invalidated": count, "course_id": course_id}


def manual_invalidate_problem(problem_id: str) -> dict:
    """Manually invalidate cache for a specific problem (admin utility)."""
    invalidator = get_cache_invalidator()
    count = invalidator.invalidate_problem_cache(problem_id)
    return {"invalidated": count, "problem_id": problem_id}


def manual_invalidate_test(test_id: str) -> dict:
    """Manually invalidate cache for a specific test (admin utility)."""
    invalidator = get_cache_invalidator()
    count = invalidator.invalidate_test_cache(test_id)
    return {"invalidated": count, "test_id": test_id}