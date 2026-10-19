# Django Backend Security Enhancements Guide

## Overview
Comprehensive security improvements and best practices for the Learning Hub Django backend.

---

## 1. Authentication & Authorization

### JWT Token Security

#### Enhanced JWT Settings
```python
# config/settings/base.py
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),  # Short-lived access tokens
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),     # Refresh tokens
    'ROTATE_REFRESH_TOKENS': True,                   # Rotate on refresh
    'BLACKLIST_AFTER_ROTATION': True,                # Blacklist old tokens
    'UPDATE_LAST_LOGIN': True,
    
    # Security
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': settings.SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': 'learninghub',
    
    # Token Claims
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    
    # Security Headers
    'JTI_CLAIM': 'jti',  # JWT ID for revocation
    
    # Anti-CSRF
    'AUTH_COOKIE': 'access_token',
    'AUTH_COOKIE_SECURE': not DEBUG,  # HTTPS only in production
    'AUTH_COOKIE_HTTP_ONLY': True,     # Not accessible via JavaScript
    'AUTH_COOKIE_SAMESITE': 'Lax',     # CSRF protection
}
```

### Permission Classes

#### Custom Permissions
```python
# apps/core/permissions.py
from rest_framework import permissions

class IsOwnerOrReadOnly(permissions.BasePermission):
    """Allow owners to edit, others to read."""
    
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.user == request.user or request.user.is_staff


class IsInstructorOrReadOnly(permissions.BasePermission):
    """Allow instructors to create/edit courses."""
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.is_instructor


class IsEnrolledInCourse(permissions.BasePermission):
    """Check if user is enrolled in course."""
    
    def has_object_permission(self, request, view, obj):
        from apps.courses.models import Enrollment
        
        if request.user.is_staff:
            return True
        
        # Check enrollment
        return Enrollment.objects.filter(
            user=request.user,
            course=obj.course if hasattr(obj, 'course') else obj
        ).exists()


class CanAccessProContent(permissions.BasePermission):
    """Check if user has Pro subscription for premium content."""
    
    def has_object_permission(self, request, view, obj):
        # Free content
        if not getattr(obj, 'is_pro_only', False):
            return True
        
        # Pro users and staff
        return request.user.is_pro or request.user.is_staff
```

---

## 2. Input Validation & Sanitization

### SQL Injection Prevention
```python
# ✅ GOOD - Use ORM
users = User.objects.filter(email=user_input)

# ✅ GOOD - Parameterized queries
from django.db import connection
cursor = connection.cursor()
cursor.execute("SELECT * FROM users WHERE email = %s", [user_input])

# ❌ BAD - String interpolation
cursor.execute(f"SELECT * FROM users WHERE email = '{user_input}'")
```

### XSS Prevention
```python
# Serializer with validation
from rest_framework import serializers
import bleach

class CommentSerializer(serializers.ModelSerializer):
    content = serializers.CharField(max_length=1000)
    
    def validate_content(self, value):
        """Sanitize HTML content."""
        # Allow only safe tags
        allowed_tags = ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li']
        allowed_attrs = {'a': ['href', 'title']}
        
        clean_content = bleach.clean(
            value,
            tags=allowed_tags,
            attributes=allowed_attrs,
            strip=True
        )
        
        return clean_content
```

### File Upload Security
```python
# apps/core/validators.py
from django.core.exceptions import ValidationError
import magic

def validate_file_extension(value):
    """Validate file extension."""
    import os
    ext = os.path.splitext(value.name)[1].lower()
    valid_extensions = ['.jpg', '.jpeg', '.png', '.pdf', '.zip']
    
    if ext not in valid_extensions:
        raise ValidationError(f'Unsupported file extension. Allowed: {valid_extensions}')


def validate_file_size(value):
    """Validate file size (max 10MB)."""
    filesize = value.size
    
    if filesize > 10 * 1024 * 1024:  # 10MB
        raise ValidationError("Maximum file size is 10MB")


def validate_file_mimetype(value):
    """Validate actual file type using magic numbers."""
    allowed_mimes = [
        'image/jpeg',
        'image/png',
        'application/pdf',
        'application/zip'
    ]
    
    file_mime = magic.from_buffer(value.read(1024), mime=True)
    value.seek(0)  # Reset file pointer
    
    if file_mime not in allowed_mimes:
        raise ValidationError(f'Invalid file type: {file_mime}')


# Model with validators
class Document(models.Model):
    file = models.FileField(
        upload_to='documents/%Y/%m/',
        validators=[
            validate_file_extension,
            validate_file_size,
            validate_file_mimetype
        ]
    )
```

