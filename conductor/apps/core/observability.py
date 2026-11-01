"""
OpenTelemetry & W3C Distributed Tracing Engine for LearningHub Conductor.

Provides:
1. W3C TraceContext (RFC compliant traceparent parsing, extraction, and propagation)
2. Hierarchical span lifecycle tracking with contextvars (parent-child spans)
3. Latency instrumentation with Prometheus histograms
4. Structured JSON and OTLP-compatible span serialization
5. DistributedTracingMiddleware for Django request/response correlation
"""

import collections
import json
import logging
import re
import time
import uuid
from contextvars import ContextVar
from typing import Any, Dict, List, Optional, Tuple

from apps.core.metrics import (
    HTTP_REQUEST_DURATION_SECONDS,
    HTTP_REQUESTS_TOTAL,
)

logger = logging.getLogger(__name__)

# ContextVars for active trace and span stack
_trace_context: ContextVar[Optional[str]] = ContextVar("trace_id", default=None)
_span_context: ContextVar[Optional[str]] = ContextVar("span_id", default=None)
_span_stack_context: ContextVar[List[str]] = ContextVar("span_stack", default=[])

# Regular expression to validate W3C traceparent (version-trace_id-parent_id-trace_flags)
# Example: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
TRACEPARENT_REGEX = re.compile(
    r"^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$"
)


class SpanStatus:
    UNSET = "UNSET"
    OK = "OK"
    ERROR = "ERROR"


class SpanKind:
    INTERNAL = "INTERNAL"
    SERVER = "SERVER"
    CLIENT = "CLIENT"
    PRODUCER = "PRODUCER"
    CONSUMER = "CONSUMER"


class Span:
    """
    OpenTelemetry-compliant performance and distributed tracing span.
    Tracks execution latency, attributes, events, errors, and parent-child causal relationships.
    """

    def __init__(
        self,
        name: str,
        trace_id: str,
        span_id: Optional[str] = None,
        parent_span_id: Optional[str] = None,
        kind: str = SpanKind.INTERNAL,
        attributes: Optional[Dict[str, Any]] = None,
    ):
        self.name = name
        self.trace_id = trace_id
        self.span_id = span_id or uuid.uuid4().hex[:16]
        self.parent_span_id = parent_span_id
        self.kind = kind
        self.attributes: Dict[str, Any] = dict(attributes or {})
        self.events: List[Dict[str, Any]] = []
        self.status = SpanStatus.UNSET
        self.status_description = ""
        self.start_time: float = 0.0
        self.end_time: Optional[float] = None
        self.duration_ms: float = 0.0
        self._previous_span_id: Optional[str] = None

    def __enter__(self) -> "Span":
        self.start_time = time.time()
        self._previous_span_id = _span_context.get()
        _span_context.set(self.span_id)

        # Maintain span hierarchy stack
        current_stack = list(_span_stack_context.get())
        current_stack.append(self.span_id)
        _span_stack_context.set(current_stack)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.end_time = time.time()
        self.duration_ms = round((self.end_time - self.start_time) * 1000.0, 3)

        if exc_type:
            self.record_exception(exc_val)
            self.set_status(SpanStatus.ERROR, str(exc_val))
        elif self.status == SpanStatus.UNSET:
            self.set_status(SpanStatus.OK)

        # Revert span stack
        current_stack = list(_span_stack_context.get())
        if current_stack and current_stack[-1] == self.span_id:
            current_stack.pop()
            _span_stack_context.set(current_stack)
            _span_context.set(current_stack[-1] if current_stack else None)
        else:
            _span_context.set(self._previous_span_id)

        # Record span in Observability ring buffer
        ObservabilityService.record_span(self)

    def set_attribute(self, key: str, value: Any) -> "Span":
        """Set a single span attribute."""
        self.attributes[key] = value
        return self

    def set_attributes(self, attributes: Dict[str, Any]) -> "Span":
        """Set multiple span attributes in bulk."""
        self.attributes.update(attributes)
        return self

    def add_event(
        self, name: str, attributes: Optional[Dict[str, Any]] = None
    ) -> "Span":
        """Record an in-span milestone event."""
        self.events.append(
            {
                "name": name,
                "timestamp": time.time(),
                "attributes": attributes or {},
            }
        )
        return self

    def record_exception(self, exception: Exception) -> "Span":
        """Capture exception metadata onto span."""
        import traceback

        self.add_event(
            "exception",
            {
                "exception.type": type(exception).__name__,
                "exception.message": str(exception),
                "exception.stacktrace": "".join(
                    traceback.format_exception(
                        type(exception), exception, exception.__traceback__
                    )
                ),
            },
        )
        return self

    def set_status(self, status: str, description: str = "") -> "Span":
        """Set status code (OK, ERROR, UNSET)."""
        self.status = status
        self.status_description = description
        return self

    @property
    def duration_seconds(self) -> float:
        return self.duration_ms / 1000.0

    def to_dict(self) -> Dict[str, Any]:
        """Serialize span to standard telemetry dictionary."""
        return {
            "name": self.name,
            "trace_id": self.trace_id,
            "span_id": self.span_id,
            "parent_span_id": self.parent_span_id,
            "kind": self.kind,
            "status": self.status,
            "status_description": self.status_description,
            "duration_ms": self.duration_ms,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "attributes": self.attributes,
            "events": self.events,
        }

    def to_otlp_json(self) -> Dict[str, Any]:
        """Format span as standard OpenTelemetry (OTLP) JSON resource span."""
        start_nano = int(self.start_time * 1e9) if self.start_time else 0
        end_nano = int(self.end_time * 1e9) if self.end_time else start_nano

        return {
            "traceId": self.trace_id,
            "spanId": self.span_id,
            "parentSpanId": self.parent_span_id or "",
            "name": self.name,
            "kind": self.kind,
            "startTimeUnixNano": str(start_nano),
            "endTimeUnixNano": str(end_nano),
            "attributes": [
                {"key": k, "value": {"stringValue": str(v)}}
                for k, v in self.attributes.items()
            ],
            "status": {
                "code": (
                    1
                    if self.status == SpanStatus.OK
                    else (2 if self.status == SpanStatus.ERROR else 0)
                ),
                "message": self.status_description,
            },
        }


