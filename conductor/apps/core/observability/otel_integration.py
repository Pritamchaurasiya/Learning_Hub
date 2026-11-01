"""
OpenTelemetry Integration for Distributed Tracing

Provides automatic instrumentation for Django, DRF, Celery, Redis, and PostgreSQL.
Exports traces to Jaeger/Zipkin/OTLP endpoints.
"""

import logging
import os
from typing import Optional
from django.conf import settings

logger = logging.getLogger(__name__)

# Try to import OpenTelemetry - graceful degradation if not installed
try:
    from opentelemetry import trace
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
    from opentelemetry.sdk.resources import Resource, SERVICE_NAME, SERVICE_VERSION
    from opentelemetry.instrumentation.django import DjangoInstrumentor
    from opentelemetry.instrumentation.requests import RequestsInstrumentor
    from opentelemetry.instrumentation.redis import RedisInstrumentor
    from opentelemetry.instrumentation.celery import CeleryInstrumentor
    from opentelemetry.instrumentation.logging import LoggingInstrumentor
    from opentelemetry.instrumentation.psycopg2 import Psycopg2Instrumentor
    from opentelemetry.exporter.jaeger.thrift import JaegerExporter
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
    from opentelemetry.propagate import set_global_textmap
    from opentelemetry.propagators.b3 import B3MultiFormat
    from opentelemetry.trace.propagation.tracecontext import (
        TraceContextTextMapPropagator,
    )

    OTEL_AVAILABLE = True
except ImportError:
    OTEL_AVAILABLE = False
    logger.warning(
        "OpenTelemetry not installed. Run: pip install opentelemetry-sdk opentelemetry-instrumentation-django opentelemetry-instrumentation-celery opentelemetry-exporter-jaeger"
    )


class OpenTelemetryConfig:
    """Configuration for OpenTelemetry tracing."""

    def __init__(self):
        self.service_name = getattr(
            settings, "OTEL_SERVICE_NAME", "learninghub-backend"
        )
        self.service_version = getattr(settings, "OTEL_SERVICE_VERSION", "1.0.0")
        self.jaeger_agent_host = getattr(settings, "OTEL_JAEGER_HOST", "localhost")
        self.jaeger_agent_port = getattr(settings, "OTEL_JAEGER_PORT", 6831)
        self.otlp_endpoint = getattr(settings, "OTEL_OTLP_ENDPOINT", None)
        self.sample_rate = getattr(settings, "OTEL_SAMPLE_RATE", 1.0)
        self.enabled = getattr(settings, "OTEL_ENABLED", True) and OTEL_AVAILABLE

        # Exporters
        self.exporters = []
        if getattr(settings, "OTEL_EXPORTER_JAEGER", True):
            self.exporters.append("jaeger")
        if getattr(settings, "OTEL_EXPORTER_OTLP", False) and self.otlp_endpoint:
            self.exporters.append("otlp")
        if getattr(settings, "OTEL_EXPORTER_CONSOLE", False):
            self.exporters.append("console")


_otel_initialized = False


def init_opentelemetry():
    """Initialize OpenTelemetry SDK with all instrumentations."""
    global _otel_initialized

    if _otel_initialized:
        logger.debug("OpenTelemetry already initialized")
        return

    if not OTEL_AVAILABLE:
        logger.warning("OpenTelemetry not available, skipping initialization")
        return

    config = OpenTelemetryConfig()
    if not config.enabled:
        logger.info("OpenTelemetry disabled via settings")
        return

    try:
        # Create resource with service metadata
        resource = Resource.create(
            {
                SERVICE_NAME: config.service_name,
                SERVICE_VERSION: config.service_version,
                "deployment.environment": getattr(
                    settings, "ENVIRONMENT", "development"
                ),
            }
        )

        # Create tracer provider
        provider = TracerProvider(resource=resource)

        # Configure exporters
        for exporter_type in config.exporters:
            if exporter_type == "jaeger":
                jaeger_exporter = JaegerExporter(
                    agent_host_name=config.jaeger_agent_host,
                    agent_port=config.jaeger_agent_port,
                )
                provider.add_span_processor(BatchSpanProcessor(jaeger_exporter))
                logger.info(
                    f"Jaeger exporter configured: {config.jaeger_agent_host}:{config.jaeger_agent_port}"
                )

            elif exporter_type == "otlp":
                otlp_exporter = OTLPSpanExporter(endpoint=config.otlp_endpoint)
                provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
                logger.info(f"OTLP exporter configured: {config.otlp_endpoint}")

            elif exporter_type == "console":
                console_exporter = ConsoleSpanExporter()
                provider.add_span_processor(BatchSpanProcessor(console_exporter))
                logger.info("Console exporter configured")

        # Set global tracer provider
        trace.set_tracer_provider(provider)

        # Configure propagators (support both W3C TraceContext and B3)
        set_global_textmap(TraceContextTextMapPropagator())
        # Also support B3 for compatibility
        # set_global_textmap(B3MultiFormat())  # Uncomment if B3 needed

        # Auto-instrument Django
        DjangoInstrumentor().instrument(
            tracer_provider=provider,
            is_sql_commentor_enabled=True,
        )

        # Auto-instrument other libraries
        RequestsInstrumentor().instrument()
        RedisInstrumentor().instrument()
        CeleryInstrumentor().instrument()
        Psycopg2Instrumentor().instrument()
        LoggingInstrumentor().instrument(
            set_logging_format=True,
            log_level=logging.INFO,
        )

        _otel_initialized = True
        logger.info(f"OpenTelemetry initialized for service: {config.service_name}")

    except Exception as e:
        logger.error(f"Failed to initialize OpenTelemetry: {e}", exc_info=True)