---

## 3. Rate Limiting & Throttling

### Custom Throttle Classes
```python
# apps/core/throttles.py
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle

class LoginRateThrottle(UserRateThrottle):
    """5 login attempts per minute."""
    rate = '5/minute'
    scope = 'login'


class RegistrationRateThrottle(AnonRateThrottle):
    """3 registrations per hour per IP."""
    rate = '3/hour'
    scope = 'registration'


class PaymentRateThrottle(UserRateThrottle):
    """10 payment attempts per hour."""
    rate = '10/hour'
    scope = 'payment'


class APICallRateThrottle(UserRateThrottle):
    """1000 API calls per hour for authenticated users."""
    rate = '1000/hour'
    scope = 'api'


# settings.py
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'apps.core.throttles.APICallRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'api': '1000/hour',
        'login': '5/minute',
        'registration': '3/hour',
        'payment': '10/hour',
    }
}
```

### Apply to Views
```python
from apps.core.throttles import LoginRateThrottle

class LoginView(APIView):
    throttle_classes = [LoginRateThrottle]
    
    def post(self, request):
        # Login logic
        pass
```

---

## 4. CORS & CSP Configuration

### CORS Settings
```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',      # Flutter web dev
    'http://localhost:8080',      
    'https://learninghub.com',    # Production
    'https://app.learninghub.com',
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]
```

### Content Security Policy
```python
# settings.py
CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = ("'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net')
CSP_STYLE_SRC = ("'self'", "'unsafe-inline'", 'https://fonts.googleapis.com')
CSP_FONT_SRC = ("'self'", 'https://fonts.gstatic.com')
CSP_IMG_SRC = ("'self'", 'data:', 'https:')
CSP_CONNECT_SRC = ("'self'", 'https://api.razorpay.com')
CSP_FRAME_ANCESTORS = ("'none'",)
CSP_BASE_URI = ("'self'",)
CSP_FORM_ACTION = ("'self'",)
```

---

## 5. Session Security

### Session Configuration
```python
# settings.py

# Session cookie security
SESSION_COOKIE_SECURE = not DEBUG  # HTTPS only
SESSION_COOKIE_HTTPONLY = True     # Not accessible via JS
SESSION_COOKIE_SAMESITE = 'Lax'    # CSRF protection
SESSION_COOKIE_AGE = 3600          # 1 hour

# CSRF cookie security
CSRF_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Lax'

# Session backend
SESSION_ENGINE = 'django.contrib.sessions.backends.db'
SESSION_SAVE_EVERY_REQUEST = False
```

### Session Tracking
```python
# Track active sessions
from apps.users.models import UserSession

def create_session_record(user, request):
    """Create session tracking record."""
    return UserSession.objects.create(
        user=user,
        session_key=request.session.session_key,
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:150],
        device_info=parse_user_agent(request.META.get('HTTP_USER_AGENT', ''))
    )


def get_client_ip(request):
    """Get client IP address."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip
```

---

## 6. Password Security

### Password Validation
```python
# settings.py
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 12,  # Increased from default 8
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Password hashing
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',  # Most secure
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
]
```

### Password Reset Security
```python
# apps/users/services.py
import secrets
from datetime import timedelta
from django.utils import timezone

def create_password_reset_token(user, request):
    """Create secure password reset token."""
    # Generate cryptographically secure token
    token = secrets.token_urlsafe(32)
    
    # Create token record
    from apps.users.models import PasswordResetToken
    reset_token = PasswordResetToken.objects.create(
        user=user,
        token=token,
        expires_at=timezone.now() + timedelta(hours=1),  # 1 hour expiry
        ip_address=get_client_ip(request)
    )
    
    # Invalidate old tokens
    PasswordResetToken.objects.filter(
        user=user,
        is_used=False
    ).exclude(id=reset_token.id).update(is_used=True)
    
    return token
```

---

## 7. API Key Security

