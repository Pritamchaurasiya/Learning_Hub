"""
API Versioning & Lifecycle Deprecation Module for Learning Hub.

Complies with:
- RFC 8594 (The Sunset HTTP Header Field)
- RFC 8594 Section 2 (The Deprecation HTTP Header Field)
- RFC 8288 / RFC 8594 Section 4 (Link Header Field for Deprecation and Successors)
- ADR-006: Header-Based Versioning Negotiation with URL-Path fallback
- Enterprise 6-Month Support Lifecycle Policy
"""

import re
import warnings
from email.utils import formatdate
from datetime import datetime, timedelta, timezone as dt_timezone
from typing import Optional, Dict, Any, List, Union
from dataclasses import dataclass, field
from functools import wraps

from django.conf import settings
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.utils import timezone
from django.utils.deprecation import MiddlewareMixin
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.versioning import BaseVersioning, exceptions


# =============================================================================
# API VERSION REPRESENTATION
# =============================================================================

class APIVersion:
    """
    Semantic API Version representation (Major.Minor).
    Supports parsing 'v1', 'v1.0', '1', '1.0', 'v2', etc.
    """

    def __init__(self, major: int, minor: int = 0):
        self.major = major
        self.minor = minor

    def __str__(self) -> str:
        return f"v{self.major}.{self.minor}"

    def __repr__(self) -> str:
        return f"APIVersion({self.major}, {self.minor})"

    def __eq__(self, other) -> bool:
        if isinstance(other, APIVersion):
            return self.major == other.major and self.minor == other.minor
        elif isinstance(other, str):
            try:
                parsed = APIVersion.parse(other)
                return self.major == parsed.major and self.minor == parsed.minor
            except Exception:
                return False
        return False

    def __lt__(self, other) -> bool:
        if isinstance(other, APIVersion):
            if self.major != other.major:
                return self.major < other.major
            return self.minor < other.minor
        elif isinstance(other, str):
            parsed = APIVersion.parse(other)
            return self < parsed
        return NotImplemented

    def __le__(self, other) -> bool:
        return self == other or self < other

    def __gt__(self, other) -> bool:
        return not self <= other

    def __ge__(self, other) -> bool:
        return not self < other

    def __hash__(self) -> int:
        return hash((self.major, self.minor))

    @classmethod
    def parse(cls, version_string: Union[str, 'APIVersion']) -> 'APIVersion':
        """
        Parse a version string into an APIVersion instance.
        Accepts: 'v1', 'v1.0', '1', '1.0', 'v2', '2.1'
        """
        if isinstance(version_string, APIVersion):
            return version_string

        cleaned = str(version_string).lower().strip().lstrip('v')
        parts = cleaned.split('.')
        major = int(parts[0])
        minor = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 0
        return cls(major, minor)


# Default Supported Versions
SUPPORTED_VERSIONS: List[APIVersion] = [
    APIVersion(1, 0),  # v1.0 - Current Stable
    APIVersion(2, 0),  # v2.0 - Next Gen
]

CURRENT_VERSION = APIVersion(1, 0)
MIN_SUPPORTED_VERSION = APIVersion(1, 0)

# Lifecycle standard duration: 6 months (180 days)
DEFAULT_DEPRECATION_WINDOW_DAYS = 180


# =============================================================================
# LIFECYCLE & DEPRECATION METADATA
# =============================================================================

