import json
import shutil
import psutil
from django.core.management.base import BaseCommand
from django.db import connections
from django.db.utils import OperationalError
from django.core.cache import cache
from django_redis import get_redis_connection

class Command(BaseCommand):
    help = 'Perform a deep health check of the system (DB, Redis, Disk, Memory)'

    def handle(self, *args, **options):
        health_status = {
            "status": "healthy",
            "services": {},
            "resources": {}
        }
        has_error = False

        # 1. Database Check
        try:
            db_conn = connections['default']
            db_conn.cursor()
            health_status["services"]["database"] = "ok"
        except OperationalError:
            health_status["services"]["database"] = "error"
            has_error = True

        # 2. Redis Check
        try:
            con = get_redis_connection("default")
            con.ping()
            health_status["services"]["redis"] = "ok"
        except Exception:
            health_status["services"]["redis"] = "error"
            has_error = True

        # 3. Disk Usage
        total, used, free = shutil.disk_usage("/")
        health_status["resources"]["disk"] = {
            "total_gb": total // (2**30),
            "used_gb": used // (2**30),
            "free_gb": free // (2**30),
            "percent": round(used / total * 100, 2)
        }
        if health_status["resources"]["disk"]["percent"] > 90:
            health_status["status"] = "degraded"
            health_status["resources"]["disk_status"] = "critical"

        # 4. Memory Usage
        mem = psutil.virtual_memory()
        health_status["resources"]["memory"] = {
            "total_gb": round(mem.total / (2**30), 2),
            "available_gb": round(mem.available / (2**30), 2),
            "percent": mem.percent
        }
        if mem.percent > 90:
            health_status["status"] = "degraded"
            health_status["resources"]["memory_status"] = "critical"

        if has_error:
            health_status["status"] = "unhealthy"
            self.stdout.write(json.dumps(health_status, indent=2))
            exit(1)
        
        self.stdout.write(json.dumps(health_status, indent=2))
