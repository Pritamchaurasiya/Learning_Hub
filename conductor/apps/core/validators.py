"""
Advanced Validation Utilities for Learning Hub.

This module provides comprehensive input validation to prevent:
1. SQL Injection
2. XSS Attacks
3. SSRF (Server-Side Request Forgery)
4. Path Traversal
5. Command Injection

All validators are designed to be used with DRF serializers.
"""

import re
import html
import urllib.parse
from typing import Optional, List, Any
from dataclasses import dataclass
from enum import Enum

from django.core.validators import URLValidator
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers


class ThreatType(Enum):
    """Types of security threats that can be detected."""
    SQL_INJECTION = 'sql_injection'
    XSS = 'xss'
    PATH_TRAVERSAL = 'path_traversal'
    COMMAND_INJECTION = 'command_injection'
    SSRF = 'ssrf'
    MALICIOUS_FILE = 'malicious_file'


@dataclass
class ValidationResult:
    """Result of security validation."""
    is_safe: bool
    threat_type: Optional[ThreatType] = None
    details: Optional[str] = None


class SecurityValidator:
    """
    Comprehensive security validator for user inputs.
    
    Usage:
        validator = SecurityValidator()
        result = validator.validate_text(user_input)
        if not result.is_safe:
            raise ValidationError(f"Security threat detected: {result.threat_type}")
    """
    
    # SQL Injection patterns
    SQL_PATTERNS = [
        r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE|UNION|JOIN)\b)",
        r"(--)|(;)|(\/\*)",  # SQL comments
        r"(\bOR\b\s*\d+\s*=\s*\d+)",  # OR 1=1 pattern
        r"(\bAND\b\s*\d+\s*=\s*\d+)",  # AND 1=1 pattern
        r"(\'|\"|;|--|\*\/|\b(CHAR|CONCAT|SUBSTRING|ASCII|CHR)\b)",  # SQL functions
        r"(\bWAITFOR\b\s+\bDELAY\b)",  # Time-based injection
        r"(\bBENCHMARK\b\s*\()",  # MySQL benchmark
    ]
    
    # XSS patterns
    XSS_PATTERNS = [
        r"<\s*script[^>]*>",  # Script tags
        r"javascript\s*:",  # JavaScript protocol
        r"on\w+\s*=",  # Event handlers (onclick, onerror, etc.)
        r"<\s*iframe[^>]*>",  # iframes
        r"<\s*object[^>]*>",  # Objects
        r"<\s*embed[^>]*>",  # Embeds
        r"<\s*svg[^>]*>",  # SVG (can contain scripts)
        r"expression\s*\(",  # CSS expressions
        r"url\s*\(\s*['\"]?\s*data:",  # Data URLs in CSS
    ]
    
    # Path traversal patterns
    PATH_PATTERNS = [
        r"\.\./",  # Parent directory
        r"\.\.\\",  # Windows parent directory
        r"%2e%2e/",  # URL encoded
        r"%2e%2e%2f",  # URL encoded
        r"\.\.%2f",  # Mixed encoding
        r"%c0%ae%c0%ae/",  # UTF-8 encoding tricks
    ]
    
    # Command injection patterns
    COMMAND_PATTERNS = [
        r"[;&|`$]",  # Shell metacharacters
        r"\$\(",  # Command substitution
        r">\s*/",  # Redirect to root
        r"\bsudo\b",  # Sudo
        r"\brm\s+-rf\b",  # Dangerous rm
        r"\bcat\b\s+/etc/",  # Reading system files
        r"\b(wget|curl)\b",  # Download commands
    ]
    
    # Dangerous file extensions
    DANGEROUS_EXTENSIONS = [
        '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.js', '.vbs',
        '.ps1', '.sh', '.bash', '.php', '.asp', '.aspx', '.jsp', '.cgi',
        '.htaccess', '.htpasswd', '.config', '.dll', '.so', '.bin',
    ]
    
    # Private/internal IP ranges for SSRF prevention
    PRIVATE_IP_PATTERNS = [
        r"^127\.",  # Localhost
        r"^10\.",  # Private Class A
        r"^172\.(1[6-9]|2[0-9]|3[0-1])\.",  # Private Class B
        r"^192\.168\.",  # Private Class C
        r"^169\.254\.",  # Link-local
        r"^0\.",  # Current network
        r"localhost",  # Localhost hostname
        r"^::1$",  # IPv6 localhost
        r"^fc00:",  # IPv6 private
        r"^fe80:",  # IPv6 link-local
    ]
    
    def __init__(self):
        self.sql_compiled = [re.compile(p, re.IGNORECASE) for p in self.SQL_PATTERNS]
        self.xss_compiled = [re.compile(p, re.IGNORECASE) for p in self.XSS_PATTERNS]
        self.path_compiled = [re.compile(p, re.IGNORECASE) for p in self.PATH_PATTERNS]
        self.command_compiled = [re.compile(p, re.IGNORECASE) for p in self.COMMAND_PATTERNS]
        self.ip_compiled = [re.compile(p, re.IGNORECASE) for p in self.PRIVATE_IP_PATTERNS]
    
    def validate_text(self, text: str, check_sql: bool = True, 
                      check_xss: bool = True) -> ValidationResult:
        """
        Validate text input for security threats.
        
        Args:
            text: User input to validate
            check_sql: Whether to check for SQL injection
            check_xss: Whether to check for XSS
            
        Returns:
            ValidationResult with safety status
        """
        if not text:
            return ValidationResult(is_safe=True)
        
        # Check SQL injection
        if check_sql:
            for pattern in self.sql_compiled:
                if pattern.search(text):
                    return ValidationResult(
                        is_safe=False,
                        threat_type=ThreatType.SQL_INJECTION,
                        details=f"Potentially malicious SQL pattern detected"
                    )
        
        # Check XSS
        if check_xss:
            for pattern in self.xss_compiled:
                if pattern.search(text):
                    return ValidationResult(
                        is_safe=False,
                        threat_type=ThreatType.XSS,
                        details=f"Potentially malicious script pattern detected"
                    )
        
        return ValidationResult(is_safe=True)
    
    def validate_path(self, path: str) -> ValidationResult:
        """
        Validate file path for traversal attacks.
        
        Args:
            path: File path to validate
            
        Returns:
            ValidationResult with safety status
        """
        if not path:
            return ValidationResult(is_safe=True)
        
        for pattern in self.path_compiled:
            if pattern.search(path):
                return ValidationResult(
                    is_safe=False,
                    threat_type=ThreatType.PATH_TRAVERSAL,
                    details="Path traversal attempt detected"
                )
        
        return ValidationResult(is_safe=True)
    
    def validate_command(self, text: str) -> ValidationResult:
        """
        Validate text that might be used in shell commands.
        
        Args:
            text: Text to validate
            
        Returns:
            ValidationResult with safety status
        """
        if not text:
            return ValidationResult(is_safe=True)
        
        for pattern in self.command_compiled:
            if pattern.search(text):
                return ValidationResult(
                    is_safe=False,
                    threat_type=ThreatType.COMMAND_INJECTION,
                    details="Potential command injection detected"
                )
        
        return ValidationResult(is_safe=True)
    
    def validate_url(self, url: str, allow_internal: bool = False) -> ValidationResult:
        """
        Validate URL for SSRF attacks.
        
        Args:
            url: URL to validate
            allow_internal: Whether to allow internal/private IPs
            
        Returns:
            ValidationResult with safety status
        """
        if not url:
            return ValidationResult(is_safe=True)
        
        # Parse URL
        try:
            parsed = urllib.parse.urlparse(url)
        except Exception:
            return ValidationResult(
                is_safe=False,
                threat_type=ThreatType.SSRF,
                details="Invalid URL format"
            )
        
        # Only allow http/https
        if parsed.scheme not in ('http', 'https'):
            return ValidationResult(
                is_safe=False,
                threat_type=ThreatType.SSRF,
                details=f"Disallowed URL scheme: {parsed.scheme}"
            )
        
        # Check for internal IPs (SSRF prevention)
        if not allow_internal:
            hostname = parsed.hostname or ''
            for pattern in self.ip_compiled:
                if pattern.search(hostname):
                    return ValidationResult(
                        is_safe=False,
                        threat_type=ThreatType.SSRF,
                        details="Internal/private URLs are not allowed"
                    )
        
        return ValidationResult(is_safe=True)
    
    def validate_filename(self, filename: str) -> ValidationResult:
        """
        Validate filename for malicious extensions and patterns.
        
        Args:
            filename: Filename to validate
            
        Returns:
            ValidationResult with safety status
        """
        if not filename:
            return ValidationResult(is_safe=True)
        
        # Check path traversal in filename
        path_result = self.validate_path(filename)
        if not path_result.is_safe:
            return path_result
        
        # Check dangerous extensions
        lower_filename = filename.lower()
        for ext in self.DANGEROUS_EXTENSIONS:
            if lower_filename.endswith(ext):
                return ValidationResult(
                    is_safe=False,
                    threat_type=ThreatType.MALICIOUS_FILE,
                    details=f"Dangerous file extension: {ext}"
                )
        
        # Check double extensions (file.jpg.php)
        parts = filename.rsplit('.', 2)
        if len(parts) >= 3:
            for ext in self.DANGEROUS_EXTENSIONS:
                if f".{parts[-1]}" == ext or f".{parts[-2]}" == ext:
                    return ValidationResult(
                        is_safe=False,
                        threat_type=ThreatType.MALICIOUS_FILE,
                        details="Suspicious double extension detected"
                    )
        
        return ValidationResult(is_safe=True)