@dataclass
class DeprecationMetadata:
    """
    Stores RFC 8594 metadata for an endpoint or version undergoing sunset.
    """
    since: datetime
    sunset: datetime
    successor: Optional[str] = None
    docs_url: Optional[str] = None
    strict_sunset: bool = True
    message: Optional[str] = None

    def is_sunset(self, at_time: Optional[datetime] = None) -> bool:
        current = at_time or timezone.now()
        if timezone.is_naive(self.sunset):
            target = timezone.make_aware(self.sunset, dt_timezone.utc)
        else:
            target = self.sunset
        if timezone.is_naive(current):
            current = timezone.make_aware(current, dt_timezone.utc)
        return current >= target

    def to_http_headers(self) -> Dict[str, str]:
        """Generate RFC 8594 compliant HTTP headers."""
        headers = {}
        # Deprecation header (IMF-fixdate)
        since_dt = self.since
        if timezone.is_naive(since_dt):
            since_dt = timezone.make_aware(since_dt, dt_timezone.utc)
        headers["Deprecation"] = formatdate(since_dt.timestamp(), usegmt=True)

        # Sunset header (IMF-fixdate)
        sunset_dt = self.sunset
        if timezone.is_naive(sunset_dt):
            sunset_dt = timezone.make_aware(sunset_dt, dt_timezone.utc)
        headers["Sunset"] = formatdate(sunset_dt.timestamp(), usegmt=True)

        # RFC 8288 / RFC 8594 Section 4 Link headers
        links = []
        if self.docs_url:
            links.append(f'<{self.docs_url}>; rel="deprecation"; type="text/html"')
        if self.successor:
            links.append(f'<{self.successor}>; rel="successor-version"')
        if links:
            headers["Link"] = ", ".join(links)

        # Auxiliary informational headers
        headers["X-API-Lifecycle-Status"] = "sunset" if self.is_sunset() else "deprecated"
        headers["X-API-Sunset-Date"] = sunset_dt.isoformat()
        if self.message:
            headers["X-API-Deprecation-Notice"] = self.message

        return headers


# Global registry of path-based deprecations
_PATH_DEPRECATION_REGISTRY: Dict[str, DeprecationMetadata] = {}

# Version-level deprecation registry
_VERSION_DEPRECATION_REGISTRY: Dict[APIVersion, DeprecationMetadata] = {}


def register_deprecated_path(
    path_prefix: str,
    since: Union[datetime, str],
    sunset: Optional[Union[datetime, str]] = None,
    successor: Optional[str] = None,
    docs_url: Optional[str] = None,
    strict_sunset: bool = True,
    message: Optional[str] = None,
) -> None:
    """
    Register an API path pattern for 6-month lifecycle deprecation.
    """
    since_dt = _parse_datetime(since)
    if sunset:
        sunset_dt = _parse_datetime(sunset)
    else:
        # Default 6-month support window
        sunset_dt = since_dt + timedelta(days=DEFAULT_DEPRECATION_WINDOW_DAYS)

    _PATH_DEPRECATION_REGISTRY[path_prefix] = DeprecationMetadata(
        since=since_dt,
        sunset=sunset_dt,
        successor=successor,
        docs_url=docs_url,
        strict_sunset=strict_sunset,
        message=message,
    )


def register_deprecated_version(
    version: Union[str, APIVersion],
    since: Union[datetime, str],
    sunset: Optional[Union[datetime, str]] = None,
    successor: Optional[str] = None,
    docs_url: Optional[str] = None,
    strict_sunset: bool = True,
    message: Optional[str] = None,
) -> None:
    """
    Register an entire API Version for 6-month lifecycle deprecation.
    """
    v = APIVersion.parse(version)
    since_dt = _parse_datetime(since)
    if sunset:
        sunset_dt = _parse_datetime(sunset)
    else:
        sunset_dt = since_dt + timedelta(days=DEFAULT_DEPRECATION_WINDOW_DAYS)

    _VERSION_DEPRECATION_REGISTRY[v] = DeprecationMetadata(
        since=since_dt,
        sunset=sunset_dt,
        successor=successor,
        docs_url=docs_url,
        strict_sunset=strict_sunset,
        message=message,
    )


def _parse_datetime(val: Union[datetime, str]) -> datetime:
    if isinstance(val, datetime):
        return val
    try:
        return datetime.fromisoformat(val.replace("Z", "+00:00"))
    except Exception:
        # Fallback date only format YYYY-MM-DD
        return datetime.strptime(val, "%Y-%m-%d").replace(tzinfo=dt_timezone.utc)


def get_deprecation_metadata(
    path: str,
    version: Optional[APIVersion] = None,
) -> Optional[DeprecationMetadata]:
    """
    Check if a path or version has registered deprecation metadata.
    """
    # 1. Check path matches
    for pattern, meta in _PATH_DEPRECATION_REGISTRY.items():
        if path.startswith(pattern) or re.search(pattern, path):
            return meta

    # 2. Check version matches
    if version and version in _VERSION_DEPRECATION_REGISTRY:
        return _VERSION_DEPRECATION_REGISTRY[version]

    return None


# =============================================================================
# DECORATORS
# =============================================================================

