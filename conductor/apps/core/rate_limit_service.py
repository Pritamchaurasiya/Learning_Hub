"""
Advanced Rate Limiting Service

Enterprise-grade rate limiting with:
1. Multi-level rate limits (IP, user, endpoint)
2. Sliding window algorithm
3. Token bucket for burst handling
4. Custom rules per endpoint
5. Real-time monitoring
6. Automatic blocking
"""

import logging
import time
import hashlib
from datetime import timedelta
from typing import Dict, Any, List, Optional, Tuple
from enum import Enum
from dataclasses import dataclass

from django.utils import timezone
from django.core.cache import cache
from django.http import HttpRequest

logger = logging.getLogger(__name__)


class RateLimitType(Enum):
    """Types of rate limiting."""
    IP = "ip"
    USER = "user"
    ENDPOINT = "endpoint"
    GLOBAL = "global"


class RateLimitAction(Enum):
    """Actions when limit exceeded."""
    BLOCK = "block"
    THROTTLE = "throttle"
    WARN = "warn"


@dataclass
class RateLimitResult:
    """Result of rate limit check."""
    allowed: bool
    remaining: int
    reset_time: int
    limit: int
    action: RateLimitAction = RateLimitAction.BLOCK


class RateLimitRule:
    """Rate limit rule configuration."""
    
    def __init__(
        self,
        requests: int,
        window_seconds: int,
        action: RateLimitAction = RateLimitAction.BLOCK,
        burst_allowance: int = 0
    ):
        self.requests = requests
        self.window_seconds = window_seconds
        self.action = action
        self.burst_allowance = burst_allowance


