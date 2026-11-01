"""Core observability package for LearningHub Conductor."""

from .tracing import (
    ObservabilityService,
    Span,
    SpanKind,
    SpanStatus,
    DistributedTracingMiddleware,
    _trace_context,
    _span_context,
    _span_stack_context,
    TRACEPARENT_REGEX,
)
from .otel_integration import (
    OpenTelemetryConfig,
    OTEL_AVAILABLE,
)
from .sentry_integration import (
    SentryConfig,
    SENTRY_AVAILABLE,
)

__all__ = [
    "ObservabilityService",
    "Span",
    "SpanKind",
    "SpanStatus",
    "DistributedTracingMiddleware",
    "_trace_context",
    "_span_context",
    "_span_stack_context",
    "TRACEPARENT_REGEX",
    "OpenTelemetryConfig",
    "OTEL_AVAILABLE",
    "SentryConfig",
    "SENTRY_AVAILABLE",
]
