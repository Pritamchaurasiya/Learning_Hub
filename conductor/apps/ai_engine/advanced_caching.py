# Advanced Caching Strategies for ML Features
"""Multi-level caching with Redis, memory, and intelligent invalidation"""

import asyncio
import json
import logging
import time
import pickle
import hashlib
from typing import Dict, Any, List, Optional, Union, Callable
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta
from django.core.cache import cache
from django.conf import settings
from django.utils import timezone
import redis.asyncio as redis
from functools import wraps
import threading
from collections import OrderedDict
import weakref

logger = logging.getLogger(__name__)

class CacheLevel(Enum):
    L1_MEMORY = "l1_memory"
    L2_REDIS = "l2_redis"
    L3_DATABASE = "l3_database"

class CacheStrategy(Enum):
    WRITE_THROUGH = "write_through"
    WRITE_BEHIND = "write_behind"
    WRITE_AROUND = "write_around"
    CACHE_ASIDE = "cache_aside"

@dataclass
class CacheConfig:
    """Configuration for caching behavior."""
    ttl: int = 3600  # Default 1 hour
    max_size: int = 1000
    strategy: CacheStrategy = CacheStrategy.CACHE_ASIDE
    compression: bool = True
    serialization: str = "json"  # json, pickle, msgpack
    invalidation_strategy: str = "ttl"  # ttl, manual, event_driven
    refresh_ahead: bool = False
    refresh_ahead_ratio: float = 0.8  # Refresh when 80% of TTL expired

