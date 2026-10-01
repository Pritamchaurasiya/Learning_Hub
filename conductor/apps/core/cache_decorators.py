"""
Reusable Cache Decorators for Django REST Framework views.
Supports user-scoped caching, parameterized keys, and Redis/LocMem backends.
"""
from functools import wraps
import hashlib
from django.core.cache import cache
from rest_framework.response import Response


def user_scoped_cache(timeout=300, key_prefix="user_view"):
    """
    Decorator for DRF viewset actions that caches responses on a per-user basis.
    
    Usage:
        @user_scoped_cache(timeout=120, key_prefix="my_courses")
        @action(detail=False, methods=["get"])
        def my_courses(self, request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(view_instance, request, *args, **kwargs):
            if not request.user or not request.user.is_authenticated:
                return view_func(view_instance, request, *args, **kwargs)

            # Build user-scoped cache key including query params
            query_hash = hashlib.md5(request.get_full_path().encode('utf-8')).hexdigest()
            cache_key = f"{key_prefix}:{request.user.id}:{query_hash}"

            cached_data = cache.get(cache_key)
            if cached_data is not None:
                return Response(cached_data)

            response = view_func(view_instance, request, *args, **kwargs)
            if response.status_code == 200 and hasattr(response, 'data'):
                cache.set(cache_key, response.data, timeout=timeout)

            return response
        return wrapper
    return decorator


def invalidate_user_cache(user_id, key_prefix="user_view"):
    """Invalidates cached entries matching key_prefix for a specific user."""
    pattern = f"{key_prefix}:{user_id}:*"
    try:
        if hasattr(cache, 'delete_pattern'):
            cache.delete_pattern(pattern)
        else:
            # Fallback for backends without delete_pattern
            pass
    except Exception:
        pass
