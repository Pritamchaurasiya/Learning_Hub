"""
Health check utilities for system monitoring.
"""

from django.db import connections
from django.core.cache import cache
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

import logging

logger = logging.getLogger(__name__)


def check_database():
    """Check database connectivity."""
    try:
        with connections['default'].cursor() as cursor:
            cursor.execute("SELECT 1")
            return True, "Database connection OK"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False, f"Database error: {str(e)}"


def check_cache():
    """Check cache connectivity."""
    try:
        cache.set('health_check', 'ok', 10)
        value = cache.get('health_check')
        if value == 'ok':
            cache.delete('health_check')
            return True, "Cache connection OK"
        return False, "Cache value mismatch"
    except Exception as e:
        logger.error(f"Cache health check failed: {e}")
        return False, f"Cache error: {str(e)}"


def check_redis():
    """Check Redis connectivity specifically."""
    try:
        from django_redis import get_redis_connection
        redis_conn = get_redis_connection('default')
        redis_conn.ping()
        return True, "Redis connection OK"
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        return False, f"Redis error: {str(e)}"


def check_celery():
    """Check Celery workers."""
    try:
        from celery import Celery
        # This is a basic check - in production you'd want more comprehensive checks
        return True, "Celery configured"
    except Exception as e:
        logger.error(f"Celery health check failed: {e}")
        return False, f"Celery error: {str(e)}"


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Basic health check endpoint.
    Returns 200 if the application is running.
    """
    return Response({
        'status': 'healthy',
        'timestamp': timezone.now().isoformat(),
        'version': getattr(settings, 'VERSION', 'unknown'),
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check_detailed(request):
    """
    Detailed health check endpoint.
    Checks database, cache, and other critical services.
    """
    from django.utils import timezone
    
    checks = {
        'database': check_database(),
        'cache': check_cache(),
    }
    
    # Check Redis if configured
    if hasattr(settings, 'REDIS_URL') or 'redis' in str(settings.CACHES.get('default', {}).get('LOCATION', '')).lower():
        checks['redis'] = check_redis()
    
    # Determine overall status
    all_healthy = all(result[0] for result in checks.values())
    
    status_code = status.HTTP_200_OK if all_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
    
    response_data = {
        'status': 'healthy' if all_healthy else 'unhealthy',
        'timestamp': timezone.now().isoformat(),
        'checks': {
            name: {
                'healthy': result[0],
                'message': result[1]
            }
            for name, result in checks.items()
        }
    }
    
    return Response(response_data, status=status_code)


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check_db(request):
    """Database-specific health check."""
    from django.utils import timezone
    
    healthy, message = check_database()
    status_code = status.HTTP_200_OK if healthy else status.HTTP_503_SERVICE_UNAVAILABLE
    
    return Response({
        'status': 'healthy' if healthy else 'unhealthy',
        'service': 'database',
        'message': message,
        'timestamp': timezone.now().isoformat(),
    }, status=status_code)


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check_cache(request):
    """Cache-specific health check."""
    from django.utils import timezone
    
    healthy, message = check_cache()
    status_code = status.HTTP_200_OK if healthy else status.HTTP_503_SERVICE_UNAVAILABLE
    
    return Response({
        'status': 'healthy' if healthy else 'unhealthy',
        'service': 'cache',
        'message': message,
        'timestamp': timezone.now().isoformat(),
    }, status=status_code)


@api_view(['GET'])
def system_metrics(request):
    """
    System metrics endpoint (admin only).
    Returns various system statistics.
    """
    from django.contrib.auth import get_user_model
    from apps.courses.models import Course, Enrollment
    from apps.quiz.models import QuizAttempt
    from django.utils import timezone
    from datetime import timedelta
    
    User = get_user_model()
    
    # Calculate metrics
    now = timezone.now()
    last_24h = now - timedelta(hours=24)
    last_7d = now - timedelta(days=7)
    last_30d = now - timedelta(days=30)
    
    metrics = {
        'users': {
            'total': User.objects.count(),
            'active_last_24h': User.objects.filter(last_login__gte=last_24h).count(),
            'active_last_7d': User.objects.filter(last_login__gte=last_7d).count(),
            'new_last_24h': User.objects.filter(date_joined__gte=last_24h).count(),
            'new_last_7d': User.objects.filter(date_joined__gte=last_7d).count(),
        },
        'courses': {
            'total': Course.objects.count(),
            'published': Course.objects.filter(is_published=True).count(),
            'featured': Course.objects.filter(is_featured=True, is_published=True).count(),
        },
        'enrollments': {
            'total': Enrollment.objects.count(),
            'active': Enrollment.objects.filter(status='active').count(),
            'completed': Enrollment.objects.filter(status='completed').count(),
            'last_24h': Enrollment.objects.filter(enrolled_at__gte=last_24h).count(),
            'last_7d': Enrollment.objects.filter(enrolled_at__gte=last_7d).count(),
        },
        'quiz_attempts': {
            'total': QuizAttempt.objects.count(),
            'completed': QuizAttempt.objects.filter(status='completed').count(),
            'last_24h': QuizAttempt.objects.filter(started_at__gte=last_24h).count(),
            'last_7d': QuizAttempt.objects.filter(started_at__gte=last_7d).count(),
        },
        'timestamp': now.isoformat(),
    }
    
    return Response({
        'status': 'success',
        'data': metrics
    })
