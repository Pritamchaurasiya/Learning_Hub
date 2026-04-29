"""
Caching utilities for LearningHub API endpoints.
Provides decorators and helper functions for Redis-based caching.
"""

import hashlib
import json
from functools import wraps
from typing import Any, Callable, Optional

from django.core.cache import cache
from django.conf import settings


def generate_cache_key(prefix: str, *args, **kwargs) -> str:
    """Generate a cache key from prefix and arguments."""
    key_parts = [prefix]
    
    # Add args
    if args:
        args_str = json.dumps(args, sort_keys=True, default=str)
        key_parts.append(hashlib.md5(args_str.encode()).hexdigest()[:12])
    
    # Add kwargs
    if kwargs:
        kwargs_str = json.dumps(kwargs, sort_keys=True, default=str)
        key_parts.append(hashlib.md5(kwargs_str.encode()).hexdigest()[:12])
    
    return ":".join(key_parts)


def cached_view(timeout: int = 300, key_prefix: Optional[str] = None):
    """
    Decorator to cache API view responses.
    
    Args:
        timeout: Cache timeout in seconds (default: 5 minutes)
        key_prefix: Custom cache key prefix (default: view function name)
    """
    def decorator(func: Callable) -> Callable:
        prefix = key_prefix or func.__name__
        
        @wraps(func)
        def wrapper(view_instance, request, *args, **kwargs):
            # Generate cache key
            user_id = request.user.id if request.user.is_authenticated else "anon"
            cache_key = generate_cache_key(
                f"api:{prefix}",
                user_id,
                request.query_params.dict() if hasattr(request, 'query_params') else {},
                args,
                kwargs
            )
            
            # Try to get from cache
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                return cached_data
            
            # Execute view and cache result
            result = func(view_instance, request, *args, **kwargs)
            cache.set(cache_key, result, timeout)
            
            return result
        
        return wrapper
    return decorator


def invalidate_cache_pattern(pattern: str):
    """Invalidate all cache keys matching a pattern."""
    if hasattr(cache, 'delete_pattern'):
        # django-redis supports pattern deletion
        cache.delete_pattern(pattern)
    else:
        # Fallback: iterate through keys (not efficient for large caches)
        # This is a simplified version - production should use redis-py directly
        pass


def clear_model_cache(model_name: str):
    """Clear all cache entries related to a model."""
    invalidate_cache_pattern(f"api:*{model_name.lower()}*")


# Cache timeout constants
CACHE_TIMES = {
    'SHORT': 60,        # 1 minute
    'MEDIUM': 300,      # 5 minutes
    'LONG': 900,        # 15 minutes
    'VERY_LONG': 3600,  # 1 hour
    'DAILY': 86400,     # 24 hours
}


class CacheTags:
    """Cache tags for easy invalidation."""
    COURSES = "courses"
    USERS = "users"
    QUIZZES = "quizzes"
    DASHBOARD = "dashboard"
    SEARCH = "search"
    CATEGORIES = "categories"


def cache_with_tags(timeout: int, tags: list):
    """
    Cache decorator that also stores cache metadata for tag-based invalidation.
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = generate_cache_key(func.__name__, *args, **kwargs)
            
            # Check cache
            cached = cache.get(cache_key)
            if cached is not None:
                return cached
            
            # Execute and cache
            result = func(*args, **kwargs)
            cache.set(cache_key, result, timeout)
            
            # Store tag metadata
            tag_key = f"_tags:{cache_key}"
            cache.set(tag_key, tags, timeout)
            
            return result
        return wrapper
    return decorator


def invalidate_by_tag(tag: str):
    """Invalidate all cache entries with a specific tag."""
    # This is a simplified version
    # In production, maintain a reverse index of tag -> cache_keys
    pass


# Response caching for specific patterns
def cache_response(timeout: int = CACHE_TIMES['MEDIUM']):
    """
    Simple response cache decorator for API views.
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(self, request, *args, **kwargs):
            # Build cache key
            cache_key_parts = [func.__name__]
            
            if request.user.is_authenticated:
                cache_key_parts.append(f"user_{request.user.id}")
            else:
                cache_key_parts.append("anon")
            
            # Add query params if present
            if hasattr(request, 'query_params') and request.query_params:
                params = sorted(request.query_params.items())
                cache_key_parts.append(str(params))
            
            cache_key = ":".join(cache_key_parts)
            cache_key = hashlib.md5(cache_key.encode()).hexdigest()[:32]
            cache_key = f"cache:{cache_key}"
            
            # Try cache
            cached_response = cache.get(cache_key)
            if cached_response is not None:
                return cached_response
            
            # Get fresh response
            response = func(self, request, *args, **kwargs)
            
            # Only cache successful responses
            if hasattr(response, 'status_code') and response.status_code == 200:
                cache.set(cache_key, response, timeout)
            
            return response
        
        return wrapper
    return decorator


# Utility function for manual cache operations
def get_cache_or_compute(key: str, compute_func: Callable, timeout: int = 300) -> Any:
    """Get value from cache or compute and store."""
    value = cache.get(key)
    if value is None:
        value = compute_func()
        cache.set(key, value, timeout)
    return value


def clear_user_cache(user_id: int):
    """Clear all cache entries for a specific user."""
    invalidate_cache_pattern(f"*user_{user_id}*")


def clear_course_cache(course_id: str):
    """Clear all cache entries for a specific course."""
    invalidate_cache_pattern(f"*course_{course_id}*")
