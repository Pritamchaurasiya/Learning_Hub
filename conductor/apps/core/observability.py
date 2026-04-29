"""
System Observability Service

Enterprise monitoring using:
1. Distributed Tracing (Correlation IDs)
2. Span collection (Performance profiling)
3. Structured Logging
"""

import logging
import uuid
import time
import json
import threading
from contextvars import ContextVar
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# Context for Trace ID
_trace_context = ContextVar("trace_id", default=None)
_span_context = ContextVar("span_id", default=None)


class ObservabilityService:
    """
    Manages tracing and observability.
    """
    
    @classmethod
    def start_trace(cls, trace_id: Optional[str] = None) -> str:
        """Start a new trace context."""
        tid = trace_id or str(uuid.uuid4())
        _trace_context.set(tid)
        return tid

    @classmethod
    def get_trace_id(cls) -> Optional[str]:
        """Get current trace ID."""
        return _trace_context.get()

    @classmethod
    def start_span(cls, name: str) -> 'Span':
        """Start a measurement span."""
        tid = cls.get_trace_id() or cls.start_trace()
        return Span(name, tid)

    @classmethod
    def log_error(cls, error: Exception, context: Dict = None):
        """Log error with correlation ID."""
        tid = cls.get_trace_id()
        payload = {
            "trace_id": tid,
            "error_type": type(error).__name__,
            "message": str(error),
            "context": context or {},
            "timestamp": time.time()
        }
        logger.error(json.dumps(payload))


class Span:
    """Performance tracing span."""
    
    def __init__(self, name: str, trace_id: str):
        self.name = name
        self.trace_id = trace_id
        self.span_id = str(uuid.uuid4())
        self.start_time = None
        self.metadata = {}
        
    def __enter__(self):
        self.start_time = time.time()
        _span_context.set(self.span_id)
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = (time.time() - self.start_time) * 1000
        status = "error" if exc_type else "ok"
        
        # Log span completion
        log_data = {
            "trace_id": self.trace_id,
            "span_id": self.span_id,
            "name": self.name,
            "duration_ms": round(duration, 3),
            "status": status,
            "metadata": self.metadata
        }
        # In production: Send to Jaeger/Zipkin
        logger.info(f"SPAN: {json.dumps(log_data)}")
        
    def set_tag(self, key: str, value: Any):
        self.metadata[key] = value
