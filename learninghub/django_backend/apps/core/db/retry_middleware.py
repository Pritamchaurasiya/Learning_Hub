"""
Database Connection Resilience Middleware

Provides automatic retry logic for transient database errors,
connection health checks, and graceful degradation.
"""

import logging
import time
import random
from functools import wraps
from django.db import connection, DatabaseError, OperationalError, InterfaceError
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

logger = logging.getLogger(__name__)

# Retryable database error codes (PostgreSQL)
RETRYABLE_PG_ERROR_CODES = {
    '08000',  # connection_exception
    '08001',  # sqlclient_unable_to_establish_sqlconnection
    '08003',  # connection_does_not_exist
    '08004',  # sqlserver_rejected_establishment_of_sqlconnection
    '08006',  # connection_failure
    '08007',  # transaction_resolution_unknown
    '40001',  # serialization_failure
    '40P01',  # deadlock_detected
    '53300',  # too_many_connections
    '54000',  # program_limit_exceeded
    '54001',  # statement_too_complex
    '54011',  # too_many_columns
    '54023',  # too_many_arguments
    '55000',  # object_not_in_prerequisite_state
    '55006',  # object_in_use
    '55P03',  # lock_not_available
    '57014',  # query_canceled
    '57P01',  # admin_shutdown
    '57P02',  # crash_shutdown
    '57P03',  # cannot_connect_now
    '58000',  # system_error
    '58030',  # io_error
    '58P01',  # undefined_file
    '58P02',  # cannot_read_file
    '58P03',  # cannot_write_file
}


class DatabaseRetryMiddleware:
    """
    Middleware that adds automatic retry logic for transient database errors.

    Configuration via settings:
    - DB_RETRY_ENABLED: Enable/disable retry (default: DEBUG=False)
    - DB_RETRY_MAX_ATTEMPTS: Maximum retry attempts (default: 3)
    - DB_RETRY_BASE_DELAY: Base delay in seconds (default: 0.1)
    - DB_RETRY_MAX_DELAY: Maximum delay in seconds (default: 2.0)
    - DB_RETRY_JITTER: Add random jitter (default: True)
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.enabled = getattr(settings, 'DB_RETRY_ENABLED', not settings.DEBUG)
        self.max_attempts = getattr(settings, 'DB_RETRY_MAX_ATTEMPTS', 3)
        self.base_delay = getattr(settings, 'DB_RETRY_BASE_DELAY', 0.1)
        self.max_delay = getattr(settings, 'DB_RETRY_MAX_DELAY', 2.0)
        self.jitter = getattr(settings, 'DB_RETRY_JITTER', True)

        # Error codes that should trigger retry
        self.retryable_codes = getattr(
            settings, 'DB_RETRYABLE_CODES', RETRYABLE_PG_ERROR_CODES
        )

    def __call__(self, request):
        if not self.enabled:
            return self.get_response(request)

        return self._process_with_retry(request)

    def _process_with_retry(self, request):
        """Process request with automatic retry on transient DB errors."""
        last_exception = None

        for attempt in range(self.max_attempts):
            try:
                # Ensure connection is healthy before request
                self._ensure_connection_healthy()

                response = self.get_response(request)
                return response

            except (OperationalError, InterfaceError, DatabaseError) as e:
                last_exception = e
                error_code = getattr(e, 'pgcode', None) or getattr(e, 'args', [None])[0]

                if self._is_retryable(error_code) and attempt < self.max_attempts - 1:
                    delay = self._calculate_delay(attempt)
                    logger.warning(
                        f"Transient DB error (attempt {attempt + 1}/{self.max_attempts}): "
                        f"{error_code} - {e}. Retrying in {delay:.2f}s"
                    )
                    time.sleep(delay)

                    # Force connection close to get fresh connection
                    connection.close_if_unusable_or_obsolete()
                    continue
                else:
                    # Non-retryable or max attempts reached
                    logger.error(
                        f"DB error after {attempt + 1} attempts: {error_code} - {e}"
                    )
                    raise

            except Exception as e:
                # Non-DB error, don't retry
                logger.exception(f"Non-retryable error in request: {e}")
                raise

        # Should not reach here, but just in case
        raise last_exception

    def _is_retryable(self, error_code) -> bool:
        """Check if error code is retryable."""
        if not error_code:
            return False
        return str(error_code) in self.retryable_codes

    def _calculate_delay(self, attempt: int) -> float:
        """Calculate delay with exponential backoff and optional jitter."""
        delay = min(self.base_delay * (2 ** attempt), self.max_delay)
        if self.jitter:
            delay = delay * (0.5 + random.random())  # 50-150% of delay
        return delay

    def _ensure_connection_healthy(self):
        """Ensure database connection is healthy."""
        if connection.connection is not None:
            try:
                # Simple health check query
                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1")
            except Exception:
                # Connection is dead, close it so Django creates a new one
                connection.close_if_unusable_or_obsolete()


# Decorator for function-level retry
def db_retry(
    max_attempts: int = 3,
    base_delay: float = 0.1,
    max_delay: float = 2.0,
    retryable_exceptions: tuple = (OperationalError, InterfaceError, DatabaseError),
):
    """
    Decorator to add database retry logic to any function.

    Usage:
        @db_retry(max_attempts=3)
        def my_database_operation():
            ...
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None

            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except retryable_exceptions as e:
                    last_exception = e
                    error_code = getattr(e, 'pgcode', None)

                    if attempt < max_attempts - 1:
                        delay = min(base_delay * (2 ** attempt), max_delay)
                        delay = delay * (0.5 + random.random())  # jitter
                        logger.warning(
                            f"DB retry {attempt + 1}/{max_attempts} for {func.__name__}: "
                            f"{error_code} - {e}. Waiting {delay:.2f}s"
                        )
                        time.sleep(delay)
                        connection.close_if_unusable_or_obsolete()
                        continue
                    else:
                        logger.error(
                            f"DB operation {func.__name__} failed after {max_attempts} attempts: {e}"
                        )
                        raise
                except Exception:
                    # Non-retryable exception
                    raise

            raise last_exception
        return wrapper
    return decorator


