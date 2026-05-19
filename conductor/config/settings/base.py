"""
Django Base Settings for Learning Hub Backend.
"""

import os
from datetime import timedelta
from pathlib import Path
import dj_database_url
from dotenv import load_dotenv

# Build paths inside the project
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load environment variables
load_dotenv(BASE_DIR / ".env")

# Security
import uuid

SECRET_KEY = os.getenv("SECRET_KEY")

# Strict enforcement: require SECRET_KEY in production
if not SECRET_KEY:
    if os.getenv("DEBUG", "False").lower() != "true":
        raise ValueError(
            "SECRET_KEY environment variable must be set in production for security. " +
            "Please set SECRET_KEY in your environment."
        )
    # Dev/test only - generate a unique insecure key so multiple dev instances don't conflict
    SECRET_KEY = "django-insecure-dev-" + str(uuid.uuid4())

# SECURITY: Default DEBUG to False for safety
DEBUG = os.getenv("DEBUG", "False").lower() == "true"

# SECURITY: Ensure ALLOWED_HOSTS is properly configured
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
ALLOWED_HOSTS = [host.strip() for host in ALLOWED_HOSTS if host.strip()]
if not ALLOWED_HOSTS and not DEBUG:
    raise ValueError(
        "ALLOWED_HOSTS must be configured in production. " +
        "Please set ALLOWED_HOSTS in your environment (comma-separated)."
    )

# SECURITY: Enforce HTTPS in production via SECURE_SSL_REDIRECT
# These are moved to production.py so local dev works smoothly
# SECURE_SSL_REDIRECT = not DEBUG
# SECURE_HSTS_SECONDS = 31536000
# SECURE_HSTS_INCLUDE_SUBDOMAINS = True
# SECURE_HSTS_PRELOAD = True

# SECURITY: Proxy header for SSL offloading (if behind load balancer/proxy)
if os.getenv("USE_X_FORWARDED_PROTO", "False").lower() == "true":
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Application definition
DJANGO_APPS = [
    "daphne",  # Must be first
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.postgres",  # Advanced Search
]

THIRD_PARTY_APPS = [
    "channels",
    # Monitoring
    "django_prometheus",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    "csp",
    "pgvector",  # Vector Search
    "axes",      # Brute Force Protection
]

LOCAL_APPS = [
    # Core production apps
    "apps.users",
    "apps.courses",
    "apps.exams",           # NEW: Exam taxonomy (Country → Exam → Subject → Topic)
    "apps.test_engine",     # NEW: Robust test engine with AI generation
    "apps.notifications",
    "apps.gamification",
    "apps.payments",
    "apps.ai_engine",
    "apps.dsa",
    "apps.core",
    "apps.discussions",
    "apps.support",
    "apps.chat",
    "apps.dashboard",
    "apps.tutors",
    "apps.live_sessions",
    "apps.search",
    "apps.analytics",
    "apps.analytics_v2",     # NEW: Advanced analytics & performance tracking
    "apps.subscriptions",    # NEW: Monetization, subscriptions, usage limits
    "apps.quiz",            # Legacy quiz (deprecated, use test_engine)
    # Archived apps (disabled to reduce startup time & attack surface):
    # "apps.web3",
    # "apps.metaverse",
    # "apps.neuro",
    # "apps.downloads",
    # "apps.study_groups",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django_prometheus.middleware.PrometheusBeforeMiddleware",
    # CORS must be first to handle preflight OPTIONS requests
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    # Advanced Security Middleware (after CORS + core security)
    "apps.core.security_middleware.SecurityHeadersMiddleware",
    "apps.core.security_middleware.RequestLoggingMiddleware",
    "apps.core.security_middleware.SQLInjectionDetectionMiddleware",
    "apps.core.security_middleware.IPAnomalyDetectionMiddleware",
    "apps.core.security_middleware.JWTBlacklistMiddleware",
    # Resilience
    "apps.core.middleware.SelfHealingMiddleware",
    # Phase 10: Input Sanitization & CORS Hardening
    "apps.core.middleware.InputSanitizationMiddleware",
    "apps.core.middleware.CORSHardeningMiddleware",
    "apps.core.audit_middleware.AuditMiddleware",
    "apps.core.rate_limit_service.RateLimitMiddleware",
    # Django Core
    "csp.middleware.CSPMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "django_prometheus.middleware.PrometheusAfterMiddleware",
    "axes.middleware.AxesMiddleware",
]

# Performance Profiling (Silk) - Dev Only
if DEBUG:
    try:
        import silk  # noqa: F401
        INSTALLED_APPS += ["silk"]
        MIDDLEWARE += ["silk.middleware.SilkyMiddleware"]
        SILKY_PYTHON_PROFILER = True
    except ImportError:
        pass  # Silk not installed, skip profiling


ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates", BASE_DIR.parent / "my_flutter_app" / "build" / "web"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# Database - PostgreSQL for production, SQLite for dev
DATABASES = {
    "default": dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=600,
    )
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Authentication Backends (Axes must be first)
AUTHENTICATION_BACKENDS = [
    "axes.backends.AxesBackend",
    "django.contrib.auth.backends.ModelBackend",
]