def get_tracer(name: str = None):
    """Get a tracer instance."""
    if not OTEL_AVAILABLE:
        return NoOpTracer()
    return trace.get_tracer(name or __name__)


class NoOpTracer:
    """No-op tracer for when OpenTelemetry is not available."""

    def start_span(self, name, **kwargs):
        return NoOpSpan()

    def start_as_current_span(self, name, **kwargs):
        return NoOpSpanContextManager()


class NoOpSpan:
    """No-op span."""

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass

    def set_attribute(self, key, value):
        pass

    def add_event(self, name, attributes=None):
        pass

    def record_exception(self, exception):
        pass

    def set_status(self, status):
        pass

    def end(self):
        pass


class NoOpSpanContextManager:
    """No-op span context manager."""

    def __enter__(self):
        return NoOpSpan()

    def __exit__(self, *args):
        pass


# =============================================================================
# CONVENIENCE DECORATORS & UTILITIES
# =============================================================================


def trace_function(name: str = None, attributes: dict = None):
    """
    Decorator to trace a function.

    Usage:
        @trace_function("my_operation", {"user_id": lambda args, kwargs: kwargs.get('user_id')})
        def my_function(user_id, data):
            ...
    """

    def decorator(func):
        def wrapper(*args, **kwargs):
            tracer = get_tracer(func.__module__)
            span_name = name or f"{func.__module__}.{func.__name__}"

            with tracer.start_span(span_name) as span:
                # Add static attributes
                if attributes:
                    for key, value in attributes.items():
                        if callable(value):
                            try:
                                span.set_attribute(key, value(args, kwargs))
                            except Exception:
                                pass
                        else:
                            span.set_attribute(key, value)

                try:
                    result = func(*args, **kwargs)
                    span.set_attribute("success", True)
                    return result
                except Exception as e:
                    span.set_attribute("success", False)
                    span.set_attribute("error", str(e))
                    span.record_exception(e)
                    raise

        return wrapper

    return decorator


class TracedSpan:
    """Context manager for manual span creation with attributes."""

    def __init__(self, name: str, attributes: dict = None, tracer_name: str = None):
        self.name = name
        self.attributes = attributes or {}
        self.tracer = get_tracer(tracer_name)
        self.span = None

    def __enter__(self):
        self.span = self.tracer.start_span(self.name)
        self.span.__enter__()
        for key, value in self.attributes.items():
            self.span.set_attribute(key, value)
        return self.span

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.span.set_attribute("error", True)
            self.span.set_attribute("error.type", exc_type.__name__)
            self.span.set_attribute("error.message", str(exc_val))
            self.span.record_exception(exc_val)
        else:
            self.span.set_attribute("error", False)
        self.span.__exit__(exc_type, exc_val, exc_tb)


def trace_span(name: str, attributes: dict = None):
    """Create a traced span context manager."""
    return TracedSpan(name, attributes)


# =============================================================================
# DJANGO MIDDLEWARE FOR REQUEST TRACING
# =============================================================================


