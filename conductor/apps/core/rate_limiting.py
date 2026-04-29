"""
Rate Limiting Middleware
Prevents abuse and DDoS attacks
"""

import time
from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin


class RateLimitMiddleware(MiddlewareMixin):
    """
    Rate limiting middleware with IP-based tracking.
    """
    
    # Default rate limits per minute
    DEFAULT_LIMITS = {
        'api': 100,      # API endpoints: 100 requests/minute
        'auth': 10,      # Auth endpoints: 10 requests/minute
        'default': 60,   # Default: 60 requests/minute
    }
    
    # Endpoint-specific limits
    ENDPOINT_LIMITS = {
        '/api/v1/auth/login/': 'auth',
        '/api/v1/auth/register/': 'auth',
        '/api/v1/auth/refresh/': 'auth',
    }
    
    def __init__(self, get_response=None):
        self.get_response = get_response
        self.limits = getattr(settings, 'RATE_LIMITS', self.DEFAULT_LIMITS)
        self.enabled = getattr(settings, 'RATE_LIMITING_ENABLED', True)
    
    def process_request(self, request):
        if not self.enabled:
            return None
        
        # Get client IP
        ip = self._get_client_ip(request)
        
        # Determine rate limit for this endpoint
        limit_type = self._get_limit_type(request.path)
        limit = self.limits.get(limit_type, self.limits['default'])
        
        # Generate cache key
        cache_key = f"rate_limit:{ip}:{request.path}"
        
        # Check current count
        current_count = cache.get(cache_key, 0)
        
        if current_count >= limit:
            # Rate limit exceeded
            return JsonResponse({
                'error': 'Rate limit exceeded',
                'retry_after': 60,
            }, status=429)
        
        # Increment counter
        cache.set(cache_key, current_count + 1, 60)
        
        return None
    
    def _get_client_ip(self, request):
        """Extract client IP from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip or 'unknown'
    
    def _get_limit_type(self, path):
        """Determine rate limit type for path."""
        for endpoint, limit_type in self.ENDPOINT_LIMITS.items():
            if path.startswith(endpoint):
                return limit_type
        return 'default'


class AdvancedRateLimitMiddleware(RateLimitMiddleware):
    """
    Advanced rate limiting with user-based tracking.
    """
    
    def process_request(self, request):
        if not self.enabled:
            return None
        
        # Get identifier (user ID if authenticated, IP otherwise)
        if request.user.is_authenticated:
            identifier = f"user:{request.user.id}"
            limits = {
                'api': 200,      # Higher limit for authenticated users
                'auth': 20,
                'default': 120,
            }
        else:
            identifier = f"ip:{self._get_client_ip(request)}"
            limits = self.limits
        
        limit_type = self._get_limit_type(request.path)
        limit = limits.get(limit_type, limits['default'])
        
        cache_key = f"rate_limit:{identifier}:{request.path}"
        current_count = cache.get(cache_key, 0)
        
        if current_count >= limit:
            return JsonResponse({
                'error': 'Rate limit exceeded',
                'retry_after': 60,
            }, status=429)
        
        cache.set(cache_key, current_count + 1, 60)
        return None
