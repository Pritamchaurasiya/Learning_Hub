"""
Rate Limiting Middleware for LearningHub API.

Implements per-IP and per-user rate limiting with configurable limits
per endpoint type. Uses Django cache for storage.
"""
import time
import logging
from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)


# Rate limit configurations per endpoint type
RATE_LIMITS = {
    'auth': {'requests': 5, 'window': 60},         # 5 req/min for auth
    'search': {'requests': 30, 'window': 60},       # 30 req/min for search
    'api': {'requests': 100, 'window': 60},         # 100 req/min for general API
    'admin': {'requests': 200, 'window': 60},       # 200 req/min for admin
    'default': {'requests': 60, 'window': 60},      # 60 req/min default
}


def get_rate_limit_category(path):
    """Determine rate limit category based on request path."""
    if '/auth/' in path or '/login/' in path or '/register/' in path:
        return 'auth'
    elif '/search/' in path:
        return 'search'
    elif '/admin/' in path:
        return 'admin'
    elif '/api/' in path:
        return 'api'
    return 'default'


class RateLimitMiddleware(MiddlewareMixin):
    """
    Rate limiting middleware using sliding window algorithm.
    
    Features:
    - Per-IP rate limiting
    - Per-user rate limiting (authenticated users)
    - Different limits per endpoint category
    - Rate limit headers in response
    - Automatic cleanup of expired entries
    """
    
    def process_request(self, request):
        """Check rate limit before processing request."""
        # Skip if rate limiting is disabled
        if not getattr(settings, 'RATE_LIMITING_ENABLED', True):
            return None
        
        # Skip rate limiting for health checks and static files
        if request.path.startswith('/health') or request.path.startswith('/static'):
            return None
        
        # Skip for admin users with special permission
        if hasattr(request, 'user') and request.user.is_superuser:
            return None
        
        category = get_rate_limit_category(request.path)
        config = RATE_LIMITS.get(category, RATE_LIMITS['default'])
        
        # Get client identifier
        ip = self._get_client_ip(request)
        user_id = getattr(request.user, 'id', None) if hasattr(request, 'user') and request.user.is_authenticated else None
        
        # Check IP-based rate limit
        ip_key = f"rl:ip:{ip}:{category}"
        ip_allowed, ip_remaining = self._check_rate(ip_key, config)
        
        # Check user-based rate limit (if authenticated)
        user_remaining = None
        if user_id:
            user_key = f"rl:user:{user_id}:{category}"
            user_allowed, user_remaining = self._check_rate(user_key, config)
            if not user_allowed:
                return self._rate_limited_response(user_remaining, config['window'], 'user')
        
        if not ip_allowed:
            return self._rate_limited_response(ip_remaining, config['window'], 'ip')
        
        # Store rate limit info for response headers
        request._rate_limit_info = {
            'category': category,
            'ip_remaining': ip_remaining,
            'user_remaining': user_remaining,
            'limit': config['requests'],
            'window': config['window'],
        }
        
        return None
    
    def process_response(self, request, response):
        """Add rate limit headers to response."""
        info = getattr(request, '_rate_limit_info', None)
        if info:
            response['X-RateLimit-Limit'] = str(info['limit'])
            response['X-RateLimit-Window'] = f"{info['window']}s"
            response['X-RateLimit-Remaining'] = str(
                info.get('user_remaining') or info.get('ip_remaining', 0)
            )
            response['X-RateLimit-Category'] = info['category']
        return response
    
    def _check_rate(self, key, config):
        """
        Sliding window rate limit check.
        Returns (allowed, remaining_requests).
        """
        now = time.time()
        window = config['window']
        max_requests = config['requests']
        
        # Get current window data
        data = cache.get(key, {'timestamps': []})
        timestamps = data.get('timestamps', [])
        
        # Remove expired timestamps
        cutoff = now - window
        timestamps = [ts for ts in timestamps if ts > cutoff]
        
        # Check if limit exceeded
        if len(timestamps) >= max_requests:
            remaining = 0
            return False, remaining
        
        # Add current timestamp
        timestamps.append(now)
        cache.set(key, {'timestamps': timestamps}, window + 10)
        
        return True, max_requests - len(timestamps)
    
    def _get_client_ip(self, request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '127.0.0.1')
    
    def _rate_limited_response(self, remaining, window, limit_type):
        """Create rate limit exceeded response."""
        return JsonResponse(
            {
                'error': 'Rate limit exceeded',
                'detail': f'Too many requests. Try again in {window} seconds.',
                'limit_type': limit_type,
            },
            status=429,
            headers={
                'Retry-After': str(window),
                'X-RateLimit-Remaining': '0',
            }
        )


class SlowQueryLoggingMiddleware(MiddlewareMixin):
    """
    Middleware that logs slow database queries.
    
    Logs any request that takes longer than the configured threshold.
    """
    
    # Configurable threshold in seconds
    SLOW_REQUEST_THRESHOLD = getattr(settings, 'SLOW_REQUEST_THRESHOLD', 2.0)
    
    def process_request(self, request):
        """Record start time."""
        request._start_time = time.time()
        return None
    
    def process_response(self, request, response):
        """Log if request was slow."""
        start_time = getattr(request, '_start_time', None)
        if start_time:
            duration = time.time() - start_time
            if duration > self.SLOW_REQUEST_THRESHOLD:
                logger.warning(
                    f"SLOW REQUEST: {request.method} {request.path} "
                    f"took {duration:.2f}s (threshold: {self.SLOW_REQUEST_THRESHOLD}s) "
                    f"status={response.status_code} "
                    f"user={getattr(request.user, 'id', 'anon')} "
                    f"ip={request.META.get('REMOTE_ADDR', 'unknown')}"
                )
                response['X-Response-Time'] = f"{duration:.2f}s"
        return response
