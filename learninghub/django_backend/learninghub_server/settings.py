import os
import sys
from pathlib import Path
from datetime import timedelta

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Add apps folder to Python path
sys.path.insert(0, os.path.join(BASE_DIR, 'apps'))

# SECURITY: SECRET_KEY must be set via environment variable in production
# Default is only for local development - never commit default secrets
# In production (DEBUG=False) without env, use a random per-boot key (fail-closed:
# tokens invalidate on restart rather than using a guessable default).
from django.core.management.utils import get_random_secret_key as _get_random_secret_key
_SECRET_FROM_ENV = os.environ.get('DJANGO_SECRET_KEY') or os.environ.get('SECRET_KEY')
DEBUG = os.environ.get('DEBUG', 'False').lower() in ('true', '1', 'yes')
# Test runner must use a stable key (random per-boot would still work within a run,
# but dev default keeps legacy tests deterministic).
_IS_TEST_RUNNER = 'pytest' in sys.modules or os.environ.get('PYTEST_CURRENT_TEST') is not None
if _SECRET_FROM_ENV:
    SECRET_KEY = _SECRET_FROM_ENV
elif DEBUG or _IS_TEST_RUNNER:
    SECRET_KEY = 'dev-only-do-not-use-in-production-generate-a-proper-secret'
else:
    SECRET_KEY = _get_random_secret_key()

# SECURITY: Allow only explicitly configured hosts - never '*'
# Production must set ALLOWED_HOSTS env var (comma-separated)
# Development can set for localhost/docker hostnames
ALLOWED_HOSTS = (
    [h.strip() for h in os.environ.get('ALLOWED_HOSTS', '').split(',') if h.strip()]
    if os.environ.get('ALLOWED_HOSTS')
    else ['localhost', '127.0.0.1']
)

# Application definition
INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third party packages
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'drf_spectacular',
    'channels',

    # Internal modular apps
    'apps.core',
    'apps.users',
    'apps.courses',
    'apps.problems',
    'apps.tests_engine',
    'apps.gamification',
    'apps.social',
    'apps.ecommerce',
    'apps.ai_tutor',
    'apps.ebooks',
    'apps.updates',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'apps.core.middleware.CSRFHeaderNormalizerMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'learninghub_server.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'learninghub_server.wsgi.application'
ASGI_APPLICATION = 'learninghub_server.asgi.application'

# Database
DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    try:
        import dj_database_url
        DATABASES = {
            'default': dj_database_url.config(
                default=DATABASE_URL,
                conn_max_age=600,
                conn_health_checks=True,
            )
        }
    except ImportError:
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': BASE_DIR / 'db.sqlite3',
            }
        }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Custom User Model
AUTH_USER_MODEL = 'users.User'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 8},
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ),
    'DEFAULT_PAGINATION_CLASS': 'apps.core.pagination.StandardResultsSetPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'EXCEPTION_HANDLER': 'apps.core.exceptions.custom_exception_handler',
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/min',
        'user': '1000/min',
        'notifications': '30/min',  # Tighter rate limit for notification endpoints
        'leaderboard': '60/min',  # Rate limit for leaderboard (prevents scraping)
        'ai_tutor': '10/min',  # AI tutor rate limit (cost control)
        'ai_tutor_anon': '3/min',  # Anonymous AI tutor (stricter)
    },
}

# Production Security Headers
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_BROWSER_XSS_FILTER = True


# SimpleJWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer', 'JWT'),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# CORS Configuration - Production secure by default
# Development can set CORS_ALLOW_ALL_ORIGINS=True via env if needed
CORS_ALLOW_ALL_ORIGINS = os.environ.get('CORS_ALLOW_ALL_ORIGINS', 'False').lower() in ('true', '1', 'yes')

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-csrf-token',
    'x-requested-with',
    'x-session-id',
    'x-guest-id',
]

# OpenAPI / Swagger Docs Settings
SPECTACULAR_SETTINGS = {
    'TITLE': 'LearningHub API (Django REST)',
    'DESCRIPTION': 'Comprehensive REST API for LearningHub Online Education & Assessment Platform',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# Channels Configuration & Redis Caching
REDIS_URL = os.environ.get('REDIS_URL')

if REDIS_URL:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                'hosts': [REDIS_URL],
            },
        },
    }
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': REDIS_URL,
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                'IGNORE_EXCEPTIONS': True,
            },
            'KEY_PREFIX': 'learninghub',
            'TIMEOUT': 300,
        }
    }
else:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        },
    }
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'learninghub-locmem-cache',
            'TIMEOUT': 300,
        }
    }

# Celery Configuration
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', REDIS_URL or 'memory://')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', REDIS_URL or 'cache')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

ADMIN_SECRET = os.environ.get('ADMIN_SECRET', 'test-admin-secret-key-32charslong!!' if (DEBUG or 'pytest' in sys.modules) else '')

# CSRF Trusted Origins for Frontend Integration
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
]
custom_origins = os.environ.get('CSRF_TRUSTED_ORIGINS')
if custom_origins:
    CSRF_TRUSTED_ORIGINS.extend([o.strip() for o in custom_origins.split(',') if o.strip()])

# Security Hardening for Production Deployments
if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    CSRF_COOKIE_SECURE = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_HTTPONLY = False  # Allow SPA client to read CSRF cookie for X-CSRFToken header
    SESSION_COOKIE_HTTPONLY = True
    SECURE_HSTS_SECONDS = int(os.environ.get('SECURE_HSTS_SECONDS', '31536000'))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    CORS_ALLOW_ALL_ORIGINS = False
    CORS_ALLOWED_ORIGINS = CSRF_TRUSTED_ORIGINS

