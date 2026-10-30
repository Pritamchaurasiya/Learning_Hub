"""
Sentry Integration for Error Tracking & Performance Monitoring

Provides automatic error capture, performance monitoring, and release tracking.
"""

import logging
import os
from typing import Optional
from django.conf import settings

logger = logging.getLogger(__name__)

# Try to import Sentry - graceful degradation if not installed
try:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
    from sentry_sdk.integrations.celery import CeleryIntegration
    from sentry_sdk.integrations.redis import RedisIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration
    from sentry_sdk.integrations.threading import ThreadingIntegration
    SENTRY_AVAILABLE = True
except ImportError:
    SENTRY_AVAILABLE = False
    logger.warning("Sentry SDK not installed. Run: pip install sentry-sdk")


_sentry_initialized = False


class SentryConfig:
    """Configuration for Sentry integration."""
    
    def __init__(self):
        self.dsn = getattr(settings, 'SENTRY_DSN', None)
        self.environment = getattr(settings, 'SENTRY_ENVIRONMENT', getattr(settings, 'ENVIRONMENT', 'development'))
        self.release = getattr(settings, 'SENTRY_RELEASE', getattr(settings, 'VERSION', '1.0.0'))
        self.traces_sample_rate = getattr(settings, 'SENTRY_TRACES_SAMPLE_RATE', 0.1)
        self.profiles_sample_rate = getattr(settings, 'SENTRY_PROFILES_SAMPLE_RATE', 0.1)
        self.send_default_pii = getattr(settings, 'SENTRY_SEND_PII', False)
        self.debug = getattr(settings, 'SENTRY_DEBUG', False)
        self.enabled = getattr(settings, 'SENTRY_ENABLED', True) and SENTRY_AVAILABLE and bool(self.dsn)
        
        # Performance
        self.enable_tracing = getattr(settings, 'SENTRY_ENABLE_TRACING', True)
        
        # Filtering
        self.ignore_errors = getattr(settings, 'SENTRY_IGNORE_ERRORS', [
            'django.http.request.Http404',
            'django.core.exceptions.PermissionDenied',
            'rest_framework.exceptions.NotFound',
            'rest_framework.exceptions.PermissionDenied',
        ])
        
        # Before send hook for custom filtering
        self.before_send = getattr(settings, 'SENTRY_BEFORE_SEND', None)


def init_sentry():
    """Initialize Sentry SDK with all integrations."""
    global _sentry_initialized
    
    if _sentry_initialized:
        logger.debug("Sentry already initialized")
        return
    
    if not SENTRY_AVAILABLE:
        logger.warning("Sentry SDK not available, skipping initialization")
        return
    
    config = SentryConfig()
    if not config.enabled:
        logger.info("Sentry disabled via settings or missing DSN")
        return
    
    try:
        # Logging integration for breadcrumbs
        logging_integration = LoggingIntegration(
            level=logging.INFO,        # Capture info and above as breadcrumbs
            event_level=logging.ERROR  # Send errors as events
        )
        
        # Initialize Sentry
        sentry_sdk.init(
            dsn=config.dsn,
            environment=config.environment,
            release=config.release,
            traces_sample_rate=config.traces_sample_rate,
            profiles_sample_rate=config.profiles_sample_rate,
            send_default_pii=config.send_default_pii,
            debug=config.debug,
            enable_tracing=config.enable_tracing,
            
            # Integrations
            integrations=[
                DjangoIntegration(
                    transaction_style='url',
                    middleware_spans=True,
                    signals_spans=True,
                    cache_spans=True,
                ),
                CeleryIntegration(
                    monitor_beat_tasks=True,
                    propagate_traces=True,
                ),
                RedisIntegration(),
                logging_integration,
                ThreadingIntegration(),
            ],
            
            # Error filtering
            ignore_errors=config.ignore_errors,
            
            # Custom before_send hook
            before_send=config.before_send or default_before_send,
            
            # Custom tags
            _experiments={
                "continuous_profiling_auto_start": True,
            },
        )
        
        # Set global tags
        sentry_sdk.set_tag("service", "learninghub-backend")
        sentry_sdk.set_tag("deployment", config.environment)
        
        _sentry_initialized = True
        logger.info(f"Sentry initialized for environment: {config.environment}, release: {config.release}")
        
    except Exception as e:
        logger.error(f"Failed to initialize Sentry: {e}", exc_info=True)


