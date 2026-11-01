"""
Distributed Tracing Middleware

Extracts and propagates W3C TraceContext headers for distributed tracing.
Integrates with OpenTelemetry when available.
"""

import logging
from django.utils.deprecation import MiddlewareMixin

try:
    from opentelemetry import trace
    from opentelemetry.propagate import extract, inject
    from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator
    OTEL_AVAILABLE = True
except ImportError:
    OTEL_AVAILABLE = False

logger = logging.getLogger(__name__)


class DistributedTracingMiddleware(MiddlewareMixin):
    """
    Middleware to extract and propagate trace context headers.
    
    Handles W3C TraceContext standard headers:
    - traceparent: Contains trace-id, parent-id, and trace-flags
    - tracestate: Contains vendor-specific trace state
    
    This enables distributed tracing across service boundaries.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.propagator = TraceContextTextMapPropagator() if OTEL_AVAILABLE else None
        
        # Headers to extract for tracing
        self.traceparent_header = 'HTTP_TRACEPARENT'
        self.tracestate_header = 'HTTP_TRACESTATE'
        
        # Header to inject in responses
        self.response_traceparent = 'X-Trace-ID'
    
    def __call__(self, request):
        # Extract trace context from incoming headers
        trace_context = self._extract_trace_context(request)
        
        # Store trace context on request for use in views/logging
        request.trace_context = trace_context
        
        # Get trace ID for logging correlation
        if trace_context and 'trace_id' in trace_context:
            request.trace_id = trace_context['trace_id']
        else:
            # Generate new trace ID if none provided
            import uuid
            request.trace_id = uuid.uuid4().hex
        
        # Process request
        response = self.get_response(request)
        
        # Inject trace context into response headers
        self._inject_trace_context(response, request.trace_id)
        
        return response
    
    def _extract_trace_context(self, request):
        """Extract trace context from request headers."""
        if not OTEL_AVAILABLE or not self.propagator:
            return {}
        
        try:
            # Build carrier from request headers
            carrier = {}
            if self.traceparent_header in request.META:
                carrier['traceparent'] = request.META[self.traceparent_header]
            if self.tracestate_header in request.META:
                carrier['tracestate'] = request.META[self.tracestate_header]
            
            if not carrier:
                return {}
            
            # Extract context
            ctx = extract(carrier)
            span_context = trace.get_current_span(ctx).get_span_context()
            
            if span_context and span_context.trace_id:
                return {
                    'trace_id': format(span_context.trace_id, '032x'),
                    'span_id': format(span_context.span_id, '016x'),
                    'trace_flags': span_context.trace_flags,
                }
            
        except Exception as e:
            logger.debug(f"Failed to extract trace context: {e}")
        
        return {}
    
    def _inject_trace_context(self, response, trace_id):
        """Inject trace context into response headers."""
        if trace_id:
            response[self.response_traceparent] = trace_id
        
        # Also inject full traceparent if we have OpenTelemetry
        if OTEL_AVAILABLE and self.propagator:
            try:
                carrier = {}
                inject(carrier)
                if 'traceparent' in carrier:
                    response['X-Trace-Parent'] = carrier['traceparent']
                if 'tracestate' in carrier:
                    response['X-Trace-State'] = carrier['tracestate']
            except Exception as e:
                logger.debug(f"Failed to inject trace context: {e}")


# Simple trace ID generation for when OpenTelemetry is not available
def generate_trace_id():
    """Generate a simple trace ID."""
    import uuid
    return uuid.uuid4().hex


def get_trace_id(request):
    """Get trace ID from request, generating if necessary."""
    if hasattr(request, 'trace_id'):
        return request.trace_id
    return generate_trace_id()


# Context manager for manual trace context
class TraceContext:
    """Context manager for setting trace context in current execution."""
    
    def __init__(self, trace_id=None, span_id=None):
        self.trace_id = trace_id or generate_trace_id()
        self.span_id = span_id
        self._previous_context = None
    
    def __enter__(self):
        if OTEL_AVAILABLE:
            # Set trace context in OpenTelemetry
            self._previous_context = trace.get_current_span()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if OTEL_AVAILABLE and self._previous_context:
            # Restore previous context
            pass