"""
Test settings for pytest.

This settings module:
1. Excludes AI engine URLs to prevent import-time syntax errors
2. Strips all custom middleware that depends on Redis/external services
3. Uses in-memory cache and channel layers
4. Disables rate limiting, axes, and CSP for test stability
"""

from config.settings.development import *  # type: ignore[assignment]  # noqa: F401, F403  # Django settings inheritance pattern

# Override URL configuration to exclude problematic AI endpoints
ROOT_URLCONF = 'config.urls_test'

# Use in-memory database for faster tests
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# ============================================================================
# MIDDLEWARE — Strip all custom middleware that depends on external services
# ============================================================================
# The full middleware stack has 15+ custom classes that hit Redis, run cache
# operations, or attempt DB queries before the test database is ready.
# We keep only Django core middleware + essential third-party.
_MIDDLEWARE_TO_REMOVE_IN_TESTS = {
    # Custom security middleware — depends on cache/Redis for IP tracking
    "apps.core.security_middleware.SecurityHeadersMiddleware",
    "apps.core.security_middleware.RequestLoggingMiddleware",
    "apps.core.security_middleware.SQLInjectionDetectionMiddleware",
    "apps.core.security_middleware.IPAnomalyDetectionMiddleware",
    "apps.core.security_middleware.JWTBlacklistMiddleware",
    # Self-healing middleware — catches exceptions and does DB connection resets
    "apps.core.middleware.SelfHealingMiddleware",
    # Input sanitization and CORS hardening — not needed in tests
    "apps.core.middleware.InputSanitizationMiddleware",
    "apps.core.middleware.CORSHardeningMiddleware",
    # Audit middleware — depends on cache
    "apps.core.audit_middleware.AuditMiddleware",
    # Rate limiting — depends on cache for sliding window tracking
    "apps.core.rate_limit_service.RateLimitMiddleware",
    # CSP — blocks test client requests
    "csp.middleware.CSPMiddleware",
    # Prometheus — not needed in tests and requires external deps
    "django_prometheus.middleware.PrometheusBeforeMiddleware",
    "django_prometheus.middleware.PrometheusAfterMiddleware",
    # Axes — disabled via AXES_ENABLED but middleware still runs
    "axes.middleware.AxesMiddleware",
    # Silk — profiling not needed in tests
    "silk.middleware.SilkyMiddleware",
}

MIDDLEWARE = [m for m in MIDDLEWARE if m not in _MIDDLEWARE_TO_REMOVE_IN_TESTS]  # type: ignore[name-defined]  # noqa: F405

# ============================================================================
# CACHE — Use in-memory (already set by development.py, but be explicit)
# ============================================================================
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "learning-hub-test-cache",
    }
}

# ============================================================================
# CHANNEL LAYERS — In-memory (no Redis dependency)
# ============================================================================
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    },
}

# ============================================================================
# CELERY — Eager mode (synchronous task execution in tests)
# ============================================================================
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# ============================================================================
# API & AUTH — Disable rate limiting and throttling
# ============================================================================
# Mock AI API keys for testing
GEMINI_API_KEY = "test-gemini-key"
OPENAI_API_KEY = "test-openai-key"
ANTHROPIC_API_KEY = "test-anthropic-key"

# Disable AI engine real calls in tests
AI_ENGINE_MOCK_MODE = True

# Disable rate limiting in tests
REST_FRAMEWORK['DEFAULT_THROTTLE_CLASSES'] = []  # type: ignore[name-defined]  # noqa: F405
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {  # type: ignore[name-defined]  # noqa: F405
    "anon": "99999/minute",
    "user": "99999/minute",
    "login": "99999/minute",
    "register": "99999/minute",
    "password_reset": "99999/minute",
    "ai_critic": "99999/minute",
    "ai_chat": "99999/minute",
    "ai_tutor": "99999/minute",
    "ai_generation": "99999/minute",
    "dsa_submission": "99999/minute",
    "quiz_submission": "99999/minute",
    "discussions": "99999/minute",
    "payment": "99999/minute",
    "subscription": "99999/minute",
    "file_upload": "99999/minute",
    "bulk_operation": "99999/minute",
    "health_check": "99999/minute",
    "websocket_connect": "99999/minute",
    "search": "99999/minute",
    "semantic_search": "99999/minute",
}

# ============================================================================
# SECURITY — Relax for tests
# ============================================================================
# Disable Axes brute-force protection during tests
AXES_ENABLED = False

# Disable custom rate limiting middleware flag
RATE_LIMITING_ENABLED = False

# No SSL in tests
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Faster password hashing for tests
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

# ============================================================================
# LOGGING — Reduce noise during tests
# ============================================================================
import logging
logging.disable(logging.WARNING)