class ObservabilityService:
    """
    Central distributed tracing and telemetry hub.
    Maintains an in-memory ring buffer of completed spans and manages context propagation.
    """

    _recent_spans: collections.deque = collections.deque(maxlen=1000)

    @classmethod
    def generate_trace_id(cls) -> str:
        """Generate a compliant 128-bit (32 hex characters) trace ID."""
        return uuid.uuid4().hex

    @classmethod
    def generate_span_id(cls) -> str:
        """Generate a compliant 64-bit (16 hex characters) span ID."""
        return uuid.uuid4().hex[:16]

    @classmethod
    def parse_traceparent(
        cls, header: Optional[str]
    ) -> Tuple[Optional[str], Optional[str], bool]:
        """
        Parse standard W3C traceparent header: 00-{trace_id}-{parent_id}-{flags}
        Returns: (trace_id, parent_span_id, sampled)
        """
        if not header or not isinstance(header, str):
            return None, None, False

        match = TRACEPARENT_REGEX.match(header.strip())
        if not match:
            return None, None, False

        version, trace_id, parent_id, flags = match.groups()
        if trace_id == "0" * 32 or parent_id == "0" * 16:
            return None, None, False

        sampled = bool(int(flags, 16) & 0x01)
        return trace_id, parent_id, sampled

    @classmethod
    def format_traceparent(
        cls, trace_id: str, span_id: str, sampled: bool = True
    ) -> str:
        """Format W3C traceparent header."""
        flags = "01" if sampled else "00"
        return f"00-{trace_id:0>32}-{span_id:0>16}-{flags}"

    @classmethod
    def start_trace(cls, trace_id: Optional[str] = None) -> str:
        """Initialize or bind the current trace context."""
        tid = trace_id or cls.generate_trace_id()
        _trace_context.set(tid)
        _span_context.set(None)
        _span_stack_context.set([])
        return tid

    @classmethod
    def get_trace_id(cls) -> Optional[str]:
        """Retrieve the active trace ID."""
        return _trace_context.get()

    @classmethod
    def get_current_span_id(cls) -> Optional[str]:
        """Retrieve the active span ID."""
        return _span_context.get()

    @classmethod
    def start_span(
        cls,
        name: str,
        kind: str = SpanKind.INTERNAL,
        attributes: Optional[Dict[str, Any]] = None,
        parent_span_id: Optional[str] = None,
    ) -> Span:
        """Create a new measurement span within the active or new trace context."""
        tid = cls.get_trace_id() or cls.start_trace()
        parent_id = parent_span_id or cls.get_current_span_id()
        return Span(
            name=name,
            trace_id=tid,
            parent_span_id=parent_id,
            kind=kind,
            attributes=attributes,
        )

    @classmethod
    def record_span(cls, span: Span) -> None:
        """Record completed span into telemetry storage and structured logger."""
        cls._recent_spans.append(span)
        log_payload = {
            "telemetry": "span",
            "trace_id": span.trace_id,
            "span_id": span.span_id,
            "parent_span_id": span.parent_span_id,
            "name": span.name,
            "duration_ms": span.duration_ms,
            "status": span.status,
            "attributes": span.attributes,
        }
        logger.info("SPAN: %s", json.dumps(log_payload))

    @classmethod
    def get_recent_spans(cls, limit: int = 100) -> List[Dict[str, Any]]:
        """Retrieve recent spans from the in-memory telemetry buffer."""
        spans = list(cls._recent_spans)
        return [s.to_dict() for s in spans[-limit:]]

    @classmethod
    def clear_spans(cls) -> None:
        """Clear recent spans buffer (useful for test resets)."""
        cls._recent_spans.clear()

    @classmethod
    def log_error(
        cls, error: Exception, context: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log error correlated with active distributed trace ID."""
        tid = cls.get_trace_id()
        payload = {
            "trace_id": tid,
            "error_type": type(error).__name__,
            "message": str(error),
            "context": context or {},
            "timestamp": time.time(),
        }
        logger.error(json.dumps(payload))


class DistributedTracingMiddleware:
    """
    Django middleware for end-to-end distributed tracing.
    1. Extracts or synthesizes W3C TraceContext traceparent
    2. Wraps request handling in a root SERVER span
    3. Records latency in Prometheus histograms
    4. Injects traceparent and X-Trace-ID into response headers
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # 1. Parse or generate W3C TraceContext
        header = request.headers.get("traceparent") or request.META.get(
            "HTTP_TRACEPARENT"
        )
        trace_id, parent_span_id, _ = ObservabilityService.parse_traceparent(header)
        if not trace_id:
            trace_id = ObservabilityService.generate_trace_id()

        ObservabilityService.start_trace(trace_id)

        # Resolve route endpoint name
        resolver_match = getattr(request, "resolver_match", None)
        endpoint = resolver_match.view_name if resolver_match else request.path
        span_name = f"HTTP {request.method} {endpoint}"

        with ObservabilityService.start_span(
            span_name,
            kind=SpanKind.SERVER,
            parent_span_id=parent_span_id,
            attributes={
                "http.method": request.method,
                "http.route": request.path,
                "http.user_agent": request.META.get("HTTP_USER_AGENT", ""),
                "http.client_ip": request.META.get("REMOTE_ADDR", ""),
            },
        ) as span:
            try:
                response = self.get_response(request)
                status_code = getattr(response, "status_code", 200)
                span.set_attribute("http.status_code", status_code)
                if status_code >= 500:
                    span.set_status(SpanStatus.ERROR, f"HTTP {status_code}")
                else:
                    span.set_status(SpanStatus.OK)

                # Record Prometheus latency metrics
                try:
                    HTTP_REQUEST_DURATION_SECONDS.labels(
                        method=request.method,
                        endpoint=endpoint[:50],
                        status_code=str(status_code),
                    ).observe(span.duration_seconds)
                    HTTP_REQUESTS_TOTAL.labels(
                        method=request.method,
                        endpoint=endpoint[:50],
                        status_code=str(status_code),
                    ).inc()
                except Exception:
                    pass

                # Propagate W3C traceparent back to client
                response["traceparent"] = ObservabilityService.format_traceparent(
                    trace_id, span.span_id
                )
                response["X-Trace-ID"] = trace_id
                return response

            except Exception as exc:
                span.record_exception(exc)
                span.set_status(SpanStatus.ERROR, str(exc))
                raise
