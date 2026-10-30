"""
Distributed Rate Limiter using Redis Lua Scripts

Implements token bucket algorithm with atomic Redis operations for
distributed rate limiting across multiple backend instances.
"""

import time
import logging
from typing import Optional, Tuple
from django.conf import settings
from django.core.cache import cache

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    redis = None

logger = logging.getLogger(__name__)

# Lua script for token bucket rate limiting
# Returns: [allowed (0/1), remaining_tokens, retry_after_seconds]
TOKEN_BUCKET_SCRIPT = """
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local requested = tonumber(ARGV[3])
local now = tonumber(ARGV[4])

local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(bucket[1])
local last_refill = tonumber(bucket[2])

if tokens == nil then
    tokens = capacity
    last_refill = now
end

-- Calculate tokens to add based on time elapsed
local elapsed = now - last_refill
local new_tokens = math.min(capacity, tokens + (elapsed * refill_rate))

if new_tokens >= requested then
    new_tokens = new_tokens - requested
    redis.call('HMSET', key, 'tokens', new_tokens, 'last_refill', now)
    redis.call('EXPIRE', key, math.ceil(capacity / refill_rate) + 60)
    return {1, new_tokens, 0}
else
    local retry_after = (requested - new_tokens) / refill_rate
    redis.call('HMSET', key, 'tokens', new_tokens, 'last_refill', now)
    redis.call('EXPIRE', key, math.ceil(capacity / refill_rate) + 60)
    return {0, new_tokens, math.ceil(retry_after)}
end
"""

# Lua script for sliding window rate limiting
# Returns: [allowed (0/1), current_count, retry_after_seconds]
SLIDING_WINDOW_SCRIPT = """
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

-- Remove expired entries
local cutoff = now - window_ms
redis.call('ZREMRANGEBYSCORE', key, '-inf', cutoff)

-- Count current requests
local current = redis.call('ZCARD', key)

if current < limit then
    -- Add new request
    local member = now .. '-' .. math.random(1000000)
    redis.call('ZADD', key, now, member)
    redis.call('EXPIRE', key, math.ceil(window_ms / 1000) + 1)
    return {1, current + 1, 0}
else
    -- Get oldest entry to calculate retry time
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local retry_after = 0
    if #oldest > 0 then
        retry_after = math.ceil((tonumber(oldest[2]) + window_ms - now) / 1000)
    end
    return {0, current, retry_after}
end
"""

# Lua script for fixed window rate limiting (simpler, faster)
# Returns: [allowed (0/1), current_count, retry_after_seconds]
FIXED_WINDOW_SCRIPT = """
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window_sec = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local current = redis.call('GET', key)
current = tonumber(current) or 0

if current < limit then
    local new_val = redis.call('INCR', key)
    if new_val == 1 then
        redis.call('EXPIRE', key, window_sec)
    end
    local ttl = redis.call('TTL', key)
    return {1, new_val, 0}
else
    local ttl = redis.call('TTL', key)
    return {0, current, ttl}
end
"""


