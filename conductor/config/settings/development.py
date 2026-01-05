"""
Development Settings for Learning Hub Backend.
"""

from .base import *  # noqa: F401, F403

DEBUG = True

# Database - Use SQLite for development
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",  # noqa: F405
    }
}

# Email - Console backend for development
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Allow all origins in development
CORS_ALLOW_ALL_ORIGINS = True

# Logging
LOGGING["root"]["level"] = "DEBUG"  # type: ignore
