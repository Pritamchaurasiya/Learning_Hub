"""
API Response Compression
Compresses API responses for faster transmission
"""

import gzip
import json
from functools import wraps
from django.http import JsonResponse, HttpResponse
from django.conf import settings


class APIResponseCompressor:
    """
    Compresses API responses for improved performance.
    """
    
    COMPRESSION_THRESHOLD = 1024  # Compress responses > 1KB
    
    @staticmethod
    def should_compress(response):
        """Check if response should be compressed."""
        content_length = len(response.content)
        return (
            content_length > APIResponseCompressor.COMPRESSION_THRESHOLD
            and 'gzip' in getattr(response, 'accepted_encoding', '')
        )
    
    @staticmethod
    def compress_response(response):
        """Compress response content."""
        if not APIResponseCompressor.should_compress(response):
            return response
        
        compressed = gzip.compress(response.content)
        
        # Only use compressed if it's smaller
        if len(compressed) < len(response.content):
            response.content = compressed
            response['Content-Encoding'] = 'gzip'
            response['Content-Length'] = str(len(compressed))
        
        return response


class CompressionMiddleware:
    """
    Middleware to compress API responses.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Only compress JSON responses
        if response.get('Content-Type', '').startswith('application/json'):
            accepted_encoding = request.META.get('HTTP_ACCEPT_ENCODING', '')
            
            if 'gzip' in accepted_encoding:
                response = APIResponseCompressor.compress_response(response)
        
        return response


def compress_api_response(func):
    """
    Decorator to compress API response.
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        response = func(*args, **kwargs)
        
        if isinstance(response, (JsonResponse, HttpResponse)):
            response = APIResponseCompressor.compress_response(response)
        
        return response
    return wrapper


class ResponseCache:
    """
    Cache for API responses.
    """
    
    CACHE_TIMEOUTS = {
        'course_list': 300,
        'course_detail': 600,
        'user_profile': 300,
        'category_list': 600,
        'search_results': 120,
    }
    
    @classmethod
    def get_cache_key(cls, request):
        """Generate cache key from request."""
        return f"api_cache:{request.path}:{hash(str(request.GET))}"
    
    @classmethod
    def cache_response(cls, request, response, timeout=None):
        """Cache API response."""
        from django.core.cache import cache
        
        cache_key = cls.get_cache_key(request)
        endpoint = request.path.split('/')[-2] if '/' in request.path else 'default'
        timeout = timeout or cls.CACHE_TIMEOUTS.get(endpoint, 300)
        
        cache.set(cache_key, response, timeout)
    
    @classmethod
    def get_cached_response(cls, request):
        """Get cached response if available."""
        from django.core.cache import cache
        
        cache_key = cls.get_cache_key(request)
        return cache.get(cache_key)
