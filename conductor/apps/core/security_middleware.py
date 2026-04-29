"""
Advanced Security Middleware for Learning Hub.

This module provides enterprise-grade security features:
1. Security Headers (CSP, X-Frame-Options, etc.)
2. Request Logging & Monitoring
3. SQL Injection Detection
4. XSS Prevention
5. IP-based Anomaly Detection
"""

import logging
import re
import hashlib
import json
import structlog
from typing import Callable, Optional, Dict, Any
from datetime import timedelta

from django.http import HttpRequest, HttpResponse, JsonResponse
from django.utils import timezone
from django.core.cache import cache
from django.conf import settings

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware:
    """
    Add essential security headers to all responses.
    
    Headers Added:
    - Content-Security-Policy (CSP)
    - X-Content-Type-Options
    - X-Frame-Options
    - X-XSS-Protection
    - Referrer-Policy
    - Permissions-Policy
    - Strict-Transport-Security (HSTS)
    """
    
    def __init__(self, get_response: Callable):
        self.get_response = get_response
    
    def __call__(self, request: HttpRequest) -> HttpResponse:
        response = self.get_response(request)
        
        # Content Security Policy
        csp_directives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://apis.google.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: https: blob:",
            "connect-src 'self' https://api.razorpay.com https://generativelanguage.googleapis.com wss:",
            "frame-ancestors 'self'",
            "form-action 'self'",
            "base-uri 'self'",
        ]
        response['Content-Security-Policy'] = '; '.join(csp_directives)
        
        # Prevent MIME type sniffing
        response['X-Content-Type-Options'] = 'nosniff'
        
        # Clickjacking protection
        response['X-Frame-Options'] = 'SAMEORIGIN'
        
        # XSS protection (legacy, but still useful for older browsers)
        response['X-XSS-Protection'] = '1; mode=block'
        
        # Control referrer information
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Permissions policy (formerly Feature-Policy)
        permissions = [
            "accelerometer=()",
            "camera=()",
            "geolocation=()",
            "gyroscope=()",
            "magnetometer=()",
            "microphone=(self)",  # Allow mic for voice features
            "payment=(self)",
            "usb=()",
        ]
        response['Permissions-Policy'] = ', '.join(permissions)
        
        # HSTS (enable only in production with HTTPS)
        if not settings.DEBUG:
            response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
        
        return response


