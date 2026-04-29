"""
Advanced Caching Configuration
Multi-layer caching with Redis for production
"""

from django.core.cache import cache
from functools import wraps
import hashlib
import json


# Cache timeouts in seconds
CACHE_TIMEOUTS = {
    'short': 60,      # 1 minute
    'medium': 300,    # 5 minutes
    'long': 3600,    # 1 hour
    'day': 86400,    # 24 hours
}


def generate_cache_key(prefix, *args, **kwargs):
    """Generate consistent cache key."""
    key_data = f"{prefix}:{str(args)}:{str(kwargs)}"
    return hashlib.md5(key_data.encode()).hexdigest()


def cache_result(timeout=CACHE_TIMEOUTS['medium'], key_prefix=None):
    """Decorator to cache function results."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            prefix = key_prefix or func.__name__
            cache_key = generate_cache_key(prefix, *args, **kwargs)
            
            # Try to get from cache
            cached = cache.get(cache_key)
            if cached is not None:
                return cached
            
            # Execute function
            result = func(*args, **kwargs)
            
            # Cache result
            cache.set(cache_key, result, timeout)
            
            return result
        return wrapper
    return decorator


def invalidate_cache_pattern(pattern):
    """Invalidate cache keys matching pattern."""
    # Implementation depends on cache backend
    pass


class CachedQuerySet:
    """Wrapper for QuerySet with built-in caching."""
    
    def __init__(self, queryset, cache_key, timeout=CACHE_TIMEOUTS['medium']):
        self.queryset = queryset
        self.cache_key = cache_key
        self.timeout = timeout
    
    def __iter__(self):
        # Try cache first
        cached = cache.get(self.cache_key)
        if cached is not None:
            return iter(cached)
        
        # Execute query and cache
        result = list(self.queryset)
        cache.set(self.cache_key, result, self.timeout)
        return iter(result)
