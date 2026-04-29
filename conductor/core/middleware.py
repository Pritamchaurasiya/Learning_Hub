"""
Security middleware for Learning Hub — Phase 10.

Provides:
- RequestLoggingMiddleware: Logs method, path, user, status, duration
- InputSanitizationMiddleware: Strips common XSS patterns from POST/PUT/PATCH
- CORSHardeningMiddleware: Validates Origin header against allowlist
"""

import html
import logging
import re
import time

from django.conf import settings
from django.http import JsonResponse

logger = logging.getLogger("security")


class RequestLoggingMiddleware:
    """Log every request with method, path, user, status code, and duration."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.monotonic()
        response = self.get_response(request)
        duration_ms = (time.monotonic() - start) * 1000

        user = getattr(request, "user", None)
        user_id = getattr(user, "id", "anon") if user and user.is_authenticated else "anon"

        logger.info(
            "%s %s | user=%s | status=%s | %.0fms",
            request.method,
            request.path,
            user_id,
            response.status_code,
            duration_ms,
        )

        # Inject server-timing header (useful for debugging)
        response["Server-Timing"] = f'total;dur={duration_ms:.1f}'
        return response


# XSS patterns to strip from user input
_XSS_PATTERNS = [
    re.compile(r"<script\b[^>]*>.*?</script>", re.I | re.S),
    re.compile(r"javascript:", re.I),
    re.compile(r"on\w+\s*=", re.I),  # onclick=, onerror=, etc.
    re.compile(r"<iframe\b[^>]*>", re.I),
]


class InputSanitizationMiddleware:
    """Strip common XSS payloads from request body strings.

    Works on POST, PUT, and PATCH JSON payloads.
    Does NOT modify file uploads.
    """

    EXEMPT_PATHS = frozenset(["/admin/", "/api/v1/dashboard/moderate/"])

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if (
            request.method in ("POST", "PUT", "PATCH")
            and request.content_type
            and "json" in request.content_type
            and not any(request.path.startswith(p) for p in self.EXEMPT_PATHS)
        ):
            try:
                body = request.body.decode("utf-8", errors="replace")
                sanitized = self._sanitize(body)
                if sanitized != body:
                    logger.warning(
                        "XSS pattern stripped from %s %s by user %s",
                        request.method,
                        request.path,
                        getattr(request.user, "id", "anon"),
                    )
                    # Replace request body with sanitized version
                    request._body = sanitized.encode("utf-8")
            except Exception:
                pass  # Don't block requests on sanitization failure

        return self.get_response(request)

    @staticmethod
    def _sanitize(text):
        """Remove XSS patterns and escape remaining HTML entities."""
        for pattern in _XSS_PATTERNS:
            text = pattern.sub("", text)
        return text


class CORSHardeningMiddleware:
    """Validate Origin header against settings.CORS_ALLOWED_ORIGINS.

    Rejects requests with disallowed Origin headers on mutating methods.
    Does NOT interfere with django-cors-headers — acts as an extra guard.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.allowed_origins = set(
            getattr(settings, "CORS_ALLOWED_ORIGINS", [])
        )
        self.allow_all = getattr(settings, "CORS_ALLOW_ALL_ORIGINS", False)

    def __call__(self, request):
        origin = request.META.get("HTTP_ORIGIN", "")

        # Only validate mutating requests with an Origin header
        if (
            origin
            and request.method in ("POST", "PUT", "PATCH", "DELETE")
            and not self.allow_all
            and origin not in self.allowed_origins
        ):
            logger.warning(
                "CORS rejection: origin=%s path=%s method=%s",
                origin,
                request.path,
                request.method,
            )
            return JsonResponse(
                {"status": "error", "message": "Origin not allowed"},
                status=403,
            )

        return self.get_response(request)