### Secure API Key Generation
```python
# apps/users/services.py
import hashlib
import secrets

def generate_api_key():
    """Generate secure API key."""
    # Generate random key
    key = secrets.token_urlsafe(32)
    prefix = key[:12]  # First 12 chars as prefix
    
    # Hash the full key
    hashed_key = hashlib.sha256(key.encode()).hexdigest()
    
    return key, prefix, hashed_key


def create_api_key(user, name, scopes=None):
    """Create API key for user."""
    from apps.users.models import APIKey
    
    key, prefix, hashed_key = generate_api_key()
    
    api_key = APIKey.objects.create(
        user=user,
        name=name,
        prefix=prefix,
        hashed_key=hashed_key,
        scopes=scopes or []
    )
    
    # Return the plain key only once
    return key, api_key


def verify_api_key(key):
    """Verify and return APIKey instance."""
    from apps.users.models import APIKey
    
    if not key:
        return None
    
    prefix = key[:12]
    hashed = hashlib.sha256(key.encode()).hexdigest()
    
    try:
        api_key = APIKey.objects.get(
            prefix=prefix,
            hashed_key=hashed,
            is_active=True
        )
        
        # Check expiry
        if api_key.expires_at and timezone.now() > api_key.expires_at:
            return None
        
        # Update last used
        api_key.last_used_at = timezone.now()
        api_key.save(update_fields=['last_used_at'])
        
        return api_key
    except APIKey.DoesNotExist:
        return None
```

---

## 8. Logging & Monitoring

### Security Event Logging
```python
# apps/core/security_logger.py
import logging

security_logger = logging.getLogger('security')

def log_security_event(event_type, user, details, request=None):
    """Log security-related events."""
    log_data = {
        'event_type': event_type,
        'user_id': str(user.id) if user else None,
        'user_email': user.email if user else None,
        'details': details,
        'timestamp': timezone.now().isoformat(),
    }
    
    if request:
        log_data.update({
            'ip_address': get_client_ip(request),
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            'path': request.path,
            'method': request.method,
        })
    
    security_logger.warning(f"Security Event: {event_type}", extra=log_data)


# Usage examples
log_security_event('failed_login', user, {'reason': 'invalid_password'}, request)
log_security_event('password_reset', user, {'ip': ip_address}, request)
log_security_event('api_key_created', user, {'key_name': name}, request)
log_security_event('permission_denied', user, {'resource': resource_id}, request)
```

### Failed Login Tracking
```python
# apps/users/views.py
from django.core.cache import cache

def track_failed_login(email, request):
    """Track failed login attempts."""
    cache_key = f'failed_login:{email}'
    attempts = cache.get(cache_key, 0)
    attempts += 1
    
    # Lock account after 5 failed attempts
    if attempts >= 5:
        log_security_event('account_locked', None, {
            'email': email,
            'attempts': attempts
        }, request)
        cache.set(cache_key, attempts, 900)  # 15 minutes lockout
        raise ValidationError("Too many failed attempts. Account locked for 15 minutes.")
    
    cache.set(cache_key, attempts, 300)  # 5 minutes
    return attempts
```

---

## 9. Production Security Checklist

### Django Settings
- [ ] `DEBUG = False` in production
- [ ] Strong `SECRET_KEY` (50+ characters, random)
- [ ] `ALLOWED_HOSTS` properly configured
- [ ] `SECURE_SSL_REDIRECT = True`
- [ ] `SECURE_HSTS_SECONDS = 31536000`
- [ ] `SECURE_HSTS_INCLUDE_SUBDOMAINS = True`
- [ ] `SECURE_HSTS_PRELOAD = True`
- [ ] `SESSION_COOKIE_SECURE = True`
- [ ] `CSRF_COOKIE_SECURE = True`
- [ ] `SECURE_BROWSER_XSS_FILTER = True`
- [ ] `SECURE_CONTENT_TYPE_NOSNIFF = True`
- [ ] `X_FRAME_OPTIONS = 'DENY'`

### Database
- [ ] Use strong database passwords
- [ ] Enable SSL for database connections
- [ ] Regular backups configured
- [ ] Database user has minimum required permissions
- [ ] Sensitive data encrypted at rest

### API Security
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] Proper authentication required
- [ ] Permission checks on all actions
- [ ] CORS configured correctly
- [ ] API versioning implemented

### Monitoring
- [ ] Error logging configured
- [ ] Security event logging enabled
- [ ] Failed login monitoring
- [ ] Suspicious activity alerts
- [ ] Regular security audits

---

## Summary

Key security principles implemented:
1. ✅ **Strong authentication** with JWT and session tracking
2. ✅ **Comprehensive authorization** with custom permissions
3. ✅ **Input validation** and sanitization
4. ✅ **Rate limiting** on sensitive endpoints
5. ✅ **Secure configuration** for production
6. ✅ **Security logging** and monitoring
7. ✅ **Password security** with Argon2 hashing
8. ✅ **API key management** with proper hashing

**Document Version**: 1.0  
**Created**: 2026-10-19  
**Author**: Kiro AI Assistant