class RateLimitService:
    """
    Advanced rate limiting service using sliding window algorithm.
    """
    
    # Default rate limits
    DEFAULT_LIMITS = {
        'api': RateLimitRule(requests=100, window_seconds=60),
        'auth': RateLimitRule(requests=5, window_seconds=60, action=RateLimitAction.BLOCK),
        'search': RateLimitRule(requests=30, window_seconds=60),
        'upload': RateLimitRule(requests=10, window_seconds=300),
        'ai': RateLimitRule(requests=20, window_seconds=60),
        'payment': RateLimitRule(requests=10, window_seconds=60, action=RateLimitAction.BLOCK),
    }
    
    # User tier limits (multiplier)
    TIER_MULTIPLIERS = {
        'free': 1.0,
        'basic': 2.0,
        'pro': 5.0,
        'enterprise': 10.0,
    }
    
    # ==========================================================================
    # CORE RATE LIMITING
    # ==========================================================================
    
    @classmethod
    def check_rate_limit(
        cls,
        identifier: str,
        limit_type: RateLimitType,
        endpoint: str = 'api',
        user_tier: str = 'free'
    ) -> RateLimitResult:
        """
        Check if request is within rate limits.
        
        Uses sliding window log algorithm for accurate limiting.
        """
        rule = cls.DEFAULT_LIMITS.get(endpoint, cls.DEFAULT_LIMITS['api'])
        
        # Apply tier multiplier
        multiplier = cls.TIER_MULTIPLIERS.get(user_tier, 1.0)
        effective_limit = int(rule.requests * multiplier)
        
        # Build cache key
        cache_key = cls._build_cache_key(identifier, limit_type, endpoint)
        
        # Get current window
        now = time.time()
        window_start = now - rule.window_seconds
        
        try:
            # Get request log
            request_log = cache.get(cache_key, [])
            
            # Filter to current window
            request_log = [t for t in request_log if t > window_start]
            
            # Check limit
            current_count = len(request_log)
            
            if current_count >= effective_limit:
                # Limit exceeded
                reset_time = int(request_log[0] + rule.window_seconds - now) if request_log else rule.window_seconds
                
                # Log for monitoring
                cls._log_limit_exceeded(identifier, limit_type, endpoint, current_count)
                
                return RateLimitResult(
                    allowed=False,
                    remaining=0,
                    reset_time=reset_time,
                    limit=effective_limit,
                    action=rule.action
                )
            
            # Allow request
            request_log.append(now)
            
            # Store updated log
            cache.set(cache_key, request_log, timeout=rule.window_seconds + 60)
            
            remaining = effective_limit - len(request_log)
            reset_time = rule.window_seconds
            
            return RateLimitResult(
                allowed=True,
                remaining=remaining,
                reset_time=reset_time,
                limit=effective_limit,
                action=RateLimitAction.WARN if remaining < effective_limit * 0.1 else RateLimitAction.BLOCK
            )
        except Exception as e:
            # Fail-open if cache is down
            logger.error("Rate limiter cache error: %s", str(e))
            return RateLimitResult(
                allowed=True,
                remaining=1,
                reset_time=0,
                limit=effective_limit,
                action=rule.action
            )
    
    @classmethod
    def _build_cache_key(
        cls,
        identifier: str,
        limit_type: RateLimitType,
        endpoint: str
    ) -> str:
        """Build cache key for rate limit tracking."""
        return f"rate_limit:{limit_type.value}:{endpoint}:{hashlib.md5(identifier.encode()).hexdigest()}"
    
    @classmethod
    def _log_limit_exceeded(
        cls,
        identifier: str,
        limit_type: RateLimitType,
        endpoint: str,
        count: int
    ) -> None:
        """Log rate limit exceeded event."""
        logger.warning(
            "Rate limit exceeded: %s %s on %s (%d requests)",
            limit_type.value, identifier, endpoint, count
        )
    
    # ==========================================================================
    # REQUEST HELPERS
    # ==========================================================================
    
    @classmethod
    def check_request(cls, request: HttpRequest, endpoint: str = 'api') -> RateLimitResult:
        """
        Check rate limit for a Django request.
        """
        # Get identifiers
        ip = cls.get_client_ip(request)
        user = getattr(request, 'user', None)
        user_tier = 'free'
        
        # Check IP limit first
        ip_result = cls.check_rate_limit(ip, RateLimitType.IP, endpoint)
        if not ip_result.allowed:
            return ip_result
        
        # Check user limit if authenticated
        if user and user.is_authenticated:
            user_tier = cls._get_user_tier(user)
            user_result = cls.check_rate_limit(
                str(user.id),
                RateLimitType.USER,
                endpoint,
                user_tier
            )
            if not user_result.allowed:
                return user_result
            return user_result
        
        return ip_result
    
    @classmethod
    def get_client_ip(cls, request: HttpRequest) -> str:
        """Get client IP from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', 'unknown')
    
    @classmethod
    def _get_user_tier(cls, user) -> str:
        """Get user's subscription tier."""
        from apps.payments.advanced_payment import AdvancedPaymentService
        
        try:
            info = AdvancedPaymentService.get_subscription_info(user)
            return info.plan.value
        except Exception:
            return 'free'
    
    # ==========================================================================
    # BURST HANDLING (Token Bucket)
    # ==========================================================================
    
    @classmethod
    def check_burst_limit(
        cls,
        identifier: str,
        max_tokens: int = 10,
        refill_rate: float = 1.0  # tokens per second
    ) -> Tuple[bool, int]:
        """
        Token bucket algorithm for burst handling.
        
        Returns: (allowed, remaining_tokens)
        """
        cache_key = f"token_bucket:{identifier}"
        
        now = time.time()
        
        # Get bucket state
        bucket = cache.get(cache_key, {
            'tokens': max_tokens,
            'last_update': now
        })
        
        # Calculate refill
        time_passed = now - bucket['last_update']
        tokens_to_add = time_passed * refill_rate
        
        # Update tokens (cap at max)
        bucket['tokens'] = min(max_tokens, bucket['tokens'] + tokens_to_add)
        bucket['last_update'] = now
        
        if bucket['tokens'] >= 1:
            # Consume a token
            bucket['tokens'] -= 1
            cache.set(cache_key, bucket, timeout=max_tokens * 2)
            return (True, int(bucket['tokens']))
        
        return (False, 0)
    
    # ==========================================================================
    # BLOCKING
    # ==========================================================================
    
    @classmethod
    def block_identifier(
        cls,
        identifier: str,
        limit_type: RateLimitType,
        duration_seconds: int = 3600,
        reason: str = ""
    ) -> None:
        """
        Temporarily block an identifier.
        """
        cache_key = f"blocked:{limit_type.value}:{identifier}"
        cache.set(cache_key, {
            'blocked_at': timezone.now().isoformat(),
            'duration': duration_seconds,
            'reason': reason
        }, timeout=duration_seconds)
        
        logger.warning("Blocked %s %s for %ds: %s", limit_type.value, identifier, duration_seconds, reason)
    
    @classmethod
    def is_blocked(cls, identifier: str, limit_type: RateLimitType) -> Tuple[bool, Optional[str]]:
        """
        Check if identifier is blocked.
        """
        cache_key = f"blocked:{limit_type.value}:{identifier}"
        block_info = cache.get(cache_key)
        
        if block_info:
            return (True, block_info.get('reason', 'Rate limit exceeded'))
        
        return (False, None)
    
    @classmethod
    def unblock_identifier(cls, identifier: str, limit_type: RateLimitType) -> None:
        """
        Remove block on an identifier.
        """
        cache_key = f"blocked:{limit_type.value}:{identifier}"
        cache.delete(cache_key)
        
        logger.info("Unblocked %s %s", limit_type.value, identifier)
    
    # ==========================================================================
    # MONITORING
    # ==========================================================================
    
    @classmethod
    def get_rate_limit_stats(cls) -> Dict[str, Any]:
        """
        Get rate limiting statistics.
        """
        # In production, query from metrics store
        return {
            'total_requests': 0,
            'blocked_requests': 0,
            'currently_blocked_ips': 0,
            'top_requesters': []
        }


