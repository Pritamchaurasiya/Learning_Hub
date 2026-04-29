"""
Input Validation and Sanitization Utilities
Prevents injection attacks and validates input data
"""

import re
import html
from typing import Any, Optional
from django.core.validators import validate_email
from django.core.exceptions import ValidationError


class InputValidator:
    """Comprehensive input validation utilities."""
    
    # Regex patterns
    PATTERNS = {
        'alphanumeric': re.compile(r'^[a-zA-Z0-9_]+$'),
        'slug': re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*$'),
        'username': re.compile(r'^[a-zA-Z0-9_.-]+$'),
        'safe_text': re.compile(r'^[\w\s\-'".,!?;:()]+$'),
        'no_html': re.compile(r'<[^>]+>'),
    }
    
    @classmethod
    def sanitize_string(cls, value: str, max_length: int = 255) -> str:
        """
        Sanitize string input.
        - Strip whitespace
        - Escape HTML
        - Limit length
        """
        if not isinstance(value, str):
            value = str(value)
        
        # Strip whitespace
        value = value.strip()
        
        # Escape HTML to prevent XSS
        value = html.escape(value)
        
        # Limit length
        if len(value) > max_length:
            value = value[:max_length]
        
        return value
    
    @classmethod
    def validate_email(cls, email: str) -> bool:
        """Validate email address."""
        try:
            validate_email(email)
            return True
        except ValidationError:
            return False
    
    @classmethod
    def validate_username(cls, username: str) -> bool:
        """Validate username format."""
        if not username or len(username) < 3 or len(username) > 30:
            return False
        return bool(cls.PATTERNS['username'].match(username))
    
    @classmethod
    def validate_slug(cls, slug: str) -> bool:
        """Validate URL slug format."""
        if not slug or len(slug) > 100:
            return False
        return bool(cls.PATTERNS['slug'].match(slug))
    
    @classmethod
    def contains_html(cls, value: str) -> bool:
        """Check if string contains HTML tags."""
        return bool(cls.PATTERNS['no_html'].search(value))
    
    @classmethod
    def validate_password_strength(cls, password: str) -> dict:
        """
        Validate password strength.
        Returns dict with 'valid' and 'errors'.
        """
        errors = []
        
        if len(password) < 8:
            errors.append("Password must be at least 8 characters")
        
        if not re.search(r'[A-Z]', password):
            errors.append("Password must contain uppercase letter")
        
        if not re.search(r'[a-z]', password):
            errors.append("Password must contain lowercase letter")
        
        if not re.search(r'\d', password):
            errors.append("Password must contain digit")
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append("Password must contain special character")
        
        return {
            'valid': len(errors) == 0,
            'errors': errors,
        }


class SQLInjectionProtection:
    """Protect against SQL injection attacks."""
    
    DANGEROUS_PATTERNS = [
        re.compile(r'(\%27)|(')|(\-\-)|(\%23)|(#)', re.IGNORECASE),
        re.compile(r'((\%3D)|(=))[^
]*((\%27)|(')|(\-\-)|(\%3B)|(;))', re.IGNORECASE),
        re.compile(r'\w*((\%27)|('))((\%6F)|o|(\%4F))((\%72)|r|(\%52))', re.IGNORECASE),
        re.compile(r'((\%27)|('))union', re.IGNORECASE),
        re.compile(r'exec(\s|\+)+(s|x)p\w+', re.IGNORECASE),
    ]
    
    @classmethod
    def is_safe(cls, value: str) -> bool:
        """Check if input is safe from SQL injection."""
        for pattern in cls.DANGEROUS_PATTERNS:
            if pattern.search(value):
                return False
        return True


def sanitize_input_dict(data: dict) -> dict:
    """Recursively sanitize all string values in a dictionary."""
    sanitized = {}
    for key, value in data.items():
        if isinstance(value, str):
            sanitized[key] = InputValidator.sanitize_string(value)
        elif isinstance(value, dict):
            sanitized[key] = sanitize_input_dict(value)
        elif isinstance(value, list):
            sanitized[key] = [InputValidator.sanitize_string(item) if isinstance(item, str) else item for item in value]
        else:
            sanitized[key] = value
    return sanitized
