"""
Distributed Token Bucket Rate Limiter using Redis Lua Scripts.
Provides atomic rate limiting, burst handling, tier multipliers, and in-memory fallback.
"""

import functools
import hashlib
import logging
import math
import threading
import time
from dataclasses import dataclass
from enum import Enum
from typing import Any, Callable, Dict, Optional, Tuple

from django.conf import settings
from django.http import HttpRequest, JsonResponse

logger = logging.getLogger(__name__)

# Redis Lua Script for atomic Token Bucket evaluation
# Guarantees zero race conditions, sub-millisecond execution, and continuous token refills
LUA_TOKEN_BUCKET = """
local key = KEYS[1]
local refill_rate = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])
local ttl = math.ceil(tonumber(ARGV[5]))

local data = redis.call('HMGET', key, 'tokens', 'last_updated')
local tokens = tonumber(data[1])
local last_updated = tonumber(data[2])

if tokens == nil then
    tokens = capacity
    last_updated = now
else
    local elapsed = math.max(0, now - last_updated)
    tokens = math.min(capacity, tokens + (elapsed * refill_rate))
    last_updated = now
end

local allowed = 0
local remaining = tokens
local retry_after = 0

if tokens >= requested then
    tokens = tokens - requested
    allowed = 1
    remaining = tokens
else
    local missing = requested - tokens
    if refill_rate > 0 then
        retry_after = math.ceil(missing / refill_rate)
    else
        retry_after = 60
    end
end

redis.call('HMSET', key, 'tokens', tokens, 'last_updated', last_updated)
redis.call('EXPIRE', key, ttl)

return { allowed, math.floor(remaining), retry_after, capacity }
"""


class RateLimitTier(Enum):
    """User account tiers with escalating capacity budgets."""

    ANONYMOUS = "ANONYMOUS"
    FREE = "FREE"
    PRO = "PRO"
    INSTRUCTOR = "INSTRUCTOR"
    ADMIN = "ADMIN"


@dataclass
class RateLimitConfig:
    """Token Bucket parameters."""

    capacity: int  # Maximum burst token capacity
    refill_rate: float  # Replenishment rate in tokens per second


@dataclass
class RateLimitResult:
    """Outcome of a rate limit evaluation."""

    allowed: bool
    remaining: int
    retry_after: int
    capacity: int
    reset_time: int