class L1MemoryCache:
    """L1 in-memory cache with LRU eviction."""
    
    def __init__(self, max_size: int = 1000):
        self.max_size = max_size
        self.cache = OrderedDict()
        self.hits = 0
        self.misses = 0
        self._lock = threading.RLock()
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from memory cache."""
        with self._lock:
            if key in self.cache:
                # Move to end (most recently used)
                value = self.cache.pop(key)
                self.cache[key] = value
                self.hits += 1
                return value
            else:
                self.misses += 1
                return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None):
        """Set value in memory cache."""
        with self._lock:
            # Remove oldest if at capacity
            if len(self.cache) >= self.max_size and key not in self.cache:
                self.cache.popitem(last=False)
            
            # Store with expiration time if TTL specified
            if ttl:
                expires_at = time.time() + ttl
                self.cache[key] = (value, expires_at)
            else:
                self.cache[key] = value
    
    def delete(self, key: str):
        """Delete key from memory cache."""
        with self._lock:
            self.cache.pop(key, None)
    
    def clear(self):
        """Clear all cache entries."""
        with self._lock:
            self.cache.clear()
            self.hits = 0
            self.misses = 0
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        total_requests = self.hits + self.misses
        hit_rate = self.hits / total_requests if total_requests > 0 else 0
        
        return {
            'hits': self.hits,
            'misses': self.misses,
            'hit_rate': hit_rate,
            'size': len(self.cache),
            'max_size': self.max_size
        }
    
    def cleanup_expired(self):
        """Remove expired entries."""
        with self._lock:
            expired_keys = []
            current_time = time.time()
            
            for key, value in self.cache.items():
                if isinstance(value, tuple) and len(value) == 2:
                    _, expires_at = value
                    if current_time > expires_at:
                        expired_keys.append(key)
            
            for key in expired_keys:
                del self.cache[key]

class AdvancedCacheManager:
    """
    Advanced multi-level cache manager for ML features.
    Implements intelligent caching strategies with Redis and memory.
    """
    
    def __init__(self):
        self.l1_cache = L1MemoryCache(max_size=1000)
        self.redis_client: Optional[redis.Redis] = None
        self.cache_configs: Dict[str, CacheConfig] = {}
        self.invalidation_callbacks: Dict[str, List[Callable]] = {}
        self.background_refresh_tasks: Dict[str, asyncio.Task] = {}
        self._initialize_redis()
        self._start_background_tasks()
    
    async def _initialize_redis(self):
        """Initialize Redis connection."""
        try:
            self.redis_client = redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=False,  # Keep binary data for pickle
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True
            )
            await self.redis_client.ping()
            logger.info("Advanced Cache Manager connected to Redis")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
    
    def _start_background_tasks(self):
        """Start background cache maintenance tasks."""
        # Start cleanup task
        cleanup_task = threading.Thread(target=self._background_cleanup, daemon=True)
        cleanup_task.start()
    
    def _background_cleanup(self):
        """Background task to clean up expired entries."""
        while True:
            try:
                self.l1_cache.cleanup_expired()
                time.sleep(60)  # Cleanup every minute
            except Exception as e:
                logger.error(f"Background cleanup error: {e}")
                time.sleep(60)
    
    def configure_cache(self, cache_key_pattern: str, config: CacheConfig):
        """Configure cache behavior for a key pattern."""
        self.cache_configs[cache_key_pattern] = config
    
    def get_config(self, key: str) -> CacheConfig:
        """Get cache configuration for a key."""
        # Find matching pattern
        for pattern, config in self.cache_configs.items():
            if pattern in key or key.startswith(pattern):
                return config
        
        # Default configuration
        return CacheConfig()
    
    async def get(self, key: str, default: Any = None) -> Any:
        """
        Get value from multi-level cache.
        L1 (memory) -> L2 (Redis) -> L3 (database/source)
        """
        config = self.get_config(key)
        
        try:
            # Level 1: Memory cache
            value = self.l1_cache.get(key)
            if value is not None:
                # Check if expired
                if isinstance(value, tuple) and len(value) == 2:
                    actual_value, expires_at = value
                    if time.time() < expires_at:
                        # Trigger refresh ahead if needed
                        if config.refresh_ahead:
                            await self._trigger_refresh_ahead(key, config)
                        return actual_value
                    else:
                        # Expired, remove from L1
                        self.l1_cache.delete(key)
                else:
                    # No expiration, return as is
                    return value
            
            # Level 2: Redis cache
            if self.redis_client:
                try:
                    redis_value = await self.redis_client.get(key)
                    if redis_value:
                        # Deserialize based on configuration
                        if config.serialization == "pickle":
                            value = pickle.loads(redis_value)
                        else:
                            value = json.loads(redis_value.decode('utf-8'))
                        
                        # Store in L1 cache
                        self.l1_cache.set(key, value, config.ttl)
                        
                        # Trigger refresh ahead if needed
                        if config.refresh_ahead:
                            await self._trigger_refresh_ahead(key, config)
                        
                        return value
                except Exception as e:
                    logger.error(f"Redis get error for key {key}: {e}")
            
            # Not found in cache
            return default
            
        except Exception as e:
            logger.error(f"Cache get error for key {key}: {e}")
            return default
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """
        Set value in multi-level cache.
        """
        config = self.get_config(key)
        effective_ttl = ttl or config.ttl
        
        try:
            # Level 1: Memory cache
            self.l1_cache.set(key, value, effective_ttl)
            
            # Level 2: Redis cache
            if self.redis_client:
                try:
                    # Serialize based on configuration
                    if config.serialization == "pickle":
                        serialized_value = pickle.dumps(value)
                    else:
                        serialized_value = json.dumps(value, default=str).encode('utf-8')
                    
                    await self.redis_client.setex(key, effective_ttl, serialized_value)
                    
                except Exception as e:
                    logger.error(f"Redis set error for key {key}: {e}")
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Cache set error for key {key}: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from all cache levels."""
        try:
            # Level 1: Memory cache
            self.l1_cache.delete(key)
            
            # Level 2: Redis cache
            if self.redis_client:
                try:
                    await self.redis_client.delete(key)
                except Exception as e:
                    logger.error(f"Redis delete error for key {key}: {e}")
                    return False
            
            # Trigger invalidation callbacks
            await self._trigger_invalidation_callbacks(key)
            
            return True
            
        except Exception as e:
            logger.error(f"Cache delete error for key {key}: {e}")
            return False
    
    async def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate cache entries matching pattern."""
        try:
            invalidated_count = 0
            
            # Level 1: Memory cache
            keys_to_delete = []
            for key in self.l1_cache.cache.keys():
                if pattern in key:
                    keys_to_delete.append(key)
            
            for key in keys_to_delete:
                self.l1_cache.delete(key)
                await self._trigger_invalidation_callbacks(key)
                invalidated_count += 1
            
            # Level 2: Redis cache
            if self.redis_client:
                try:
                    redis_keys = await self.redis_client.keys(f"*{pattern}*")
                    if redis_keys:
                        await self.redis_client.delete(*redis_keys)
                        invalidated_count += len(redis_keys)
                        
                        # Trigger callbacks for Redis keys
                        for redis_key in redis_keys:
                            key_str = redis_key.decode('utf-8') if isinstance(redis_key, bytes) else redis_key
                            await self._trigger_invalidation_callbacks(key_str)
                            
                except Exception as e:
                    logger.error(f"Redis pattern delete error: {e}")
            
            return invalidated_count
            
        except Exception as e:
            logger.error(f"Cache pattern invalidation error: {e}")
            return 0
    
    def add_invalidation_callback(self, pattern: str, callback: Callable):
        """Add callback for cache invalidation."""
        if pattern not in self.invalidation_callbacks:
            self.invalidation_callbacks[pattern] = []
        self.invalidation_callbacks[pattern].append(callback)
    
    async def _trigger_invalidation_callbacks(self, key: str):
        """Trigger invalidation callbacks for a key."""
        try:
            for pattern, callbacks in self.invalidation_callbacks.items():
                if pattern in key:
                    for callback in callbacks:
                        try:
                            if asyncio.iscoroutinefunction(callback):
                                await callback(key)
                            else:
                                callback(key)
                        except Exception as e:
                            logger.error(f"Invalidation callback error: {e}")
        except Exception as e:
            logger.error(f"Trigger invalidation callbacks error: {e}")
    
    async def _trigger_refresh_ahead(self, key: str, config: CacheConfig):
        """Trigger refresh ahead for cache entry."""
        if not config.refresh_ahead:
            return
        
        # Check if already refreshing
        refresh_key = f"refreshing:{key}"
        if self.redis_client:
            try:
                is_refreshing = await self.redis_client.get(refresh_key)
                if is_refreshing:
                    return  # Already refreshing
                
                # Set refresh flag
                await self.redis_client.setex(refresh_key, 300, "1")  # 5 minutes
                
                # Schedule background refresh
                if key not in self.background_refresh_tasks:
                    task = asyncio.create_task(self._background_refresh(key, config))
                    self.background_refresh_tasks[key] = task
                    
            except Exception as e:
                logger.error(f"Refresh ahead setup error: {e}")
    
    async def _background_refresh(self, key: str, config: CacheConfig):
        """Background task to refresh cache entry."""
        try:
            # Wait a bit to allow concurrent requests to proceed
            await asyncio.sleep(1)
            
            # Get fresh value from source (this would be implemented per use case)
            fresh_value = await self._refresh_value_from_source(key)
            
            if fresh_value is not None:
                # Update cache with fresh value
                await self.set(key, fresh_value, config.ttl)
                logger.info(f"Refreshed cache key: {key}")
            
        except Exception as e:
            logger.error(f"Background refresh error for key {key}: {e}")
        finally:
            # Clean up refresh flag and task
            refresh_key = f"refreshing:{key}"
            if self.redis_client:
                try:
                    await self.redis_client.delete(refresh_key)
                except Exception:
                    pass
            
            self.background_refresh_tasks.pop(key, None)
    
    async def _refresh_value_from_source(self, key: str) -> Any:
        """
        Refresh value from original source.
        This would be implemented based on the specific use case.
        """
        # This is a placeholder - actual implementation would depend on the data source
        return None
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get comprehensive cache statistics."""
        stats = {
            'l1_memory': self.l1_cache.get_stats(),
            'l2_redis': {},
            'total_keys': 0,
            'background_refreshes': len(self.background_refresh_tasks)
        }
        
        # Get Redis stats if available
        if self.redis_client:
            try:
                # Get Redis info
                info = self.redis_client.info()
                stats['l2_redis'] = {
                    'used_memory': info.get('used_memory', 0),
                    'used_memory_human': info.get('used_memory_human', '0B'),
                    'connected_clients': info.get('connected_clients', 0),
                    'total_commands_processed': info.get('total_commands_processed', 0),
                    'keyspace_hits': info.get('keyspace_hits', 0),
                    'keyspace_misses': info.get('keyspace_misses', 0)
                }
                
                # Calculate Redis hit rate
                redis_hits = stats['l2_redis']['keyspace_hits']
                redis_misses = stats['l2_redis']['keyspace_misses']
                redis_total = redis_hits + redis_misses
                stats['l2_redis']['hit_rate'] = redis_hits / redis_total if redis_total > 0 else 0
                
            except Exception as e:
                logger.error(f"Redis stats error: {e}")
        
        return stats
    
    async def warm_cache(self, keys: List[str], values: List[Any], ttl: Optional[int] = None):
        """Warm cache with multiple key-value pairs."""
        try:
            for key, value in zip(keys, values):
                await self.set(key, value, ttl)
            
            logger.info(f"Warmed cache with {len(keys)} entries")
            
        except Exception as e:
            logger.error(f"Cache warm error: {e}")
    
    async def get_or_set(self, key: str, factory: Callable, ttl: Optional[int] = None) -> Any:
        """
        Get value from cache or set using factory function if not found.
        """
        value = await self.get(key)
        if value is not None:
            return value
        
        # Generate value using factory
        if asyncio.iscoroutinefunction(factory):
            value = await factory()
        else:
            value = factory()
        
        # Set in cache
        if value is not None:
            await self.set(key, value, ttl)
        
        return value