def deprecated_api(
    since: Union[datetime, str],
    sunset: Optional[Union[datetime, str]] = None,
    successor: Optional[str] = None,
    docs_url: Optional[str] = None,
    strict_after_sunset: bool = True,
    message: Optional[str] = None,
):
    """
    Decorator marking a specific view or API endpoint as deprecated under RFC 8594.
    Automatically applies 6-month sunset period and attaches Sunset, Deprecation, and Link headers.
    Returns HTTP 410 Gone if accessed after sunset.
    """
    since_dt = _parse_datetime(since)
    sunset_dt = _parse_datetime(sunset) if sunset else since_dt + timedelta(days=DEFAULT_DEPRECATION_WINDOW_DAYS)
    meta = DeprecationMetadata(
        since=since_dt,
        sunset=sunset_dt,
        successor=successor,
        docs_url=docs_url,
        strict_sunset=strict_after_sunset,
        message=message,
    )

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Check sunset
            now = timezone.now()
            if meta.is_sunset(now) and meta.strict_sunset:
                return JsonResponse(
                    {
                        "error": "API_SUNSET",
                        "status": 410,
                        "message": message or f"This endpoint has been retired per the 6-month lifecycle policy (Sunset: {meta.sunset.strftime('%Y-%m-%d')}).",
                        "successor": successor,
                        "docs_url": docs_url,
                    },
                    status=410,
                    headers=meta.to_http_headers(),
                )

            # Warn in runtime logs
            warn_msg = message or f"{func.__name__} is deprecated since {meta.since.strftime('%Y-%m-%d')} and sunsets on {meta.sunset.strftime('%Y-%m-%d')}."
            warnings.warn(warn_msg, DeprecationWarning, stacklevel=2)

            response = func(*args, **kwargs)
            if hasattr(response, "__setitem__"):
                for k, v in meta.to_http_headers().items():
                    response[k] = v

            return response

        # Attach metadata to wrapper for inspection
        wrapper._deprecation_metadata = meta
        return wrapper

    return decorator