class DistributedTokenBucketRateLimiter:
    """
    High-performance distributed rate limiter powered by Redis Lua scripts.
    Features:
    - Atomicity: Token checks and deductions execute as a single Redis Lua atomic operation.
    - Continuous Refill: Eliminates boundary spike vulnerabilities inherent to fixed windows.
    - Tiered Capacity: Dynamically scales allowance based on authenticated user membership.
    - Resilient Fallback: Thread-safe in-memory token bucket if Redis is absent or disconnected.
    """

    # Default rate configurations: (capacity, refill_tokens_per_second)
    # 60 tokens / 1.0 per sec = steady state 60 req/min with burst up to 60
    TIER_CONFIGS: Dict[RateLimitTier, RateLimitConfig] = {
        RateLimitTier.ANONYMOUS: RateLimitConfig(
            capacity=20, refill_rate=0.5
        ),  # 30 req/min, burst 20
        RateLimitTier.FREE: RateLimitConfig(
            capacity=60, refill_rate=1.0
        ),  # 60 req/min, burst 60
        RateLimitTier.PRO: RateLimitConfig(
            capacity=300, refill_rate=5.0
        ),  # 300 req/min, burst 300
        RateLimitTier.INSTRUCTOR: RateLimitConfig(
            capacity=600, refill_rate=10.0
        ),  # 600 req/min, burst 600
        RateLimitTier.ADMIN: RateLimitConfig(
            capacity=2000, refill_rate=50.0
        ),  # 3000 req/min, burst 2000
    }

    # Endpoint multipliers to restrict expensive routes (auth, AI, heavy search)
    ENDPOINT_PROFILES: Dict[str, Dict[str, float]] = {
        "auth": {
            "capacity_factor": 0.25,
            "rate_factor": 0.2,
        },  # e.g., login/registration brute-force defense
        "ai": {
            "capacity_factor": 0.33,
            "rate_factor": 0.33,
        },  # Expensive LLM token streams
        "search": {
            "capacity_factor": 0.5,
            "rate_factor": 0.5,
        },  # Full-text / Vector search queries
        "default": {"capacity_factor": 1.0, "rate_factor": 1.0},
    }

    _instance = None
    _lock = threading.Lock()
    _in_memory_buckets: Dict[str, Dict[str, float]] = {}

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        self._redis_client = None
        self._lua_script = None
        self._init_redis()

    def _init_redis(self):
        try:
            import redis

            redis_url = getattr(settings, "REDIS_URL", "redis://localhost:6379/0")
            client = redis.from_url(
                redis_url, decode_responses=True, socket_connect_timeout=1.5
            )
            # Ping connection
            client.ping()
            self._redis_client = client
            self._lua_script = client.register_script(LUA_TOKEN_BUCKET)
            logger.info(
                "DistributedTokenBucketRateLimiter: Connected to Redis (%s)", redis_url
            )
        except Exception as exc:
            logger.warning(
                "DistributedTokenBucketRateLimiter: Redis unavailable (%s). Using thread-safe in-memory fallback.",
                exc,
            )
            self._redis_client = None
            self._lua_script = None

    def check_rate_limit(
        self,
        identifier: str,
        tier: RateLimitTier = RateLimitTier.FREE,
        endpoint_category: str = "default",
        cost: int = 1,
    ) -> RateLimitResult:
        """
        Evaluate if a request from identifier is allowed under the configured token bucket.
        """
        base_config = self.TIER_CONFIGS.get(tier, self.TIER_CONFIGS[RateLimitTier.FREE])
        profile = self.ENDPOINT_PROFILES.get(
            endpoint_category, self.ENDPOINT_PROFILES["default"]
        )

        capacity = max(1, int(base_config.capacity * profile["capacity_factor"]))
        refill_rate = max(0.01, base_config.refill_rate * profile["rate_factor"])
        # TTL: time required to fully recharge from empty + buffer
        ttl = max(60, int(math.ceil(capacity / refill_rate) + 60))

        key = f"tb_rate_limit:{tier.value}:{endpoint_category}:{hashlib.sha256(identifier.encode()).hexdigest()[:24]}"
        now = time.time()

        # 1. Attempt Redis Lua Script Execution
        if self._lua_script is not None:
            try:
                allowed, remaining, retry_after, cap = self._lua_script(
                    keys=[key],
                    args=[refill_rate, capacity, now, cost, ttl],
                )
                return RateLimitResult(
                    allowed=bool(allowed),
                    remaining=int(remaining),
                    retry_after=int(retry_after),
                    capacity=int(cap),
                    reset_time=int(now + retry_after) if retry_after > 0 else int(now),
                )
            except Exception as e:
                logger.error(
                    "Redis Lua rate limiter failed, falling back to memory: %s", e
                )

        # 2. Resilient In-Memory Fallback
        return self._check_in_memory(key, capacity, refill_rate, now, cost, ttl)

    def _check_in_memory(
        self,
        key: str,
        capacity: int,
        refill_rate: float,
        now: float,
        cost: int,
        ttl: int,
    ) -> RateLimitResult:
        with self._lock:
            bucket = self._in_memory_buckets.get(key)
            if bucket is None:
                tokens = float(capacity)
                last_updated = now
            else:
                elapsed = max(0.0, now - bucket["last_updated"])
                tokens = min(
                    float(capacity), bucket["tokens"] + (elapsed * refill_rate)
                )
                last_updated = now

            if tokens >= cost:
                tokens -= cost
                allowed = True
                remaining = int(tokens)
                retry_after = 0
            else:
                allowed = False
                remaining = int(tokens)
                missing = cost - tokens
                retry_after = (
                    math.ceil(missing / refill_rate) if refill_rate > 0 else 60
                )

            self._in_memory_buckets[key] = {
                "tokens": tokens,
                "last_updated": last_updated,
                "expires_at": now + ttl,
            }

            # Periodic prune for in-memory leaks if dictionary grows large
            if len(self._in_memory_buckets) > 5000:
                self._in_memory_buckets = {
                    k: v
                    for k, v in self._in_memory_buckets.items()
                    if v["expires_at"] > now
                }

            return RateLimitResult(
                allowed=allowed,
                remaining=remaining,
                retry_after=retry_after,
                capacity=capacity,
                reset_time=int(now + retry_after) if retry_after > 0 else int(now),
            )

    @classmethod
    def get_client_tier(cls, user) -> RateLimitTier:
        """Resolve RateLimitTier from authenticated Django User."""
        if not user or not user.is_authenticated:
            return RateLimitTier.ANONYMOUS
        if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
            return RateLimitTier.ADMIN

        # Check role field or pro attributes
        role = getattr(user, "role", "").upper()
        if role in ("INSTRUCTOR", "TEACHER"):
            return RateLimitTier.INSTRUCTOR

        if getattr(user, "is_pro", False) or role in ("PRO", "PREMIUM"):
            return RateLimitTier.PRO

        return RateLimitTier.FREE


