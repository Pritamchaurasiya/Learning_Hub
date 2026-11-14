import os
import sys
from pathlib import Path
from datetime import timedelta

from django.core.exceptions import ImproperlyConfigured

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Add apps folder to Python path
sys.path.insert(0, os.path.join(BASE_DIR, 'apps'))

DEBUG = os.environ.get('DEBUG', 'False').lower() in ('true', '1', 'yes')
_IS_TEST_RUNNER = 'pytest' in sys.modules or os.environ.get('PYTEST_CURRENT_TEST') is not None

# Secrets must be stable across restarts in production. A random per-boot
# SECRET_KEY invalidates sessions/tokens and makes rollbacks unpredictable.
_SECRET_FROM_ENV = os.environ.get('DJANGO_SECRET_KEY') or os.environ.get('SECRET_KEY')
if _SECRET_FROM_ENV:
    SECRET_KEY = _SECRET_FROM_ENV
elif DEBUG or _IS_TEST_RUNNER:
    SECRET_KEY = 'dev-only-do-not-use-in-production-generate-a-proper-secret'
else:
    raise ImproperlyConfigured(
        'DJANGO_SECRET_KEY (or SECRET_KEY) is required when DEBUG is False.'
    )

# Production hosts are explicit. Never silently accept wildcard hosts.
_hosts_from_env = os.environ.get('ALLOWED_HOSTS', '')
if _hosts_from_env.strip():
    ALLOWED_HOSTS = [host.strip() for host in _hosts_from_env.split(',') if host.strip()]
elif DEBUG or _IS_TEST_RUNNER:
    ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'testserver']
else:
    raise ImproperlyConfigured('ALLOWED_HOSTS must be set in production.')

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

# Database: PostgreSQL/Neon is mandatory outside local development and tests.
DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    try:
        import dj_database_url
    except ImportError as exc:
        raise ImproperlyConfigured(
            'dj-database-url is required when DATABASE_URL is configured.'
        ) from exc

    DATABASES = {
        'default': dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=60,
            conn_health_checks=True,
        )
    }
elif DEBUG or _IS_TEST_RUNNER:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    raise ImproperlyConfigured(
        'DATABASE_URL is required outside local development and tests. '
        'Production must never fall back to SQLite.'
    )

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
        'apps.core.authentication.JWTCookieAuthentication',
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
        'auth': '5/min',
        'notifications': '30/min',
        'leaderboard': '60/min',
        'ai_tutor': '10/min',
        'ai_tutor_anon': '3/min',
    },
}

# Production Security Headers
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_BROWSER_XSS_FILTER = True

# Keep token signing independent from Django's application secret in production.
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
if not JWT_SECRET_KEY and not (DEBUG or _IS_TEST_RUNNER):
    raise ImproperlyConfigured('JWT_SECRET_KEY is required in production.')

# SimpleJWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': (
        os.environ.get('JWT_SECRET_KEY')
        or (SECRET_KEY if DEBUG or _IS_TEST_RUNNER else None)
    ),
    'AUTH_HEADER_TYPES': ('Bearer', 'JWT'),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# CORS / CSRF origins. Use exact origins; custom domains can be added later
# through the environment without changing source code.
_local_origins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
]
_custom_csrf_origins = [
    origin.strip()
    for origin in os.environ.get('CSRF_TRUSTED_ORIGINS', '').split(',')
    if origin.strip()
]
CSRF_TRUSTED_ORIGINS = list(dict.fromkeys(_local_origins + _custom_csrf_origins))

_custom_cors_origins = [
    origin.strip()
    for origin in os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',')
    if origin.strip()
]
CORS_ALLOWED_ORIGINS = list(dict.fromkeys(_custom_cors_origins or _custom_csrf_origins))
CORS_ALLOW_ALL_ORIGINS = (
    os.environ.get('CORS_ALLOW_ALL_ORIGINS', 'False').lower() in ('true', '1', 'yes')
)
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

# Django's CSRF middleware cookie name matches the LearningHub SPA client.
CSRF_COOKIE_NAME = 'csrf-token'
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_HTTPONLY = True

# OpenAPI / Swagger Docs Settings
SPECTACULAR_SETTINGS = {
    'TITLE': 'LearningHub API (Django REST)',
    'DESCRIPTION': 'Comprehensive REST API for LearningHub Online Education & Assessment Platform',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# Shared cache/channel layers are required for multi-instance production.
# A single-instance staging service may explicitly opt into in-memory fallbacks.
REDIS_URL = os.environ.get('REDIS_URL')
ALLOW_IN_MEMORY_BACKENDS = (
    os.environ.get('ALLOW_IN_MEMORY_BACKENDS', 'False').lower() in ('true', '1', 'yes')
)

if REDIS_URL:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {'hosts': [REDIS_URL]},
        },
    }
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': REDIS_URL,
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                'IGNORE_EXCEPTIONS': False,
            },
            'KEY_PREFIX': 'learninghub',
            'TIMEOUT': 300,
        }
    }
elif DEBUG or _IS_TEST_RUNNER or ALLOW_IN_MEMORY_BACKENDS:
    CHANNEL_LAYERS = {
        'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'},
    }
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'learninghub-locmem-cache',
            'TIMEOUT': 300,
        }
    }
else:
    raise ImproperlyConfigured(
        'REDIS_URL is required in production. Set ALLOW_IN_MEMORY_BACKENDS=true '
        'only for a single-instance staging deployment.'
    )

# Celery Configuration
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', REDIS_URL or 'memory://')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', REDIS_URL or 'cache')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True

ADMIN_SECRET = os.environ.get('ADMIN_SECRET', '')
if not DEBUG and not _IS_TEST_RUNNER and not ADMIN_SECRET:
    raise ImproperlyConfigured('ADMIN_SECRET is required in production.')

# Production Security Hardening
if not DEBUG and not _IS_TEST_RUNNER:
    if not _custom_csrf_origins:
        raise ImproperlyConfigured(
            'CSRF_TRUSTED_ORIGINS must include the deployed LearningHub frontend origin.'
        )
    SECURE_SSL_REDIRECT = (
        os.environ.get('SECURE_SSL_REDIRECT', 'True').lower() in ('true', '1', 'yes')
    )
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    CSRF_COOKIE_SECURE = True
    SESSION_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = int(os.environ.get('SECURE_HSTS_SECONDS', '31536000'))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
    SECURE_CROSS_ORIGIN_OPENER_POLICY = 'same-origin'
    CORS_ALLOW_ALL_ORIGINS = False
    CORS_ALLOWED_ORIGINS = list(dict.fromkeys(_custom_cors_origins or _custom_csrf_origins))