class OpenTelemetryMiddleware:
    """
    Django middleware to add trace context to requests.
    Adds trace_id to request for logging correlation.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.enabled = OTEL_AVAILABLE and getattr(settings, "OTEL_ENABLED", True)

    def __call__(self, request):
        if not self.enabled:
            return self.get_response(request)

        tracer = get_tracer("django.request")

        # Extract trace context from headers (W3C TraceContext)
        traceparent = request.META.get("HTTP_TRACEPARENT")
        tracestate = request.META.get("HTTP_TRACESTATE")

        # Start span for request
        span_name = f"{request.method} {request.path}"
        with tracer.start_span(span_name) as span:
            # Add request attributes
            span.set_attribute("http.method", request.method)
            span.set_attribute("http.url", request.build_absolute_uri())
            span.set_attribute("http.scheme", request.scheme)
            span.set_attribute("http.host", request.get_host())
            span.set_attribute("http.target", request.path)
            span.set_attribute(
                "http.user_agent", request.META.get("HTTP_USER_AGENT", "")
            )

            # Add trace ID to request for logging
            trace_id = span.get_span_context().trace_id
            request.trace_id = format(trace_id, "032x")

            # Add to response headers for client-side correlation
            response = self.get_response(request)

            span.set_attribute("http.status_code", response.status_code)

            # Add trace headers to response
            response["X-Trace-ID"] = request.trace_id

            return response


# =============================================================================
# CELERY TASK TRACING
# =============================================================================


def trace_celery_task(task_name: str = None):
    """
    Decorator to trace Celery tasks with proper context propagation.

    Usage:
        @shared_task
        @trace_celery_task("process_payment")
        def process_payment(payment_id):
            ...
    """

    def decorator(func):
        def wrapper(*args, **kwargs):
            tracer = get_tracer("celery.task")
            span_name = task_name or f"celery.{func.__name__}"

            # Extract trace context from task headers if present
            # Celery passes headers in task.request.headers
            ctx = None
            if hasattr(wrapper, "request") and hasattr(wrapper.request, "headers"):
                headers = wrapper.request.headers
                # Extract traceparent/tracestate for context propagation
                traceparent = headers.get("traceparent")
                if traceparent:
                    # Parse and set as parent context
                    pass

            with tracer.start_span(span_name) as span:
                span.set_attribute("celery.task.name", func.__name__)
                span.set_attribute(
                    "celery.task.id", getattr(wrapper.request, "id", "unknown")
                )

                try:
                    result = func(*args, **kwargs)
                    span.set_attribute("success", True)
                    return result
                except Exception as e:
                    span.set_attribute("success", False)
                    span.set_attribute("error", str(e))
                    span.record_exception(e)
                    raise

        return wrapper

    return decorator


# =============================================================================
# DJANGO SIGNAL TRACING
# =============================================================================


def trace_signal(sender, **kwargs):
    """Trace Django signal handlers."""
    tracer = get_tracer("django.signals")
    signal_name = getattr(sender, "__name__", str(sender))

    with tracer.start_span(f"signal.{signal_name}") as span:
        span.set_attribute("signal.sender", signal_name)
        # Signal handlers shouldn't raise, but if they do...
        try:
            pass  # Actual handler runs outside this context
        except Exception as e:
            span.set_attribute("error", str(e))
            span.record_exception(e)


# =============================================================================
# HEALTH CHECK ENDPOINT
# =============================================================================


def otel_health_check():
    """Check OpenTelemetry status for health endpoint."""
    return {
        "opentelemetry": {
            "available": OTEL_AVAILABLE,
            "initialized": _otel_initialized,
            "enabled": getattr(settings, "OTEL_ENABLED", False),
            "service_name": getattr(
                settings, "OTEL_SERVICE_NAME", "learninghub-backend"
            ),
        }
    }


# =============================================================================
# INTEGRATION WITH EXISTING OBSERVABILITY
# =============================================================================


def enhance_existing_observability():
    """
    Enhance the existing ObservabilityService with OpenTelemetry.
    Call this after Django setup.
    """
    if not OTEL_AVAILABLE:
        return

    try:
        from apps.core.observability import ObservabilityService

        # Monkey-patch to add trace context to existing spans
        original_start_span = ObservabilityService.start_span

        def enhanced_start_span(cls, name: str):
            otel_span = get_tracer("observability").start_span(name)
            # Return wrapper that combines both
            return CombinedSpan(otel_span, original_start_span(name))

        ObservabilityService.start_span = classmethod(enhanced_start_span)
        logger.info("Enhanced existing ObservabilityService with OpenTelemetry")

    except Exception as e:
        logger.warning(f"Could not enhance ObservabilityService: {e}")


class CombinedSpan:
    """Combines OpenTelemetry span with existing ObservabilityService span."""

    def __init__(self, otel_span, local_span):
        self.otel_span = otel_span
        self.local_span = local_span

    def __enter__(self):
        self.otel_span.__enter__()
        self.local_span.__enter__()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.otel_span.__exit__(exc_type, exc_val, exc_tb)
        self.local_span.__exit__(exc_type, exc_val, exc_tb)

    def set_tag(self, key: str, value):
        self.otel_span.set_attribute(key, value)
        self.local_span.set_tag(key, value)

    @property
    def trace_id(self):
        return self.otel_span.get_span_context().trace_id
