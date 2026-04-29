"""
Security Headers Middleware
Adds essential security headers to all responses
"""

import re
from django.conf import settings
from django.http import HttpResponse


class SecurityHeadersMiddleware:
    """
    Middleware to add security headers to all responses.
    Implements OWASP recommended security headers.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        
        # Security headers configuration
        self.security_headers = {
            # Prevent MIME type sniffing
            'X-Content-Type-Options': 'nosniff',
            
            # Enable XSS protection
            'X-XSS-Protection': '1; mode=block',
            
            # Prevent clickjacking
            'X-Frame-Options': 'DENY',
            
            # Referrer policy
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            
            # Permissions policy
            'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
            
            # Content Security Policy
            'Content-Security-Policy': 
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                "img-src 'self' data: https:; "
                "font-src 'self' https://cdn.jsdelivr.net; "
                "connect-src 'self'; "
                "frame-ancestors 'none'; "
                "base-uri 'self'; "
                "form-action 'self';",
            
            # Strict Transport Security (HTTPS only)
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        }
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Add security headers
        for header, value in self.security_headers.items():
            # Don't override if already set
            if header not in response:
                response[header] = value
        
        return response
    
    def process_exception(self, request, exception):
        """Handle exceptions securely."""
        # Don't leak sensitive information in error responses
        return None
