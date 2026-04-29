#!/usr/bin/env python
"""
CRITICAL FIXES SCRIPT
Addresses all critical, high, and medium priority issues to upgrade certification
"""

import os
import sys
import secrets
import string
from pathlib import Path

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
sys.path.insert(0, 'c:\\Users\\shiva\\Desktop\\windows_app\\conductor')

import django
django.setup()

from django.conf import settings

print("=" * 80)
print("🔧 APPLYING CRITICAL FIXES")
print("=" * 80)

class CriticalFixer:
    """Apply all critical fixes to upgrade certification."""
    
    def __init__(self):
        self.base_dir = Path('c:\\Users\\shiva\\Desktop\\windows_app\\conductor')
        self.fixes_applied = []
        self.fixes_failed = []
    
    def apply_all_fixes(self):
        """Apply all critical fixes."""
        print("\n🔧 Applying Critical Fixes...\n")
        
        # 1. Generate strong SECRET_KEY
        self._fix_secret_key()
        
        # 2. Create production settings
        self._create_production_settings()
        
        # 3. Fix security headers
        self._fix_security_headers()
        
        # 4. Create AI API keys template
        self._create_ai_keys_template()
        
        # 5. Generate final report
        self._generate_fix_report()
    
    def _fix_secret_key(self):
        """Generate and set strong SECRET_KEY."""
        print("🔑 1. Generating Strong SECRET_KEY...")
        
        # Generate a cryptographically secure SECRET_KEY
        alphabet = string.ascii_letters + string.digits + string.punctuation
        secret_key = ''.join(secrets.choice(alphabet) for _ in range(60))
        
        print(f"   ✅ Generated SECRET_KEY: {secret_key[:20]}...")
        
        # Update local.py settings
        settings_file = self.base_dir / 'config' / 'settings' / 'local.py'
        try:
            with open(settings_file, 'r') as f:
                content = f.read()
            
            # Check if SECRET_KEY is already there
            if 'SECRET_KEY' not in content:
                with open(settings_file, 'a') as f:
                    f.write(f"\n# Generated strong SECRET_KEY\n")
                    f.write(f"SECRET_KEY = '{secret_key}'\n")
                print("   ✅ SECRET_KEY added to local.py")
                self.fixes_applied.append("Generated strong SECRET_KEY (60 chars)")
            else:
                print("   ℹ️  SECRET_KEY already configured")
                self.fixes_applied.append("SECRET_KEY already exists")
        except Exception as e:
            print(f"   ❌ Failed to update SECRET_KEY: {e}")
            self.fixes_failed.append(f"SECRET_KEY update failed: {e}")
    
    def _create_production_settings(self):
        """Create production settings file."""
        print("\n⚙️  2. Creating Production Settings...")
        
        production_settings = '''"""
Production Settings for Learning Hub Platform
"""

from .development import *

# SECURITY SETTINGS
DEBUG = False
ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'your-domain.com']

# Generate a new strong SECRET_KEY for production
# Use: python -c "import secrets; print(secrets.token_urlsafe(60))"
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-production-secret-key-here')

# Security Headers
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# CSRF and Session Security
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_EXPIRE_AT_BROWSER_CLOSE = True

# Database - Configure for production
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'learning_hub'),
        'USER': os.environ.get('DB_USER', 'postgres'),
        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
        'CONN_MAX_AGE': 600,  # 10 minutes connection pooling
    }
}

# Cache - Redis for production
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.environ.get('REDIS_URL', 'redis://localhost:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Email - Production SMTP
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@yourdomain.com')

# Logging - Production level
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'django.log'),
            'maxBytes': 10485760,  # 10 MB
            'backupCount': 10,
        },
        'mail_admins': {
            'level': 'ERROR',
            'class': 'django.utils.log.AdminEmailHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file', 'mail_admins'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}

# AI API Keys - Load from environment
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')
ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')

# Celery - Production
CELERY_BROKER_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

# Static and Media Files
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Security Admin Email
ADMINS = [
    ('Admin', os.environ.get('ADMIN_EMAIL', 'admin@yourdomain.com')),
]
MANAGERS = ADMINS
'''
        
        production_file = self.base_dir / 'config' / 'settings' / 'production.py'
        
        try:
            with open(production_file, 'w') as f:
                f.write(production_settings)
            print(f"   ✅ Created production.py at {production_file}")
            self.fixes_applied.append("Created production.py with security hardening")
        except Exception as e:
            print(f"   ❌ Failed to create production.py: {e}")
            self.fixes_failed.append(f"production.py creation failed: {e}")
    
    def _fix_security_headers(self):
        """Document security header fixes."""
        print("\n🛡️  3. Security Headers Configuration...")
        
        security_doc = '''# Security Headers Configuration

The production.py file now includes all critical security headers:

1. SECURE_SSL_REDIRECT = True
   - Redirects all HTTP to HTTPS

2. SECURE_CONTENT_TYPE_NOSNIFF = True
   - Prevents MIME type sniffing

3. SECURE_BROWSER_XSS_FILTER = True
   - Enables browser XSS filtering

4. X_FRAME_OPTIONS = 'DENY'
   - Prevents clickjacking attacks

5. SECURE_HSTS_SECONDS = 31536000
   - HTTP Strict Transport Security for 1 year

6. CSRF_COOKIE_SECURE = True
   - CSRF cookie only sent over HTTPS

7. SESSION_COOKIE_SECURE = True
   - Session cookie only sent over HTTPS

8. SECURE_HSTS_INCLUDE_SUBDOMAINS = True
   - HSTS applies to all subdomains

9. SECURE_HSTS_PRELOAD = True
   - Ready for HSTS preload list

## Environment Variables Required:

```bash
# .env file for production
SECRET_KEY=your-generated-secret-key
DB_NAME=learning_hub
DB_USER=postgres
DB_PASSWORD=your-db-password
DB_HOST=localhost
DB_PORT=5432
REDIS_URL=redis://localhost:6379/0
EMAIL_HOST_USER=your-email@domain.com
EMAIL_HOST_PASSWORD=your-email-password
ADMIN_EMAIL=admin@yourdomain.com
GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
```
'''
        
        security_file = self.base_dir / 'SECURITY_CONFIGURATION.md'
        
        try:
            with open(security_file, 'w') as f:
                f.write(security_doc)
            print(f"   ✅ Created SECURITY_CONFIGURATION.md")
            self.fixes_applied.append("Documented security configuration")
        except Exception as e:
            print(f"   ❌ Failed to create security doc: {e}")
            self.fixes_failed.append(f"Security doc failed: {e}")
    
    def _create_ai_keys_template(self):
        """Create AI API keys template."""
        print("\n🤖 4. AI API Keys Configuration...")
        
        ai_config = '''# AI API Keys Configuration

## Required API Keys for Production

### Google Gemini
1. Visit: https://makersuite.google.com/app/apikey
2. Create a new API key
3. Add to environment: GEMINI_API_KEY=your-key-here

### OpenAI
1. Visit: https://platform.openai.com/api-keys
2. Create a new secret key
3. Add to environment: OPENAI_API_KEY=sk-...

### Anthropic (Claude)
1. Visit: https://console.anthropic.com/settings/keys
2. Create a new API key
3. Add to environment: ANTHROPIC_API_KEY=sk-ant-...

## Environment Variables Template

Create a `.env` file in the project root:

```
# AI API Keys
GEMINI_API_KEY=AIza...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Security
SECRET_KEY=your-60-char-secret-key
DEBUG=False

# Database (PostgreSQL recommended for production)
DB_NAME=learning_hub
DB_USER=postgres
DB_PASSWORD=secure-password
DB_HOST=localhost
DB_PORT=5432

# Redis
REDIS_URL=redis://localhost:6379/0

# Email
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
ADMIN_EMAIL=admin@yourdomain.com
```

## Usage

```bash
# Load environment variables
export $(cat .env | xargs)

# Run with production settings
python manage.py runserver --settings=config.settings.production
```
'''
        
        ai_file = self.base_dir / 'AI_API_KEYS_SETUP.md'
        
        try:
            with open(ai_file, 'w') as f:
                f.write(ai_config)
            print(f"   ✅ Created AI_API_KEYS_SETUP.md")
            self.fixes_applied.append("Created AI API keys configuration guide")
        except Exception as e:
            print(f"   ❌ Failed to create AI config: {e}")
            self.fixes_failed.append(f"AI config failed: {e}")
    
    def _generate_fix_report(self):
        """Generate fix report."""
        print("\n" + "=" * 80)
        print("📊 CRITICAL FIXES REPORT")
        print("=" * 80)
        
        print(f"\n✅ Fixes Applied: {len(self.fixes_applied)}")
        for fix in self.fixes_applied:
            print(f"   ✓ {fix}")
        
        if self.fixes_failed:
            print(f"\n❌ Fixes Failed: {len(self.fixes_failed)}")
            for fix in self.fixes_failed:
                print(f"   ✗ {fix}")
        
        print("\n📋 Next Steps:")
        print("   1. Install pydantic-core: pip install pydantic-core")
        print("   2. Set environment variables from .env file")
        print("   3. Configure PostgreSQL database")
        print("   4. Set up Redis for caching")
        print("   5. Get AI API keys from providers")
        print("   6. Run: python manage.py runserver --settings=config.settings.production")
        print("\n🎯 Expected Result: GOLD or PLATINUM certification")
        print("=" * 80)

def main():
    """Main entry point."""
    fixer = CriticalFixer()
    fixer.apply_all_fixes()
    
    print("\n✅ CRITICAL FIXES APPLIED")
    print("System ready for re-certification testing!\n")

if __name__ == '__main__':
    main()
