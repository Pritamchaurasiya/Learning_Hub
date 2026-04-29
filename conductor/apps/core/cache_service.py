"""
Advanced Caching Service for Learning Hub.

This module provides enterprise-grade caching:
1. Multi-layer caching (L1: Local, L2: Redis)
2. Cache stampede prevention
3. Cache warming strategies
4. TTL management with jitter
5. Cache statistics and monitoring
"""

import hashlib
import json
import random
import logging
import threading
from typing import Any, Callable, Optional, Dict, List, TypeVar
from functools import wraps
from datetime import timedelta

from django.core.cache import cache, caches
from django.utils import timezone
from django.conf import settings

logger = logging.getLogger(__name__)

T = TypeVar('T')


class CacheConfig:
    """Configuration for cache behavior."""
    
    def __init__(
        self,
        ttl: int = 300,  # 5 minutes default
        jitter: float = 0.1,  # 10% TTL jitter
        stale_ttl: int = 60,  # Serve stale for 1 min while refreshing
        lock_timeout: int = 30,  # Lock during refresh
        prefix: str = ""
    ):
        self.ttl = ttl
        self.jitter = jitter
        self.stale_ttl = stale_ttl
        self.lock_timeout = lock_timeout
        self.prefix = prefix
    
    def get_ttl_with_jitter(self) -> int:
        """Get TTL with random jitter to prevent cache stampede."""
        jitter_range = int(self.ttl * self.jitter)
        jitter = random.randint(-jitter_range, jitter_range)
        return max(1, self.ttl + jitter)


