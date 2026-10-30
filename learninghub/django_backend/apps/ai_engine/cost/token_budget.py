"""
AI Cost Optimization Module

Provides token budget enforcement, cost tracking, model routing,
and semantic cache hit rate monitoring for AI operations.
"""

import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, Optional, List
from enum import Enum
from django.conf import settings
from django.core.cache import cache
from django.db import models
from django.utils import timezone

logger = logging.getLogger(__name__)


class ModelTier(Enum):
    """AI model tiers for cost optimization."""
    FLASH = "gemini-1.5-flash"      # Cheap, fast, good for simple tasks
    PRO = "gemini-1.5-pro"          # Expensive, powerful, for complex tasks
    ULTRA = "gemini-1.5-ultra"      # Most expensive, maximum capability


@dataclass
class TokenBudget:
    """Token budget configuration for a user/session."""
    daily_limit: int = 100_000      # Tokens per day
    monthly_limit: int = 1_000_000  # Tokens per month
    per_request_limit: int = 8_000  # Max tokens per request
    warning_threshold: float = 0.8  # Warn at 80% of limit


@dataclass
class UsageStats:
    """AI usage statistics."""
    total_tokens: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_requests: int = 0
    cache_hits: int = 0
    cache_misses: int = 0
    estimated_cost_usd: float = 0.0
    by_model: Dict[str, int] = field(default_factory=dict)
    by_operation: Dict[str, int] = field(default_factory=dict)


class ModelRouter:
    """
    Routes requests to appropriate model based on complexity.

    Simple queries -> FLASH (cheaper)
    Complex queries -> PRO (more capable)
    Very complex -> ULTRA (maximum capability)
    """

    # Keywords that indicate complexity
    COMPLEX_KEYWORDS = [
        'analyze', 'compare', 'evaluate', 'synthesize', 'critique',
        'design', 'architect', 'optimize', 'debug', 'refactor',
        'explain in detail', 'comprehensive', 'thorough', 'deep dive',
    ]

    SIMPLE_KEYWORDS = [
        'what is', 'define', 'list', 'summarize', 'brief',
        'quick', 'simple', 'basic', 'overview', 'hello', 'hi',
    ]

    def __init__(self):
        self.default_tier = ModelTier.FLASH
        self.complexity_threshold = 0.6  # 0-1 score

    def route(self, prompt: str, context: dict = None) -> ModelTier:
        """
        Determine which model tier to use based on prompt complexity.

        Returns:
            ModelTier enum value
        """
        complexity_score = self._calculate_complexity(prompt, context)

        if complexity_score >= 0.8:
            return ModelTier.ULTRA
        elif complexity_score >= self.complexity_threshold:
            return ModelTier.PRO
        else:
            return ModelTier.FLASH

    def _calculate_complexity(self, prompt: str, context: dict = None) -> float:
        """Calculate complexity score 0-1."""
        prompt_lower = prompt.lower()
        score = 0.3  # Base score

        # Check for complex keywords
        for keyword in self.COMPLEX_KEYWORDS:
            if keyword in prompt_lower:
                score += 0.15

        # Check for simple keywords (reduce score)
        for keyword in self.SIMPLE_KEYWORDS:
            if keyword in prompt_lower:
                score -= 0.1

        # Length factor
        word_count = len(prompt.split())
        if word_count > 500:
            score += 0.2
        elif word_count > 200:
            score += 0.1
        elif word_count < 50:
            score -= 0.1

        # Context complexity
        if context:
            if context.get('requires_code_execution'):
                score += 0.2
            if context.get('requires_reasoning'):
                score += 0.15
            if context.get('multi_step'):
                score += 0.1

        return max(0.0, min(1.0, score))