def deprecated(since_version: str, message: str = None):
    """
    Backward-compatible decorator for marking endpoints deprecated by version string.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            warn_msg = message or f"{func.__name__} is deprecated since v{since_version}"
            warnings.warn(warn_msg, DeprecationWarning, stacklevel=2)

            response = func(*args, **kwargs)
            if hasattr(response, "__setitem__"):
                response["X-Deprecated"] = "true"
                response["X-Deprecated-Since"] = since_version
                if message:
                    response["X-Deprecated-Message"] = message
                # Attach generic RFC 8594 headers
                response["Deprecation"] = "true"
            return response
        return wrapper
    return decorator


def version_range(min_version: str = None, max_version: str = None):
    """
    Decorator to restrict endpoint execution to specific API versions.
    """
    min_v = APIVersion.parse(min_version) if min_version else None
    max_v = APIVersion.parse(max_version) if max_version else None

    def decorator(func):
        @wraps(func)
        def wrapper(request, *args, **kwargs):
            api_version = getattr(request, 'api_version', CURRENT_VERSION)
            if min_v and api_version < min_v:
                return JsonResponse({
                    'status': 'error',
                    'message': f'This endpoint requires API version >= {min_v}',
                    'current_version': str(api_version),
                }, status=400)
            if max_v and api_version > max_v:
                return JsonResponse({
                    'status': 'error',
                    'message': f'This endpoint is not available in API version > {max_v}',
                    'current_version': str(api_version),
                }, status=400)
            return func(request, *args, **kwargs)
        return wrapper
    return decorator


# =============================================================================
# DRF VERSIONING CLASS (ADR-006: HEADER-FIRST NEGOTIATION)
# =============================================================================

from apps.core.versioning import HeaderAndPathVersioning


# =============================================================================
# MIDDLEWARE (RFC 8594 SUNSET & LIFECYCLE ENFORCEMENT)
# =============================================================================

class APIVersioningAndDeprecationMiddleware(MiddlewareMixin):
    """
    Global middleware enforcing:
    - Header & Path Version Resolution (ADR-006)
    - Response version headers ('X-API-Version')
    - RFC 8594 Deprecation & Sunset Headers
    - 6-Month Lifecycle Policy with HTTP 410 Gone for expired endpoints
    """

    URL_VERSION_PATTERN = re.compile(r'/api/v(\d+(?:\.\d+)?)')

    def process_request(self, request: HttpRequest):
        # Extract version
        version = self._extract_version(request)
        request.api_version = version
        request.version = f"v{version.major}"

        # If strict version check is enabled
        if version and not self._is_supported(version):
            return JsonResponse({
                'status': 'error',
                'message': f'API version {version} is not supported',
                'supported_versions': [str(v) for v in SUPPORTED_VERSIONS],
                'current_version': str(CURRENT_VERSION),
            }, status=400)

        # Check deprecation & sunset status
        meta = get_deprecation_metadata(request.path, version)
        request._deprecation_metadata = meta

        if meta:
            now = timezone.now()
            if meta.is_sunset(now) and meta.strict_sunset:
                return JsonResponse({
                    "error": "API_SUNSET",
                    "status": 410,
                    "message": meta.message or f"This endpoint has been retired per the 6-month lifecycle policy (Sunset: {meta.sunset.strftime('%Y-%m-%d')}).",
                    "successor": meta.successor,
                    "docs_url": meta.docs_url,
                }, status=410, headers=meta.to_http_headers())

        return None

    def process_response(self, request: HttpRequest, response: HttpResponse):
        # Attach version header
        api_ver = getattr(request, "api_version", CURRENT_VERSION)
        if api_ver:
            response["X-API-Version"] = str(api_ver)

        # Attach deprecation headers if applicable
        meta = getattr(request, "_deprecation_metadata", None)
        if meta and hasattr(response, "__setitem__"):
            for header_name, header_val in meta.to_http_headers().items():
                if header_name not in response:
                    response[header_name] = header_val

        return response

    def _extract_version(self, request: HttpRequest) -> APIVersion:
        # 1. Custom Header: X-API-Version
        x_ver = request.META.get('HTTP_X_API_VERSION')
        if x_ver:
            try:
                return APIVersion.parse(x_ver)
            except Exception:
                pass

        # 2. Content Negotiation: Accept: application/json; version=1.0
        accept = request.META.get('HTTP_ACCEPT', '')
        match = re.search(r'version=(\d+(?:\.\d+)?)', accept, re.IGNORECASE)
        if match:
            try:
                return APIVersion.parse(match.group(1))
            except Exception:
                pass

        # 3. URL path (/api/v1/...)
        url_match = self.URL_VERSION_PATTERN.search(request.path)
        if url_match:
            try:
                return APIVersion.parse(url_match.group(1))
            except Exception:
                pass

        # 4. Query param
        q_ver = request.GET.get('api_version') or request.GET.get('version')
        if q_ver:
            try:
                return APIVersion.parse(q_ver)
            except Exception:
                pass

        return CURRENT_VERSION

    def _is_supported(self, version: APIVersion) -> bool:
        return version in SUPPORTED_VERSIONS or version >= MIN_SUPPORTED_VERSION


# Alias for backward compatibility
APIVersionMiddleware = APIVersioningAndDeprecationMiddleware


# =============================================================================
# VERSIONED API VIEW & SERIALIZER HELPERS
# =============================================================================

class VersionedAPIView(APIView):
    """
    Base class for versioned API views.
    """
    min_version: str = None
    max_version: str = None

    def dispatch(self, request, *args, **kwargs):
        api_version = getattr(request, 'api_version', CURRENT_VERSION)

        if self.min_version:
            min_v = APIVersion.parse(self.min_version)
            if api_version < min_v:
                return Response({
                    'status': 'error',
                    'message': f'This endpoint requires API version >= {min_v}',
                }, status=status.HTTP_400_BAD_REQUEST)

        if self.max_version:
            max_v = APIVersion.parse(self.max_version)
            if api_version > max_v:
                return Response({
                    'status': 'error',
                    'message': f'This endpoint is not available in API version > {max_v}',
                }, status=status.HTTP_400_BAD_REQUEST)

        return super().dispatch(request, *args, **kwargs)


def get_versioned_serializer(request: Request, serializers_map: Dict[str, type]):
    """
    Get the appropriate serializer based on API version.
    """
    api_version = getattr(request, 'api_version', CURRENT_VERSION)
    version_key = f'v{api_version.major}'

    if version_key in serializers_map:
        return serializers_map[version_key]

    sorted_keys = sorted(serializers_map.keys(), reverse=True)
    for key in sorted_keys:
        key_version = APIVersion.parse(key)
        if key_version <= api_version:
            return serializers_map[key]

    return list(serializers_map.values())[0]
