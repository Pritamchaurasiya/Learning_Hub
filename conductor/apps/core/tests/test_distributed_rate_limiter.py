"""
Unit tests for Distributed Token Bucket Rate Limiter.
Verifies atomic token deductions, burst handling, tier budgets, decorators, and middleware.
"""

import time
import pytest
from django.test import RequestFactory, override_settings
from django.http import HttpResponse

from apps.core.rate_limiting import (
    DistributedTokenBucketRateLimiter,
    RateLimitTier,
    RateLimitResult,
    rate_limit_token_bucket,
)
from apps.core.rate_limit_middleware import RateLimitMiddleware


@pytest.fixture
def limiter():
    limiter_instance = DistributedTokenBucketRateLimiter()
    # Reset in-memory store for predictable unit tests
    limiter_instance._in_memory_buckets.clear()
    return limiter_instance


class TestTokenBucketCore:
    def test_initial_tokens_and_deduction(self, limiter):
        res1 = limiter.check_rate_limit("test-client-1", tier=RateLimitTier.FREE, cost=1)
        assert res1.allowed is True
        assert res1.capacity == 60
        assert res1.remaining == 59
        assert res1.retry_after == 0

    def test_burst_exhaustion(self, limiter):
        identifier = "burst-client"
        # Anonymous capacity is 20 tokens
        for _ in range(20):
            res = limiter.check_rate_limit(identifier, tier=RateLimitTier.ANONYMOUS, cost=1)
            assert res.allowed is True

        # 21st request should be throttled
        res_throttled = limiter.check_rate_limit(identifier, tier=RateLimitTier.ANONYMOUS, cost=1)
        assert res_throttled.allowed is False
        assert res_throttled.remaining == 0
        assert res_throttled.retry_after > 0

    def test_tier_capacities(self, limiter):
        anon = limiter.check_rate_limit("client-anon", tier=RateLimitTier.ANONYMOUS)
        free = limiter.check_rate_limit("client-free", tier=RateLimitTier.FREE)
        pro = limiter.check_rate_limit("client-pro", tier=RateLimitTier.PRO)
        admin = limiter.check_rate_limit("client-admin", tier=RateLimitTier.ADMIN)

        assert anon.capacity < free.capacity < pro.capacity < admin.capacity
        assert admin.capacity == 2000

    def test_endpoint_profile_restriction(self, limiter):
        # Auth profile limits capacity to 25% of tier budget
        res_auth = limiter.check_rate_limit("user-1", tier=RateLimitTier.FREE, endpoint_category="auth")
        res_default = limiter.check_rate_limit("user-2", tier=RateLimitTier.FREE, endpoint_category="default")

        assert res_auth.capacity < res_default.capacity
        assert res_auth.capacity == 15  # 60 * 0.25 = 15


class TestDecoratorAndMiddleware:
    def test_decorator_allows_and_blocks(self, limiter, settings):
        settings.RATE_LIMITING_ENABLED = True

        @rate_limit_token_bucket(endpoint_category="auth")
        def sample_view(request):
            return HttpResponse("Success", status=200)

        factory = RequestFactory()
        req = factory.post("/api/v1/auth/login/")

        # Anonymous capacity for auth is 5 tokens (20 * 0.25 = 5)
        for _ in range(5):
            resp = sample_view(req)
            assert resp.status_code == 200
            assert "X-RateLimit-Limit" in resp
            assert "X-RateLimit-Remaining" in resp

        # 6th request is throttled
        blocked_resp = sample_view(req)
        assert blocked_resp.status_code == 429
        assert "Retry-After" in blocked_resp

    def test_middleware_end_to_end(self, limiter, settings):
        settings.RATE_LIMITING_ENABLED = True
        middleware = RateLimitMiddleware(lambda req: HttpResponse("API Response"))
        factory = RequestFactory()
        req = factory.get("/api/v1/courses/")

        resp = middleware(req)
        assert resp.status_code == 200
        assert "X-RateLimit-Limit" in resp
        assert "X-RateLimit-Remaining" in resp
        assert "X-RateLimit-Reset" in resp