class TokenBudgetEnforcer:
    """
    Enforces token budgets per user/session with Redis-backed tracking.
    """

    def __init__(self, redis_url: str = None):
        self.redis_url = redis_url or getattr(settings, 'REDIS_URL', 'redis://localhost:6379/0')
        self._redis = None
        self._init_redis()

    def _init_redis(self):
        try:
            import redis
            self._redis = redis.from_url(
                self.redis_url,
                decode_responses=True,
                max_connections=10,
            )
            self._redis.ping()
        except Exception as e:
            logger.warning(f"Redis not available for token budget: {e}")
            self._redis = None

    def _get_user_key(self, user_id: str, period: str) -> str:
        """Generate Redis key for user token tracking."""
        return f"token_budget:{period}:{user_id}"

    def check_budget(
        self,
        user_id: str,
        estimated_tokens: int,
        budget: TokenBudget = None,
    ) -> tuple[bool, dict]:
        """
        Check if user has budget for estimated tokens.

        Returns:
            (allowed: bool, info: dict)
        """
        budget = budget or TokenBudget()
        now = timezone.now()

        # Check daily budget
        daily_key = self._get_user_key(user_id, f"daily:{now.date()}")
        daily_used = self._get_usage(daily_key)
        daily_remaining = budget.daily_limit - daily_used

        # Check monthly budget
        monthly_key = self._get_user_key(user_id, f"monthly:{now.year}-{now.month:02d}")
        monthly_used = self._get_usage(monthly_key)
        monthly_remaining = budget.monthly_limit - monthly_used

        # Check per-request limit
        if estimated_tokens > budget.per_request_limit:
            return False, {
                "allowed": False,
                "reason": "per_request_limit_exceeded",
                "limit": budget.per_request_limit,
                "requested": estimated_tokens,
            }

        # Check daily limit
        if daily_used + estimated_tokens > budget.daily_limit:
            return False, {
                "allowed": False,
                "reason": "daily_limit_exceeded",
                "used": daily_used,
                "limit": budget.daily_limit,
                "remaining": daily_remaining,
                "reset_at": (now + timedelta(days=1)).replace(hour=0, minute=0, second=0).isoformat(),
            }

        # Check monthly limit
        if monthly_used + estimated_tokens > budget.monthly_limit:
            return False, {
                "allowed": False,
                "reason": "monthly_limit_exceeded",
                "used": monthly_used,
                "limit": budget.monthly_limit,
                "remaining": monthly_remaining,
            }

        # Check warning threshold
        warning = False
        if daily_used + estimated_tokens > budget.daily_limit * budget.warning_threshold:
            warning = True

        return True, {
            "allowed": True,
            "warning": warning,
            "daily_used": daily_used,
            "daily_remaining": daily_remaining,
            "monthly_used": monthly_used,
            "monthly_remaining": monthly_remaining,
        }

    def consume_budget(
        self,
        user_id: str,
        prompt_tokens: int,
        completion_tokens: int,
        model: str = "unknown",
        operation: str = "chat",
    ) -> dict:
        """Record token consumption and return updated stats."""
        total_tokens = prompt_tokens + completion_tokens
        now = timezone.now()

        daily_key = self._get_user_key(user_id, f"daily:{now.date()}")
        monthly_key = self._get_user_key(user_id, f"monthly:{now.year}-{now.month:02d}")

        if self._redis:
            try:
                pipe = self._redis.pipeline()
                pipe.incrby(daily_key, total_tokens)
                pipe.incrby(monthly_key, total_tokens)
                pipe.expire(daily_key, 86400 * 2)  # 2 days TTL
                pipe.expire(monthly_key, 86400 * 32)  # 32 days TTL
                pipe.execute()
            except Exception as e:
                logger.error(f"Failed to record token usage: {e}")

        # Also track in Django cache for quick access
        cache_key = f"token_usage:{user_id}:{now.date()}"
        usage = cache.get(cache_key, {"total": 0, "by_model": {}, "by_operation": {}})
        usage["total"] = usage.get("total", 0) + total_tokens
        usage["prompt_tokens"] = usage.get("prompt_tokens", 0) + prompt_tokens
        usage["completion_tokens"] = usage.get("completion_tokens", 0) + completion_tokens
        usage["by_model"][model] = usage["by_model"].get(model, 0) + total_tokens
        usage["by_operation"][operation] = usage["by_operation"].get(operation, 0) + total_tokens
        cache.set(cache_key, usage, 86400 * 2)

        return self.get_usage_stats(user_id)

    def _get_usage(self, key: str) -> int:
        """Get usage from Redis or cache."""
        if self._redis:
            try:
                val = self._redis.get(key)
                return int(val) if val else 0
            except Exception:
                pass
        return 0

    def get_usage_stats(self, user_id: str) -> UsageStats:
        """Get comprehensive usage statistics for user."""
        now = timezone.now()
        daily_key = f"token_usage:{user_id}:{now.date()}"
        usage = cache.get(daily_key, {})

        return UsageStats(
            total_tokens=usage.get("total", 0),
            prompt_tokens=usage.get("prompt_tokens", 0),
            completion_tokens=usage.get("completion_tokens", 0),
            total_requests=usage.get("requests", 0),
            by_model=usage.get("by_model", {}),
            by_operation=usage.get("by_operation", {}),
            estimated_cost_usd=self._estimate_cost(usage),
        )

    def _estimate_cost(self, usage: dict) -> float:
        """Estimate cost in USD based on model pricing (approximate)."""
        # Approximate pricing per 1M tokens (as of 2024)
        pricing = {
            "gemini-1.5-flash": {"input": 0.075, "output": 0.30},
            "gemini-1.5-pro": {"input": 3.50, "output": 10.50},
            "gemini-1.5-ultra": {"input": 7.00, "output": 21.00},
        }

        total_cost = 0.0
        for model, tokens in usage.get("by_model", {}).items():
            model_pricing = pricing.get(model, pricing["gemini-1.5-flash"])
            # Rough split: 60% input, 40% output
            input_tokens = int(tokens * 0.6)
            output_tokens = int(tokens * 0.4)
            total_cost += (input_tokens / 1_000_000) * model_pricing["input"]
            total_cost += (output_tokens / 1_000_000) * model_pricing["output"]

        return round(total_cost, 4)

    def reset_user_budget(self, user_id: str) -> bool:
        """Reset all budgets for a user (admin action)."""
        if not self._redis:
            return False

        try:
            pattern = f"token_budget:*:{user_id}"
            cursor = 0
            while True:
                cursor, keys = self._redis.scan(cursor, match=pattern, count=100)
                if keys:
                    self._redis.delete(*keys)
                if cursor == 0:
                    break
            return True
        except Exception as e:
            logger.error(f"Failed to reset user budget: {e}")
            return False


