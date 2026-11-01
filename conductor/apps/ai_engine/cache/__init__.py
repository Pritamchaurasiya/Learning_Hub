"""
AI Engine Cache & Invalidation Subsystem.
"""

from apps.ai_engine.cache.semantic_cache_invalidator import (
    invalidate_semantic_cache_for_course,
    invalidate_semantic_cache_for_lesson,
    invalidate_semantic_cache_for_module,
    register_cache_invalidation_signals,
)

__all__ = [
    "invalidate_semantic_cache_for_course",
    "invalidate_semantic_cache_for_lesson",
    "invalidate_semantic_cache_for_module",
    "register_cache_invalidation_signals",
]
