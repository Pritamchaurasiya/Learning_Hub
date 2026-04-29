# 🛡️ CYBERSECURITY COMPLETE GUIDE

## From Developer to Security Engineer

### Learning Hub - God Mode v10.0

---

# 📖 TABLE OF CONTENTS

1. [Security Mindset](#1-security-mindset)
2. [OWASP Top 10](#2-owasp-top-10)
3. [Authentication & Authorization](#3-authentication--authorization)
4. [Encryption & Hashing](#4-encryption--hashing)
5. [Network Security](#5-network-security)
6. [Secure Coding Practices](#6-secure-coding-practices)
7. [Penetration Testing Basics](#7-penetration-testing-basics)

---

# 1. SECURITY MINDSET

## Think Like an Attacker

Every feature you build is a potential attack surface. Ask yourself:

- What could go wrong if a user enters unexpected input?
- What happens if someone bypasses the UI and calls APIs directly?
- What data could leak if the database is compromised?

## Defense in Depth

Never rely on a single security measure. Layer your defenses:

```
[Firewall] → [WAF] → [Load Balancer] → [App Security] → [Database Encryption]
```

## Principle of Least Privilege

Give users/services only the permissions they absolutely need.

```python
# BAD: Admin access for all operations
user.role = 'admin'

# GOOD: Specific permissions
user.permissions = ['read:courses', 'write:own_reviews']
```

---

# 2. OWASP TOP 10 (2021)

The Open Web Application Security Project's list of most critical security risks.

## A01: Broken Access Control

**What**: Users can access resources they shouldn't.

**Attack Example**:

```
# User 123 changes URL to access User 456's data
GET /api/users/123/orders  → Own orders (allowed)
GET /api/users/456/orders  → Other user's orders (SHOULD BE BLOCKED!)
```

**Defense**:

```python
# Always verify ownership
def get_user_orders(request, user_id):
    if request.user.id != user_id:
        return HttpResponse(status=403)  # Forbidden
    return Order.objects.filter(user_id=user_id)
```

## A02: Cryptographic Failures

**What**: Sensitive data exposed due to weak or missing encryption.

**Common Mistakes**:

- Storing passwords in plain text
- Using MD5/SHA1 for password hashing
- Transmitting data over HTTP instead of HTTPS

**Defense**:

```python
# Password hashing with bcrypt
import bcrypt

def hash_password(password):
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode(), salt)

def verify_password(password, hashed):
    return bcrypt.checkpw(password.encode(), hashed)
```

## A03: Injection

**What**: Attacker injects malicious code through user input.

### SQL Injection

```python
# VULNERABLE: Raw SQL with user input
query = f"SELECT * FROM users WHERE username = '{username}'"

# Attack: username = "admin'--"
# Resulting query: SELECT * FROM users WHERE username = 'admin'--'
# The -- comments out the rest, bypassing authentication!

# SAFE: Parameterized queries
cursor.execute("SELECT * FROM users WHERE username = %s", [username])

# SAFE: Django ORM (automatically parameterized)
User.objects.filter(username=username)
```

### Command Injection

```python
# VULNERABLE
os.system(f"ping {user_input}")

# Attack: user_input = "8.8.8.8; rm -rf /"
# Executes: ping 8.8.8.8; rm -rf /

# SAFE: Use subprocess with shell=False
import subprocess
subprocess.run(["ping", user_input], shell=False)
```

## A04: Insecure Design

**What**: Flaws in architecture, not just code.

**Examples**:

- No rate limiting on login (brute force possible)
- Password reset sends link via SMS (can be intercepted)
- No captcha on registration (bot spam)

**Defense**:

- Threat modeling during design phase
- Security requirements before coding

## A05: Security Misconfiguration

**What**: Default/insecure settings in production.

**Common Issues**:

```python
# Django settings.py

# WRONG for production:
DEBUG = True
SECRET_KEY = 'hardcoded-secret-key'
ALLOWED_HOSTS = ['*']

# CORRECT:
DEBUG = False
SECRET_KEY = os.environ.get('SECRET_KEY')
ALLOWED_HOSTS = ['yourdomain.com']
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

## A06: Vulnerable Components

**What**: Using libraries with known security flaws.

**Defense**:

```bash
# Python: Check for vulnerabilities
pip install safety
safety check

# npm (JavaScript)
npm audit

# Stay updated
pip list --outdated
pip install --upgrade package-name
```

## A07: Identification & Authentication Failures

**What**: Weak authentication mechanisms.

**Common Issues**:

- Weak password requirements
- No multi-factor authentication
- Session tokens in URL
- No account lockout after failed attempts

**Defense**:

```python
# Rate limiting login attempts
from django_ratelimit.decorators import ratelimit

@ratelimit(key='ip', rate='5/m', block=True)
def login_view(request):
    # Only 5 login attempts per minute per IP
    pass
```

## A08: Software & Data Integrity Failures

**What**: Code or data modified without verification.

**Examples**:

- Auto-updating from untrusted sources
- Deserializing untrusted data

**Defense**:

```python
# Never deserialize untrusted data with pickle
# VULNERABLE:
import pickle
data = pickle.loads(untrusted_input)  # Can execute code!

# SAFE: Use JSON for untrusted data
import json
data = json.loads(untrusted_input)
```

## A09: Security Logging & Monitoring Failures

**What**: Unable to detect breaches due to missing logs.

**What to Log**:

- Login attempts (success/failure)
- Password changes
- Permission changes
- Sensitive data access
- API rate limit hits

```python
import logging

security_logger = logging.getLogger('security')

def login(username, password):
    if authenticate(username, password):
        security_logger.info(f"Successful login: {username}")
    else:
        security_logger.warning(f"Failed login attempt: {username}")
```

## A10: Server-Side Request Forgery (SSRF)

**What**: Attacker makes server send requests to unintended locations.

```python
# VULNERABLE: User controls URL
def fetch_url(request):
    url = request.GET['url']
    response = requests.get(url)  # Could be internal URLs!
    return HttpResponse(response.text)

# Attack: url = http://169.254.169.254/latest/meta-data/
# On AWS, this exposes instance metadata including credentials!

# DEFENSE: Allowlist valid URLs
ALLOWED_HOSTS = ['api.example.com', 'cdn.example.com']

def fetch_url(request):
    url = request.GET['url']
    if not any(url.startswith(f'https://{h}') for h in ALLOWED_HOSTS):
        return HttpResponse(status=400)
    response = requests.get(url)
    return HttpResponse(response.text)
```

---

# 3. AUTHENTICATION & AUTHORIZATION

## Authentication vs Authorization

- **Authentication (AuthN)**: "Who are you?" (Identity)
- **Authorization (AuthZ)**: "What can you do?" (Permissions)

## JWT (JSON Web Tokens)

### Structure

```
header.payload.signature

eyJhbGciOiJIUzI1NiJ9.          # Header (algorithm)
eyJ1c2VyX2lkIjoxMjM0NX0.       # Payload (claims)
SflKxwRJSMeKKF2QT4fwpMeJf36    # Signature
```

### How It Works

```
1. User logs in with credentials
2. Server validates, creates JWT, sends to client
3. Client stores JWT (localStorage/httpOnly cookie)
4. Client sends JWT with every request (Authorization header)
5. Server validates signature, extracts user info
```

### Implementation

```python
# Creating JWT (server-side)
import jwt
from datetime import datetime, timedelta

def create_token(user_id):
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(hours=1),  # Expires in 1 hour
        'iat': datetime.utcnow(),  # Issued at
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

# Validating JWT
def verify_token(token):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        return None  # Token expired
    except jwt.InvalidTokenError:
        return None  # Invalid token
```

### Security Best Practices

```python
# Short-lived access tokens
ACCESS_TOKEN_LIFETIME = timedelta(minutes=15)

# Long-lived refresh tokens (stored securely)
REFRESH_TOKEN_LIFETIME = timedelta(days=7)

# Rotate refresh tokens on use
ROTATE_REFRESH_TOKENS = True

# Store in httpOnly cookie (prevents XSS access)
response.set_cookie(
    'access_token',
    token,
    httponly=True,
    secure=True,  # HTTPS only
    samesite='Strict'
)
```

## OAuth 2.0

### Flow for "Login with Google"

```
1. User clicks "Login with Google"
2. App redirects to Google's OAuth page
3. User authenticates with Google
4. Google redirects back with authorization code
5. App exchanges code for access token
6. App uses token to fetch user info from Google
```

---

# 4. ENCRYPTION & HASHING

## Hashing vs Encryption

| Hashing                        | Encryption                     |
| ------------------------------ | ------------------------------ |
| One-way (irreversible)         | Two-way (reversible)           |
| Same input = same output       | Same input + key = same output |
| Used for: passwords, integrity | Used for: sensitive data       |

## Password Hashing

```python
# NEVER store passwords in plain text!
# NEVER use MD5 or SHA1/SHA256 alone!

# Good algorithms (with salt, slow):
# - bcrypt (recommended)
# - Argon2 (newest, memory-hard)
# - PBKDF2 (Django default)

import bcrypt

# Hash password
password = "user_password123"
salt = bcrypt.gensalt(rounds=12)  # Higher rounds = slower = more secure
hashed = bcrypt.hashpw(password.encode(), salt)

# Verify password
def check_password(password, hashed):
    return bcrypt.checkpw(password.encode(), hashed)
```

## Symmetric Encryption (AES)

Same key for encryption and decryption.

```python
from cryptography.fernet import Fernet

# Generate key (store securely!)
key = Fernet.generate_key()
cipher = Fernet(key)

# Encrypt
message = "Sensitive data"
encrypted = cipher.encrypt(message.encode())

# Decrypt
decrypted = cipher.decrypt(encrypted).decode()
```

## Asymmetric Encryption (RSA)

Different keys for encryption (public) and decryption (private).

```python
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa, padding

# Generate key pair
private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
public_key = private_key.public_key()

# Encrypt with public key (anyone can encrypt)
message = b"Secret message"
encrypted = public_key.encrypt(
    message,
    padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None)
)

# Decrypt with private key (only owner can decrypt)
decrypted = private_key.decrypt(
    encrypted,
    padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None)
)
```

---

# 5. NETWORK SECURITY

## HTTPS/TLS

**What**: Encrypts all data between client and server.

**How it works (simplified)**:

```
1. Client connects to server
2. Server sends its SSL certificate (contains public key)
3. Client verifies certificate with CA
4. Client generates session key, encrypts with server's public key
5. Server decrypts with private key
6. Both use session key for encrypted communication
```

## Firewall Rules

```bash
# Block all incoming traffic by default
iptables -P INPUT DROP

# Allow SSH only from specific IP
iptables -A INPUT -s 203.0.113.0 -p tcp --dport 22 -j ACCEPT

# Allow HTTP/HTTPS from anywhere
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Allow established connections
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
```

## CORS (Cross-Origin Resource Sharing)

Controls which domains can access your API.

```python
# Django settings.py
CORS_ALLOWED_ORIGINS = [
    "https://yourdomain.com",
    "https://app.yourdomain.com",
]

# Don't do this in production!
CORS_ALLOW_ALL_ORIGINS = False
```

---

# 6. SECURE CODING PRACTICES

## Input Validation

```python
import re
from typing import Optional

def validate_email(email: str) -> Optional[str]:
    """Validate and sanitize email input."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if re.match(pattern, email):
        return email.lower().strip()
    return None

def validate_username(username: str) -> Optional[str]:
    """Only allow alphanumeric and underscore."""
    if re.match(r'^[a-zA-Z0-9_]{3,20}$', username):
        return username
    return None
```

## Output Encoding

```python
# Prevent XSS when rendering user content
import html

user_input = '<script>alert("XSS")</script>'
safe_output = html.escape(user_input)
# Result: &lt;script&gt;alert("XSS")&lt;/script&gt;
```

## Error Handling

```python
# DON'T expose internal errors to users
def api_view(request):
    try:
        result = process_request(request)
        return JsonResponse(result)
    except Exception as e:
        # Log full error for debugging
        logger.error(f"Error processing request: {e}", exc_info=True)

        # Return generic message to user
        return JsonResponse(
            {'error': 'An error occurred. Please try again.'},
            status=500
        )
```

---

# 7. PENETRATION TESTING BASICS

## Reconnaissance

```bash
# Find subdomains
nslookup example.com
dig example.com

# Port scanning
nmap -sV example.com

# Web technology detection
whatweb example.com
```

## Common Vulnerability Testing

### SQL Injection Test

```
# In login form username field:
admin'--
' OR '1'='1
```

### XSS Test

```html
<script>
  alert("XSS");
</script>
<img src=x onerror=alert('XSS')>
```

### Directory Traversal

```
GET /api/files?path=../../../etc/passwd
```

## Security Tools

| Tool           | Purpose                              |
| -------------- | ------------------------------------ |
| **Burp Suite** | Web proxy, intercept/modify requests |
| **OWASP ZAP**  | Automated security scanner           |
| **Nmap**       | Port scanning                        |
| **SQLMap**     | Automated SQL injection              |
| **Wireshark**  | Network traffic analysis             |

---

# 🔐 SECURITY CHECKLIST

## Before Deployment

- [ ] DEBUG = False
- [ ] SECRET_KEY from environment
- [ ] HTTPS enabled
- [ ] CORS configured properly
- [ ] Rate limiting on authentication endpoints
- [ ] Input validation on all endpoints
- [ ] Passwords hashed with bcrypt/Argon2
- [ ] SQL injection prevention (ORM/parameterized queries)
- [ ] XSS prevention (output encoding)
- [ ] CSRF tokens enabled
- [ ] Security headers set (CSP, X-Frame-Options, etc.)
- [ ] Dependency vulnerabilities checked
- [ ] Logging configured
- [ ] Backup strategy in place

---

_Generated by God Mode v10.0 - Infinite Learning Engine_
_Learning Hub Cybersecurity Track_