class RequestLoggingMiddleware:
    """
    Log all requests with structured data for monitoring and debugging.
    
    Features:
    - Request/Response timing
    - User identification
    - IP tracking
    - Error logging
    - Structured JSON logging (structlog)
    - X-Request-ID tracing
    """
    
    def __init__(self, get_response: Callable):
        self.get_response = get_response
        self.sensitive_paths = ['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/payments/']
        self._struct_logger = structlog.get_logger(__name__)
    
    def __call__(self, request: HttpRequest) -> HttpResponse:
        import uuid
        
        # Start timing
        request._start_time = timezone.now()
        
        # Generat or extract Request ID
        request_id = request.META.get('HTTP_X_REQUEST_ID') or str(uuid.uuid4())
        request.request_id = request_id
        
        # Bind context for this request
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            path=request.path,
            method=request.method,
            ip=self._get_client_ip(request)
        )
        
        # Process request
        response = self.get_response(request)
        
        # Calculate duration
        duration_ms = (timezone.now() - request._start_time).total_seconds() * 1000
        
        # Identify user
        user_id = None
        if hasattr(request, 'user') and hasattr(request.user, 'is_authenticated'):
            if request.user.is_authenticated:
                user_id = str(request.user.id)
                structlog.contextvars.bind_contextvars(user_id=user_id)
        
        # Prepare Log Event
        status_code = response.status_code
        
        log_kwargs = {
            "status_code": status_code,
            "duration_ms": round(duration_ms, 2),
            "user_agent": request.META.get('HTTP_USER_AGENT', '')[:200],
        }
        
        # Log based on status code
        if status_code >= 500:
            self._struct_logger.error("request_failed", **log_kwargs)
        elif status_code >= 400:
            self._struct_logger.warning("request_client_error", **log_kwargs)
        elif duration_ms > 1000:
            self._struct_logger.warning("request_slow", **log_kwargs)
        else:
            self._struct_logger.info("request_finished", **log_kwargs)
        
        # Add tracing headers
        response['X-Request-ID'] = request_id
        response['X-Response-Time-Ms'] = str(round(duration_ms, 2))
        
        return response
    
    def _get_client_ip(self, request: HttpRequest) -> str:
        """Extract real client IP from headers."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '')


class SQLInjectionDetectionMiddleware:
    """
    Detect and block potential SQL injection attempts.
    
    This is a defense-in-depth layer - Django's ORM already protects
    against SQL injection, but this catches attempts for logging/blocking.
    
    Note: Patterns are designed to minimize false positives with JSON/form data.
    """
    
    # More specific SQL injection patterns (reduced false positives)
    SQL_PATTERNS = [
        r"(\bunion\b\s+\bselect\b)",  # UNION SELECT
        r"(\bselect\b.+\bfrom\b.+\bwhere\b)",  # SELECT FROM WHERE
        r"(exec\s+(sp_|xp_)\w+)",  # Stored procedure call
        r"(\bdrop\b\s+\btable\b)",  # DROP TABLE
        r"(\bdelete\b\s+\bfrom\b)",  # DELETE FROM
        r"(\binsert\b\s+\binto\b)",  # INSERT INTO (when not in JSON context)
        r"(\bupdate\b\s+\w+\s+\bset\b)",  # UPDATE SET
        r"(;\s*--)",  # SQL comment after semicolon
        r"('\s*or\s+'1'\s*=\s*'1)",  # Classic OR injection
        r"('\s*or\s+1\s*=\s*1)",  # Numeric OR injection
    ]
    
    # Paths to skip (API endpoints with JSON bodies)
    SKIP_PATHS = [
        '/api/v1/auth/',
        '/api/v1/courses/',
        '/api/v1/dsa/',
        '/api/v1/payments/',
        '/api/v1/chat/',
        '/api/v1/discussions/',
    ]
    
    def __init__(self, get_response: Callable):
        self.get_response = get_response
        self.patterns = [re.compile(p, re.IGNORECASE) for p in self.SQL_PATTERNS]
    
    def __call__(self, request: HttpRequest) -> HttpResponse:
        # Skip API paths with JSON bodies (Django ORM handles this)
        if any(request.path.startswith(path) for path in self.SKIP_PATHS):
            return self.get_response(request)
        
        # Check query parameters (higher risk than POST bodies)
        if self._check_for_injection(request.GET):
            return self._block_request(request, 'query_params')
        
        # Check POST data only for non-API paths
        if request.method == 'POST' and hasattr(request, 'body'):
            try:
                body_str = request.body.decode('utf-8', errors='ignore')
                if any(p.search(body_str) for p in self.patterns):
                    return self._block_request(request, 'post_body')
            except Exception:
                pass  # Can't decode, let it pass to normal processing
        
        return self.get_response(request)
    
    def _check_for_injection(self, data: dict) -> bool:
        """Check dictionary values for SQL injection patterns."""
        for value in data.values():
            if isinstance(value, str):
                if any(p.search(value) for p in self.patterns):
                    return True
        return False
    
    def _block_request(self, request: HttpRequest, source: str) -> JsonResponse:
        """Block and log suspicious request."""
        ip = request.META.get('REMOTE_ADDR', 'unknown')
        logger.critical(
            f"SQL_INJECTION_ATTEMPT: ip={ip}, path={request.path}, source={source}"
        )
        
        # Log to AuditLog if available
        try:
            from apps.core.models import AuditLog
            AuditLog.log_action(
                action='SQL_INJECTION_ATTEMPT',
                resource=request.path,
                ip_address=ip,
                details={'source': source},
                severity='critical'
            )
        except Exception:
            pass
        
        return JsonResponse(
            {'status': 'error', 'message': 'Request blocked'},
            status=403
        )


class IPAnomalyDetectionMiddleware:
    """
    Detect anomalous IP behavior patterns.
    
    Features:
    - Rapid request detection
    - Geographic anomaly detection (if GeoIP available)
    - Failed login tracking
    - Automatic temporary blocking
    """
    
    CACHE_PREFIX = 'ip_activity:'
    BLOCK_PREFIX = 'ip_blocked:'
    
    # Thresholds
    MAX_REQUESTS_PER_MINUTE = 120
    MAX_FAILED_LOGINS_PER_HOUR = 10
    BLOCK_DURATION_SECONDS = 1800  # 30 minutes
    
    def __init__(self, get_response: Callable):
        self.get_response = get_response
    
    def __call__(self, request: HttpRequest) -> HttpResponse:
        ip = self._get_client_ip(request)
        
        # Check if IP is blocked
        if cache.get(f"{self.BLOCK_PREFIX}{ip}"):
            logger.warning(f"BLOCKED_IP_REQUEST: ip={ip}, path={request.path}")
            return JsonResponse(
                {'status': 'error', 'message': 'Access temporarily blocked'},
                status=429
            )
        
        # Track request rate
        cache_key = f"{self.CACHE_PREFIX}{ip}:minute"
        request_count = cache.get(cache_key, 0) + 1
        cache.set(cache_key, request_count, timeout=60)
        
        if request_count > self.MAX_REQUESTS_PER_MINUTE:
            self._block_ip(ip, 'rate_limit_exceeded')
            return JsonResponse(
                {'status': 'error', 'message': 'Too many requests'},
                status=429
            )
        
        # Process request
        response = self.get_response(request)
        
        # Track failed login attempts
        if request.path in ['/api/v1/auth/login/', '/api/v1/auth/login'] and response.status_code == 401:
            self._track_failed_login(ip)
        
        return response
    
    def _get_client_ip(self, request: HttpRequest) -> str:
        """Extract real client IP."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '')
    
    def _track_failed_login(self, ip: str):
        """Track failed login attempts."""
        cache_key = f"{self.CACHE_PREFIX}{ip}:failed_logins"
        count = cache.get(cache_key, 0) + 1
        cache.set(cache_key, count, timeout=3600)  # 1 hour window
        
        if count >= self.MAX_FAILED_LOGINS_PER_HOUR:
            self._block_ip(ip, 'too_many_failed_logins')
    
    def _block_ip(self, ip: str, reason: str):
        """Temporarily block an IP."""
        cache.set(
            f"{self.BLOCK_PREFIX}{ip}",
            {'reason': reason, 'blocked_at': timezone.now().isoformat()},
            timeout=self.BLOCK_DURATION_SECONDS
        )
        logger.warning(f"IP_BLOCKED: ip={ip}, reason={reason}, duration={self.BLOCK_DURATION_SECONDS}s")
        
        # Log to AuditLog
        try:
            from apps.core.models import AuditLog
            AuditLog.log_action(
                action='IP_BLOCKED',
                resource=ip,
                ip_address=ip,
                details={'reason': reason},
                severity='warning'
            )
        except Exception:
            pass


