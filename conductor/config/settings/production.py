"""
Production Settings for Learning Hub Platform
"""

from .base import *

# SECURITY SETTINGS
DEBUG = False
ALLOWED_HOSTS = [
    h.strip()
    for h in os.environ.get("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
    if h.strip()
]

from django.core.exceptions import ImproperlyConfigured

# Generate a new strong SECRET_KEY for production
# Use: python -c "import secrets; print(secrets.token_urlsafe(60))"
try:
    SECRET_KEY = os.environ["SECRET_KEY"]
except KeyError:
    raise ImproperlyConfigured(
        "SECRET_KEY environment variable is missing and must be set in production."
    )

# Require separate JWT_SECRET_KEY in production
try:
    JWT_SECRET_KEY = os.environ["JWT_SECRET_KEY"]
except KeyError:
    raise ImproperlyConfigured(
        "JWT_SECRET_KEY environment variable is missing and must be set in production. "
        "Do NOT reuse your SECRET_KEY for JWT signing."
    )

# Security Headers
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = "DENY"
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# CSRF and Session Security
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_EXPIRE_AT_BROWSER_CLOSE = True

# CORS — explicit whitelist, override dev's CORS_ALLOW_ALL_ORIGINS
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "CORS_ALLOWED_ORIGINS", "https://learninghub.app,https://www.learninghub.app"
    ).split(",")
    if o.strip()
]

# Axes — strict brute-force limits in production
AXES_ENABLED = True
AXES_FAILURE_LIMIT = 5

# Database - Configure for production
import dj_database_url

if os.environ.get("DATABASE_URL"):
    DATABASES = {
        "default": dj_database_url.config(
            default=os.environ.get("DATABASE_URL"),
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ.get("DB_NAME", "learning_hub"),
            "USER": os.environ.get("DB_USER", "postgres"),
            "PASSWORD": os.environ.get("DB_PASSWORD", ""),
            "HOST": os.environ.get("DB_HOST", "localhost"),
            "PORT": os.environ.get("DB_PORT", "5432"),
            "CONN_MAX_AGE": 600,  # 10 minutes connection pooling
        }
    }

# Cache - Redis for production
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": os.environ.get("REDIS_URL", "redis://localhost:6379/1"),
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
    }
}

# Email - Production SMTP
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = os.environ.get("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", 587))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "noreply@learninghub.app")

# Logging - Production level (Console + Rotating File)
LOGS_DIR = os.path.join(BASE_DIR, "logs")
os.makedirs(LOGS_DIR, exist_ok=True)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "level": "INFO",
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
        "file": {
            "level": "INFO",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": os.path.join(LOGS_DIR, "django.log"),
            "maxBytes": 10485760,  # 10 MB
            "backupCount": 10,
            "formatter": "verbose",
        },
        "mail_admins": {
            "level": "ERROR",
            "class": "django.utils.log.AdminEmailHandler",
        },
    },
    "loggers": {
        "django": {
            "handlers": ["console", "file", "mail_admins"],
            "level": "INFO",
            "propagate": True,
        },
    },
}

# AI API Keys - Load from environment
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

# Celery - Production
CELERY_BROKER_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

# Static and Media Files
STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")
MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media")

# Override JWT configuration for production security
from datetime import timedelta

SIMPLE_JWT.update(
    {
        # Shorter access token lifetime for production security
        "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),  # Reduced from 60 to 15
        "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
        # Enhanced token rotation and blacklisting
        "ROTATE_REFRESH_TOKENS": True,
        "BLACKLIST_AFTER_ROTATION": True,
        "UPDATE_LAST_LOGIN": True,
        # Security claims
        "JTI_CLAIM": "jti",  # JWT ID for token revocation tracking
        "ISSUER": "learninghub",  # Token issuer validation
        "LEEWAY": 0,  # No time leeway for token validation
        # Production signing key (separate from SECRET_KEY)
        "SIGNING_KEY": JWT_SECRET_KEY,
        # HTTP-only cookie support (more secure than localStorage)
        "AUTH_COOKIE": "access_token",
        "AUTH_COOKIE_SECURE": True,  # HTTPS only
        "AUTH_COOKIE_HTTP_ONLY": True,  # Not accessible via JavaScript
        "AUTH_COOKIE_SAMESITE": "Lax",  # CSRF protection
        "AUTH_COOKIE_PATH": "/",
        "AUTH_COOKIE_DOMAIN": os.environ.get("COOKIE_DOMAIN", None),
    }
)

# Rate Limiting - Stricter in production
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"].update(
    {
        "anon": "500/day",  # Reduced from 1000
        "user": "5000/day",  # Reduced from 10000
        "ai_chat": "5/minute",  # Reduced from 10
        "ai_generation": "10/hour",  # Reduced from 20
        "login": "3/minute",  # Reduced from 5
        "password_reset": "2/hour",  # Reduced from 3
        "payment": "5/hour",  # Reduced from 10
    }
)

# Security Admin Email
ADMINS = [
    ("Admin", os.environ.get("ADMIN_EMAIL", "admin@yourdomain.com")),
]
MANAGERS = ADMINS

# Additional Production Security
# Prevent host header injection
USE_X_FORWARDED_HOST = False
SECURE_REFERRER_POLICY = "same-origin"

# Content Security Policy - strict for production (handled by SecurityHeadersMiddleware with nonces)
# These are kept for django-csp package compatibility but overridden by middleware
CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = ("'self'", "https://cdn.jsdelivr.net")
CSP_STYLE_SRC = ("'self'", "https://fonts.googleapis.com")
CSP_FONT_SRC = ("'self'", "https://fonts.gstatic.com")
CSP_IMG_SRC = ("'self'", "data:", "https:")
CSP_CONNECT_SRC = ("'self'",)
CSP_FRAME_ANCESTORS = ("'none'",)  # Prevent iframe embedding

# Observability - Production Settings
OTEL_ENABLED = True
OTEL_SAMPLE_RATE = 0.1
OTEL_EXPORTER_JAEGER = True
OTEL_EXPORTER_OTLP = False  # Set to True if using OTLP collector
# OTEL_OTLP_ENDPOINT = "http://jaeger:4317"  # Uncomment if using OTLP

SENTRY_ENABLED = True
SENTRY_TRACES_SAMPLE_RATE = 0.1
SENTRY_PROFILES_SAMPLE_RATE = 0.1
SENTRY_SEND_PII = False
SENTRY_DEBUG = False