# Context manager for transaction-level retry
class DatabaseRetryContext:
    """
    Context manager for retrying database operations within a block.

    Usage:
        with DatabaseRetryContext(max_attempts=3):
            # Multiple DB operations that should be retried together
            user = User.objects.create(...)
            Profile.objects.create(user=user, ...)
    """

    def __init__(
        self,
        max_attempts: int = 3,
        base_delay: float = 0.1,
        max_delay: float = 2.0,
    ):
        self.max_attempts = max_attempts
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.attempt = 0

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None:
            return False  # No exception, normal exit

        # Check if exception is retryable
        if exc_type in (OperationalError, InterfaceError, DatabaseError):
            error_code = getattr(exc_val, 'pgcode', None)
            retryable_codes = getattr(
                settings, 'DB_RETRYABLE_CODES', RETRYABLE_PG_ERROR_CODES
            )

            if str(error_code) in retryable_codes and self.attempt < self.max_attempts - 1:
                self.attempt += 1
                delay = min(self.base_delay * (2 ** self.attempt), self.max_delay)
                delay = delay * (0.5 + random.random())

                logger.warning(
                    f"DB transaction retry {self.attempt}/{self.max_attempts}: "
                    f"{error_code} - {exc_val}. Waiting {delay:.2f}s"
                )
                time.sleep(delay)
                connection.close_if_unusable_or_obsolete()
                return True  # Suppress exception, retry

        return False  # Don't suppress, let exception propagate

    def run(self, func, *args, **kwargs):
        """Run a function with retry context."""
        with self:
            return func(*args, **kwargs)


# Health check utilities
def check_database_health() -> dict:
    """
    Comprehensive database health check.

    Returns:
        Dict with health status and metrics
    """
    health = {
        "status": "healthy",
        "connection": "unknown",
        "latency_ms": None,
        "pool_size": None,
        "active_connections": None,
        "errors": [],
    }

    try:
        # Test basic connectivity
        start = time.perf_counter()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        health["latency_ms"] = round((time.perf_counter() - start) * 1000, 2)
        health["connection"] = "ok"

        # Get connection pool info (PostgreSQL specific)
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    count(*) as total_connections,
                    count(*) FILTER (WHERE state = 'active') as active_connections
                FROM pg_stat_activity
                WHERE datname = current_database()
            """)
            row = cursor.fetchone()
            if row:
                health["active_connections"] = row[1]

        # Check connection pool settings
        health["pool_size"] = getattr(settings, 'CONN_MAX_AGE', 0)

    except Exception as e:
        health["status"] = "unhealthy"
        health["connection"] = "failed"
        health["errors"].append(str(e))
        logger.error(f"Database health check failed: {e}")

    return health


def get_connection_info() -> dict:
    """Get detailed database connection information."""
    info = {
        "vendor": connection.vendor,
        "settings": {
            "CONN_MAX_AGE": getattr(settings, 'CONN_MAX_AGE', 0),
            "CONN_HEALTH_CHECKS": getattr(settings, 'CONN_HEALTH_CHECKS', False),
        },
        "connection": None,
    }

    if connection.connection is not None:
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT version()")
                version = cursor.fetchone()[0]
                info["connection"] = {
                    "status": "connected",
                    "version": version,
                    "autocommit": connection.get_autocommit(),
                }
        except Exception as e:
            info["connection"] = {"status": "error", "error": str(e)}
    else:
        info["connection"] = {"status": "no_connection"}

    return info


# Celery task for periodic health checks
def periodic_db_health_check():
    """
    Celery task to periodically check database health.
    Should be scheduled via Celery Beat (e.g., every 5 minutes).
    """
    health = check_database_health()

    if health["status"] != "healthy":
        logger.error(f"Database health check failed: {health}")
        # Could send alert via monitoring system
        # send_alert("Database health check failed", health)

    return health


# Connection pool monitoring
class ConnectionPoolMonitor:
    """Monitor database connection pool usage."""

    def __init__(self):
        self.metrics = {
            "total_acquired": 0,
            "total_released": 0,
            "peak_usage": 0,
            "current_usage": 0,
            "errors": 0,
        }

    def acquire(self):
        self.metrics["total_acquired"] += 1
        self.metrics["current_usage"] += 1
        self.metrics["peak_usage"] = max(
            self.metrics["peak_usage"], self.metrics["current_usage"]
        )

    def release(self):
        self.metrics["total_released"] += 1
        self.metrics["current_usage"] = max(0, self.metrics["current_usage"] - 1)

    def error(self):
        self.metrics["errors"] += 1

    def get_stats(self) -> dict:
        return {
            **self.metrics,
            "utilization": (
                self.metrics["current_usage"] / max(1, self.metrics["peak_usage"])
            ),
        }

    def reset(self):
        self.metrics = {
            "total_acquired": 0,
            "total_released": 0,
            "peak_usage": 0,
            "current_usage": 0,
            "errors": 0,
        }


# Global pool monitor instance
pool_monitor = ConnectionPoolMonitor()