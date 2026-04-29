"""
Enhanced Error Tracking & Reporting for Learning Hub.

This module provides:
1. Structured error logging
2. Error aggregation and reporting
3. Sentry-ready integration
4. Performance monitoring
5. Retry logic for external APIs
"""

import logging
import traceback
import json
import time
from typing import Callable, Optional, Dict, Any, Type
from functools import wraps
from datetime import timedelta

from django.utils import timezone
from django.core.cache import cache
from django.conf import settings
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


logger = logging.getLogger(__name__)


class ErrorSeverity:
    """Error severity levels."""
    DEBUG = 'debug'
    INFO = 'info'
    WARNING = 'warning'
    ERROR = 'error'
    CRITICAL = 'critical'


class ErrorCategory:
    """Error categories for classification."""
    VALIDATION = 'validation'
    AUTHENTICATION = 'authentication'
    AUTHORIZATION = 'authorization'
    NOT_FOUND = 'not_found'
    EXTERNAL_API = 'external_api'
    DATABASE = 'database'
    INTERNAL = 'internal'
    RATE_LIMIT = 'rate_limit'


class StructuredError:
    """
    Structured error representation for consistent logging and reporting.
    """
    
    def __init__(
        self,
        message: str,
        code: str,
        category: str = ErrorCategory.INTERNAL,
        severity: str = ErrorSeverity.ERROR,
        details: Dict[str, Any] = None,
        exception: Exception = None,
        user_id: str = None,
        request_id: str = None
    ):
        self.message = message
        self.code = code
        self.category = category
        self.severity = severity
        self.details = details or {}
        self.exception = exception
        self.user_id = user_id
        self.request_id = request_id
        self.timestamp = timezone.now()
        self.stack_trace = traceback.format_exc() if exception else None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            'message': self.message,
            'code': self.code,
            'category': self.category,
            'severity': self.severity,
            'details': self.details,
            'timestamp': self.timestamp.isoformat(),
            'user_id': self.user_id,
            'request_id': self.request_id,
            'stack_trace': self.stack_trace if settings.DEBUG else None
        }
    
    def log(self):
        """Log the error with appropriate severity."""
        log_data = json.dumps(self.to_dict(), default=str)
        
        if self.severity == ErrorSeverity.DEBUG:
            logger.debug(f"STRUCTURED_ERROR: {log_data}")
        elif self.severity == ErrorSeverity.INFO:
            logger.info(f"STRUCTURED_ERROR: {log_data}")
        elif self.severity == ErrorSeverity.WARNING:
            logger.warning(f"STRUCTURED_ERROR: {log_data}")
        elif self.severity == ErrorSeverity.CRITICAL:
            logger.critical(f"STRUCTURED_ERROR: {log_data}")
        else:
            logger.error(f"STRUCTURED_ERROR: {log_data}")
        
        # Record for metrics
        ErrorTracker.track(self)


class ErrorTracker:
    """
    Track and aggregate errors for monitoring.
    """
    
    ERRORS_PREFIX = 'error_tracking:'
    ERROR_WINDOW = 3600  # 1 hour
    
    @classmethod
    def track(cls, error: StructuredError):
        """
        Track an error occurrence.
        
        Args:
            error: The structured error to track
        """
        # Increment error counter by category
        category_key = f"{cls.ERRORS_PREFIX}category:{error.category}"
        cache.set(category_key, cache.get(category_key, 0) + 1, timeout=cls.ERROR_WINDOW)
        
        # Increment error counter by code
        code_key = f"{cls.ERRORS_PREFIX}code:{error.code}"
        cache.set(code_key, cache.get(code_key, 0) + 1, timeout=cls.ERROR_WINDOW)
        
        # Record recent errors (keep last 100)
        recent_key = f"{cls.ERRORS_PREFIX}recent"
        recent = cache.get(recent_key, [])
        recent.insert(0, {
            'code': error.code,
            'message': error.message[:200],
            'category': error.category,
            'severity': error.severity,
            'timestamp': error.timestamp.isoformat()
        })
        cache.set(recent_key, recent[:100], timeout=cls.ERROR_WINDOW)
    
    @classmethod
    def get_stats(cls) -> Dict[str, Any]:
        """
        Get error statistics for the last hour.
        """
        recent = cache.get(f"{cls.ERRORS_PREFIX}recent", [])
        
        stats_by_category = {}
        stats_by_severity = {}
        
        for error in recent:
            category = error.get('category', 'unknown')
            severity = error.get('severity', 'error')
            
            stats_by_category[category] = stats_by_category.get(category, 0) + 1
            stats_by_severity[severity] = stats_by_severity.get(severity, 0) + 1
        
        return {
            'total_errors': len(recent),
            'by_category': stats_by_category,
            'by_severity': stats_by_severity,
            'recent_errors': recent[:10],
            'window': 'last_hour'
        }


