#!/usr/bin/env python3
"""
Environment Variable Validation Script
Checks that all required environment variables are properly configured.
"""

import os
import sys
from typing import List, Tuple, Optional

# Required environment variables for production
REQUIRED_PRODUCTION_VARS = [
    'SECRET_KEY',
    'DEBUG',
    'ALLOWED_HOSTS',
    'DATABASE_URL',
    'REDIS_URL',
]

# Optional but recommended
RECOMMENDED_VARS = [
    'JWT_SECRET_KEY',
    'CORS_ALLOWED_ORIGINS',
    'SENTRY_DSN',
    'EMAIL_HOST_USER',
    'EMAIL_HOST_PASSWORD',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
]

# Security-critical variables (should be strong/unique)
SECURITY_CRITICAL_VARS = [
    'SECRET_KEY',
    'JWT_SECRET_KEY',
]

# URL format variables
URL_VARS = [
    'DATABASE_URL',
    'REDIS_URL',
    'SENTRY_DSN',
]

def validate_required_vars() -> List[Tuple[str, str]]:
    """Check that all required variables are set."""
    errors = []
    
    for var in REQUIRED_PRODUCTION_VARS:
        value = os.getenv(var)
        if not value:
            errors.append((var, "Missing required variable"))
        else:
            print(f"✅ {var} is set")
    
    return errors

def validate_recommended_vars() -> List[str]:
    """Check recommended variables."""
    warnings = []
    
    for var in RECOMMENDED_VARS:
        value = os.getenv(var)
        if not value:
            warnings.append(f"⚠️  {var} not set (recommended but optional)")
        else:
            print(f"✅ {var} is set")
    
    return warnings

def validate_security_critical_vars() -> List[Tuple[str, str]]:
    """Validate security-critical variables are strong."""
    errors = []
    
    for var in SECURITY_CRITICAL_VARS:
        value = os.getenv(var)
        if not value:
            continue  # Already caught in required check
        
        # Check minimum length
        if len(value) < 32:
            errors.append((var, f"Too short ({len(value)} chars), minimum 32 characters recommended"))
        
        # Check for common weak values
        weak_values = ['secret', 'password', '123456', 'admin', 'test', 'dev']
        if any(weak in value.lower() for weak in weak_values):
            errors.append((var, "Contains weak/common value"))
        
        # Check for diversity (should have mix of characters)
        has_lower = any(c.islower() for c in value)
        has_upper = any(c.isupper() for c in value)
        has_digit = any(c.isdigit() for c in value)
        has_special = any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in value)
        
        diversity_score = sum([has_lower, has_upper, has_digit, has_special])
        if diversity_score < 3:
            errors.append((var, f"Low character diversity ({diversity_score}/4 types), use mix of cases, digits, and special chars"))
    
    return errors

def validate_url_formats() -> List[Tuple[str, str]]:
    """Validate URL format variables."""
    errors = []
    
    for var in URL_VARS:
        value = os.getenv(var)
        if not value:
            continue
        
        # Basic URL validation
        if '://' not in value:
            errors.append((var, "Invalid URL format (missing ://)"))
        
        # Specific checks
        if var == 'DATABASE_URL':
            if not any(proto in value for proto in ['postgresql://', 'postgres://', 'sqlite://']):
                errors.append((var, "Should use postgresql://, postgres://, or sqlite://"))
        
        if var == 'REDIS_URL':
            if not value.startswith('redis://'):
                errors.append((var, "Should start with redis://"))
    
    return errors

def validate_django_settings() -> List[str]:
    """Validate Django-specific environment configuration."""
    warnings = []
    
    # Check DEBUG setting
    debug = os.getenv('DEBUG', '').lower()
    if debug in ['true', '1', 'yes']:
        warnings.append("⚠️  DEBUG is enabled (should be False in production)")
    elif debug in ['false', '0', 'no', '']:
        print("✅ DEBUG is disabled (production mode)")
    else:
        warnings.append(f"⚠️  DEBUG has unrecognized value: {debug}")
    
    # Check ALLOWED_HOSTS
    allowed_hosts = os.getenv('ALLOWED_HOSTS', '')
    if allowed_hosts:
        hosts = [h.strip() for h in allowed_hosts.split(',') if h.strip()]
        if '*' in hosts:
            warnings.append("⚠️  ALLOWED_HOSTS contains '*' (wildcard) - security risk")
        elif 'localhost' in hosts or '127.0.0.1' in hosts:
            warnings.append("⚠️  ALLOWED_HOSTS contains localhost/127.0.0.1 - should use actual domain in production")
        else:
            print(f"✅ ALLOWED_HOSTS configured with {len(hosts)} host(s)")
    
    return warnings