# Decorators for easy caching
def cache_result(key_pattern: str, ttl: int = 3600, cache_manager: AdvancedCacheManager = None):
    """Decorator to cache function results."""
    if cache_manager is None:
        cache_manager = advanced_cache_manager
    
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = f"{key_pattern}:{hashlib.md5(str(args + tuple(sorted(kwargs.items()))).encode()).hexdigest()}"
            
            # Try to get from cache
            cached_result = await cache_manager.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Execute function
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
            
            # Cache result
            await cache_manager.set(cache_key, result, ttl)
            
            return result
        
        return wrapper
    return decorator

def cache_user_specific(key_pattern: str, ttl: int = 1800):
    """Decorator for user-specific caching."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract user_id from arguments
            user_id = None
            if args and hasattr(args[0], 'user_id'):
                user_id = args[0].user_id
            elif 'user_id' in kwargs:
                user_id = kwargs['user_id']
            elif 'user' in kwargs and hasattr(kwargs['user'], 'id'):
                user_id = kwargs['user'].id
            
            if user_id is None:
                # Execute without caching if no user_id
                if asyncio.iscoroutinefunction(func):
                    return await func(*args, **kwargs)
                else:
                    return func(*args, **kwargs)
            
            # Generate user-specific cache key
            cache_key = f"user_{user_id}:{key_pattern}:{hashlib.md5(str(args[1:] + tuple(sorted(kwargs.items()))).encode()).hexdigest()}"
            
            # Use advanced cache manager
            cached_result = await advanced_cache_manager.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Execute function
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
            
            # Cache result
            await advanced_cache_manager.set(cache_key, result, ttl)
            
            return result
        
        return wrapper
    return decorator

# Specialized cache managers for ML features
class MLModelCache:
    """Specialized cache for ML model predictions and embeddings."""
    
    def __init__(self, cache_manager: AdvancedCacheManager):
        self.cache_manager = cache_manager
        self._configure_ml_cache()
    
    def _configure_ml_cache(self):
        """Configure cache settings for ML features."""
        # Model predictions - shorter TTL for freshness
        self.cache_manager.configure_cache(
            "ml_prediction:",
            CacheConfig(ttl=300, max_size=500, refresh_ahead=True)
        )
        
        # User embeddings - longer TTL
        self.cache_manager.configure_cache(
            "user_embedding:",
            CacheConfig(ttl=7200, max_size=1000, serialization="pickle")
        )
        
        # Content embeddings - longest TTL
        self.cache_manager.configure_cache(
            "content_embedding:",
            CacheConfig(ttl=86400, max_size=2000, serialization="pickle")
        )
        
        # Recommendations - medium TTL
        self.cache_manager.configure_cache(
            "recommendations:",
            CacheConfig(ttl=1800, max_size=1000, refresh_ahead=True)
        )
        
        # User profiles - medium TTL
        self.cache_manager.configure_cache(
            "user_profile:",
            CacheConfig(ttl=1800, max_size=500, refresh_ahead=True)
        )
    
    async def get_prediction(self, model_name: str, input_hash: str) -> Optional[Any]:
        """Get cached model prediction."""
        key = f"ml_prediction:{model_name}:{input_hash}"
        return await self.cache_manager.get(key)
    
    async def set_prediction(self, model_name: str, input_hash: str, prediction: Any) -> bool:
        """Cache model prediction."""
        key = f"ml_prediction:{model_name}:{input_hash}"
        return await self.cache_manager.set(key, prediction, ttl=300)
    
    async def get_user_embedding(self, user_id: int) -> Optional[np.ndarray]:
        """Get cached user embedding."""
        key = f"user_embedding:{user_id}"
        return await self.cache_manager.get(key)
    
    async def set_user_embedding(self, user_id: int, embedding: np.ndarray) -> bool:
        """Cache user embedding."""
        key = f"user_embedding:{user_id}"
        return await self.cache_manager.set(key, embedding, ttl=7200)
    
    async def get_content_embedding(self, content_id: str, content_type: str) -> Optional[np.ndarray]:
        """Get cached content embedding."""
        key = f"content_embedding:{content_type}:{content_id}"
        return await self.cache_manager.get(key)
    
    async def set_content_embedding(self, content_id: str, content_type: str, embedding: np.ndarray) -> bool:
        """Cache content embedding."""
        key = f"content_embedding:{content_type}:{content_id}"
        return await self.cache_manager.set(key, embedding, ttl=86400)
    
    async def get_recommendations(self, user_id: int, context: str) -> Optional[List[Dict]]:
        """Get cached recommendations."""
        key = f"recommendations:{user_id}:{context}"
        return await self.cache_manager.get(key)
    
    async def set_recommendations(self, user_id: int, context: str, recommendations: List[Dict]) -> bool:
        """Cache recommendations."""
        key = f"recommendations:{user_id}:{context}"
        return await self.cache_manager.set(key, recommendations, ttl=1800)
    
    async def invalidate_user_cache(self, user_id: int):
        """Invalidate all cache entries for a user."""
        patterns = [
            f"user_{user_id}:",
            f"user_embedding:{user_id}",
            f"recommendations:{user_id}:"
        ]
        
        total_invalidated = 0
        for pattern in patterns:
            total_invalidated += await self.cache_manager.invalidate_pattern(pattern)
        
        return total_invalidated
    
    async def invalidate_model_cache(self, model_name: str):
        """Invalidate cache for a specific model."""
        pattern = f"ml_prediction:{model_name}:"
        return await self.cache_manager.invalidate_pattern(pattern)

# Global instances
advanced_cache_manager = AdvancedCacheManager()
ml_model_cache = MLModelCache(advanced_cache_manager)

# Cache warming utilities
class CacheWarmer:
    """Utility for warming up caches with common data."""
    
    def __init__(self, cache_manager: AdvancedCacheManager):
        self.cache_manager = cache_manager
    
    async def warm_user_profiles(self, user_ids: List[int]):
        """Warm user profiles cache."""
        try:
            from apps.ai_engine.optimized_queries import optimized_query_manager
            
            profiles = []
            keys = []
            
            for user_id in user_ids:
                profile = optimized_query_manager.get_optimized_user_profile(user_id)
                if profile:
                    profiles.append(profile)
                    keys.append(f"user_profile:{user_id}")
            
            await self.cache_manager.warm_cache(keys, profiles, ttl=1800)
            logger.info(f"Warmed {len(profiles)} user profiles")
            
        except Exception as e:
            logger.error(f"User profiles cache warm error: {e}")
    
    async def warm_course_analytics(self, course_ids: List[int]):
        """Warm course analytics cache."""
        try:
            from apps.ai_engine.optimized_queries import optimized_query_manager
            
            analytics = []
            keys = []
            
            for course_id in course_ids:
                analytics_data = optimized_query_manager.get_optimized_course_analytics(course_id)
                if analytics_data:
                    analytics.append(analytics_data)
                    keys.append(f"course_analytics:{course_id}")
            
            await self.cache_manager.warm_cache(keys, analytics, ttl=1800)
            logger.info(f"Warmed {len(analytics)} course analytics")
            
        except Exception as e:
            logger.error(f"Course analytics cache warm error: {e}")
    
    async def warm_recommendations(self, user_ids: List[int]):
        """Warm recommendations cache."""
        try:
            from apps.ai_engine.ml_integration import ml_integration
            
            recommendations = []
            keys = []
            
            for user_id in user_ids:
                user_recommendations = await ml_integration.get_real_time_recommendations(
                    user_id=user_id,
                    context='courses',
                    limit=10
                )
                if user_recommendations:
                    recommendations.append(user_recommendations)
                    keys.append(f"recommendations:{user_id}:courses")
            
            await self.cache_manager.warm_cache(keys, recommendations, ttl=1800)
            logger.info(f"Warmed {len(recommendations)} user recommendations")
            
        except Exception as e:
            logger.error(f"Recommendations cache warm error: {e}")

# Global cache warmer
cache_warmer = CacheWarmer(advanced_cache_manager)