# ==========================================================================
# MIDDLEWARE
# ==========================================================================

class RateLimitMiddleware:
    """
    Rate limiting middleware.
    """
    
    # Endpoints and their limit categories
    ENDPOINT_MAPPING = {
        '/api/auth/': 'auth',
        '/api/ai/': 'ai',
        '/api/search/': 'search',
        '/api/payments/': 'payment',
        '/api/upload/': 'upload',
    }
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        from django.conf import settings as django_settings
        from django.http import JsonResponse
        
        # Bypass rate limiting if disabled (e.g., in tests)
        if not getattr(django_settings, 'RATE_LIMITING_ENABLED', True):
            return self.get_response(request)
        
        # Determine endpoint category
        endpoint = 'api'
        for path, category in self.ENDPOINT_MAPPING.items():
            if request.path.startswith(path):
                endpoint = category
                break
        
        # Check if blocked
        ip = RateLimitService.get_client_ip(request)
        is_blocked, reason = RateLimitService.is_blocked(ip, RateLimitType.IP)
        
        if is_blocked:
            return JsonResponse({
                'error': 'Too many requests',
                'reason': reason,
                'retry_after': 3600
            }, status=429)
        
        # Check rate limit
        result = RateLimitService.check_request(request, endpoint)
        
        if not result.allowed:
            # Add headers for client
            response = JsonResponse({
                'error': 'Rate limit exceeded',
                'retry_after': result.reset_time
            }, status=429)
            
            response['X-RateLimit-Limit'] = str(result.limit)
            response['X-RateLimit-Remaining'] = '0'
            response['X-RateLimit-Reset'] = str(result.reset_time)
            response['Retry-After'] = str(result.reset_time)
            
            return response
        
        # Proceed with request
        response = self.get_response(request)
        
        # Add rate limit headers
        response['X-RateLimit-Limit'] = str(result.limit)
        response['X-RateLimit-Remaining'] = str(result.remaining)
        response['X-RateLimit-Reset'] = str(result.reset_time)
        
        return response
