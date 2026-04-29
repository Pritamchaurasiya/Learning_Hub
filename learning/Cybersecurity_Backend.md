# 🛡️ Backend Cybersecurity - Complete Defense Guide

## God Mode v12.0 - Security Engineer's Handbook

---

# 📖 TABLE OF CONTENTS

1. [OWASP Top 10 in Django](#1-owasp-top-10-in-django)
2. [Authentication Deep Dive](#2-authentication-deep-dive)
3. [Code Injection Prevention](#3-code-injection-prevention)
4. [Sandbox Security](#4-sandbox-security)
5. [API Security](#5-api-security)
6. [Database Security](#6-database-security)
7. [Infrastructure Security](#7-infrastructure-security)
8. [Security Testing](#8-security-testing)

---

# 1. OWASP TOP 10 IN DJANGO

## A01: Broken Access Control

### Attack Vector

User bypasses authorization to access unauthorized resources.

```python
# ❌ VULNERABLE: No ownership check
class SubmissionViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return Submission.objects.all()  # User can see ALL submissions!

# ✅ SECURE: Filter by authenticated user
class SubmissionViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return Submission.objects.filter(user=self.request.user)
```

### Defense Checklist

- [ ] Always filter querysets by user ownership
- [ ] Use object-level permissions
- [ ] Deny by default, allow explicitly
- [ ] Log access control failures

## A02: Cryptographic Failures

### Django Built-in Protections

```python
# settings.py
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')  # Never hardcode!

# Password hashing (Django default: PBKDF2)
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',  # Preferred
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
]

# HTTPS enforcement
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

## A03: Injection

### SQL Injection

```python
# ❌ VULNERABLE: Raw SQL with string formatting
def get_user(username):
    return User.objects.raw(f"SELECT * FROM users WHERE username = '{username}'")
    # Attack: username = "'; DROP TABLE users; --"

# ✅ SECURE: Parameterized queries
def get_user(username):
    return User.objects.raw("SELECT * FROM users WHERE username = %s", [username])

# ✅ BEST: Use ORM
def get_user(username):
    return User.objects.filter(username=username).first()
```

### Command Injection

```python
# ❌ VULNERABLE: User input in shell command
def run_code(filename):
    os.system(f"python {filename}")  # What if filename = "; rm -rf /"?

# ✅ SECURE: Use subprocess with list args (no shell)
def run_code(filename):
    if not filename.isalnum():
        raise ValueError("Invalid filename")
    subprocess.run(["python", filename], shell=False)
```

## A04: Insecure Design

### Threat Modeling Approach

1. **Identify Assets**: What are we protecting?
2. **Identify Threats**: Who might attack?
3. **Identify Vulnerabilities**: How might they attack?
4. **Rate Risks**: Likelihood × Impact
5. **Mitigate**: Implement controls

## A05: Security Misconfiguration

```python
# settings/production.py

# ❌ BAD
DEBUG = True
ALLOWED_HOSTS = ['*']

# ✅ GOOD
DEBUG = False
ALLOWED_HOSTS = ['mydomain.com', 'www.mydomain.com']

# Security Headers
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
```

## A06: Vulnerable Components

```bash
# Check for vulnerable dependencies
pip install safety
safety check

# Or with Snyk
snyk test --file=requirements.txt
```

## A07: Authentication Failures

```python
# Rate limiting login attempts
from django_ratelimit.decorators import ratelimit

@ratelimit(key='ip', rate='5/m', method='POST', block=True)
def login_view(request):
    # Login logic
    pass
```

## A08: Data Integrity Failures

```python
# Verify JWT signatures
from rest_framework_simplejwt.authentication import JWTAuthentication

# settings.py
SIMPLE_JWT = {
    'ALGORITHM': 'HS256',  # Use RS256 for public/private key
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
}
```

## A09: Logging & Monitoring Failures

```python
# settings.py
LOGGING = {
    'version': 1,
    'handlers': {
        'security': {
            'class': 'logging.FileHandler',
            'filename': 'security.log',
        },
    },
    'loggers': {
        'django.security': {
            'handlers': ['security'],
            'level': 'WARNING',
        },
    },
}

# Log security events
import logging
logger = logging.getLogger('django.security')

def login(request):
    # ... auth logic ...
    if auth_failed:
        logger.warning(f"Failed login attempt for {username} from {request.META['REMOTE_ADDR']}")
```

## A10: SSRF (Server-Side Request Forgery)

```python
# ❌ VULNERABLE: User controls URL
def fetch_data(url):
    response = requests.get(url)  # Can access internal services!
    return response.json()

# ✅ SECURE: Whitelist allowed domains
ALLOWED_DOMAINS = ['api.github.com', 'api.stripe.com']

def fetch_data(url):
    parsed = urllib.parse.urlparse(url)
    if parsed.netloc not in ALLOWED_DOMAINS:
        raise ValueError("Domain not allowed")
    response = requests.get(url, timeout=5)
    return response.json()
```

---

# 2. AUTHENTICATION DEEP DIVE

## JWT Token Security

### Token Lifecycle

```
[User Login] → [Server Generates Tokens]
                    ↓
            access_token (15 min)
            refresh_token (7 days)
                    ↓
[Client Stores Securely] → [Client Sends Access Token]
                    ↓
[Server Validates Signature] → [Grant Access]
```

### Token Storage (Client-Side)

| Storage           | Security         | Persistence  |
| ----------------- | ---------------- | ------------ |
| `localStorage`    | XSS vulnerable   | Persists     |
| `sessionStorage`  | XSS vulnerable   | Session only |
| `HttpOnly Cookie` | ✅ XSS protected | Persists     |
| Secure Memory     | ✅ Best          | RAM only     |

### Token Refresh Flow

```python
# views.py
from rest_framework_simplejwt.views import TokenRefreshView

# Client sends refresh_token to /api/auth/refresh/
# Server responds with new access_token
```

## Multi-Factor Authentication (MFA)

```python
# Using django-otp
from django_otp.plugins.otp_totp.models import TOTPDevice

def enable_mfa(user):
    device = TOTPDevice.objects.create(user=user, name='default')
    # Generate QR code for authenticator app
    return device.config_url

def verify_mfa(user, code):
    device = TOTPDevice.objects.filter(user=user).first()
    return device.verify_token(code)
```

---

# 3. CODE INJECTION PREVENTION

## Sandboxing User Code

### Defense in Depth

```
Layer 1: Input Validation (Regex patterns)
    ↓
Layer 2: Restricted Execution (No dangerous modules)
    ↓
Layer 3: Container Isolation (Docker)
    ↓
Layer 4: Resource Limits (Memory, CPU, Time)
    ↓
Layer 5: Network Isolation (--network none)
```

### Pattern Blacklist

```python
# services.py
FORBIDDEN_PATTERNS = [
    r'import\s+os',
    r'import\s+subprocess',
    r'import\s+sys',
    r'import\s+shutil',
    r'from\s+os\s+import',
    r'__import__',
    r'eval\s*\(',
    r'exec\s*\(',
    r'compile\s*\(',
    r'open\s*\(',
    r'globals\s*\(',
    r'locals\s*\(',
    r'getattr\s*\(',
    r'setattr\s*\(',
    r'delattr\s*\(',
    r'__builtins__',
    r'__code__',
    r'__class__',
]

def sanitize_code(code: str) -> bool:
    for pattern in FORBIDDEN_PATTERNS:
        if re.search(pattern, code, re.IGNORECASE):
            return False
    return True
```

### Docker Container Security

```bash
docker run \
    --rm \                          # Remove container after exit
    --network none \                # No network access
    --memory 128m \                 # Memory limit
    --cpus 0.5 \                    # CPU limit
    --read-only \                   # Read-only filesystem
    --user 65534:65534 \            # Run as nobody
    --security-opt no-new-privileges \
    python:3.11-slim \
    python /app/solution.py < /app/input.txt
```

---

# 4. SANDBOX SECURITY

## Attack Scenarios & Defenses

### Attack 1: Fork Bomb

```python
# Attack code
import os
while True:
    os.fork()
```

**Defense**: Docker `--pids-limit 50`

### Attack 2: Memory Bomb

```python
# Attack code
x = "A" * (1024**3)  # 1GB string
```

**Defense**: Docker `--memory 128m`

### Attack 3: Symlink Attack

```python
# Attack code
import os
os.symlink('/etc/passwd', '/app/data')
```

**Defense**: Read-only filesystem, restricted paths

### Attack 4: Time-Based Exfiltration

```python
# Attack code (side-channel)
import time
secret = read_secret()
for char in secret:
    time.sleep(ord(char) * 0.01)  # Timing leak!
```

**Defense**: Consistent timeout enforcement, no timing observation

---

# 5. API SECURITY

## Rate Limiting

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
        'rest_framework.throttling.ScopedRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
        'submissions': '10/minute',  # Scoped
    }
}

# views.py
class SubmissionViewSet(viewsets.ModelViewSet):
    throttle_scope = 'submissions'
```

## Input Validation

```python
# serializers.py
from rest_framework import serializers

class SubmissionSerializer(serializers.ModelSerializer):
    code = serializers.CharField(max_length=50000)  # Limit size
    language = serializers.ChoiceField(choices=['python', 'javascript', 'java'])

    def validate_code(self, value):
        if len(value) < 10:
            raise serializers.ValidationError("Code too short")
        if not sanitize_code(value):
            raise serializers.ValidationError("Forbidden code patterns detected")
        return value
```

## CORS Configuration

```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    "https://mydomain.com",
]
# NOT: CORS_ALLOW_ALL_ORIGINS = True  # Never in production!

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
```

---

# 6. DATABASE SECURITY

## Principle of Least Privilege

```sql
-- Create read-only user for analytics
CREATE USER analytics_user WITH PASSWORD 'secure_password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_user;

-- Create app user with limited permissions
CREATE USER app_user WITH PASSWORD 'secure_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
REVOKE DELETE ON users FROM app_user;  # Protect user table from deletion
```

## Sensitive Data Encryption

```python
# Using django-encrypted-model-fields
from encrypted_model_fields.fields import EncryptedCharField

class UserProfile(models.Model):
    ssn = EncryptedCharField(max_length=11)  # Encrypted at rest
```

## Database Connection Security

```python
# settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ['DB_NAME'],
        'USER': os.environ['DB_USER'],
        'PASSWORD': os.environ['DB_PASSWORD'],
        'HOST': os.environ['DB_HOST'],
        'PORT': '5432',
        'OPTIONS': {
            'sslmode': 'require',  # Encrypt connection
        },
    }
}
```

---

# 7. INFRASTRUCTURE SECURITY

## Secrets Management

```python
# ❌ NEVER: Hardcoded secrets
SECRET_KEY = 'django-insecure-abc123'

# ✅ Environment variables
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')

# ✅ BEST: Secret manager (AWS, GCP, HashiCorp Vault)
import boto3
ssm = boto3.client('ssm')
SECRET_KEY = ssm.get_parameter(Name='/app/secret_key', WithDecryption=True)['Parameter']['Value']
```

## Firewall Configuration

```
Internet
    ↓
[Load Balancer (Port 443)]
    ↓
[Web Server (Port 8000, internal only)]
    ↓
[Database (Port 5432, internal only)]
[Redis (Port 6379, internal only)]
```

---

# 8. SECURITY TESTING

## Static Analysis

```bash
# Python security linting
pip install bandit
bandit -r apps/

# Output: Security issues by severity
```

## Dynamic Analysis

```bash
# OWASP ZAP (API scan)
docker run -t owasp/zap2docker-stable zap-api-scan.py \
    -t http://api.example.com/openapi.json \
    -f openapi
```

## Penetration Testing Checklist

- [ ] SQL Injection on all input fields
- [ ] XSS on all output fields
- [ ] CSRF on state-changing actions
- [ ] IDOR on resource access
- [ ] Authentication bypass attempts
- [ ] Rate limit bypass attempts
- [ ] File upload vulnerabilities
- [ ] SSRF on URL inputs

---

# 🎓 SECURITY EXERCISES

## Exercise 1: Fix the Vulnerability

```python
# This endpoint is vulnerable. Find and fix it.
@api_view(['GET'])
def get_user_data(request):
    user_id = request.query_params.get('id')
    query = f"SELECT * FROM users WHERE id = {user_id}"
    with connection.cursor() as cursor:
        cursor.execute(query)
        return Response(cursor.fetchone())
```

## Exercise 2: Implement Rate Limiting

Add rate limiting that:

- 5 login attempts per minute per IP
- 10 API calls per minute per user
- Exponential backoff on failures

## Exercise 3: Security Audit

Perform a security audit of the DSA submission system:

1. Identify attack vectors
2. Rate risks (1-5)
3. Propose mitigations

---

_God Mode v12.0 - Security Engineering Mastery_
_Last Updated: 2026-01-06_