class DistributedRateLimiter:
    """
    Distributed rate limiter using Redis Lua scripts for atomicity.

    Supports three algorithms:
    - token_bucket: Smooth rate limiting with burst allowance
    - sliding_window: Precise rate limiting with rolling window
    - fixed_window: Simple, fast rate limiting (less precise)
    """

    def __init__(
        self,
        redis_url: Optional[str] = None,
        algorithm: str = "token_bucket",
        default_limit: int = 100,
        default_window: int = 60,  # seconds
    ):
        self.algorithm = algorithm
        self.default_limit = default_limit
        self.default_window = default_window

        if REDIS_AVAILABLE:
            self.redis_url = redis_url or getattr(settings, 'REDIS_URL', 'redis://localhost:6379/0')
            self._redis = redis.from_url(
                self.redis_url,
                decode_responses=True,
                max_connections=20,
            )
            # Register Lua scripts
            self._token_bucket_sha = self._redis.script_load(TOKEN_BUCKET_SCRIPT)
            self._sliding_window_sha = self._redis.script_load(SLIDING_WINDOW_SCRIPT)
            self._fixed_window_sha = self._redis.script_load(FIXED_WINDOW_SCRIPT)
        else:
            logger.warning("Redis not available, using in-memory fallback")
            self._redis = None
            self._local_buckets = {}
            self._lock = __import__('threading').Lock()

    def _get_redis_key(self, identifier: str, scope: str = "default") -> str:
        """Generate Redis key for rate limit bucket."""
        return f"ratelimit:{scope}:{identifier}"

    def check_rate_limit(
        self,
        identifier: str,
        limit: Optional[int] = None,
        window: Optional[int] = None,
        scope: str = "default",
        requested: int = 1,
    ) -> Tuple[bool, int, int]:
        """
        Check and consume rate limit.

        Args:
            identifier: Unique identifier (user_id, IP, API key, etc.)
            limit: Maximum requests allowed in window
            window: Time window in seconds
            scope: Rate limit scope (e.g., "api", "login", "ai_tutor")
            requested: Number of tokens to consume (default 1)

        Returns:
            Tuple of (allowed, remaining, retry_after_seconds)
        """
        limit = limit or self.default_limit
        window = window or self.default_window
        key = self._get_redis_key(identifier, scope)
        now = time.time()

        if self._redis:
            try:
                if self.algorithm == "token_bucket":
                    # refill_rate = tokens per second
                    refill_rate = limit / window
                    result = self._redis.evalsha(
                        self._token_bucket_sha,
                        1, key,
                        limit, refill_rate, requested, now
                    )
                    return bool(result[0]), int(result[1]), int(result[2])

                elif self.algorithm == "sliding_window":
                    window_ms = window * 1000
                    now_ms = int(now * 1000)
                    result = self._redis.evalsha(
                        self._sliding_window_sha,
                        1, key,
                        limit, window_ms, now_ms
                    )
                    return bool(result[0]), int(result[1]), int(result[2])

                else:  # fixed_window
                    result = self._redis.evalsha(
                        self._fixed_window_sha,
                        1, key,
                        limit, window, int(now)
                    )
                    return bool(result[0]), int(result[1]), int(result[2])

            except Exception as e:
                logger.error(f"Redis rate limit error: {e}")
                # Fall through to local fallback

        # In-memory fallback (single instance only)
        return self._local_check_rate_limit(identifier, limit, window, scope, requested, now)

    def _local_check_rate_limit(
        self,
        identifier: str,
        limit: int,
        window: int,
        scope: str,
        requested: int,
        now: float,
    ) -> Tuple[bool, int, int]:
        """In-memory fallback for when Redis is unavailable."""
        key = f"{scope}:{identifier}"

        with self._lock:
            if key not in self._local_buckets:
                self._local_buckets[key] = {
                    'tokens': limit,
                    'last_refill': now,
                    'window_start': now,
                    'count': 0,
                }

            bucket = self._local_buckets[key]

            if self.algorithm == "token_bucket":
                elapsed = now - bucket['last_refill']
                refill_rate = limit / window
                bucket['tokens'] = min(limit, bucket['tokens'] + elapsed * refill_rate)
                bucket['last_refill'] = now

                if bucket['tokens'] >= requested:
                    bucket['tokens'] -= requested
                    return True, int(bucket['tokens']), 0
                else:
                    retry_after = int((requested - bucket['tokens']) / refill_rate)
                    return False, int(bucket['tokens']), retry_after

            elif self.algorithm == "sliding_window":
                # Clean old entries (simplified)
                if now - bucket['window_start'] > window:
                    bucket['window_start'] = now
                    bucket['count'] = 0

                if bucket['count'] < limit:
                    bucket['count'] += requested
                    return True, bucket['count'], 0
                else:
                    retry_after = int(window - (now - bucket['window_start']))
                    return False, bucket['count'], max(1, retry_after)

            else:  # fixed_window
                if now - bucket['window_start'] > window:
                    bucket['window_start'] = now
                    bucket['count'] = 0

                if bucket['count'] < limit:
                    bucket['count'] += requested
                    return True, limit - bucket['count'], 0
                else:
                    retry_after = int(window - (now - bucket['window_start']))
                    return False, bucket['count'], max(1, retry_after)

    def get_current_usage(
        self,
        identifier: str,
        scope: str = "default",
    ) -> int:
        """Get current usage count for identifier."""
        key = self._get_redis_key(identifier, scope)

        if self._redis:
            try:
                if self.algorithm == "token_bucket":
                    bucket = self._redis.hmget(key, 'tokens')
                    tokens = float(bucket[0]) if bucket[0] else 0
                    return int(tokens)
                else:
                    count = self._redis.get(key)
                    return int(count) if count else 0
            except Exception:
                pass

        # Fallback
        with self._lock:
            bucket = self._local_buckets.get(f"{scope}:{identifier}", {})
            if self.algorithm == "token_bucket":
                return int(bucket.get('tokens', 0))
            return bucket.get('count', 0)

    def reset(self, identifier: str, scope: str = "default") -> bool:
        """Reset rate limit for identifier."""
        key = self._get_redis_key(identifier, scope)

        if self._redis:
            try:
                return bool(self._redis.delete(key))
            except Exception:
                pass

        with self._lock:
            if f"{scope}:{identifier}" in self._local_buckets:
                del self._local_buckets[f"{scope}:{identifier}"]
                return True
        return False


