"""
Development Settings for Learning Hub Backend.
"""

import os
import pathlib
from typing import Any, Dict
from .base import *  # noqa: F401, F403
from .base import BASE_DIR, LOGGING

DEBUG = True

# Remove postgres-specific and unavailable apps for SQLite development
_APPS_TO_REMOVE = {
    "django.contrib.postgres",
    "django_prometheus",
    "pgvector",
}
INSTALLED_APPS = [app for app in INSTALLED_APPS if app not in _APPS_TO_REMOVE]  # type: ignore[name-defined]  # noqa: F405

# Remove prometheus and unavailable middleware for development
_MIDDLEWARE_TO_REMOVE = {
    "django_prometheus.middleware.PrometheusBeforeMiddleware",
    "django_prometheus.middleware.PrometheusAfterMiddleware",
}
MIDDLEWARE = [m for m in MIDDLEWARE if m not in _MIDDLEWARE_TO_REMOVE]  # type: ignore[name-defined]  # noqa: F405

# Database - Use SQLite for development
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": str(BASE_DIR / "db.sqlite3"),  # Convert Path to str
    }
}

# Email - Console backend for development
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Allow all origins in development
CORS_ALLOW_ALL_ORIGINS = True

# Logging override - safely modify dict
_logging: Dict[str, Any] = dict(LOGGING) if isinstance(LOGGING, dict) else {}
if "root" in _logging:
    _logging["root"]["level"] = "DEBUG"
    LOGGING = _logging  # type: ignore[misc]

# Ensure no SSL redirect in development/tests
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Celery Eager mode for local development without Redis
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# Cache - Use local memory for development/testing (no Redis dependency)
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "learning-hub-dev-cache",
    }
}

# Channel layers - Use in-memory for development (no Redis dependency)
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    },
}

# Mock AI API keys for development (use real keys in production)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "dev-gemini-key")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "dev-openai-key")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "dev-anthropic-key")

# Static files configuration for development
STATICFILES_DIRS = [
    pathlib.Path(BASE_DIR) / "static",
]