# ==============================================================================
# DECORATOR & DRF THROTTLE
# ==============================================================================


def rate_limit_token_bucket(
    endpoint_category: str = "default",
    cost: int = 1,
    key_func: Optional[Callable[[HttpRequest], str]] = None,
):
    """
    View decorator enforcing Redis Lua distributed token bucket rate limiting.
    """

    def decorator(view_func):
        @functools.wraps(view_func)
        def wrapped_view(request, *args, **kwargs):
            if not getattr(settings, "RATE_LIMITING_ENABLED", True):
                return view_func(request, *args, **kwargs)

            limiter = DistributedTokenBucketRateLimiter()
            user = getattr(request, "user", None)
            if key_func:
                identifier = key_func(request)
            else:
                if user and getattr(user, "is_authenticated", False):
                    identifier = f"usr:{user.id}"
                else:
                    x_fwd = request.META.get("HTTP_X_FORWARDED_FOR")
                    identifier = f"ip:{x_fwd.split(',')[0].strip() if x_fwd else request.META.get('REMOTE_ADDR', '127.0.0.1')}"

            tier = limiter.get_client_tier(user)
            result = limiter.check_rate_limit(
                identifier=identifier,
                tier=tier,
                endpoint_category=endpoint_category,
                cost=cost,
            )

            if not result.allowed:
                return JsonResponse(
                    {
                        "error": "Rate limit exceeded",
                        "detail": f"Too many requests. Token bucket exhausted. Try again in {result.retry_after}s.",
                        "retry_after": result.retry_after,
                        "tier": tier.value,
                    },
                    status=429,
                    headers={
                        "Retry-After": str(result.retry_after),
                        "X-RateLimit-Limit": str(result.capacity),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(result.reset_time),
                    },
                )

            response = view_func(request, *args, **kwargs)
            response["X-RateLimit-Limit"] = str(result.capacity)
            response["X-RateLimit-Remaining"] = str(result.remaining)
            response["X-RateLimit-Reset"] = str(result.reset_time)
            return response

        return wrapped_view

    return decorator


try:
    from rest_framework.throttling import BaseThrottle

    class DistributedTokenBucketRateThrottle(BaseThrottle):
        """
        DRF-compatible throttle backed by DistributedTokenBucketRateLimiter.
        """

        endpoint_category = "default"
        cost = 1

        def __init__(self):
            self.limiter = DistributedTokenBucketRateLimiter()

        def allow_request(self, request, view):
            if not getattr(settings, "RATE_LIMITING_ENABLED", True):
                return True

            category = getattr(view, "rate_limit_category", self.endpoint_category)
            user = getattr(request, "user", None)
            tier = self.limiter.get_client_tier(user)

            if user and getattr(user, "is_authenticated", False):
                identifier = f"usr:{user.id}"
            else:
                x_fwd = request.META.get("HTTP_X_FORWARDED_FOR")
                identifier = f"ip:{x_fwd.split(',')[0].strip() if x_fwd else request.META.get('REMOTE_ADDR', '127.0.0.1')}"

            self.result = self.limiter.check_rate_limit(
                identifier=identifier,
                tier=tier,
                endpoint_category=category,
                cost=self.cost,
            )
            return self.result.allowed

        def wait(self):
            return (
                getattr(self, "result", None).retry_after
                if getattr(self, "result", None)
                else None
            )

except ImportError:

    class DistributedTokenBucketRateThrottle:
        pass