class SemanticCacheMonitor:
    """
    Monitors semantic cache hit rate and provides optimization insights.
    """

    TARGET_HIT_RATE = 0.30  # Target 30% cache hit rate
    MIN_HIT_RATE_WARNING = 0.15  # Warn if below 15%

    def __init__(self):
        self.stats_key = "semantic_cache:stats"

    def record_hit(self, query_type: str = "general"):
        """Record a cache hit."""
        self._increment("hits", query_type)

    def record_miss(self, query_type: str = "general"):
        """Record a cache miss."""
        self._increment("misses", query_type)

    def _increment(self, metric: str, query_type: str):
        """Increment counter in cache."""
        key = f"{self.stats_key}:{query_type}"
        try:
            current = cache.get(key, {"hits": 0, "misses": 0, "total": 0})
            current[metric] = current.get(metric, 0) + 1
            current["total"] = current.get("hits", 0) + current.get("misses", 0)
            cache.set(key, current, 86400 * 7)  # 7 days
        except Exception as e:
            logger.error(f"Failed to record cache metric: {e}")

    def get_hit_rate(self, query_type: str = "general") -> float:
        """Get current hit rate for query type."""
        key = f"{self.stats_key}:{query_type}"
        stats = cache.get(key, {"hits": 0, "misses": 0, "total": 0})
        total = stats.get("total", 0)
        if total == 0:
            return 0.0
        return stats.get("hits", 0) / total

    def get_all_stats(self) -> Dict[str, dict]:
        """Get stats for all query types."""
        # This would need Redis SCAN in production
        # For now, return known types
        types = ["general", "chat", "code", "analysis", "generation"]
        return {
            t: {
                "hit_rate": self.get_hit_rate(t),
                "hits": cache.get(f"{self.stats_key}:{t}", {}).get("hits", 0),
                "misses": cache.get(f"{self.stats_key}:{t}", {}).get("misses", 0),
            }
            for t in types
        }

    def is_healthy(self) -> tuple[bool, str]:
        """Check if cache hit rate is healthy."""
        overall_rate = self.get_hit_rate("general")

        if overall_rate >= self.TARGET_HIT_RATE:
            return True, f"Cache hit rate healthy: {overall_rate:.1%}"
        elif overall_rate >= self.MIN_HIT_RATE_WARNING:
            return False, f"Cache hit rate below target: {overall_rate:.1%} (target: {self.TARGET_HIT_RATE:.0%})"
        else:
            return False, f"Cache hit rate critically low: {overall_rate:.1%}"