class CacheService:
    """
    Advanced caching service with stampede prevention and monitoring.
    
    Features:
    - TTL jitter to prevent thundering herd
    - Lock-based refresh to prevent stampede
    - Stale-while-revalidate support
    - Cache statistics
    """
    
    # Local memory cache for hot data (L1)
    _local_cache: Dict[str, Dict[str, Any]] = {}
    _local_cache_lock = threading.Lock()
    LOCAL_CACHE_SIZE = 1000
    LOCAL_CACHE_TTL = 60  # 1 minute for local cache
    
    # Statistics
    _stats = {
        'hits': 0,
        'misses': 0,
        'l1_hits': 0,
        'l2_hits': 0,
        'sets': 0,
        'refreshes': 0
    }
    
    @classmethod
    def get(
        cls,
        key: str,
        default: Any = None,
        use_local: bool = True
    ) -> Any:
        """
        Get value from cache with multi-layer support.
        
        Args:
            key: Cache key
            default: Default value if not found
            use_local: Whether to check local cache first
            
        Returns:
            Cached value or default
        """
        # L1: Check local cache first
        if use_local:
            local_value = cls._get_local(key)
            if local_value is not None:
                cls._stats['hits'] += 1
                cls._stats['l1_hits'] += 1
                return local_value
        
        # L2: Check Redis/Django cache
        try:
            value = cache.get(key)
            if value is not None:
                cls._stats['hits'] += 1
                cls._stats['l2_hits'] += 1
                
                # Promote to L1 cache
                if use_local:
                    cls._set_local(key, value)
                
                return value
        except Exception as e:
            logger.warning(f"Cache get error for key {key}: {e}")
        
        cls._stats['misses'] += 1
        return default
    
    @classmethod
    def set(
        cls,
        key: str,
        value: Any,
        ttl: int = 300,
        use_local: bool = True
    ):
        """
        Set value in cache.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds
            use_local: Whether to also cache locally
        """
        try:
            cache.set(key, value, timeout=ttl)
            cls._stats['sets'] += 1
            
            if use_local:
                cls._set_local(key, value)
        except Exception as e:
            logger.warning(f"Cache set error for key {key}: {e}")
    
    @classmethod
    def delete(cls, key: str):
        """Delete key from all cache layers."""
        try:
            cache.delete(key)
            cls._delete_local(key)
        except Exception as e:
            logger.warning(f"Cache delete error for key {key}: {e}")
    
    @classmethod
    def delete_pattern(cls, pattern: str):
        """
        Delete all keys matching pattern.
        
        Note: This only works with Redis backend.
        """
        try:
            # Try to use Redis-specific pattern deletion
            redis_cache = caches.get('default', None)
            if hasattr(redis_cache, 'delete_pattern'):
                redis_cache.delete_pattern(pattern)
        except Exception as e:
            logger.warning(f"Pattern delete error for {pattern}: {e}")
    
    @classmethod
    def get_or_set(
        cls,
        key: str,
        default_factory: Callable[[], T],
        config: CacheConfig = None
    ) -> T:
        """
        Get value from cache or compute and cache it.
        
        Implements lock-based stampede prevention.
        
        Args:
            key: Cache key
            default_factory: Function to compute value if not cached
            config: Cache configuration
            
        Returns:
            Cached or computed value
        """
        if config is None:
            config = CacheConfig()
        
        full_key = f"{config.prefix}{key}" if config.prefix else key
        
        # Try to get from cache
        value = cls.get(full_key)
        if value is not None:
            return value
        
        # Acquire lock to prevent stampede
        lock_key = f"lock:{full_key}"
        acquired = cls._acquire_lock(lock_key, config.lock_timeout)
        
        if acquired:
            try:
                # Double-check after acquiring lock
                value = cls.get(full_key)
                if value is not None:
                    return value
                
                # Compute value
                value = default_factory()
                
                # Cache with jittered TTL
                ttl = config.get_ttl_with_jitter()
                cls.set(full_key, value, ttl=ttl)
                cls._stats['refreshes'] += 1
                
                return value
            finally:
                cls._release_lock(lock_key)
        else:
            # Another process is refreshing, wait and retry
            import time
            time.sleep(0.1)
            return cls.get(full_key) or default_factory()
    
    @classmethod
    def invalidate_tags(cls, tags: List[str]):
        """
        Invalidate all cache entries with given tags.
        
        This requires tracking tags separately.
        """
        for tag in tags:
            tag_key = f"cache_tag:{tag}"
            keys = cache.get(tag_key, [])
            for key in keys:
                cls.delete(key)
            cache.delete(tag_key)
    
    @classmethod
    def get_stats(cls) -> Dict[str, Any]:
        """Get cache statistics."""
        total = cls._stats['hits'] + cls._stats['misses']
        hit_rate = (cls._stats['hits'] / total * 100) if total > 0 else 0
        
        return {
            'hits': cls._stats['hits'],
            'misses': cls._stats['misses'],
            'l1_hits': cls._stats['l1_hits'],
            'l2_hits': cls._stats['l2_hits'],
            'sets': cls._stats['sets'],
            'refreshes': cls._stats['refreshes'],
            'hit_rate_percent': round(hit_rate, 2),
            'l1_cache_size': len(cls._local_cache)
        }
    
    @classmethod
    def clear_stats(cls):
        """Reset statistics."""
        for key in cls._stats:
            cls._stats[key] = 0
    
    # =========================================================================
    # PRIVATE METHODS
    # =========================================================================
    
    @classmethod
    def _get_local(cls, key: str) -> Optional[Any]:
        """Get from local memory cache."""
        with cls._local_cache_lock:
            entry = cls._local_cache.get(key)
            if entry:
                if timezone.now().timestamp() < entry['expires']:
                    return entry['value']
                else:
                    del cls._local_cache[key]
        return None
    
    @classmethod
    def _set_local(cls, key: str, value: Any):
        """Set in local memory cache."""
        with cls._local_cache_lock:
            # Evict if cache is full
            if len(cls._local_cache) >= cls.LOCAL_CACHE_SIZE:
                # Remove oldest entry
                oldest_key = next(iter(cls._local_cache))
                del cls._local_cache[oldest_key]
            
            cls._local_cache[key] = {
                'value': value,
                'expires': timezone.now().timestamp() + cls.LOCAL_CACHE_TTL
            }
    
    @classmethod
    def _delete_local(cls, key: str):
        """Delete from local memory cache."""
        with cls._local_cache_lock:
            cls._local_cache.pop(key, None)
    
    @classmethod
    def _acquire_lock(cls, key: str, timeout: int) -> bool:
        """Acquire distributed lock."""
        return cache.add(key, "1", timeout=timeout)
    
    @classmethod
    def _release_lock(cls, key: str):
        """Release distributed lock."""
        cache.delete(key)


