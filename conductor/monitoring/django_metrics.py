"""
Django Prometheus Metrics Configuration
Integrates Django with Prometheus for application metrics
"""

# Install django-prometheus
# pip install django-prometheus

# settings.py additions:
INSTALLED_APPS = [
    'django_prometheus',
    # ... other apps
]

MIDDLEWARE = [
    'django_prometheus.middleware.PrometheusBeforeMiddleware',
    # ... other middleware
    'django_prometheus.middleware.PrometheusAfterMiddleware',
]

# Database monitoring
DATABASES = {
    'default': {
        'ENGINE': 'django_prometheus.db.backends.postgresql',
        'NAME': 'learning_hub',
        # ... other settings
    }
}

# Cache monitoring
CACHES = {
    'default': {
        'BACKEND': 'django_prometheus.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
    }
}

# URLs configuration
# from django.urls import path, include
# urlpatterns = [
#     path('metrics/', include('django_prometheus.urls')),
# ]

# Custom metrics example
from prometheus_client import Counter, Histogram, Gauge

# Request counter
http_requests_total = Counter(
    'django_http_requests_total',
    'Total HTTP requests',
    ['method', 'handler', 'status']
)

# Response time histogram
http_request_duration = Histogram(
    'django_http_request_duration_seconds',
    'HTTP request duration',
    ['method', 'handler']
)

# Active users gauge
active_users = Gauge(
    'django_active_users',
    'Number of active users'
)

# Database query histogram
db_query_duration = Histogram(
    'django_db_query_duration_seconds',
    'Database query duration',
    ['query_type']
)

def update_active_users(count):
    """Update active users metric."""
    active_users.set(count)

def record_request(method, handler, status, duration):
    """Record HTTP request metrics."""
    http_requests_total.labels(
        method=method,
        handler=handler,
        status=status
    ).inc()
    
    http_request_duration.labels(
        method=method,
        handler=handler
    ).observe(duration)