def default_before_send(event, hint):
    """Default before_send hook for custom event filtering."""
    # Filter out health check errors
    if event.get('request', {}).get('url', '').endswith('/health/'):
        return None
    
    # Filter out known benign errors
    if 'exc_info' in hint:
        exc_type, exc_value, _ = hint['exc_info']
        if exc_type.__name__ in ['Http404', 'PermissionDenied']:
            return None
    
    return event


def capture_exception(exception, **kwargs):
    """Capture an exception with additional context."""
    if not SENTRY_AVAILABLE or not _sentry_initialized:
        return
    
    with sentry_sdk.push_scope() as scope:
        for key, value in kwargs.items():
            scope.set_extra(key, value)
        sentry_sdk.capture_exception(exception)


def capture_message(message, level="info", **kwargs):
    """Capture a message with additional context."""
    if not SENTRY_AVAILABLE or not _sentry_initialized:
        return
    
    with sentry_sdk.push_scope() as scope:
        for key, value in kwargs.items():
            scope.set_extra(key, value)
        sentry_sdk.capture_message(message, level=level)


def set_user_context(user):
    """Set user context for Sentry events."""
    if not SENTRY_AVAILABLE or not _sentry_initialized:
        return
    
    sentry_sdk.set_user({
        "id": str(user.id),
        "email": user.email,
        "username": user.username,
        "role": getattr(user, 'role', 'unknown'),
    })


def set_tag(key, value):
    """Set a tag for Sentry events."""
    if not SENTRY_AVAILABLE or not _sentry_initialized:
        return
    sentry_sdk.set_tag(key, value)


def set_context(name, context):
    """Set structured context for Sentry events."""
    if not SENTRY_AVAILABLE or not _sentry_initialized:
        return
    sentry_sdk.set_context(name, context)


def add_breadcrumb(message, category="custom", level="info", data=None):
    """Add a breadcrumb for debugging context."""
    if not SENTRY_AVAILABLE or not _sentry_initialized:
        return
    
    sentry_sdk.add_breadcrumb(
        message=message,
        category=category,
        level=level,
        data=data or {},
    )


def start_transaction(name, op="function", **kwargs):
    """Start a performance transaction."""
    if not SENTRY_AVAILABLE or not _sentry_initialized:
        return NoOpTransaction()
    
    return sentry_sdk.start_transaction(
        name=name,
        op=op,
        **kwargs
    )


class NoOpTransaction:
    """No-op transaction for when Sentry is not available."""
    
    def __enter__(self):
        return self
    
    def __exit__(self, *args):
        pass
    
    def set_tag(self, key, value):
        pass
    
    def set_data(self, key, value):
        pass
    
    def finish(self):
        pass


# =============================================================================
# DJANGO MIDDLEWARE FOR SENTRY
# =============================================================================