# Pre-configured rate limiters for common use cases
class RateLimitPresets:
    """Pre-configured rate limiters for common endpoints."""

    # API endpoints
    API_DEFAULT = DistributedRateLimiter(algorithm="token_bucket", default_limit=1000, default_window=60)
    API_STRICT = DistributedRateLimiter(algorithm="token_bucket", default_limit=100, default_window=60)

    # Authentication
    LOGIN = DistributedRateLimiter(algorithm="fixed_window", default_limit=5, default_window=60)
    REGISTER = DistributedRateLimiter(algorithm="fixed_window", default_limit=10, default_window=3600)
    PASSWORD_RESET = DistributedRateLimiter(algorithm="fixed_window", default_limit=3, default_window=3600)

    # AI Tutor (cost control)
    AI_TUTOR = DistributedRateLimiter(algorithm="token_bucket", default_limit=15, default_window=60)
    AI_TUTOR_ANON = DistributedRateLimiter(algorithm="token_bucket", default_limit=3, default_window=60)
    AI_GENERATION = DistributedRateLimiter(algorithm="token_bucket", default_limit=20, default_window=3600)

    # DSA/Code execution
    DSA_SUBMISSION = DistributedRateLimiter(algorithm="fixed_window", default_limit=5, default_window=60)
    DSA_RUN = DistributedRateLimiter(algorithm="token_bucket", default_limit=30, default_window=60)

    # Search
    SEARCH = DistributedRateLimiter(algorithm="token_bucket", default_limit=100, default_window=60)
    SEMANTIC_SEARCH = DistributedRateLimiter(algorithm="token_bucket", default_limit=30, default_window=60)

    # Payments
    PAYMENT = DistributedRateLimiter(algorithm="fixed_window", default_limit=10, default_window=3600)

    # WebSocket
    WS_CONNECT = DistributedRateLimiter(algorithm="fixed_window", default_limit=10, default_window=60)

    # File upload
    FILE_UPLOAD = DistributedRateLimiter(algorithm="fixed_window", default_limit=20, default_window=3600)


# Decorator for easy rate limiting on views
def rate_limit(
    limiter: DistributedRateLimiter,
    identifier_func=None,
    scope: str = "default",
    limit: Optional[int] = None,
    window: Optional[int] = None,
):
    """
    Decorator to apply rate limiting to Django views.

    Usage:
        @rate_limit(RateLimitPresets.LOGIN, identifier_func=lambda r: r.META['REMOTE_ADDR'])
        def login_view(request):
            ...
    """
    def decorator(view_func):
        def wrapped_view(request, *args, **kwargs):
            # Determine identifier
            if identifier_func:
                identifier = identifier_func(request)
            elif hasattr(request, 'user') and request.user.is_authenticated:
                identifier = f"user:{request.user.id}"
            else:
                identifier = f"ip:{request.META.get('REMOTE_ADDR', 'unknown')}"

            allowed, remaining, retry_after = limiter.check_rate_limit(
                identifier=identifier,
                limit=limit,
                window=window,
                scope=scope,
            )

            if not allowed:
                from django.http import JsonResponse
                return JsonResponse(
                    {
                        'error': 'Rate limit exceeded',
                        'retry_after': retry_after,
                        'limit': limit or limiter.default_limit,
                    },
                    status=429,
                    headers={
                        'X-RateLimit-Limit': str(limit or limiter.default_limit),
                        'X-RateLimit-Remaining': str(remaining),
                        'X-RateLimit-Reset': str(int(time.time()) + retry_after),
                        'Retry-After': str(retry_after),
                    }
                )

            response = view_func(request, *args, **kwargs)

            # Add rate limit headers to response
            if hasattr(response, 'headers'):
                response.headers['X-RateLimit-Limit'] = str(limit or limiter.default_limit)
                response.headers['X-RateLimit-Remaining'] = str(remaining)
                response.headers['X-RateLimit-Reset'] = str(int(time.time()) + retry_after)

            return response
        return wrapped_view
    return decorator