"""
Database Connection Retry Middleware

Handles transient database connection failures with automatic retry logic.
Works with Django 5.0+ CONN_HEALTH_CHECKS setting.
"""

import logging
import time
from django.db import connection, OperationalError, InterfaceError
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)


# Exception types that indicate transient connection issues
TRANSIENT_DB_EXCEPTIONS = (
    OperationalError,
    InterfaceError,
    ConnectionError,
    TimeoutError,
)


class DatabaseRetryMiddleware(MiddlewareMixin):
    """
    Middleware to retry requests on transient database connection failures.
    
    Works in conjunction with Django's CONN_HEALTH_CHECKS setting (Django 5.0+)
    which validates connections before use.
    
    Configuration via settings:
    - DB_RETRY_MAX_ATTEMPTS: Maximum retry attempts (default: 3)
    - DB_RETRY_BASE_DELAY: Base delay in seconds (default: 0.5)
    - DB_RETRY_MAX_DELAY: Maximum delay in seconds (default: 5.0)
    - DB_RETRY_EXPONENTIAL_BASE: Exponential backoff base (default: 2)
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.max_attempts = getattr(settings, 'DB_RETRY_MAX_ATTEMPTS', 3)
        self.base_delay = getattr(settings, 'DB_RETRY_BASE_DELAY', 0.5)
        self.max_delay = getattr(settings, 'DB_RETRY_MAX_DELAY', 5.0)
        self.exponential_base = getattr(settings, 'DB_RETRY_EXPONENTIAL_BASE', 2)
        
        # Ensure CONN_HEALTH_CHECKS is enabled in settings
        if not getattr(settings, 'CONN_HEALTH_CHECKS_ENABLED', False):
            logger.warning(
                "CONN_HEALTH_CHECKS not enabled in DATABASES setting. "
                "Database retry middleware works best with CONN_HEALTH_CHECKS=True"
            )
    
    def process_exception(self, request, exception):
        """Process database exceptions and retry if transient."""
        if not isinstance(exception, TRANSIENT_DB_EXCEPTIONS):
            return None
        
        # Don't retry on read-only methods if not idempotent
        if request.method not in ('GET', 'HEAD', 'OPTIONS'):
            logger.warning(
                f"Transient DB error on non-idempotent method {request.method}: {exception}. Not retrying."
            )
            return None
        
        logger.warning(
            f"Transient database error on {request.method} {request.path}: {exception}. "
            f"Will retry up to {self.max_attempts} times."
        )
        
        # Close the broken connection
        connection.close_if_unusable_or_obsolete()
        
        for attempt in range(1, self.max_attempts + 1):
            try:
                # Wait with exponential backoff + jitter
                delay = min(
                    self.base_delay * (self.exponential_base ** (attempt - 1)),
                    self.max_delay
                )
                import random
                jitter = random.uniform(0, delay * 0.1)
                time.sleep(delay + jitter)
                
                # Ensure connection is healthy
                connection.ensure_connection()
                
                # Retry the request
                response = self.get_response(request)
                logger.info(f"Database retry succeeded on attempt {attempt} for {request.path}")
                return response
                
            except TRANSIENT_DB_EXCEPTIONS as e:
                logger.warning(f"Database retry attempt {attempt} failed: {e}")
                connection.close_if_unusable_or_obsolete()
                
                if attempt == self.max_attempts:
                    logger.error(
                        f"All {self.max_attempts} database retry attempts exhausted for {request.path}"
                    )
                    # Return None to let Django handle the exception normally
                    return None
        
        return None


class DatabaseConnectionHealthMiddleware(MiddlewareMixin):
    """
    Lightweight middleware to ensure database connection health at request start.
    
    This is a proactive check - if the connection is dead, it will be recreated
    before the view runs, avoiding mid-view failures.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.check_interval = getattr(settings, 'DB_HEALTH_CHECK_INTERVAL', 300)  # 5 minutes
        self._last_check = 0
    
    def __call__(self, request):
        import time
        current_time = time.time()
        
        # Periodic health check (not on every request)
        if current_time - self._last_check > self.check_interval:
            try:
                connection.ensure_connection()
                self._last_check = current_time
            except Exception as e:
                logger.warning(f"Periodic database health check failed: {e}")
                connection.close_if_unusable_or_obsolete()
        
        return self.get_response(request)


# Celery task retry utilities for database operations

from celery import shared_task
from functools import wraps


def db_retry_task(max_retries=3, base_delay=1.0, max_delay=60.0, exponential_base=2):
    """
    Decorator for Celery tasks to retry on transient database errors.
    
    Usage:
        @shared_task
        @db_retry_task(max_retries=3)
        def my_db_task():
            ...
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(max_retries + 1):
                try:
                    # Ensure fresh connection for each attempt
                    connection.close_if_unusable_or_obsolete()
                    return func(*args, **kwargs)
                    
                except TRANSIENT_DB_EXCEPTIONS as e:
                    last_exception = e
                    if attempt < max_retries:
                        delay = min(
                            base_delay * (exponential_base ** attempt),
                            max_delay
                        )
                        import random
                        jitter = random.uniform(0, delay * 0.1)
                        logger.warning(
                            f"Task {func.__name__} DB error (attempt {attempt + 1}/{max_retries + 1}): {e}. "
                            f"Retrying in {delay + jitter:.1f}s..."
                        )
                        time.sleep(delay + jitter)
                        continue
                    else:
                        logger.error(f"Task {func.__name__} failed after {max_retries + 1} attempts: {e}")
                        raise
            
            # Should not reach here, but just in case
            raise last_exception
        
        return wrapper
    return decorator


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def health_check_database_task(self):
    """
    Periodic task to verify database connectivity.
    Can be scheduled via Celery Beat.
    """
    try:
        connection.ensure_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
        
        if result and result[0] == 1:
            return {"status": "healthy", "message": "Database connection OK"}
        else:
            raise Exception("Unexpected health check result")
            
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))


# Management command helper for connection validation

def validate_database_connection() -> bool:
    """
    Validate database connection is working.
    Can be used in health checks, management commands, etc.
    """
    try:
        connection.ensure_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
        return result and result[0] == 1
    except Exception as e:
        logger.error(f"Database connection validation failed: {e}")
        return False


def get_database_connection_info() -> dict:
    """
    Get information about the current database connection.
    Useful for debugging and monitoring.
    """
    info = {
        "connected": False,
        "vendor": None,
        "alias": "default",
        "settings": {},
    }
    
    try:
        connection.ensure_connection()
        info["connected"] = True
        info["vendor"] = connection.vendor
        info["alias"] = connection.alias
        
        # Get connection parameters (without sensitive data)
        settings_dict = connection.settings_dict.copy()
        # Remove sensitive fields
        for key in ['PASSWORD', 'OPTIONS']:
            if key in settings_dict:
                settings_dict[key] = '***'
        info["settings"] = settings_dict
        
    except Exception as e:
        info["error"] = str(e)
    
    return info