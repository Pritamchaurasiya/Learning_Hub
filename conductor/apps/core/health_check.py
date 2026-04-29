"""
Health Check & Monitoring Service

Production monitoring with:
1. Health check endpoints
2. Dependency status checks
3. Performance metrics
4. System resource monitoring
5. Readiness/Liveness probes
"""

import logging
import time
import os
import platform
from datetime import timedelta
from typing import Dict, Any, List, Optional
from enum import Enum

from django.utils import timezone
from django.db import connection
from django.core.cache import cache
from django.conf import settings

logger = logging.getLogger(__name__)


class HealthStatus(Enum):
    """Health status levels."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


class ComponentType(Enum):
    """System components."""
    DATABASE = "database"
    CACHE = "cache"
    CELERY = "celery"
    STORAGE = "storage"
    EMAIL = "email"
    AI_SERVICE = "ai_service"


class HealthCheckService:
    """
    Comprehensive health check and monitoring service.
    """
    
    # Timeout for checks (seconds)
    CHECK_TIMEOUT = 5
    
    # ==========================================================================
    # MAIN HEALTH CHECK
    # ==========================================================================
    
    @classmethod
    def get_health(cls, detailed: bool = False) -> Dict[str, Any]:
        """
        Get overall system health status.
        
        Args:
            detailed: Include detailed component status
            
        Returns:
            Health status response
        """
        start_time = time.time()
        
        # Check all components
        components = cls._check_all_components()
        
        # Determine overall status
        overall_status = cls._calculate_overall_status(components)
        
        response = {
            'status': overall_status.value,
            'timestamp': timezone.now().isoformat(),
            'version': getattr(settings, 'VERSION', '1.0.0'),
            'environment': getattr(settings, 'ENVIRONMENT', 'development'),
            'response_time_ms': round((time.time() - start_time) * 1000, 2)
        }
        
        if detailed:
            response['components'] = components
            response['system'] = cls._get_system_info()
        
        return response
    
    @classmethod
    def _check_all_components(cls) -> Dict[str, Dict]:
        """Check all system components."""
        return {
            ComponentType.DATABASE.value: cls._check_database(),
            ComponentType.CACHE.value: cls._check_cache(),
            ComponentType.CELERY.value: cls._check_celery(),
            ComponentType.STORAGE.value: cls._check_storage(),
        }
    
    @classmethod
    def _calculate_overall_status(cls, components: Dict) -> HealthStatus:
        """Calculate overall status from components."""
        statuses = [c.get('status', 'unhealthy') for c in components.values()]
        
        if all(s == 'healthy' for s in statuses):
            return HealthStatus.HEALTHY
        elif any(s == 'unhealthy' for s in statuses):
            return HealthStatus.UNHEALTHY
        else:
            return HealthStatus.DEGRADED
    
    # ==========================================================================
    # COMPONENT CHECKS
    # ==========================================================================
    
    @classmethod
    def _check_database(cls) -> Dict[str, Any]:
        """Check database connectivity."""
        start = time.time()
        
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            
            latency = (time.time() - start) * 1000
            
            return {
                'status': 'healthy',
                'latency_ms': round(latency, 2),
                'message': 'Database connection OK'
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'latency_ms': -1,
                'message': str(e)
            }
    
    @classmethod
    def _check_cache(cls) -> Dict[str, Any]:
        """Check cache (Redis) connectivity."""
        start = time.time()
        
        try:
            test_key = '_health_check_'
            cache.set(test_key, 'ok', timeout=10)
            result = cache.get(test_key)
            cache.delete(test_key)
            
            latency = (time.time() - start) * 1000
            
            if result == 'ok':
                return {
                    'status': 'healthy',
                    'latency_ms': round(latency, 2),
                    'message': 'Cache connection OK'
                }
            else:
                return {
                    'status': 'degraded',
                    'latency_ms': round(latency, 2),
                    'message': 'Cache read/write mismatch'
                }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'latency_ms': -1,
                'message': str(e)
            }
    
    @classmethod
    def _check_celery(cls) -> Dict[str, Any]:
        """Check Celery worker status."""
        try:
            from celery import current_app
            
            # Inspect active workers
            inspect = current_app.control.inspect(timeout=2)
            stats = inspect.stats()
            
            if stats:
                return {
                    'status': 'healthy',
                    'workers': len(stats),
                    'message': f'{len(stats)} worker(s) active'
                }
            else:
                return {
                    'status': 'degraded',
                    'workers': 0,
                    'message': 'No active workers'
                }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'workers': 0,
                'message': str(e)
            }
    
    @classmethod
    def _check_storage(cls) -> Dict[str, Any]:
        """Check file storage availability."""
        try:
            from django.core.files.storage import default_storage
            
            # Try to list files
            default_storage.listdir('')
            
            return {
                'status': 'healthy',
                'message': 'Storage accessible'
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'message': str(e)
            }
    
    # ==========================================================================
    # KUBERNETES PROBES
    # ==========================================================================
    
    @classmethod
    def liveness_probe(cls) -> Dict[str, Any]:
        """
        Kubernetes liveness probe.
        Returns True if the application is running.
        """
        return {
            'status': 'alive',
            'timestamp': timezone.now().isoformat()
        }
    
    @classmethod
    def readiness_probe(cls) -> Dict[str, Any]:
        """
        Kubernetes readiness probe.
        Returns True if the application is ready to serve traffic.
        """
        # Check critical dependencies
        db_check = cls._check_database()
        cache_check = cls._check_cache()
        
        is_ready = (
            db_check.get('status') == 'healthy' and
            cache_check.get('status') in ['healthy', 'degraded']
        )
        
        return {
            'status': 'ready' if is_ready else 'not_ready',
            'database': db_check.get('status'),
            'cache': cache_check.get('status'),
            'timestamp': timezone.now().isoformat()
        }
    
    # ==========================================================================
    # SYSTEM INFO
    # ==========================================================================
    
    @classmethod
    def _get_system_info(cls) -> Dict[str, Any]:
        """Get system information."""
        import psutil
        
        try:
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            return {
                'platform': platform.system(),
                'python_version': platform.python_version(),
                'cpu_cores': os.cpu_count(),
                'cpu_percent': cpu_percent,
                'memory': {
                    'total_gb': round(memory.total / (1024**3), 2),
                    'used_gb': round(memory.used / (1024**3), 2),
                    'percent': memory.percent
                },
                'disk': {
                    'total_gb': round(disk.total / (1024**3), 2),
                    'used_gb': round(disk.used / (1024**3), 2),
                    'percent': round(disk.percent, 1)
                }
            }
        except ImportError:
            return {
                'platform': platform.system(),
                'python_version': platform.python_version(),
                'cpu_cores': os.cpu_count(),
                'note': 'psutil not available for detailed stats'
            }
        except Exception as e:
            return {'error': str(e)}
    
    # ==========================================================================
    # METRICS
    # ==========================================================================
    
    @classmethod
    def get_metrics(cls) -> Dict[str, Any]:
        """
        Get application metrics for monitoring.
        """
        from apps.users.models import User
        from apps.courses.models import Course, Enrollment
        
        return {
            'users': {
                'total': User.objects.count(),
                'active_today': User.objects.filter(
                    last_login__date=timezone.now().date()
                ).count()
            },
            'courses': {
                'total': Course.objects.filter(is_published=True).count(),
                'enrollments_today': Enrollment.objects.filter(
                    created_at__date=timezone.now().date()
                ).count()
            },
            'system': cls._get_system_info(),
            'timestamp': timezone.now().isoformat()
        }


# ==========================================================================
# API VIEWS
# ==========================================================================

def health_check_view(request):
    """Health check endpoint."""
    from django.http import JsonResponse
    
    detailed = request.GET.get('detailed', 'false').lower() == 'true'
    health = HealthCheckService.get_health(detailed=detailed)
    
    status_code = 200 if health['status'] == 'healthy' else 503
    
    return JsonResponse(health, status=status_code)


def liveness_view(request):
    """Kubernetes liveness probe endpoint."""
    from django.http import JsonResponse
    
    return JsonResponse(HealthCheckService.liveness_probe())


def readiness_view(request):
    """Kubernetes readiness probe endpoint."""
    from django.http import JsonResponse
    
    result = HealthCheckService.readiness_probe()
    status_code = 200 if result['status'] == 'ready' else 503
    
    return JsonResponse(result, status=status_code)


def metrics_view(request):
    """Metrics endpoint for monitoring."""
    from django.http import JsonResponse
    from rest_framework.permissions import IsAdminUser
    
    # In production, add authentication
    metrics = HealthCheckService.get_metrics()
    
    return JsonResponse(metrics)
