"""
Enhanced Query Optimization Middleware
Implements query caching, N+1 detection, and slow query logging
"""

import time
import logging
from functools import wraps
from django.db import connection, reset_queries
from django.core.cache import cache
from django.http import JsonResponse

logger = logging.getLogger('query_optimizer')

class EnhancedQueryOptimizationMiddleware:
    """
    Middleware to optimize database queries and detect performance issues.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.slow_query_threshold = 0.02  # 20ms
        self.max_queries_threshold = 50
    
    def __call__(self, request):
        # Skip optimization for admin and static files
        if request.path.startswith(('/admin/', '/static/', '/media/')):
            return self.get_response(request)
        
        reset_queries()
        start_time = time.time()
        
        response = self.get_response(request)
        
        # Analyze queries
        total_time = time.time() - start_time
        queries = connection.queries
        
        # Log slow queries
        slow_queries = [q for q in queries if float(q.get('time', 0)) > self.slow_query_threshold]
        
        if slow_queries:
            logger.warning(f"Slow queries detected: {len(slow_queries)} queries > {self.slow_query_threshold}s")
            for q in slow_queries[:5]:  # Log top 5
                logger.warning(f"Slow query: {q['sql'][:100]}... ({q['time']}s)")
        
        # Detect N+1 queries
        if len(queries) > self.max_queries_threshold:
            logger.warning(f"N+1 query pattern detected: {len(queries)} queries for {request.path}")
        
        # Add performance headers
        response['X-Query-Count'] = str(len(queries))
        response['X-Query-Time'] = f"{total_time:.3f}"
        
        return response


def cached_query(timeout=300, key_prefix='query_cache'):
    """
    Decorator to cache database query results.
    
    Args:
        timeout: Cache timeout in seconds (default 5 minutes)
        key_prefix: Prefix for cache key
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = f"{key_prefix}:{func.__name__}:{hash(str(args))}:{hash(str(kwargs))}"
            
            # Try to get from cache
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Execute function
            result = func(*args, **kwargs)
            
            # Cache the result
            cache.set(cache_key, result, timeout)
            
            return result
        return wrapper
    return decorator


def optimize_queryset(queryset, select_related=None, prefetch_related=None):
    """
    Optimize a queryset with select_related and prefetch_related.
    
    Args:
        queryset: Django QuerySet to optimize
        select_related: List of fields for select_related
        prefetch_related: List of fields for prefetch_related
    """
    if select_related:
        queryset = queryset.select_related(*select_related)
    
    if prefetch_related:
        queryset = queryset.prefetch_related(*prefetch_related)
    
    return queryset


class QueryCacheManager:
    """
    Manager for query result caching.
    """
    
    CACHE_TIMEOUTS = {
        'course_list': 300,      # 5 minutes
        'course_detail': 600,    # 10 minutes
        'category_list': 600,    # 10 minutes
        'user_profile': 300,     # 5 minutes
        'leaderboard': 60,       # 1 minute
        'search_results': 120,   # 2 minutes
    }
    
    @classmethod
    def get_cache_key(cls, model_name, identifier=None, filters=None):
        """Generate cache key for model data."""
        key = f"model:{model_name}"
        if identifier:
            key += f":{identifier}"
        if filters:
            key += f":{hash(str(filters))}"
        return key
    
    @classmethod
    def cache_model_data(cls, model_name, data, identifier=None, timeout=None):
        """Cache model data with appropriate timeout."""
        cache_key = cls.get_cache_key(model_name, identifier)
        timeout = timeout or cls.CACHE_TIMEOUTS.get(model_name, 300)
        cache.set(cache_key, data, timeout)
    
    @classmethod
    def get_cached_model_data(cls, model_name, identifier=None):
        """Get cached model data."""
        cache_key = cls.get_cache_key(model_name, identifier)
        return cache.get(cache_key)
    
    @classmethod
    def invalidate_cache(cls, model_name, identifier=None):
        """Invalidate cache for model."""
        if identifier:
            cache_key = cls.get_cache_key(model_name, identifier)
            cache.delete(cache_key)
        else:
            # Delete all keys with model prefix
            # Note: This is a simplified version
            pass
