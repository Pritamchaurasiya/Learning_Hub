"""
Real-Time Monitoring Dashboard for Learning Hub
Django view for system health monitoring
"""

from django.shortcuts import render
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.contrib.admin.views.decorators import staff_member_required
import psutil
import json
import time
from datetime import datetime

# Try to import Django models
try:
    from apps.courses.models import Course, Category
    from apps.users.models import User
    from apps.enrollments.models import Enrollment
    MODELS_AVAILABLE = True
except ImportError:
    MODELS_AVAILABLE = False


@staff_member_required
def monitoring_dashboard(request):
    """Main monitoring dashboard view."""
    return render(request, 'monitoring/dashboard.html')


@staff_member_required
def api_health_metrics(request):
    """API endpoint for real-time system metrics."""
    try:
        # System metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Network
        net_io = psutil.net_io_counters()
        
        # Load average
        load_avg = psutil.getloadavg() if hasattr(psutil, 'getloadavg') else [0, 0, 0]
        
        metrics = {
            'timestamp': datetime.now().isoformat(),
            'system': {
                'cpu_percent': cpu_percent,
                'cpu_count': psutil.cpu_count(),
                'memory_percent': memory.percent,
                'memory_used_gb': round(memory.used / (1024**3), 2),
                'memory_total_gb': round(memory.total / (1024**3), 2),
                'disk_percent': disk.percent,
                'disk_used_gb': round(disk.used / (1024**3), 2),
                'disk_total_gb': round(disk.total / (1024**3), 2),
                'load_avg_1m': round(load_avg[0], 2),
                'load_avg_5m': round(load_avg[1], 2),
                'load_avg_15m': round(load_avg[2], 2),
            },
            'network': {
                'bytes_sent': net_io.bytes_sent,
                'bytes_recv': net_io.bytes_recv,
                'packets_sent': net_io.packets_sent,
                'packets_recv': net_io.packets_recv,
            }
        }
        
        # Application metrics
        if MODELS_AVAILABLE:
            metrics['application'] = {
                'total_users': User.objects.count(),
                'total_courses': Course.objects.count(),
                'total_categories': Category.objects.count(),
                'total_enrollments': Enrollment.objects.count(),
            }
        
        return JsonResponse(metrics)
    
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
def api_processes(request):
    """Get running processes."""
    try:
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'status']):
            try:
                processes.append(proc.info)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        
        # Sort by CPU usage
        processes.sort(key=lambda x: x.get('cpu_percent', 0), reverse=True)
        
        return JsonResponse({'processes': processes[:20]})  # Top 20 processes
    
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
def api_database_status(request):
    """Database connection status."""
    try:
        from django.db import connection
        
        with connection.cursor() as cursor:
            start = time.time()
            cursor.execute("SELECT 1")
            cursor.fetchone()
            response_time = (time.time() - start) * 1000  # ms
        
        return JsonResponse({
            'status': 'connected',
            'response_time_ms': round(response_time, 2),
            'database': connection.settings_dict.get('NAME', 'unknown')
        })
    
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'error': str(e)
        }, status=500)


@staff_member_required
def api_cache_status(request):
    """Cache connection status."""
    try:
        from django.core.cache import cache
        
        start = time.time()
        cache.set('monitoring_test', 'value', 10)
        value = cache.get('monitoring_test')
        response_time = (time.time() - start) * 1000
        
        return JsonResponse({
            'status': 'connected',
            'response_time_ms': round(response_time, 2),
            'test_value': value
        })
    
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'error': str(e)
        }, status=500)


@staff_member_required
def api_disk_io(request):
    """Disk I/O statistics."""
    try:
        disk_io = psutil.disk_io_counters()
        
        return JsonResponse({
            'read_bytes': disk_io.read_bytes,
            'write_bytes': disk_io.write_bytes,
            'read_count': disk_io.read_count,
            'write_count': disk_io.write_count,
            'read_time': disk_io.read_time,
            'write_time': disk_io.write_time,
        })
    
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
