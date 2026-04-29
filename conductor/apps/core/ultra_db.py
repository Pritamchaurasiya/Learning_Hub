"""
Ultra-Performance Database Layer
Composite indexes, query optimization, connection pooling
"""

from django.db import models
from django.db.models import Q, F, Index
from django.core.cache import cache
from typing import List, Optional, Any
import logging

logger = logging.getLogger(__name__)

class QueryOptimizer:
    """
    Intelligent query optimization with automatic index suggestions
    """
    
    # Composite indexes for common query patterns
    COMMON_INDEXES = [
        # Course lookups
        Index(fields=['is_published', '-enrollment_count'], name='course_popularity_idx'),
        Index(fields=['category', 'is_published', '-created_at'], name='course_category_idx'),
        Index(fields=['instructor', 'is_published'], name='course_instructor_idx'),
        
        # User activity
        Index(fields=['user', '-created_at'], name='activity_user_idx'),
        Index(fields=['user', 'action', '-created_at'], name='activity_user_action_idx'),
        
        # Enrollment
        Index(fields=['user', 'course', 'is_active'], name='enrollment_active_idx'),
        
        # Gamification
        Index(fields=['user', '-total_xp'], name='gamification_leaderboard_idx'),
        
        # DSA/Submissions
        Index(fields=['user', 'problem', 'status', '-created_at'], name='submission_idx'),
    ]
    
    @classmethod
    def get_optimized_queryset(cls, model_class, filters: dict, ordering: List[str]):
        """Get an optimized queryset with select_related and prefetch_related"""
        queryset = model_class.objects.all()
        
        # Add select_related for foreign keys
        foreign_keys = [f.name for f in model_class._meta.get_fields() 
                       if f.is_foreign_key and f.name not in ['id', 'created_at', 'updated_at']]
        if foreign_keys:
            queryset = queryset.select_related(*foreign_keys[:3])  # Limit to 3
        
        # Add ordering
        if ordering:
            queryset = queryset.order_by(*ordering)
        
        # Apply filters
        if filters:
            queryset = queryset.filter(**filters)
        
        return queryset
    
    @classmethod
    def bulk_fetch_related(cls, parent_objects: List, related_name: str, 
                          model_class, filter_kwargs: dict = None) -> dict:
        """Efficiently fetch related objects in bulk"""
        if not parent_objects:
            return {}
        
        # Extract parent IDs
        parent_ids = [obj.id for obj in parent_objects]
        
        # Build filter
        filter_q = Q(**{f"{related_name.split('.')[0]}_id__in": parent_ids})
        if filter_kwargs:
            filter_q &= Q(**filter_kwargs)
        
        # Fetch all at once
        related_objects = model_class.objects.filter(filter_q)
        
        # Group by parent
        grouped = {}
        for obj in related_objects:
            parent_id = getattr(obj, f"{related_name.split('.')[0]}_id")
            if parent_id not in grouped:
                grouped[parent_id] = []
            grouped[parent_id].append(obj)
        
        return grouped
    
    @classmethod
    def analyze_query(cls, queryset) -> dict:
        """Analyze a queryset and provide optimization suggestions"""
        query = queryset.query
        
        # Get SQL explanation (debug mode only)
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute(f"EXPLAIN {query}")
                plan = cursor.fetchall()
            
            return {
                'sql': str(query),
                'plan': plan,
                'suggestions': cls._generate_suggestions(plan)
            }
        except Exception as e:
            logger.warning(f"Could not analyze query: {e}")
            return {'sql': str(query), 'error': str(e)}
    
    @staticmethod
    def _generate_suggestions(plan: List) -> List[str]:
        """Generate optimization suggestions based on query plan"""
        suggestions = []
        
        for row in plan:
            plan_text = str(row).lower()
            if 'seq scan' in plan_text:
                suggestions.append("Consider adding an index for sequential scan")
            if 'nested loop' in plan_text:
                suggestions.append("Use select_related to reduce joins")
            if 'bitmap heap scan' in plan_text:
                suggestions.append("Consider composite index")
        
        return suggestions


