# 🚦 RATE LIMITING & THROTTLING COMPLETE GUIDE

## Protecting APIs and Services at Scale

---

## 📋 TABLE OF CONTENTS

1. [What is Rate Limiting](#-what-is-rate-limiting)
2. [Algorithms](#-algorithms)
3. [Implementation](#-implementation)
4. [Distributed Rate Limiting](#-distributed-rate-limiting)
5. [Client Identification](#-client-identification)
6. [Response Handling](#-response-handling)
7. [Django/DRF Implementation](#-djangodrf-implementation)
8. [Best Practices](#-best-practices)

---

## 🎯 WHAT IS RATE LIMITING

### Definition

**Rate limiting** is a technique to control the rate of requests a client can make to a server, protecting against abuse and ensuring fair resource allocation.

### Why Rate Limit?

| Threat             | Protection                  |
| ------------------ | --------------------------- |
| **DDoS Attacks**   | Limit request flood         |
| **Brute Force**    | Slow down password attempts |
| **Scraping**       | Prevent data harvesting     |
| **Resource Abuse** | Fair usage for all          |
| **Cost Control**   | Limit expensive operations  |

### Rate Limiting vs Throttling

| Rate Limiting             | Throttling                |
| ------------------------- | ------------------------- |
| Hard limit, reject excess | Slow down, delay requests |
| Return 429 immediately    | Queue and process slowly  |
| Binary: allow or deny     | Gradual degradation       |

---

## 🔢 ALGORITHMS

### 1. Token Bucket

```
┌─────────────────────────────────────────────────────────┐
│                     Token Bucket                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Bucket (capacity: 10 tokens)                           │
│  ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐            │
│  │ ● │ ● │ ● │ ● │ ● │ ● │   │   │   │   │            │
│  └───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘            │
│                ▲                       │                │
│                │  Refill rate:         │ Request       │
│                │  1 token/second       │ takes 1 token │
│                │                       ▼                │
│                                                          │
│  Request handling:                                       │
│  - If tokens > 0: Allow, remove 1 token                 │
│  - If tokens = 0: Reject (429)                          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Implementation**:

```python
import time

class TokenBucket:
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity
        self.refill_rate = refill_rate  # tokens per second
        self.tokens = capacity
        self.last_refill = time.time()

    def allow_request(self) -> bool:
        self._refill()

        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False

    def _refill(self):
        now = time.time()
        elapsed = now - self.last_refill
        new_tokens = elapsed * self.refill_rate
        self.tokens = min(self.capacity, self.tokens + new_tokens)
        self.last_refill = now

# Usage
bucket = TokenBucket(capacity=10, refill_rate=1)  # 10 burst, 1/sec sustained
if bucket.allow_request():
    process_request()
else:
    raise RateLimitExceeded()
```

### 2. Sliding Window Counter

```
┌─────────────────────────────────────────────────────────┐
│               Sliding Window Counter                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Current window (100 req limit per minute)              │
│                                                          │
│  Previous Window │ Current Window                       │
│  (40 requests)   │ (30 requests at 30s into window)    │
│  ┌───────────────┼───────────────────┐                 │
│  │▓▓▓▓▓▓▓▓▓▓     │▓▓▓▓▓▓             │                 │
│  └───────────────┼───────────────────┘                 │
│                  ▲                                       │
│                  │ Now (30s into current minute)        │
│                                                          │
│  Weighted count = (40 * 0.5) + 30 = 50 requests        │
│  (30s remaining from prev window, so weight = 0.5)     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Implementation**:

```python
import time
from dataclasses import dataclass

@dataclass
class WindowState:
    count: int
    timestamp: float

class SlidingWindowCounter:
    def __init__(self, limit: int, window_size: int):
        self.limit = limit
        self.window_size = window_size
        self.previous = WindowState(0, 0)
        self.current = WindowState(0, time.time())

    def allow_request(self) -> bool:
        now = time.time()
        current_window = now // self.window_size

        # New window?
        if current_window != self.current.timestamp // self.window_size:
            self.previous = self.current
            self.current = WindowState(0, now)

        # Calculate weighted count
        elapsed = now % self.window_size
        weight = 1 - (elapsed / self.window_size)
        count = (self.previous.count * weight) + self.current.count

        if count < self.limit:
            self.current.count += 1
            return True
        return False
```

### 3. Fixed Window Counter

```python
class FixedWindowCounter:
    def __init__(self, limit: int, window_size: int):
        self.limit = limit
        self.window_size = window_size
        self.count = 0
        self.window_start = time.time()

    def allow_request(self) -> bool:
        now = time.time()

        # Reset window?
        if now - self.window_start >= self.window_size:
            self.count = 0
            self.window_start = now

        if self.count < self.limit:
            self.count += 1
            return True
        return False
```

### Algorithm Comparison

| Algorithm          | Pros                | Cons              |
| ------------------ | ------------------- | ----------------- |
| **Token Bucket**   | Handles bursts well | Memory per client |
| **Sliding Window** | Smooth, accurate    | More computation  |
| **Fixed Window**   | Simple, fast        | Edge case bursts  |
| **Leaky Bucket**   | Steady output       | No burst handling |

---

## 🔧 IMPLEMENTATION

### Redis-Based Rate Limiter

```python
import redis
import time

class RedisRateLimiter:
    def __init__(self, redis_client: redis.Redis, limit: int, window: int):
        self.redis = redis_client
        self.limit = limit
        self.window = window

    def is_allowed(self, key: str) -> tuple[bool, dict]:
        """Check if request is allowed and return rate limit info."""
        now = time.time()
        window_key = f"ratelimit:{key}:{int(now // self.window)}"

        pipe = self.redis.pipeline()
        pipe.incr(window_key)
        pipe.expire(window_key, self.window + 1)
        results = pipe.execute()

        current_count = results[0]

        return (
            current_count <= self.limit,
            {
                "limit": self.limit,
                "remaining": max(0, self.limit - current_count),
                "reset": int((now // self.window + 1) * self.window)
            }
        )

# Usage
limiter = RedisRateLimiter(redis.Redis(), limit=100, window=60)
allowed, info = limiter.is_allowed(f"user:{user_id}")
if not allowed:
    raise RateLimitExceeded(info)
```

### Sliding Window with Redis

```python
class RedisSlidingWindowLimiter:
    def __init__(self, redis_client: redis.Redis, limit: int, window: int):
        self.redis = redis_client
        self.limit = limit
        self.window = window

    def is_allowed(self, key: str) -> bool:
        now = time.time()
        window_start = now - self.window

        pipe = self.redis.pipeline()

        # Remove old entries
        pipe.zremrangebyscore(key, 0, window_start)

        # Count entries in window
        pipe.zcard(key)

        # Add new entry
        pipe.zadd(key, {str(now): now})

        # Set expiry
        pipe.expire(key, self.window + 1)

        results = pipe.execute()
        request_count = results[1]

        return request_count < self.limit
```

---

## 🌐 DISTRIBUTED RATE LIMITING

### Challenges

| Challenge       | Solution                    |
| --------------- | --------------------------- |
| No shared state | Use Redis/memcached         |
| Race conditions | Lua scripts for atomicity   |
| Latency         | Local caching + sync        |
| Consistency     | Accept eventual consistency |

### Atomic Lua Script

```lua
-- rate_limit.lua
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

-- Clean old entries
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

-- Get count
local count = redis.call('ZCARD', key)

if count < limit then
    redis.call('ZADD', key, now, now)
    redis.call('EXPIRE', key, window)
    return {1, limit - count - 1}
else
    return {0, 0}
end
```

```python
# Python usage
def check_rate_limit(key: str) -> tuple[bool, int]:
    result = redis.eval(
        LUA_SCRIPT,
        1,
        key,
        str(limit),
        str(window),
        str(time.time())
    )
    return bool(result[0]), result[1]
```

---

## 🔍 CLIENT IDENTIFICATION

### Strategies

| Strategy        | Pros                   | Cons                |
| --------------- | ---------------------- | ------------------- |
| **IP Address**  | Simple, no auth needed | Shared IPs, proxies |
| **API Key**     | Clear identification   | Needs integration   |
| **User ID**     | Accurate per-user      | Auth required       |
| **Combination** | Comprehensive          | Complex             |

### Implementation

```python
def get_rate_limit_key(request) -> str:
    # Authenticated user
    if request.user.is_authenticated:
        return f"user:{request.user.id}"

    # API key
    api_key = request.headers.get('X-API-Key')
    if api_key:
        return f"apikey:{api_key}"

    # Fall back to IP
    ip = get_client_ip(request)
    return f"ip:{ip}"

def get_client_ip(request) -> str:
    # Handle proxies (X-Forwarded-For)
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', 'unknown')
```

---

## 📤 RESPONSE HANDLING

### Standard Headers

```python
class RateLimitMiddleware:
    def add_headers(self, response, info):
        response['X-RateLimit-Limit'] = info['limit']
        response['X-RateLimit-Remaining'] = info['remaining']
        response['X-RateLimit-Reset'] = info['reset']

        if info['remaining'] == 0:
            response['Retry-After'] = info['reset'] - int(time.time())

        return response
```

### 429 Response

```python
from rest_framework.exceptions import Throttled
from rest_framework.views import exception_handler

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if isinstance(exc, Throttled):
        response.data = {
            "error": "rate_limit_exceeded",
            "message": "Too many requests. Please slow down.",
            "retry_after": exc.wait
        }

    return response
```

---

## 🐍 DJANGO/DRF IMPLEMENTATION

### DRF Throttling

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
        'auth': '5/minute',  # For login attempts
    }
}
```

### Custom Throttle

```python
from rest_framework.throttling import SimpleRateThrottle

class LoginRateThrottle(SimpleRateThrottle):
    scope = 'auth'

    def get_cache_key(self, request, view):
        # Rate limit by IP for login attempts
        ip = self.get_ident(request)
        return f"throttle_login_{ip}"

class BurstRateThrottle(SimpleRateThrottle):
    scope = 'burst'
    rate = '10/second'

class SustainedRateThrottle(SimpleRateThrottle):
    scope = 'sustained'
    rate = '100/minute'

# Usage: Apply both for burst + sustained limiting
class MyView(APIView):
    throttle_classes = [BurstRateThrottle, SustainedRateThrottle]
```

### Middleware Approach

```python
class RateLimitMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.limiter = RedisRateLimiter(
            redis.Redis(),
            limit=100,
            window=60
        )

    def __call__(self, request):
        # Skip for internal/health checks
        if request.path in ['/health/', '/metrics/']:
            return self.get_response(request)

        key = get_rate_limit_key(request)
        allowed, info = self.limiter.is_allowed(key)

        if not allowed:
            response = JsonResponse({
                'error': 'rate_limit_exceeded',
                'retry_after': info['reset'] - int(time.time())
            }, status=429)
        else:
            response = self.get_response(request)

        # Add headers
        response['X-RateLimit-Limit'] = info['limit']
        response['X-RateLimit-Remaining'] = info['remaining']
        response['X-RateLimit-Reset'] = info['reset']

        return response
```

---

## 💎 BEST PRACTICES

### Configuration

- ✅ Use different limits for different endpoints
- ✅ Higher limits for authenticated users
- ✅ Separate limits for sensitive operations (login, payment)
- ✅ Document rate limits in API documentation

### Implementation

- ✅ Use distributed storage (Redis) for multi-instance
- ✅ Include rate limit headers in all responses
- ✅ Provide clear error messages with retry information
- ✅ Log rate limit violations for monitoring

### Operations

- ✅ Monitor rate limit metrics
- ✅ Alert on unusual patterns
- ✅ Have bypass mechanism for emergencies
- ✅ Regularly review and adjust limits

---

**SINGULARITY ENGINE v17.0**  
_"The best defense is a controlled offense."_