# Axes Configuration — brute-force protection
# In production (DEBUG=False), defaults to 5 failed attempts before lockout.
# Override with AXES_FAILURE_LIMIT env var for development flexibility.
AXES_FAILURE_LIMIT = int(os.getenv("AXES_FAILURE_LIMIT", "5"))
AXES_COOLOFF_TIME = 1  # 1 Hour lockout
AXES_LOCKOUT_PARAMETERS = ["ip_address", "username"]
AXES_LOCK_OUT_AT_FAILURE = True  # Immediately lock on exceeding limit
AXES_RESET_ON_SUCCESS = True  # Clear failure counter on successful login
AXES_USE_GEOIP = False
AXES_ENABLE_DOS_SITE = False
AXES_ENABLED = os.getenv("AXES_ENABLED", "True").lower() == "true" and not DEBUG

# Password hashing - Use Argon2 for security
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
]

# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Media files
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

# Default primary key field type
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Custom User Model
AUTH_USER_MODEL = "users.User"

# Rate limit constants
STRICT_RATE = "5/minute"

# Django REST Framework
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.StandardResultsSetPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "apps.core.error_tracking.enhanced_exception_handler",
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/day",
        "user": "5000/day",
        "ai_critic": STRICT_RATE,
        "ai_chat": "10/minute",
        "ai_tutor": "15/minute",
        "ai_generation": "20/hour",
        "login": STRICT_RATE,
        "register": "10/hour",
        "password_reset": "3/hour",
        "dsa_submission": STRICT_RATE,
        "quiz_submission": "20/minute",
        "discussions": "30/minute",
        "payment": "10/hour",
        "subscription": "5/hour",
        "file_upload": "20/hour",
        "bulk_operation": "5/hour",
        "health_check": "60/minute",
        "websocket_connect": "10/minute",
        "search": "100/minute",
        "semantic_search": "30/minute",
    },
    # Versioning
    "DEFAULT_VERSIONING_CLASS": "rest_framework.versioning.URLPathVersioning",
    "DEFAULT_VERSION": "v1",
    "ALLOWED_VERSIONS": ["v1", "v2"],
    "VERSION_PARAM": "version",
}

# JWT Settings
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=int(os.getenv("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", 60))
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=int(os.getenv("JWT_REFRESH_TOKEN_LIFETIME_DAYS", 7))
    ),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": os.getenv("JWT_SECRET_KEY", SECRET_KEY),
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

# CORS Settings
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:3000,http://localhost:5173,http://localhost:8080,"
        "http://127.0.0.1:3000,http://127.0.0.1:5173,http://127.0.0.1:8080",
    ).split(",")
    if origin.strip()
]
CORS_ALLOW_CREDENTIALS = True
CORS_EXPOSE_HEADERS = ["Content-Type", "X-CSRFToken"]

# DRF Spectacular (API Documentation)
SPECTACULAR_SETTINGS = {
    "TITLE": "Learning Hub API",
    "DESCRIPTION": "RESTful API for Learning Hub Mobile Application",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "SECURITY": [{"jwt": []}],
    "SECURITY_DEFINITIONS": {
        "jwt": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }
}

# Email
EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend"
)

# Structlog Configuration
import structlog

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer(),
    ],
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

# Logging
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": structlog.stdlib.ProcessorFormatter,
            "processor": structlog.processors.JSONRenderer(),
        },
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json",
        },
        "file": {
            "level": "INFO",
            "class": "logging.FileHandler",
            "filename": BASE_DIR / "django.log",
            "formatter": "json",
        },
    },
    "loggers": {
        "django": {
            "handlers": ["console", "file"],
            "level": os.getenv("DJANGO_LOG_LEVEL", "INFO"),
            "propagate": False,
        },
        "apps": {
            "handlers": ["console", "file"],
            "level": "INFO",
            "propagate": False,
        },
        "django.security": {
            "handlers": ["console", "file"],
            "level": "INFO",
            "propagate": False,
        },
    },
}

# Celery Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutes
CELERY_TASK_ACKS_LATE = True  # Ensure tasks aren't lost if worker crashes
CELERY_TASK_REJECT_ON_WORKER_LOST = True
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
CELERY_BROKER_POOL_LIMIT = 10
CELERY_TASK_ROUTES = {
    "apps.ai_engine.tasks.*": {"queue": "ai_queue"},
    "apps.core.background_tasks.*": {"queue": "default"},
}

# Caching - Redis
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "IGNORE_EXCEPTIONS": True,  # Fallback to DB if Redis is down
            "CONNECTION_POOL_KWARGS": {
                "max_connections": 100,
                "retry_on_timeout": True,
            }
        },
        "KEY_PREFIX": "learning_hub",
    }
}