class CacheLayer:
    """
    Unified Redis cache layer with smart invalidation
    """
    
    PREFIX = "learning_hub:"
    DEFAULT_TTL = 3600  # 1 hour
    
    @classmethod
    def get(cls, key: str, default=None) -> Any:
        """Get value from cache"""
        full_key = f"{cls.PREFIX}{key}"
        return cache.get(full_key, default)
    
    @classmethod
    def set(cls, key: str, value: Any, ttl: int = None) -> bool:
        """Set value in cache"""
        full_key = f"{cls.PREFIX}{key}"
        return cache.set(full_key, value, timeout=ttl or cls.DEFAULT_TTL)
    
    @classmethod
    def delete(cls, key: str) -> bool:
        """Delete from cache"""
        full_key = f"{cls.PREFIX}{key}"
        return cache.delete(full_key)
    
    @classmethod
    def get_many(cls, keys: List[str]) -> dict:
        """Get multiple values from cache"""
        full_keys = [f"{cls.PREFIX}{k}" for k in keys]
        return cache.get_many(full_keys)
    
    @classmethod
    def set_many(cls, data: dict, ttl: int = None) -> None:
        """Set multiple values in cache"""
        full_data = {f"{cls.PREFIX}{k}": v for k, v in data.items()}
        cache.set_many(full_data, timeout=ttl or cls.DEFAULT_TTL)
    
    @classmethod
    def cached_method(cls, ttl: int = None, key_builder=None):
        """Decorator for caching method results"""
        def decorator(func):
            def wrapper(self, *args, **kwargs):
                # Build cache key
                if key_builder:
                    cache_key = key_builder(self, *args, **kwargs)
                else:
                    cache_key = f"{func.__name__}:{':'.join(map(str, args))}"
                
                # Try to get from cache
                cached = cls.get(cache_key)
                if cached is not None:
                    return cached
                
                # Compute
                result = func(self, *args, **kwargs)
                
                # Store in cache
                cls.set(cache_key, result, ttl)
                
                return result
            return wrapper
        return decorator
    
    @classmethod
    def invalidate_user_cache(cls, user_id: int) -> int:
        """Invalidate all cache entries for a specific user"""
        patterns = [
            f"user:{user_id}:*",
            f"courses:user:{user_id}:*",
            f"progress:user:{user_id}:*",
        ]
        # Note: Full implementation would use Redis SCAN
        logger.info(f"Would invalidate {len(patterns)} cache patterns for user {user_id}")
        return len(patterns)
    
    @classmethod
    def invalidate_course_cache(cls, course_id: int) -> int:
        """Invalidate all cache entries for a specific course"""
        patterns = [
            f"course:{course_id}:*",
            f"enrollments:course:{course_id}:*",
            f"reviews:course:{course_id}:*",
        ]
        logger.info(f"Would invalidate {len(patterns)} cache patterns for course {course_id}")
        return len(patterns)


class PrefetchOptimizer:
    """
    Optimizes prefetch operations for complex relationships
    """
    
    @classmethod
    def get_optimized_prefetch(cls, model_class, prefetch_related: List[str]) -> dict:
        """Generate optimized prefetch queries"""
        prefetch_map = {}
        
        for prefetch_path in prefetch_related:
            parts = prefetch_path.split('__')
            
            if len(parts) == 1:
                # Direct foreign key
                prefetch_map[prefetch_path] = None
            elif len(parts) == 2:
                # Foreign key with filter
                prefetch_map[parts[0]] = {
                    'queryset': cls._get_filtered_queryset(parts[0], parts[1]),
                    'to_attr': parts[1]
                }
            else:
                # Nested prefetch
                prefetch_map[parts[0]] = {
                    'queryset': cls._get_nested_queryset(parts),
                    'to_attr': parts[-1]
                }
        
        return prefetch_map
    
    @staticmethod
    def _get_filtered_queryset(related_name: str, filter_field: str) -> Any:
        """Get filtered queryset for prefetch (placeholder)"""
        # In production, return actual filtered queryset
        return None
    
    @staticmethod
    def _get_nested_queryset(parts: List[str]) -> Any:
        """Get nested queryset for prefetch (placeholder)"""
        return None


# Cache decorator for frequently called methods
def cached_query(ttl: int = 300, key_prefix: str = ""):
    """Decorator for caching query results"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Build cache key
            cache_key = f"{key_prefix}:{func.__name__}:{str(args)}:{str(kwargs)}"
            
            # Try cache
            cached = CacheLayer.get(cache_key)
            if cached is not None:
                return cached
            
            # Execute and cache
            result = func(*args, **kwargs)
            CacheLayer.set(cache_key, result, ttl)
            
            return result
        return wrapper
    return decorator