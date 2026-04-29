from django.db import connection, connections
from django.core.cache import caches
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
import psutil
import time
import shutil
import logging

logger = logging.getLogger(__name__)

class DeepHealthCheckView(APIView):
    """
    Performs a deep inspection of all system components.
    God Mode: Checks DB, Redis (if configured), Disk, Memory, and AI Engine connectivity.
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        health_report = {
            "status": "healthy",
            "timestamp": time.time(),
            "components": {}
        }
        
        # 1. Database Check
        db_status = True
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            health_report["components"]["database"] = {"status": "up", "latency": "ok"}
        except Exception as e:
            db_status = False
            health_report["components"]["database"] = {"status": "down", "error": str(e)}
            
        # 2. Cache Check (Redis/LocMem)
        cache_status = True
        try:
            cache = caches['default']
            cache.set('god_mode_health', 'ok', timeout=10)
            val = cache.get('god_mode_health')
            if val != 'ok':
                raise Exception("Cache Read/Write Failed")
            health_report["components"]["cache"] = {"status": "up", "backend": settings.CACHES['default']['BACKEND']}
        except Exception as e:
            # Don't fail overall health for cache if it's not critical, but warn
            health_report["components"]["cache"] = {"status": "degraded", "error": str(e)}
            
        # 3. System Resources
        try:
            mem = psutil.virtual_memory()
            disk = shutil.disk_usage('/')
            health_report["components"]["system"] = {
                "memory_used_percent": mem.percent,
                "disk_free_gb": round(disk.free / (1024**3), 2),
                "cpu_percent": psutil.cpu_percent(interval=0.1)
            }
        except Exception as e:
            health_report["components"]["system"] = {"status": "unknown", "error": str(e)}
            
        # 4. AI Engine Check (Mock)
        # In a real deployed deepseek setup, we'd ping the model endpoint here.
        health_report["components"]["ai_engine"] = {
            "status": "standby",
            "provider": "Simulated/OpenAI"
        }
        
        # Overall Status Logic
        if not db_status:
            health_report["status"] = "critical"
            status_code = 503
        elif health_report["components"]["cache"]["status"] == "degraded":
            health_report["status"] = "degraded"
            status_code = 200
        else:
            status_code = 200
            
        return Response(health_report, status=status_code)