class AICostDashboard:
    """
    Provides dashboard data for AI cost monitoring.
    """

    def __init__(self):
        self.budget_enforcer = TokenBudgetEnforcer()
        self.cache_monitor = SemanticCacheMonitor()
        self.model_router = ModelRouter()

    def get_user_dashboard(self, user_id: str) -> dict:
        """Get cost dashboard for a specific user."""
        usage = self.budget_enforcer.get_usage_stats(user_id)
        budget = TokenBudget()

        return {
            "user_id": user_id,
            "usage": {
                "total_tokens": usage.total_tokens,
                "prompt_tokens": usage.prompt_tokens,
                "completion_tokens": usage.completion_tokens,
                "total_requests": usage.total_requests,
                "by_model": usage.by_model,
                "by_operation": usage.by_operation,
            },
            "cost": {
                "estimated_usd": usage.estimated_cost_usd,
                "daily_budget_usd": self._tokens_to_usd(budget.daily_limit),
                "monthly_budget_usd": self._tokens_to_usd(budget.monthly_limit),
            },
            "budget": {
                "daily_used": usage.total_tokens,  # Simplified
                "daily_limit": budget.daily_limit,
                "monthly_limit": budget.monthly_limit,
                "percentage_used": (
                    usage.total_tokens / budget.daily_limit * 100
                    if budget.daily_limit > 0 else 0
                ),
            },
            "cache": {
                "hit_rate": self.cache_monitor.get_hit_rate(),
                "healthy": self.cache_monitor.is_healthy()[0],
            },
            "recommendations": self._generate_recommendations(usage),
        }

    def get_system_dashboard(self) -> dict:
        """Get system-wide AI cost dashboard."""
        # This would aggregate across all users in production
        cache_stats = self.cache_monitor.get_all_stats()

        return {
            "cache_performance": cache_stats,
            "overall_hit_rate": self.cache_monitor.get_hit_rate(),
            "cache_healthy": self.cache_monitor.is_healthy()[0],
            "model_distribution": self._get_model_distribution(),
            "cost_trends": self._get_cost_trends(),
            "recommendations": self._generate_system_recommendations(cache_stats),
        }

    def _tokens_to_usd(self, tokens: int) -> float:
        """Convert tokens to estimated USD (using Flash pricing)."""
        return round((tokens / 1_000_000) * 0.15, 4)  # ~$0.15 per 1M tokens blended

    def _generate_recommendations(self, usage: UsageStats) -> List[str]:
        """Generate cost optimization recommendations for user."""
        recommendations = []

        if usage.total_tokens == 0:
            return ["Start using AI features to see personalized recommendations."]

        # Check cache hit rate
        hit_rate = self.cache_monitor.get_hit_rate()
        if hit_rate < self.cache_monitor.TARGET_HIT_RATE:
            recommendations.append(
                f"Semantic cache hit rate is {hit_rate:.1%} (target: {self.cache_monitor.TARGET_HIT_RATE:.0%}). "
                "Consider enabling semantic caching for repeated queries."
            )

        # Check model distribution
        flash_usage = usage.by_model.get("gemini-1.5-flash", 0)
        pro_usage = usage.by_model.get("gemini-1.5-pro", 0)
        total_model_usage = flash_usage + pro_usage

        if total_model_usage > 0 and pro_usage / total_model_usage > 0.5:
            recommendations.append(
                f"Pro model usage is {pro_usage/total_model_usage:.0%}. "
                "Consider using Flash model for simpler queries to reduce costs."
            )

        # Check per-request tokens
        if usage.total_requests > 0:
            avg_tokens = usage.total_tokens / usage.total_requests
            if avg_tokens > 5000:
                recommendations.append(
                    f"Average tokens per request is {avg_tokens:.0f}. "
                    "Consider breaking complex requests into smaller chunks."
                )

        return recommendations

    def _get_model_distribution(self) -> dict:
        """Get system-wide model usage distribution."""
        # In production, aggregate from all users
        return {
            "gemini-1.5-flash": {"percentage": 60, "tokens": 1_000_000},
            "gemini-1.5-pro": {"percentage": 35, "tokens": 500_000},
            "gemini-1.5-ultra": {"percentage": 5, "tokens": 100_000},
        }

    def _get_cost_trends(self) -> dict:
        """Get cost trends over time."""
        # In production, query from time-series database
        return {
            "daily_costs": [
                {"date": "2026-10-20", "cost": 12.50},
                {"date": "2026-10-21", "cost": 15.20},
                {"date": "2026-10-22", "cost": 11.80},
                {"date": "2026-10-23", "cost": 18.90},
                {"date": "2026-10-24", "cost": 14.30},
                {"date": "2026-10-25", "cost": 16.70},
                {"date": "2026-10-26", "cost": 13.40},
            ],
            "monthly_projection": 450.00,
        }

    def _generate_system_recommendations(self, cache_stats: dict) -> List[str]:
        """Generate system-wide recommendations."""
        recommendations = []

        overall_rate = self.cache_monitor.get_hit_rate()
        if overall_rate < self.cache_monitor.TARGET_HIT_RATE:
            recommendations.append(
                f"System cache hit rate is {overall_rate:.1%}. "
                "Implement semantic cache warming for common queries."
            )

        # Check for query types with low hit rates
        for qtype, stats in cache_stats.items():
            if stats.get("hit_rate", 0) < 0.1 and stats.get("total", 0) > 100:
                recommendations.append(
                    f"Query type '{qtype}' has very low cache hit rate ({stats['hit_rate']:.1%}). "
                    "Review caching strategy for this operation type."
                )

        return recommendations


