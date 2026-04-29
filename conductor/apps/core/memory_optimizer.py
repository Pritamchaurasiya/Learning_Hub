"""
Memory Optimization Manager
Manages memory usage and optimizes resource allocation
"""

import gc
import sys
from functools import wraps
from django.core.cache import cache


class MemoryOptimizer:
    """
    Manages memory usage for optimal performance.
    """
    
    # Memory thresholds (in MB)
    MEMORY_WARNING = 512
    MEMORY_CRITICAL = 1024
    
    @staticmethod
    def optimize_queryset_memory(queryset, chunk_size=1000):
        """
        Process large querysets in chunks to manage memory.
        """
        offset = 0
        while True:
            chunk = queryset[offset:offset + chunk_size]
            if not chunk:
                break
            
            for item in chunk:
                yield item
            
            offset += chunk_size
            
            # Force garbage collection after each chunk
            if offset % (chunk_size * 10) == 0:
                gc.collect()
    
    @staticmethod
    def memory_efficient_iterator(queryset, prefetch_fields=None, chunk_size=100):
        """
        Memory-efficient iterator with prefetching.
        """
        if prefetch_fields:
            queryset = queryset.prefetch_related(*prefetch_fields)
        
        return MemoryOptimizer.optimize_queryset_memory(queryset, chunk_size)
    
    @staticmethod
    def clear_memory_cache():
        """
        Clear memory cache to free up resources.
        """
        gc.collect()
        
        # Clear Django cache if memory pressure is high
        try:
            import psutil
            memory = psutil.virtual_memory()
            if memory.percent > 80:
                cache.clear()
                print("[MEMORY] Cache cleared due to high memory usage")
        except ImportError:
            pass
    
    @staticmethod
    def optimize_model_instances(instances, fields=None):
        """
        Optimize model instances by deferring unused fields.
        """
        if fields:
            return instances.only(*fields)
        return instances


def memory_efficient(func):
    """
    Decorator to make function memory-efficient.
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            result = func(*args, **kwargs)
            return result
        finally:
            # Cleanup after execution
            gc.collect()
    return wrapper


class ObjectPool:
    """
    Simple object pool for reusable objects.
    """
    
    def __init__(self, factory, max_size=10):
        self.factory = factory
        self.max_size = max_size
        self._pool = []
        self._in_use = set()
    
    def acquire(self):
        """Acquire an object from the pool."""
        if self._pool:
            obj = self._pool.pop()
        else:
            obj = self.factory()
        
        self._in_use.add(id(obj))
        return obj
    
    def release(self, obj):
        """Release an object back to the pool."""
        obj_id = id(obj)
        if obj_id in self._in_use:
            self._in_use.remove(obj_id)
            if len(self._pool) < self.max_size:
                self._pool.append(obj)
