"""
API Response Caching Decorators
Cache API responses for improved performance
"""

import json
import hashlib
from functools import wraps
from django.core.cache import cache
from django.http import JsonResponse


def cache_api_response(timeout=300, vary_on_headers=None):
    """Decorator to cache API responses."""
    vary_on_headers = vary_on_headers or []
    
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Generate cache key
            key_parts = [
                request.path,
                request.method,
                str(sorted(request.GET.items())),
            ]
            
            # Add user-specific data if authenticated
            if request.user.is_authenticated:
                key_parts.append(f"user:{request.user.id}")
            
            # Add varying headers
            for header in vary_on_headers:
                value = request.headers.get(header, '')
                key_parts.append(f"{header}:{value}")
            
            cache_key = f"api:{hashlib.md5(':'.join(key_parts).encode()).hexdigest()}"
            
            # Try to get from cache
            cached = cache.get(cache_key)
            if cached is not None:
                return JsonResponse(cached, safe=False)
            
            # Execute view
            response = view_func(request, *args, **kwargs)
            
            # Cache successful GET responses
            if request.method == 'GET' and response.status_code == 200:
                if isinstance(response, JsonResponse):
                    try:
                        data = json.loads(response.content)
                        cache.set(cache_key, data, timeout)
                    except:
                        pass
            
            return response
        return wrapper
    return decorator


def invalidate_api_cache(pattern):
    """Invalidate API cache by pattern."""
    # This would require iterating through cache keys
    # Implementation depends on cache backend
    pass