def generate_env_file_template():
    """Generate a template .env file with all variables."""
    template = """# Learning Hub Backend - Environment Configuration
# Copy this file to .env and fill in your values

# =============================================================================
# REQUIRED VARIABLES
# =============================================================================

# Django Secret Key (generate a strong random key)
# python -c "import secrets; print(secrets.token_urlsafe(50))"
SECRET_KEY=your-secret-key-here-minimum-50-characters-long-and-very-random

# Debug Mode (set to False in production)
DEBUG=False

# Allowed Hosts (comma-separated, no spaces)
ALLOWED_HOSTS=api.yourdomain.com,www.yourdomain.com

# Database URL (PostgreSQL recommended for production)
DATABASE_URL=postgresql://user:password@localhost:5432/learning_hub

# Redis URL (for caching and Celery)
REDIS_URL=redis://localhost:6379/0

# =============================================================================
# RECOMMENDED VARIABLES
# =============================================================================

# JWT Secret Key (should be different from SECRET_KEY)
JWT_SECRET_KEY=your-jwt-secret-key-here-also-very-random-and-different

# CORS Allowed Origins (comma-separated, for Flutter frontend)
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Sentry DSN (for error tracking)
SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz

# Email Configuration (for notifications)
EMAIL_HOST_USER=noreply@yourdomain.com
EMAIL_HOST_PASSWORD=your-email-password

# AWS S3 Configuration (for media storage)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=secret...
AWS_STORAGE_BUCKET_NAME=learning-hub-media

# Razorpay (for payments)
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=secret_...

# =============================================================================
# OPTIONAL VARIABLES
# =============================================================================

# Frontend URL (for email links)
FRONTEND_URL=https://yourdomain.com

# Celery Configuration
CELERY_BROKER_URL=${REDIS_URL}
CELERY_RESULT_BACKEND=${REDIS_URL}

# Cache Configuration
CACHE_URL=${REDIS_URL}

# Additional Security Headers
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
"""
    return template

def main():
    """Run all environment validation checks."""
    print("=" * 60)
    print("Learning Hub - Environment Variable Validation")
    print("=" * 60)
    print()
    
    errors = []
    warnings = []
    
    # Run checks
    print("1. Checking Required Variables...")
    errors.extend(validate_required_vars())
    print()
    
    print("2. Checking Security-Critical Variables...")
    sec_errors = validate_security_critical_vars()
    if sec_errors:
        for var, msg in sec_errors:
            errors.append((var, msg))
    else:
        print("✅ All security-critical variables are strong")
    print()
    
    print("3. Checking URL Formats...")
    url_errors = validate_url_formats()
    if url_errors:
        for var, msg in url_errors:
            errors.append((var, msg))
    else:
        print("✅ All URL formats are valid")
    print()
    
    print("4. Checking Django Settings...")
    warnings.extend(validate_django_settings())
    print()
    
    print("5. Checking Recommended Variables...")
    warnings.extend(validate_recommended_vars())
    print()
    
    # Summary
    print("=" * 60)
    print("VALIDATION SUMMARY")
    print("=" * 60)
    
    if errors:
        print(f"\n❌ ERRORS ({len(errors)}):")
        for var, msg in errors:
            print(f"   • {var}: {msg}")
    
    if warnings:
        print(f"\n⚠️  WARNINGS ({len(warnings)}):")
        for warning in warnings:
            print(f"   • {warning}")
    
    if not errors and not warnings:
        print("\n✅ ALL CHECKS PASSED - Environment is properly configured!")
    elif not errors:
        print("\n⚠️  Environment has warnings but is functional")
    else:
        print("\n❌ Environment has errors that must be fixed before deployment")
        print("\nTo generate a template .env file, run:")
        print("   python validate_environment.py --generate-template")
        return 1
    
    # Offer to generate template
    if '--generate-template' in sys.argv:
        print("\nGenerating .env.template file...")
        template = generate_env_file_template()
        with open('.env.template', 'w') as f:
            f.write(template)
        print("✅ Created .env.template - copy to .env and customize")
    
    return 0 if not errors else 1

if __name__ == "__main__":
    sys.exit(main())