# Global instances
_budget_enforcer = None
_cache_monitor = None
_model_router = None
_cost_dashboard = None


def get_budget_enforcer() -> TokenBudgetEnforcer:
    global _budget_enforcer
    if _budget_enforcer is None:
        _budget_enforcer = TokenBudgetEnforcer()
    return _budget_enforcer


def get_cache_monitor() -> SemanticCacheMonitor:
    global _cache_monitor
    if _cache_monitor is None:
        _cache_monitor = SemanticCacheMonitor()
    return _cache_monitor


def get_model_router() -> ModelRouter:
    global _model_router
    if _model_router is None:
        _model_router = ModelRouter()
    return _model_router


def get_cost_dashboard() -> AICostDashboard:
    global _cost_dashboard
    if _cost_dashboard is None:
        _cost_dashboard = AICostDashboard()
    return _cost_dashboard


# Decorator for automatic cost tracking
def track_ai_cost(
    operation: str = "chat",
    user_id_param: str = "user_id",
    budget: TokenBudget = None,
):
    """
    Decorator to automatically track AI costs for a function.

    Usage:
        @track_ai_cost(operation="code_generation")
        def generate_code(user_id, prompt):
            ...
            return response
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Extract user_id
            user_id = kwargs.get(user_id_param)
            if not user_id and args:
                # Try to get from first arg if it's a request object
                if hasattr(args[0], 'user'):
                    user_id = args[0].user.id

            if not user_id:
                logger.warning(f"No user_id found for cost tracking in {func.__name__}")
                return func(*args, **kwargs)

            enforcer = get_budget_enforcer()

            # Estimate tokens (rough approximation)
            prompt = kwargs.get('prompt') or kwargs.get('query') or ""
            estimated_tokens = len(prompt.split()) * 2 + 1000  # Very rough estimate

            # Check budget
            allowed, info = enforcer.check_budget(user_id, estimated_tokens, budget)
            if not allowed:
                raise Exception(f"Token budget exceeded: {info['reason']}")

            # Execute function
            start_time = time.time()
            result = func(*args, **kwargs)

            # Record usage (would need actual token counts from response)
            # This is a simplified version
            try:
                # Try to extract token usage from result
                if hasattr(result, 'usage_metadata'):
                    prompt_tokens = result.usage_metadata.prompt_token_count
                    completion_tokens = result.usage_metadata.candidates_token_count
                elif isinstance(result, dict) and 'usage' in result:
                    prompt_tokens = result['usage'].get('prompt_tokens', 0)
                    completion_tokens = result['usage'].get('completion_tokens', 0)
                else:
                    # Estimate
                    prompt_tokens = len(prompt.split()) * 1.5
                    completion_tokens = 500  # Default estimate

                enforcer.consume_budget(
                    user_id=user_id,
                    prompt_tokens=int(prompt_tokens),
                    completion_tokens=int(completion_tokens),
                    operation=operation,
                )
            except Exception as e:
                logger.error(f"Failed to record AI cost: {e}")

            return result
        return wrapper
    return decorator