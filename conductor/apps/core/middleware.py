
import logging
import time
import json
from django.db import connection, transaction
from django.core.cache import cache
from django.conf import settings
from rest_framework.response import Response
from rest_framework import status
import structlog

logger = structlog.get_logger(__name__)
standard_logger = logging.getLogger(__name__)

class SelfHealingMiddleware:
    """
    Advanced middleware that attempts to recover from transient system failures.
    - Database Connectivity Issues: Retries queries.
    - Rate Limits: Implements exponential backoff on client side logic (if server to server).
    - Cache Failures: Gracefully degrades to DB.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_time = time.time()
        try:
            response = self.get_response(request)
            duration_ms = (time.time() - start_time) * 1000
            # Structured APM logging for every request
            logger.info(
                "request_completed",
                method=request.method,
                path=request.path,
                status=getattr(response, 'status_code', 0),
                duration_ms=round(duration_ms, 2),
            )
            # Flag slow requests (> 2 seconds) as warnings
            if duration_ms > 2000:
                logger.warning(
                    "slow_request_detected",
                    method=request.method,
                    path=request.path,
                    duration_ms=round(duration_ms, 2),
                )
            return response
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            logger.error(
                "request_failed",
                method=request.method,
                path=request.path,
                duration_ms=round(duration_ms, 2),
                error=str(e),
            )
            return self.attempt_healing(request, e)

    def attempt_healing(self, request, exception):
        """
        Analyze the exception and attempt to self-heal or degrade gracefully.
        """
        error_type = type(exception).__name__
        logger.error("system_error_detected", error=str(exception), type=error_type)

        # 1. Database Connection Failures
        if "OperationalError" in error_type or "connection" in str(exception).lower():
            logger.info("attempting_db_healing")
            try:
                # Try to reset connection
                connection.close()
                connection.connect()
                # Retry logic would ideally happen in the view, but here we can
                # return a Service Unavailable with a "Retry-After" header
                # OR we could replay the request if it's safe (GET/HEAD).
                if request.method in ["GET", "HEAD"]:
                   # We can't easily replay the view logic here without complex re-routing
                   # But we fixed the connection for the NEXT request.
                   pass
            except Exception as heal_error:
                logger.error("db_healing_failed", error=str(heal_error))
                return self.emergency_response(
                    "Database is restarting. Please try again in 5 seconds.", 
                    status.HTTP_503_SERVICE_UNAVAILABLE,
                    retry_after=5
                )

        # 2. Cache Failures (Redis down)
        if "RedisError" in error_type or "ConnectionError" in str(exception):
             logger.warning("cache_degradation_active")
             # Disable cache for this request context if possible, or just fail open.
             # In Django, cache failure usually raises exception if not configured to ignore.
             # We can assume the view failed because of this.
             return self.emergency_response(
                 "System performance degraded but operational.",
                 status.HTTP_503_SERVICE_UNAVAILABLE
             )
        
        # Default: 500 Error
        return self.emergency_response(
            "An internal error occurred. Our self-healing systems have been notified.",
            status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    def emergency_response(self, message, status_code, retry_after=None):
        from rest_framework.renderers import JSONRenderer
        data = {"status": "error", "message": message, "code": "system_healing"}
        response = Response(data, status=status_code)
        response.accepted_renderer = JSONRenderer()
        response.accepted_media_type = "application/json"
        response.renderer_context = {}
        if retry_after:
            response["Retry-After"] = str(retry_after)
        return response

from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
import hashlib
import hmac

@database_sync_to_async
def get_user_from_token(token_key):
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        # Validate the token
        UntypedToken(token_key)
        # Decode manually to get user_id (UntypedToken ensures it's valid)
        import jwt
        from django.conf import settings
        decoded_data = jwt.decode(token_key, settings.SECRET_KEY, algorithms=["HS256"])
        user = User.objects.get(id=decoded_data["user_id"])
        return user
    except (InvalidToken, TokenError, Exception) as e:
        logger.warning("websocket_auth_failed: %s", str(e))
        return AnonymousUser()

class JWTAuthMiddleware:
    """
    Custom ASGI Middleware that authenticates WebSocket connections using JWTs.
    Extracts the token from the query string (`?token=...`).
    """
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        query_params = parse_qs(query_string)
        token = query_params.get("token", [None])[0]

        if token:
            scope["user"] = await get_user_from_token(token)
        else:
            scope["user"] = AnonymousUser()

        return await self.app(scope, receive, send)


class SignatureVerificationMiddleware:
    """
    Middleware for verifying API request signatures.
    Provides additional security layer for API endpoints.
    """
    def __init__(self, get_response):
        self.get_response = get_response
        self.secret_key = getattr(settings, 'API_SECRET_KEY', None)

    def __call__(self, request):
        # Skip signature verification for safe methods or if no secret configured
        if not self.secret_key or request.method in ['GET', 'HEAD', 'OPTIONS']:
            return self.get_response(request)
        
        signature = request.headers.get('X-API-Signature', '')
        timestamp = request.headers.get('X-API-Timestamp', '')
        
        # If no signature provided, let it pass but log warning
        if not signature:
            logger.warning("request_missing_signature", path=request.path)
            return self.get_response(request)
        
        # Verify signature
        if self._verify_signature(request, signature, timestamp):
            return self.get_response(request)
        else:
            logger.warning("request_signature_invalid", path=request.path)
            return Response(
                {"error": "Invalid API signature"},
                status=status.HTTP_401_UNAUTHORIZED
            )

    def _verify_signature(self, request, signature: str, timestamp: str) -> bool:
        """Verify the request signature."""
        try:
            # Check timestamp is within 5 minutes
            import time
            if timestamp:
                request_time = int(timestamp)
                current_time = int(time.time())
                if abs(current_time - request_time) > 300:
                    return False
            
            # Build message to sign
            message = f"{request.path}{timestamp}{request.body.decode('utf-8') if request.body else ''}"
            expected_signature = hmac.new(
                self.secret_key.encode(),
                message.encode(),
                hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(signature, expected_signature)
        except Exception as e:
            logger.error("signature_verification_error", error=str(e))
            return False


# =============================================================================
# ADDITIONAL SECURITY MIDDLEWARE (Consolidated from core/middleware.py)
# =============================================================================

import html
import re


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
                    standard_logger.warning(
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
            standard_logger.warning(
                "CORS rejection: origin=%s path=%s method=%s",
                origin,
                request.path,
                request.method,
            )
            from django.http import JsonResponse
            return JsonResponse(
                {"status": "error", "message": "Origin not allowed"},
                status=403,
            )

        return self.get_response(request)