# =============================================================================
# DECORATORS
# =============================================================================

def cached(
    key: str = None,
    ttl: int = 300,
    key_builder: Callable[..., str] = None,
    condition: Callable[..., bool] = None
):
    """
    Decorator to cache function results.
    
    Usage:
        @cached(ttl=3600)
        def get_user_profile(user_id):
            ...
        
        @cached(key_builder=lambda user_id: f"user:{user_id}")
        def get_user(user_id):
            ...
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Check condition
            if condition and not condition(*args, **kwargs):
                return func(*args, **kwargs)
            
            # Build cache key
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            elif key:
                cache_key = key
            else:
                # Auto-generate key from function name and arguments
                key_parts = [func.__module__, func.__name__]
                key_parts.extend(str(arg) for arg in args)
                key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
                key_str = ":".join(key_parts)
                cache_key = hashlib.md5(key_str.encode()).hexdigest()
            
            # Get or compute
            config = CacheConfig(ttl=ttl)
            return CacheService.get_or_set(cache_key, lambda: func(*args, **kwargs), config)
        
        # Add cache control methods
        wrapper.cache_clear = lambda k=None: CacheService.delete(k or cache_key)
        
        return wrapper
    return decorator


def cache_method(ttl: int = 300, key_prefix: str = None):
    """
    Decorator to cache instance method results.
    
    Uses object ID in cache key for instance isolation.
    
    Usage:
        class UserService:
            @cache_method(ttl=600)
            def get_profile(self, user_id):
                ...
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            # Build cache key with instance reference
            prefix = key_prefix or f"{self.__class__.__name__}.{func.__name__}"
            key_parts = [prefix, str(id(self))]
            key_parts.extend(str(arg) for arg in args)
            key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
            cache_key = ":".join(key_parts)
            
            config = CacheConfig(ttl=ttl)
            return CacheService.get_or_set(cache_key, lambda: func(self, *args, **kwargs), config)
        
        return wrapper
    return decorator


# =============================================================================
# CACHE WARMING
# =============================================================================

class CacheWarmer:
    """
    Utility for pre-populating cache with frequently accessed data.
    
    Usage:
        warmer = CacheWarmer()
        warmer.register('courses', warm_courses, ttl=3600)
        warmer.register('categories', warm_categories, ttl=7200)
        warmer.warm_all()  # Call on app startup or via celery
    """
    
    def __init__(self):
        self._warmers: Dict[str, Dict[str, Any]] = {}
    
    def register(self, name: str, factory: Callable, ttl: int = 300):
        """Register a cache warmer."""
        self._warmers[name] = {'factory': factory, 'ttl': ttl}
    
    def warm(self, name: str):
        """Warm a specific cache."""
        if name not in self._warmers:
            logger.warning(f"Unknown cache warmer: {name}")
            return
        
        config = self._warmers[name]
        try:
            data = config['factory']()
            CacheService.set(f"warm:{name}", data, ttl=config['ttl'])
            logger.info(f"Cache warmed: {name}")
        except Exception as e:
            logger.error(f"Failed to warm cache {name}: {e}")
    
    def warm_all(self):
        """Warm all registered caches."""
        for name in self._warmers:
            self.warm(name)


# Global warmer instance
cache_warmer = CacheWarmer()


# =============================================================================
# QUERY CACHING
# =============================================================================

def cache_queryset(
    key: str,
    ttl: int = 300,
    serializer: Callable = None
):
    """
    Cache Django QuerySet results.
    
    Usage:
        @cache_queryset('active_courses', ttl=600)
        def get_active_courses():
            return Course.objects.filter(is_active=True)
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Check cache
            cached_data = CacheService.get(key)
            if cached_data is not None:
                return cached_data
            
            # Execute query
            queryset = func(*args, **kwargs)
            
            # Serialize for caching
            if serializer:
                data = serializer(queryset)
            else:
                data = list(queryset)
            
            # Cache
            CacheService.set(key, data, ttl=ttl)
            
            return data
        
        wrapper.invalidate = lambda: CacheService.delete(key)
        return wrapper
    
    return decorator