class SentryMiddleware:
    """
    Django middleware to add user context and request data to Sentry.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.enabled = SENTRY_AVAILABLE and getattr(settings, 'SENTRY_ENABLED', True)
    
    def __call__(self, request):
        if not self.enabled:
            return self.get_response(request)
        
        # Add user context if authenticated
        if hasattr(request, 'user') and request.user.is_authenticated:
            set_user_context(request.user)
        
        # Add request context
        sentry_sdk.set_context("request", {
            "method": request.method,
            "url": request.build_absolute_uri(),
            "headers": dict(request.META),
            "query_params": dict(request.GET),
        })
        
        response = self.get_response(request)
        
        # Add response info
        sentry_sdk.set_context("response", {
            "status_code": response.status_code,
        })
        
        return response


# =============================================================================
# CELERY TASK INTEGRATION
# =============================================================================

def sentry_celery_task(task_name: str = None):
    """
    Decorator to add Sentry context to Celery tasks.
    
    Usage:
        @shared_task
        @sentry_celery_task("process_payment")
        def process_payment(payment_id):
            ...
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            if not SENTRY_AVAILABLE or not _sentry_initialized:
                return func(*args, **kwargs)
            
            name = task_name or f"celery.{func.__name__}"
            
            with sentry_sdk.start_transaction(name=name, op="celery.task") as transaction:
                transaction.set_tag("task.name", func.__name__)
                transaction.set_tag("task.id", getattr(wrapper.request, 'id', 'unknown'))
                
                # Set user context if available in task args
                if args and hasattr(args[0], 'id'):
                    set_user_context(args[0])
                
                try:
                    result = func(*args, **kwargs)
                    transaction.set_tag("success", True)
                    return result
                except Exception as e:
                    transaction.set_tag("success", False)
                    capture_exception(e, task=func.__name__)
                    raise
        return wrapper
    return decorator


# =============================================================================
# HEALTH CHECK
# =============================================================================

def sentry_health_check():
    """Check Sentry status for health endpoint."""
    return {
        "sentry": {
            "available": SENTRY_AVAILABLE,
            "initialized": _sentry_initialized,
            "enabled": getattr(settings, 'SENTRY_ENABLED', False),
            "environment": getattr(settings, 'SENTRY_ENVIRONMENT', 'development'),
            "release": getattr(settings, 'SENTRY_RELEASE', '1.0.0'),
            "dsn_configured": bool(getattr(settings, 'SENTRY_DSN', None)),
        }
    }


# =============================================================================
# RELEASE TRACKING
# =============================================================================

def configure_release_tracking():
    """Configure automatic release tracking from git/version."""
    try:
        import subprocess
        
        # Try to get git commit hash
        try:
            commit = subprocess.check_output(
                ['git', 'rev-parse', 'HEAD'],
                stderr=subprocess.DEVNULL,
                cwd=settings.BASE_DIR
            ).decode().strip()
            set_tag("git.commit", commit)
        except Exception:
            pass
        
        # Try to get git tag
        try:
            tag = subprocess.check_output(
                ['git', 'describe', '--tags', '--always'],
                stderr=subprocess.DEVNULL,
                cwd=settings.BASE_DIR
            ).decode().strip()
            set_tag("git.tag", tag)
        except Exception:
            pass
            
    except Exception as e:
        logger.debug(f"Could not configure release tracking: {e}")


# =============================================================================
# INTEGRATION WITH EXISTING ERROR TRACKING
# =============================================================================

def enhance_error_tracking():
    """
    Enhance existing error_tracking module with Sentry.
    """
    try:
        from apps.core.error_tracking import StructuredError, ErrorCategory, ErrorSeverity
        
        # Monkey-patch to also send to Sentry
        original_capture = StructuredError.capture if hasattr(StructuredError, 'capture') else None
        
        def enhanced_capture(error, **kwargs):
            # Call original if exists
            if original_capture:
                original_capture(error, **kwargs)
            
            # Also send to Sentry
            if isinstance(error, Exception):
                capture_exception(error, **kwargs)
            elif isinstance(error, StructuredError):
                capture_message(
                    error.message,
                    level=error.severity.value.lower(),
                    category=error.category.value,
                    code=error.code,
                    **kwargs
                )
        
        StructuredError.capture = staticmethod(enhanced_capture)
        logger.info("Enhanced StructuredError with Sentry integration")
        
    except Exception as e:
        logger.warning(f"Could not enhance error_tracking with Sentry: {e}")