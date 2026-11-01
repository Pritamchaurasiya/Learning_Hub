"""
Unit tests for API Versioning, RFC 8594 Sunset/Deprecation Headers & 6-Month Lifecycle Policy.
"""

from datetime import datetime, timedelta, timezone as dt_timezone
import pytest
from django.http import HttpResponse, JsonResponse
from django.test import RequestFactory
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory

from apps.core.api_versioning import (
    APIVersion,
    APIVersioningAndDeprecationMiddleware,
    HeaderAndPathVersioning,
    deprecated_api,
    register_deprecated_path,
    _PATH_DEPRECATION_REGISTRY,
    _VERSION_DEPRECATION_REGISTRY,
)


class TestAPIVersionClass:
    """Verifies semantic versioning logic."""

    def test_version_parsing_and_str(self):
        v1 = APIVersion.parse("v1")
        assert v1.major == 1 and v1.minor == 0
        assert str(v1) == "v1.0"

        v2_1 = APIVersion.parse("2.1")
        assert v2_1.major == 2 and v2_1.minor == 1
        assert str(v2_1) == "v2.1"

    def test_version_comparisons(self):
        v1 = APIVersion(1, 0)
        v1_1 = APIVersion(1, 1)
        v2 = APIVersion(2, 0)

        assert v1 < v1_1 < v2
        assert v2 > v1
        assert v1 == APIVersion(1, 0)
        assert v1 == "v1.0"
        assert v1 != v2


class TestHeaderAndPathVersioning:
    """Verifies DRF Header-first version negotiation (ADR-006)."""

    def setup_method(self):
        self.factory = APIRequestFactory()
        self.versioning = HeaderAndPathVersioning()
        self.versioning.allowed_versions = ["v1", "v2"]
        self.versioning.default_version = "v1"

    def test_custom_header_negotiation(self):
        req = self.factory.get("/api/courses/", HTTP_X_API_VERSION="v2")
        version = self.versioning.determine_version(req)
        assert version == "v2"

    def test_accept_header_negotiation(self):
        req = self.factory.get(
            "/api/courses/", HTTP_ACCEPT="application/json; version=2.0"
        )
        version = self.versioning.determine_version(req)
        assert version == "v2"

    def test_url_path_negotiation(self):
        req = self.factory.get("/api/v1/courses/")
        version = self.versioning.determine_version(req)
        assert version == "v1"

    def test_query_param_negotiation(self):
        req = self.factory.get("/api/courses/?version=v2")
        version = self.versioning.determine_version(req)
        assert version == "v2"

    def test_fallback_to_default_version(self):
        req = self.factory.get("/api/courses/")
        version = self.versioning.determine_version(req)
        assert version == "v1"


class TestRFC8594DeprecationAndLifecycle:
    """Verifies RFC 8594 Deprecation, Sunset, Link headers and 6-month lifecycle policy."""

    def setup_method(self):
        self.factory = RequestFactory()
        _PATH_DEPRECATION_REGISTRY.clear()
        _VERSION_DEPRECATION_REGISTRY.clear()

    def test_middleware_injects_version_header(self):
        def dummy_view(request):
            return HttpResponse("OK")

        middleware = APIVersioningAndDeprecationMiddleware(dummy_view)
        req = self.factory.get("/api/v1/courses/")
        res = middleware(req)

        assert res.status_code == 200
        assert res["X-API-Version"] == "v1.0"

    def test_deprecated_endpoint_injects_rfc8594_headers(self):
        since = datetime.now(dt_timezone.utc) - timedelta(days=30)
        sunset = since + timedelta(days=180)  # 6-month lifecycle

        register_deprecated_path(
            path_prefix="/api/v1/legacy-analytics/",
            since=since,
            sunset=sunset,
            successor="/api/v2/analytics/",
            docs_url="https://docs.learninghub.com/api/lifecycle",
            strict_sunset=True,
            message="Please migrate to v2 analytics.",
        )

        def dummy_view(request):
            return HttpResponse("Legacy Data")

        middleware = APIVersioningAndDeprecationMiddleware(dummy_view)
        req = self.factory.get("/api/v1/legacy-analytics/metrics/")
        res = middleware(req)

        # Before sunset date: returns 200 with RFC 8594 headers
        assert res.status_code == 200
        assert "Deprecation" in res
        assert "Sunset" in res
        assert 'rel="deprecation"' in res["Link"]
        assert 'rel="successor-version"' in res["Link"]
        assert res["X-API-Lifecycle-Status"] == "deprecated"

    def test_sunset_endpoint_returns_410_gone(self):
        # Sunset in the past (e.g. 7 months ago)
        since = datetime.now(dt_timezone.utc) - timedelta(days=210)
        sunset = since + timedelta(days=180)  # Sunset was 30 days ago

        register_deprecated_path(
            path_prefix="/api/v1/expired-endpoint/",
            since=since,
            sunset=sunset,
            successor="/api/v2/new-endpoint/",
            docs_url="https://docs.learninghub.com/api/lifecycle",
            strict_sunset=True,
        )

        def dummy_view(request):
            return HttpResponse("Should not reach here")

        middleware = APIVersioningAndDeprecationMiddleware(dummy_view)
        req = self.factory.get("/api/v1/expired-endpoint/")
        res = middleware(req)

        # Strict sunset returns HTTP 410 Gone
        assert res.status_code == 410
        assert res["Sunset"] != ""
        assert "API_SUNSET" in res.content.decode()

    def test_deprecated_api_decorator_active_and_sunset(self):
        # 1. Active deprecation
        since_active = datetime.now(dt_timezone.utc) - timedelta(days=10)
        sunset_active = since_active + timedelta(days=180)

        @deprecated_api(
            since=since_active,
            sunset=sunset_active,
            successor="/api/v2/courses/",
            docs_url="https://docs.learninghub.com/api/v2",
        )
        def sample_view(request):
            return HttpResponse("Sample response")

        req = self.factory.get("/sample/")
        res = sample_view(req)
        assert res.status_code == 200
        assert "Sunset" in res
        assert "Deprecation" in res

        # 2. Expired sunset
        since_expired = datetime.now(dt_timezone.utc) - timedelta(days=200)
        sunset_expired = since_expired + timedelta(days=180)

        @deprecated_api(
            since=since_expired,
            sunset=sunset_expired,
            strict_after_sunset=True,
        )
        def expired_view(request):
            return HttpResponse("Never called")

        res_expired = expired_view(req)
        assert res_expired.status_code == 410
        assert "API_SUNSET" in res_expired.content.decode()
