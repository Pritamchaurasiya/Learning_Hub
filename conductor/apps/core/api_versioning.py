"""
API Versioning Module for Learning Hub.

This module provides:
1. URL-based API versioning
2. Header-based version negotiation
3. Deprecation notices
4. Version-specific serializers
"""

import re
import warnings
from typing import Optional, Dict, Any
from functools import wraps

from django.conf import settings
from django.http import HttpRequest, JsonResponse
from rest_framework.request import Request
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status


class APIVersion:
    """API Version representation."""
    
    def __init__(self, major: int, minor: int = 0):
        self.major = major
        self.minor = minor
    
    def __str__(self) -> str:
        return f"v{self.major}.{self.minor}"
    
    def __eq__(self, other) -> bool:
        if isinstance(other, APIVersion):
            return self.major == other.major and self.minor == other.minor
        return False
    
    def __lt__(self, other) -> bool:
        if isinstance(other, APIVersion):
            if self.major != other.major:
                return self.major < other.major
            return self.minor < other.minor
        return NotImplemented
    
    def __le__(self, other) -> bool:
        return self == other or self < other
    
    def __gt__(self, other) -> bool:
        return not self <= other
    
    def __ge__(self, other) -> bool:
        return not self < other
    
    @classmethod
    def parse(cls, version_string: str) -> 'APIVersion':
        """
        Parse version string to APIVersion.
        
        Accepts: 'v1', 'v1.0', '1', '1.0'
        """
        # Remove 'v' prefix if present
        version_string = version_string.lower().strip().lstrip('v')
        
        parts = version_string.split('.')
        major = int(parts[0])
        minor = int(parts[1]) if len(parts) > 1 else 0
        
        return cls(major, minor)


# Supported API versions
SUPPORTED_VERSIONS = [
    APIVersion(1, 0),  # v1.0 - Current stable
    APIVersion(2, 0),  # v2.0 - Future
]

DEPRECATED_VERSIONS = [
    # APIVersion(0, 9),  # Example: deprecated version
]

CURRENT_VERSION = APIVersion(1, 0)
MIN_SUPPORTED_VERSION = APIVersion(1, 0)


class APIVersionMiddleware:
    """
    Middleware to handle API versioning.
    
    Supports:
    - URL path versioning: /api/v1/...
    - Header versioning: Accept: application/json; version=1.0
    - Query param versioning: ?api_version=1.0
    """
    
    URL_VERSION_PATTERN = re.compile(r'/api/v(\d+(?:\.\d+)?)')
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request: HttpRequest):
        # Extract API version
        version = self._extract_version(request)
        
        # Attach version to request
        request.api_version = version
        
        # Check if version is supported
        if version and not self._is_supported(version):
            return JsonResponse({
                'status': 'error',
                'message': f'API version {version} is not supported',
                'supported_versions': [str(v) for v in SUPPORTED_VERSIONS],
                'current_version': str(CURRENT_VERSION)
            }, status=400)
        
        # Process request
        response = self.get_response(request)
        
        # Add version headers to response
        if version:
            response['X-API-Version'] = str(version)
            response['X-API-Deprecated'] = str(version in DEPRECATED_VERSIONS).lower()
        
        return response
    
    def _extract_version(self, request: HttpRequest) -> Optional[APIVersion]:
        """Extract API version from request."""
        
        # 1. Try URL path
        match = self.URL_VERSION_PATTERN.search(request.path)
        if match:
            return APIVersion.parse(match.group(1))
        
        # 2. Try Accept header
        accept_header = request.META.get('HTTP_ACCEPT', '')
        version_match = re.search(r'version=(\d+(?:\.\d+)?)', accept_header)
        if version_match:
            return APIVersion.parse(version_match.group(1))
        
        # 3. Try query parameter
        version_param = request.GET.get('api_version')
        if version_param:
            try:
                return APIVersion.parse(version_param)
            except ValueError:
                pass
        
        # Default to current version
        return CURRENT_VERSION
    
    def _is_supported(self, version: APIVersion) -> bool:
        """Check if version is supported."""
        return version in SUPPORTED_VERSIONS or version >= MIN_SUPPORTED_VERSION


def deprecated(since_version: str, message: str = None):
    """
    Decorator to mark API endpoints as deprecated.
    
    Usage:
        @deprecated(since_version="1.0", message="Use /api/v2/users instead")
        def get_user(request):
            ...
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Issue deprecation warning
            warning_msg = message or f"{func.__name__} is deprecated since v{since_version}"
            warnings.warn(warning_msg, DeprecationWarning, stacklevel=2)
            
            # Call the original function
            response = func(*args, **kwargs)
            
            # Add deprecation headers if Response object
            if hasattr(response, '__setitem__'):
                response['X-Deprecated'] = 'true'
                response['X-Deprecated-Since'] = since_version
                if message:
                    response['X-Deprecated-Message'] = message
            
            return response
        
        return wrapper
    return decorator


def version_range(min_version: str = None, max_version: str = None):
    """
    Decorator to restrict endpoint to specific API versions.
    
    Usage:
        @version_range(min_version="1.0", max_version="2.0")
        def my_view(request):
            ...
    """
    min_v = APIVersion.parse(min_version) if min_version else None
    max_v = APIVersion.parse(max_version) if max_version else None
    
    def decorator(func):
        @wraps(func)
        def wrapper(request, *args, **kwargs):
            api_version = getattr(request, 'api_version', CURRENT_VERSION)
            
            if min_v and api_version < min_v:
                return Response({
                    'status': 'error',
                    'message': f'This endpoint requires API version >= {min_v}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if max_v and api_version > max_v:
                return Response({
                    'status': 'error',
                    'message': f'This endpoint is not available in API version {api_version}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            return func(request, *args, **kwargs)
        
        return wrapper
    return decorator


class VersionedAPIView(APIView):
    """
    Base class for versioned API views.
    
    Usage:
        class UserView(VersionedAPIView):
            min_version = '1.0'
            max_version = '2.0'
            
            def get(self, request):
                if request.api_version >= APIVersion(2, 0):
                    return self.get_v2(request)
                return self.get_v1(request)
    """
    
    min_version: str = None
    max_version: str = None
    
    def dispatch(self, request, *args, **kwargs):
        api_version = getattr(request, 'api_version', CURRENT_VERSION)
        
        # Check version range
        if self.min_version:
            min_v = APIVersion.parse(self.min_version)
            if api_version < min_v:
                return Response({
                    'status': 'error',
                    'message': f'This endpoint requires API version >= {min_v}'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        if self.max_version:
            max_v = APIVersion.parse(self.max_version)
            if api_version > max_v:
                return Response({
                    'status': 'error',
                    'message': f'This endpoint is not available in API version > {max_v}'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return super().dispatch(request, *args, **kwargs)


# =============================================================================
# VERSIONED SERIALIZER HELPER
# =============================================================================

def get_versioned_serializer(request: Request, serializers_map: Dict[str, type]):
    """
    Get the appropriate serializer based on API version.
    
    Usage:
        serializer_class = get_versioned_serializer(request, {
            'v1': UserSerializerV1,
            'v2': UserSerializerV2,
        })
    """
    api_version = getattr(request, 'api_version', CURRENT_VERSION)
    version_key = f'v{api_version.major}'
    
    if version_key in serializers_map:
        return serializers_map[version_key]
    
    # Fallback to highest available version
    sorted_keys = sorted(serializers_map.keys(), reverse=True)
    for key in sorted_keys:
        key_version = APIVersion.parse(key)
        if key_version <= api_version:
            return serializers_map[key]
    
    # Default to first serializer
    return list(serializers_map.values())[0]