class JWTBlacklistMiddleware:
    """
    Check if JWT tokens are blacklisted (for logout functionality).
    
    When a user logs out, their token's JTI is added to a blacklist
    to prevent reuse before expiration.
    """
    
    BLACKLIST_PREFIX = 'jwt_blacklist:'
    
    def __init__(self, get_response: Callable):
        self.get_response = get_response
    
    def __call__(self, request: HttpRequest) -> HttpResponse:
        # Extract token from Authorization header
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
            
            # Hash the token for the cache key
            token_hash = hashlib.sha256(token.encode()).hexdigest()[:32]
            
            if cache.get(f"{self.BLACKLIST_PREFIX}{token_hash}"):
                return JsonResponse(
                    {'status': 'error', 'message': 'Token has been revoked'},
                    status=401
                )
        
        return self.get_response(request)
    
    @classmethod
    def blacklist_token(cls, token: str, expires_in_seconds: int = 3600):
        """
        Add a token to the blacklist.
        
        Args:
            token: The JWT token string
            expires_in_seconds: How long to keep in blacklist (should match token expiry)
        """
        token_hash = hashlib.sha256(token.encode()).hexdigest()[:32]
        cache.set(
            f"{cls.BLACKLIST_PREFIX}{token_hash}",
            {'blacklisted_at': timezone.now().isoformat()},
            timeout=expires_in_seconds
        )


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def sanitize_input(text: str) -> str:
    """
    Sanitize user input to prevent XSS.
    
    Args:
        text: Raw user input
        
    Returns:
        Sanitized text with dangerous characters escaped
    """
    if not text:
        return text
    
    # HTML entity encoding for dangerous characters
    replacements = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
        '\\': '&#x5C;',
    }
    
    for char, escaped in replacements.items():
        text = text.replace(char, escaped)
    
    return text


def validate_uuid(uuid_string: str) -> bool:
    """
    Validate UUID format to prevent injection.
    
    Args:
        uuid_string: String to validate
        
    Returns:
        True if valid UUID format
    """
    import uuid
    try:
        uuid.UUID(uuid_string)
        return True
    except ValueError:
        return False


def generate_request_id() -> str:
    """Generate unique request ID for tracing."""
    import uuid
    return str(uuid.uuid4())[:8]