# =============================================================================
# DRF SERIALIZER VALIDATORS
# =============================================================================

def validate_safe_text(value: str, field_name: str = "field") -> str:
    """
    DRF-compatible validator for safe text input.
    
    Usage in serializer:
        name = serializers.CharField(validators=[validate_safe_text])
    """
    if not value:
        return value
    
    validator = SecurityValidator()
    result = validator.validate_text(value)
    
    if not result.is_safe:
        raise serializers.ValidationError(
            f"Invalid input in {field_name}: potentially unsafe content detected"
        )
    
    return value


def validate_safe_html(value: str) -> str:
    """
    Sanitize HTML content while preserving safe tags.
    
    Allows: p, br, strong, em, ul, ol, li, a (with safe href)
    """
    import bleach
    
    ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li', 
                    'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre']
    ALLOWED_ATTRS = {
        'a': ['href', 'title'],
        '*': ['class']
    }
    
    try:
        cleaned = bleach.clean(
            value,
            tags=ALLOWED_TAGS,
            attributes=ALLOWED_ATTRS,
            strip=True
        )
        return cleaned
    except Exception:
        # If bleach is not installed, do basic escaping
        return html.escape(value)


def validate_safe_filename(value: str) -> str:
    """
    DRF-compatible validator for safe filenames.
    """
    if not value:
        return value
    
    validator = SecurityValidator()
    result = validator.validate_filename(value)
    
    if not result.is_safe:
        raise serializers.ValidationError(
            f"Invalid filename: {result.details}"
        )
    
    return value


def validate_safe_url(value: str) -> str:
    """
    DRF-compatible validator for safe URLs.
    """
    if not value:
        return value
    
    validator = SecurityValidator()
    result = validator.validate_url(value)
    
    if not result.is_safe:
        raise serializers.ValidationError(
            f"Invalid URL: {result.details}"
        )
    
    return value


# =============================================================================
# SERIALIZER FIELD MIXINS
# =============================================================================

class SafeCharField(serializers.CharField):
    """CharField with automatic security validation."""
    
    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        return validate_safe_text(value, self.field_name)


class SafeTextField(serializers.CharField):
    """TextField with automatic security validation."""
    
    def __init__(self, *args, **kwargs):
        kwargs.setdefault('max_length', 10000)
        super().__init__(*args, **kwargs)
    
    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        return validate_safe_text(value, self.field_name)


class SafeURLField(serializers.URLField):
    """URLField with SSRF prevention."""
    
    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        return validate_safe_url(value)


class SafeFileField(serializers.FileField):
    """FileField with filename validation."""
    
    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        
        if hasattr(value, 'name'):
            validate_safe_filename(value.name)
        
        return value
