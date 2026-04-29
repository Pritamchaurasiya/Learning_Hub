"""
Self-Healing System Monitor.
Proactively checks system health and attempts auto-remediation.
"""
import logging
import time
from typing import Dict, Any, List
from django.db import connections
from django.core.cache import cache
from django.conf import settings
from apps.core.email_service import EmailService, EmailType

logger = logging.getLogger(__name__)

from abc import ABC, abstractmethod

class HealthCheck(ABC):
    """Base Health Check Class."""
    name = "base"
    
    @abstractmethod
    def check(self) -> bool:
        pass

    def heal(self) -> bool:
        return False

class DatabaseCheck(HealthCheck):
    name = "database"
    
    def check(self) -> bool:
        try:
            for name in connections:
                cursor = connections[name].cursor()
                cursor.execute("SELECT 1")
                row = cursor.fetchone()
                if row is None:
                    return False
            return True
        except Exception as e:
            logger.error(f"DB Check Failed: {e}")
            return False
            
    def heal(self) -> bool:
        logger.warning("Attempting DB Healing: Closing old connections...")
        try:
            for name in connections:
                connections[name].close_if_unusable_or_obsolete()
            return self.check()
        except Exception as e:
            logger.error(f"DB Healing Failed: {e}")
            return False

class CacheCheck(HealthCheck):
    name = "cache"
    
    def check(self) -> bool:
        try:
            cache.set("health_check_ping", "pong", 10)
            return cache.get("health_check_ping") == "pong"
        except Exception as e:
            logger.error(f"Cache Check Failed: {e}")
            return False
            
    def heal(self) -> bool:
        logger.warning("Attempting Cache Healing: Clearing check key...")
        try:
            # We can't restart Redis from here, but we can try to re-init
            # For now, just a soft retry
            time.sleep(1)
            return self.check()
        except Exception:
            return False

class SystemHealer:
    """
    Orchestrates health checks and healing.
    """
    CHECKS = [DatabaseCheck(), CacheCheck()]
    
    @classmethod
    def run_diagnostics(cls) -> Dict[str, Any]:
        """
        Run all checks. If fail, try heal. If heal fail, alert.
        """
        status = {}
        all_healthy = True
        
        for check in cls.CHECKS:
            is_healthy = check.check()
            
            if not is_healthy:
                logger.warning(f"Health Check '{check.name}' FAILED. Initiating Healing protocols...")
                healed = check.heal()
                
                if healed:
                    logger.info(f"Health Check '{check.name}' RESTORED via Self-Healing.")
                    status[check.name] = "Healed"
                else:
                    logger.critical(f"Health Check '{check.name}' CRITICAL FAILURE. Healing ineffective.")
                    status[check.name] = "Critical"
                    all_healthy = False
                    cls._escalate_alert(check.name)
            else:
                status[check.name] = "Healthy"
                
        return {
            "healthy": all_healthy,
            "details": status
        }
    
    @classmethod
    def _escalate_alert(cls, component: str):
        """Send emergency alert via EmailService."""
        admins = [email for name, email in getattr(settings, 'ADMINS', [])]
        if not admins:
            admins = ['admin@learninghub.com'] # Fallback
            
        EmailService.send_bulk_email(
            recipients=admins,
            email_type=EmailType.LOGIN_ALERT, # Reusing alert template type
            context={
                "first_name": "Admin",
                "message": f"CRITICAL SYSTEM ALERT: {component} is DOWN and Automediation failed. Immediate intervention required."
            }
        )
