"""
Unit tests for OpenTelemetry & W3C Distributed Tracing Engine.
Verifies traceparent parsing, span hierarchy, OTLP formatting, and middleware integration.
"""

import pytest
from django.test import RequestFactory
from django.http import HttpResponse

from apps.core.observability import (
    ObservabilityService,
    Span,
    SpanKind,
    SpanStatus,
    DistributedTracingMiddleware,
)


@pytest.fixture(autouse=True)
def clean_observability():
    """Ensure clean span buffer and trace context before each test."""
    ObservabilityService.clear_spans()
    ObservabilityService.start_trace()
    yield
    ObservabilityService.clear_spans()


class TestW3CTraceContext:
    def test_generate_ids(self):
        tid = ObservabilityService.generate_trace_id()
        sid = ObservabilityService.generate_span_id()
        assert len(tid) == 32
        assert len(sid) == 16
        assert int(tid, 16) > 0
        assert int(sid, 16) > 0

    def test_parse_valid_traceparent(self):
        valid = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
        trace_id, parent_id, sampled = ObservabilityService.parse_traceparent(valid)
        assert trace_id == "4bf92f3577b34da6a3ce929d0e0e4736"
        assert parent_id == "00f067aa0ba902b7"
        assert sampled is True

    def test_parse_invalid_or_none_traceparent(self):
        assert ObservabilityService.parse_traceparent(None) == (None, None, False)
        assert ObservabilityService.parse_traceparent("") == (None, None, False)
        assert ObservabilityService.parse_traceparent("invalid-header") == (
            None,
            None,
            False,
        )
        # All zeros are illegal per W3C spec
        assert ObservabilityService.parse_traceparent(
            "00-00000000000000000000000000000000-0000000000000000-01"
        ) == (None, None, False)

    def test_format_traceparent(self):
        header = ObservabilityService.format_traceparent(
            "4bf92f3577b34da6a3ce929d0e0e4736", "00f067aa0ba902b7", sampled=True
        )
        assert header == "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"


class TestSpanLifecycle:
    def test_span_execution_and_timing(self):
        with ObservabilityService.start_span(
            "test_operation", attributes={"env": "test"}
        ) as span:
            span.set_attribute("user.id", "usr-123")
            span.add_event("cache_check", {"hit": True})
            assert span.status == SpanStatus.UNSET

        assert span.status == SpanStatus.OK
        assert span.duration_ms >= 0.0
        assert span.attributes["env"] == "test"
        assert span.attributes["user.id"] == "usr-123"
        assert len(span.events) == 1
        assert span.events[0]["name"] == "cache_check"

    def test_nested_span_hierarchy(self):
        with ObservabilityService.start_span("parent_span") as parent:
            assert ObservabilityService.get_current_span_id() == parent.span_id
            with ObservabilityService.start_span("child_span") as child:
                assert child.parent_span_id == parent.span_id
                assert ObservabilityService.get_current_span_id() == child.span_id
            # Returns to parent context
            assert ObservabilityService.get_current_span_id() == parent.span_id

        assert ObservabilityService.get_current_span_id() is None
        spans = ObservabilityService.get_recent_spans()
        assert len(spans) == 2
        # Completed spans in order of exit: child first, then parent
        assert spans[0]["name"] == "child_span"
        assert spans[1]["name"] == "parent_span"
        assert spans[0]["parent_span_id"] == spans[1]["span_id"]

    def test_exception_recording_and_status(self):
        try:
            with ObservabilityService.start_span("failing_operation") as span:
                raise ValueError("Simulated fault")
        except ValueError:
            pass

        assert span.status == SpanStatus.ERROR
        assert "Simulated fault" in span.status_description
        assert any(e["name"] == "exception" for e in span.events)

    def test_to_otlp_json_export(self):
        with ObservabilityService.start_span("otlp_test", kind=SpanKind.SERVER) as span:
            span.set_attribute("http.status_code", 200)

        otlp = span.to_otlp_json()
        assert otlp["traceId"] == span.trace_id
        assert otlp["spanId"] == span.span_id
        assert otlp["name"] == "otlp_test"
        assert otlp["kind"] == "SERVER"
        assert otlp["status"]["code"] == 1  # OK
        assert any(attr["key"] == "http.status_code" for attr in otlp["attributes"])


class TestDistributedTracingMiddleware:
    def test_middleware_new_trace_propagation(self):
        factory = RequestFactory()
        request = factory.get("/api/v1/courses/")

        def dummy_view(req):
            return HttpResponse("OK", status=200)

        middleware = DistributedTracingMiddleware(dummy_view)
        response = middleware(request)

        assert "traceparent" in response
        assert "X-Trace-ID" in response
        trace_id, span_id, sampled = ObservabilityService.parse_traceparent(
            response["traceparent"]
        )
        assert trace_id == response["X-Trace-ID"]
        assert sampled is True

        recent = ObservabilityService.get_recent_spans()
        assert len(recent) == 1
        assert recent[0]["attributes"]["http.method"] == "GET"
        assert recent[0]["attributes"]["http.status_code"] == 200

    def test_middleware_existing_traceparent_propagation(self):
        factory = RequestFactory()
        incoming_traceparent = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
        request = factory.get(
            "/api/v1/test/",
            HTTP_TRACEPARENT=incoming_traceparent,
        )

        def dummy_view(req):
            return HttpResponse("OK", status=200)

        middleware = DistributedTracingMiddleware(dummy_view)
        response = middleware(request)

        trace_id, _, _ = ObservabilityService.parse_traceparent(response["traceparent"])
        assert trace_id == "4bf92f3577b34da6a3ce929d0e0e4736"
        assert response["X-Trace-ID"] == "4bf92f3577b34da6a3ce929d0e0e4736"

        recent = ObservabilityService.get_recent_spans()
        assert recent[0]["parent_span_id"] == "00f067aa0ba902b7"