class RetryConfig:
    """Configuration for retry logic."""
    
    def __init__(
        self,
        max_retries: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        exponential_backoff: bool = True,
        retry_exceptions: tuple = (Exception,),
        exclude_exceptions: tuple = ()
    ):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.exponential_backoff = exponential_backoff
        self.retry_exceptions = retry_exceptions
        self.exclude_exceptions = exclude_exceptions


def retry_on_failure(config: RetryConfig = None):
    """
    Decorator to retry function on failure with exponential backoff.
    
    Usage:
        @retry_on_failure(RetryConfig(max_retries=3))
        def call_external_api():
            ...
    """
    if config is None:
        config = RetryConfig()
    
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(config.max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except config.exclude_exceptions:
                    # Don't retry excluded exceptions
                    raise
                except config.retry_exceptions as e:
                    last_exception = e
                    
                    if attempt < config.max_retries:
                        # Calculate delay
                        if config.exponential_backoff:
                            delay = min(
                                config.base_delay * (2 ** attempt),
                                config.max_delay
                            )
                        else:
                            delay = config.base_delay
                        
                        logger.warning(
                            f"RETRY: {func.__name__} failed (attempt {attempt + 1}/{config.max_retries + 1}), "
                            f"retrying in {delay}s: {str(e)}"
                        )
                        
                        time.sleep(delay)
            
            # All retries exhausted
            error = StructuredError(
                message=f"Function {func.__name__} failed after {config.max_retries + 1} attempts",
                code='RETRY_EXHAUSTED',
                category=ErrorCategory.EXTERNAL_API,
                severity=ErrorSeverity.ERROR,
                exception=last_exception,
                details={'function': func.__name__, 'max_retries': config.max_retries}
            )
            error.log()
            
            raise last_exception
        
        return wrapper
    return decorator


def with_error_handling(
    error_code: str = 'INTERNAL_ERROR',
    category: str = ErrorCategory.INTERNAL,
    fallback_response: Any = None
):
    """
    Decorator for standardized error handling in views.
    
    Usage:
        @with_error_handling(error_code='USER_FETCH_ERROR', category=ErrorCategory.DATABASE)
        def get_user(request, user_id):
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                # Extract request if available
                request = None
                for arg in args:
                    if hasattr(arg, 'user'):
                        request = arg
                        break
                
                error = StructuredError(
                    message=str(e),
                    code=error_code,
                    category=category,
                    severity=ErrorSeverity.ERROR,
                    exception=e,
                    user_id=str(request.user.id) if request and hasattr(request, 'user') and request.user.is_authenticated else None
                )
                error.log()
                
                if fallback_response is not None:
                    return fallback_response
                
                return Response({
                    'status': 'error',
                    'message': 'An unexpected error occurred',
                    'code': error_code
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return wrapper
    return decorator


def enhanced_exception_handler(exc: Exception, context: dict) -> Response:
    """
    Enhanced exception handler for DRF with structured error logging.
    
    Configure in settings.py:
        REST_FRAMEWORK = {
            'EXCEPTION_HANDLER': 'apps.core.error_tracking.enhanced_exception_handler'
        }
    """
    # Call default exception handler first
    response = exception_handler(exc, context)
    
    # Extract request info
    request = context.get('request')
    view = context.get('view')
    
    # Determine error category
    status_code = response.status_code if response else 500
    
    if status_code == 400:
        category = ErrorCategory.VALIDATION
        severity = ErrorSeverity.WARNING
    elif status_code == 401:
        category = ErrorCategory.AUTHENTICATION
        severity = ErrorSeverity.WARNING
    elif status_code == 403:
        category = ErrorCategory.AUTHORIZATION
        severity = ErrorSeverity.WARNING
    elif status_code == 404:
        category = ErrorCategory.NOT_FOUND
        severity = ErrorSeverity.INFO
    elif status_code == 429:
        category = ErrorCategory.RATE_LIMIT
        severity = ErrorSeverity.WARNING
    elif status_code >= 500:
        category = ErrorCategory.INTERNAL
        severity = ErrorSeverity.ERROR
    else:
        category = ErrorCategory.INTERNAL
        severity = ErrorSeverity.WARNING
    
    # Create structured error
    error = StructuredError(
        message=str(exc),
        code=exc.__class__.__name__,
        category=category,
        severity=severity,
        exception=exc if status_code >= 500 else None,
        user_id=str(request.user.id) if request and hasattr(request, 'user') and request.user.is_authenticated else None,
        details={
            'view': view.__class__.__name__ if view else None,
            'path': request.path if request else None,
            'method': request.method if request else None,
        }
    )
    error.log()
    
    if response is not None:
        # Standardize response format
        response.data = {
            'status': 'error',
            'message': str(exc) if status_code < 500 else 'An unexpected error occurred',
            'code': exc.__class__.__name__,
            'errors': response.data if isinstance(response.data, dict) and status_code == 400 else None
        }
    else:
        # Handle unhandled exceptions
        response = Response({
            'status': 'error',
            'message': 'An unexpected error occurred',
            'code': 'INTERNAL_SERVER_ERROR'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return response


# =============================================================================
# CIRCUIT BREAKER PATTERN
# =============================================================================

class CircuitBreaker:
    """
    Circuit breaker pattern for external service calls.
    
    States:
    - CLOSED: Normal operation, requests pass through
    - OPEN: Circuit is tripped, requests fail immediately
    - HALF_OPEN: Testing if service has recovered
    
    Usage:
        breaker = CircuitBreaker('external_api', threshold=5)
        
        @breaker
        def call_external_api():
            ...
    """
    
    def __init__(
        self,
        name: str,
        threshold: int = 5,
        recovery_time: int = 60,
        half_open_requests: int = 1
    ):
        self.name = name
        self.threshold = threshold
        self.recovery_time = recovery_time
        self.half_open_requests = half_open_requests
        
        # Cache keys
        self.state_key = f"circuit_breaker:{name}:state"
        self.failures_key = f"circuit_breaker:{name}:failures"
        self.last_failure_key = f"circuit_breaker:{name}:last_failure"
    
    @property
    def state(self) -> str:
        """Get current circuit state."""
        state = cache.get(self.state_key, 'CLOSED')
        
        # Check if should transition from OPEN to HALF_OPEN
        if state == 'OPEN':
            last_failure = cache.get(self.last_failure_key)
            if last_failure:
                try:
                    from django.utils.dateparse import parse_datetime
                    last_failure_time = parse_datetime(last_failure)
                    if timezone.now() > last_failure_time + timedelta(seconds=self.recovery_time):
                        cache.set(self.state_key, 'HALF_OPEN', timeout=86400)
                        return 'HALF_OPEN'
                except Exception:
                    pass
        
        return state
    
    def record_success(self):
        """Record a successful call."""
        cache.set(self.failures_key, 0, timeout=86400)
        cache.set(self.state_key, 'CLOSED', timeout=86400)
    
    def record_failure(self):
        """Record a failed call."""
        failures = cache.get(self.failures_key, 0) + 1
        cache.set(self.failures_key, failures, timeout=86400)
        cache.set(self.last_failure_key, timezone.now().isoformat(), timeout=86400)
        
        if failures >= self.threshold:
            cache.set(self.state_key, 'OPEN', timeout=86400)
            logger.warning(f"CIRCUIT_BREAKER_OPEN: {self.name} after {failures} failures")
    
    def __call__(self, func: Callable):
        """Use as decorator."""
        @wraps(func)
        def wrapper(*args, **kwargs):
            if self.state == 'OPEN':
                raise CircuitBreakerOpenError(f"Circuit breaker {self.name} is OPEN")
            
            try:
                result = func(*args, **kwargs)
                self.record_success()
                return result
            except Exception as e:
                self.record_failure()
                raise
        
        return wrapper


class CircuitBreakerOpenError(Exception):
    """Raised when circuit breaker is open."""
    pass