# Celery Beat Schedule
CELERY_BEAT_SCHEDULE = {
    # Gamification Tasks
    "reset-weekly-xp": {
        "task": "apps.core.background_tasks.reset_weekly_xp",
        "schedule": 604800,  # Weekly
    },
    "process-streak-reminders": {
        "task": "apps.core.background_tasks.process_streak_reminders",
        "schedule": 86400,  # Daily
    },
    "check-streak-expiry": {
        "task": "apps.gamification.tasks.check_streak_expiry",
        "schedule": 86400,  # Daily
    },
    "check-achievements-batch": {
        "task": "apps.core.background_tasks.check_achievements_batch",
        "schedule": 21600,  # Every 6 hours
    },
    # Maintenance Tasks
    "warm-cache": {
        "task": "apps.core.background_tasks.warm_cache",
        "schedule": 3600,  # Hourly
    },
    "cleanup-blacklisted-tokens": {
        "task": "apps.core.background_tasks.cleanup_blacklisted_tokens",
        "schedule": 86400,  # Daily
    },
    "cleanup-audit-logs": {
        "task": "apps.core.background_tasks.cleanup_old_audit_logs",
        "schedule": 86400,  # Daily
    },
    "cleanup-expired-tokens": {
        "task": "apps.core.background_tasks.cleanup_expired_tokens",
        "schedule": 86400,  # Daily
    },
    # Analytics
    "daily-analytics-aggregation": {
        "task": "apps.core.background_tasks.daily_analytics_aggregation",
        "schedule": 86400,  # Daily (Midnight)
    },
    "calculate-course-stats": {
        "task": "apps.courses.tasks.calculate_course_stats",
        "schedule": 86400,  # Daily
    },
    # Notifications
    "send-daily-digest": {
        "task": "apps.core.background_tasks.send_daily_digest",
        "schedule": 86400,  # Daily at 09:00 UTC
    },
    # Health
    "system-health-check": {
        "task": "apps.core.background_tasks.system_health_check",
        "schedule": 300,  # Every 5 minutes
    },
    # Test Engine Tasks
    "check-expired-attempts": {
        "task": "apps.test_engine.tasks.check_expired_attempts",
        "schedule": 60,  # Every minute
    },
    "cleanup-abandoned-attempts": {
        "task": "apps.test_engine.tasks.cleanup_abandoned_attempts",
        "schedule": 3600,  # Every hour
    },
    "recalculate-question-stats": {
        "task": "apps.test_engine.tasks.recalculate_question_stats",
        "schedule": 86400,  # Daily
    },
    # Subscription Tasks
    "cleanup-expired-subscriptions": {
        "task": "apps.subscriptions.tasks.cleanup_expired_subscriptions",
        "schedule": 3600,  # Every hour
    },
    "send-expiry-reminders": {
        "task": "apps.subscriptions.tasks.send_expiry_reminders",
        "schedule": 86400,  # Daily at 09:00 UTC
    },
    "convert-expired-trials": {
        "task": "apps.subscriptions.tasks.convert_expired_trials",
        "schedule": 86400,  # Daily
    },
}

# Channels / WebSocket Configuration
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [REDIS_URL],
        },
    },
}

# Frontend URL for emails
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Firebase Cloud Messaging (FCM) Configuration
# Set FCM_CREDENTIALS as a dict in settings, or set FCM_CREDENTIALS_PATH to a JSON file path
FCM_CREDENTIALS = os.getenv('FCM_CREDENTIALS', None)  # Can be set as JSON string or dict
FCM_CREDENTIALS_PATH = os.getenv('FCM_CREDENTIALS_PATH', None)  # Path to firebase-admin-sdk json file

# ==============================================================================
# SECURITY HARDENING 🛡️
# ==============================================================================

# Content Security Policy (CSP)
# django-csp configuration - Security hardened
CONTENT_SECURITY_POLICY = {
    "DIRECTIVES": {
        "default-src": ("'self'",),
        "base-uri": ("'self'",),
        "object-src": ("'none'",),
        "font-src": ("'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"),
        "frame-ancestors": ("'none'",),
        "img-src": ("'self'", "data:", "https://images.unsplash.com", "https://*.unsplash.com"),
        "style-src": ("'self'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"),
        "script-src": ("'self'", "https://cdn.jsdelivr.net", "https://unpkg.com", "https://cdnjs.cloudflare.com"),
        "connect-src": ("'self'",),
        "manifest-src": ("'self'",),
    }
}

# CSP and session security settings below (HSTS already configured at top)

# Session Security (enforce HTTPS cookies only in production)
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = False
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'

# SECURITY: Referrer policy
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'

# SECURITY: Cross-Origin Opener Policy
SECURE_CROSS_ORIGIN_OPENER_POLICY = 'same-origin'


# Browser Protections
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# Suppress warnings
SILENCED_SYSTEM_CHECKS = ['drf_spectacular.W002', 'drf_spectacular.W001']



