# Security Architecture - Learning Hub

## Overview

This document outlines the comprehensive security measures implemented in
the Learning Hub backend to protect against common vulnerabilities and attacks.

---

## 1. Authentication & Authorization

### JWT Token Security

```python
# settings.py
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),  # Short-lived
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,  # New refresh on use
    'BLACKLIST_AFTER_ROTATION': True,  # Old token invalidated
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,  # Use separate key in prod
}
```

**Best Practices:**

- ✅ Short access token lifetime (15 min)
- ✅ Refresh token rotation
- ✅ Token blacklisting on logout
- ✅ Secure HttpOnly cookies (optional)

### Permission Classes

| Class                | Purpose                     |
| -------------------- | --------------------------- |
| `IsAuthenticated`    | Require valid JWT           |
| `IsAdminUser`        | Admin-only endpoints        |
| `AllowAny`           | Public endpoints            |
| `IsEnrolledInCourse` | Custom: enrolled users only |

---

## 2. Rate Limiting (DoS Prevention)

### Throttle Implementation

```python
# apps/core/throttles.py
class LoginRateThrottle(AnonRateThrottle):
    scope = 'login'  # 5/min - Brute force protection

class PaymentThrottle(UserRateThrottle):
    scope = 'payment'  # 10/hour - Fraud prevention

class AIGenerationThrottle(UserRateThrottle):
    scope = 'ai_generation'  # 20/hour - Resource protection
```

### Settings Configuration

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_RATES': {
        'login': '5/min',
        'register': '3/hour',
        'password_reset': '3/hour',
        'ai_chat': '60/min',
        'ai_generation': '20/hour',
        'payment': '10/hour',
        'dsa_submission': '30/hour',
        'file_upload': '20/hour',
    }
}
```

---

## 3. Input Validation & Sanitization

### DRF Serializers

```python
class UserRegistrationSerializer(serializers.Serializer):
    email = serializers.EmailField(
        validators=[UniqueValidator(queryset=User.objects.all())]
    )
    password = serializers.CharField(
        min_length=8,
        write_only=True,
        validators=[password_validation.validate_password]
    )
```

### SQL Injection Prevention

```python
# ✅ SAFE: Parameterized queries (ORM)
User.objects.filter(email=user_input)

# ❌ DANGER: Raw SQL with user input
cursor.execute(f"SELECT * FROM users WHERE email = '{user_input}'")
```

### XSS Prevention

- Django templates auto-escape by default
- DRF serializers encode output
- Use `bleach` for user-generated HTML content

---

## 4. Intrusion Detection System (IDS)

### Threat Detection Patterns

```python
# apps/security/intrusion_detection.py
class IntrusionDetectionService:
    SQL_INJECTION_PATTERNS = [
        r"UNION SELECT", r"DROP TABLE", r"OR 1=1",
        r"INSERT INTO", r"DELETE FROM"
    ]

    XSS_PATTERNS = [
        r"<script>", r"javascript:", r"onload=", r"onerror="
    ]
```

### Threat Levels

| Level    | Score | Action                        |
| -------- | ----- | ----------------------------- |
| LOW      | 0-20  | Log only                      |
| MEDIUM   | 21-50 | Alert                         |
| HIGH     | 51-80 | Block + Alert                 |
| CRITICAL | 81+   | Block + Alert + Security Team |

---

## 5. Payment Security

### Razorpay Integration

```python
# Signature Verification
def verify_payment(self, order_id, payment_id, signature):
    self.client.utility.verify_payment_signature({
        'razorpay_order_id': order_id,
        'razorpay_payment_id': payment_id,
        'razorpay_signature': signature
    })
```

### Security Measures

- ✅ Server-side signature verification
- ✅ Idempotency checks (duplicate payment prevention)
- ✅ User ownership validation
- ✅ Amount verification
- ✅ Rate limiting on payment endpoints

---

## 6. Data Protection

### Encryption

```python
# Password Hashing (Django default: PBKDF2)
from django.contrib.auth.hashers import make_password
hashed = make_password(plain_password)

# For sensitive data, use Fernet
from cryptography.fernet import Fernet
cipher = Fernet(settings.ENCRYPTION_KEY)
encrypted = cipher.encrypt(data.encode())
```

### Database Security

```python
# PostgreSQL with SSL
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'OPTIONS': {
            'sslmode': 'require',
        }
    }
}
```

---

## 7. CORS & Headers

### Security Headers Configuration

```python
# settings.py
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True

# CORS
CORS_ALLOWED_ORIGINS = [
    "https://learninghub.com",
    "https://app.learninghub.com",
]
CORS_ALLOW_CREDENTIALS = True
```

---

## 8. File Upload Security

### Validation Rules

```python
def validate_avatar(file):
    # 1. Size check
    if file.size > 5 * 1024 * 1024:  # 5MB
        raise ValidationError("File too large")

    # 2. Extension check
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in ['.jpg', '.jpeg', '.png', '.webp']:
        raise ValidationError("Invalid file type")

    # 3. Magic bytes check (actual content)
    magic = file.read(4)
    file.seek(0)
    if magic[:2] != b'\xff\xd8':  # JPEG magic
        raise ValidationError("Invalid image content")
```

### Secure Storage

- ✅ S3 with private ACLs
- ✅ Signed URLs for access
- ✅ Content-Disposition headers

---

## 9. Logging & Monitoring

### Security Event Logging

```python
import logging
logger = logging.getLogger('security')

# Log security events
logger.warning(f"Failed login attempt for {email} from IP {ip}")
logger.critical(f"SQL Injection attempt detected: {payload}")
```

### Alerting

- Critical events → PagerDuty/Slack
- High events → Email to security team
- Medium events → Daily digest

---

## 10. Content Moderation (AI-Powered)

### Implementation

```python
# apps/core/content_moderation.py
class ContentModerationService:
    @staticmethod
    def moderate_content(content: str) -> ModerationResult:
        # 1. Profanity filter
        if contains_profanity(content):
            return ModerationResult(flagged=True, reason="profanity")

        # 2. AI toxicity check
        toxicity_score = AIClient.check_toxicity(content)
        if toxicity_score > 0.8:
            return ModerationResult(flagged=True, reason="toxic")

        return ModerationResult(flagged=False)
```

---

## 11. API Security Checklist

### Pre-Production Checklist

- [ ] All endpoints have rate limiting
- [ ] All inputs are validated via serializers
- [ ] All sensitive data is encrypted
- [ ] All passwords meet complexity requirements
- [ ] All payments are signature-verified
- [ ] All file uploads are content-validated
- [ ] All admin endpoints require IsAdminUser
- [ ] All secrets are in environment variables
- [ ] HTTPS is enforced
- [ ] CORS is properly configured
- [ ] Security headers are set
- [ ] Logging is enabled for security events

---

## 12. Common Attack Mitigations

| Attack            | Mitigation                          |
| ----------------- | ----------------------------------- |
| SQL Injection     | ORM parameterized queries           |
| XSS               | Auto-escaping, CSP headers          |
| CSRF              | CSRF tokens (Django default)        |
| Brute Force       | Rate limiting, account lockout      |
| Session Hijacking | Secure cookies, short tokens        |
| Man-in-the-Middle | HTTPS, HSTS                         |
| Clickjacking      | X-Frame-Options: DENY               |
| Data Exposure     | Field-level permissions, encryption |

---

## 13. Secret Management

### Environment Variables

```bash
# .env (NEVER commit to Git!)
SECRET_KEY=your-256-bit-secret-key
DATABASE_URL=postgres://user:pass@host:5432/db
RAZORPAY_KEY_ID=rzp_live_xxxx
RAZORPAY_KEY_SECRET=xxxx
STRIPE_SECRET_KEY=sk_live_xxxx
GEMINI_API_KEY=xxxx
```

### Loading Secrets

```python
import os
from dotenv import load_dotenv

load_dotenv()
SECRET_KEY = os.environ['SECRET_KEY']
```

---

## 14. Incident Response

### Steps

1. **Detect**: IDS alerts, log analysis
2. **Contain**: Block IP, disable account
3. **Analyze**: Review logs, identify scope
4. **Remediate**: Patch vulnerability
5. **Recover**: Restore from backup if needed
6. **Report**: Document incident, lessons learned

---

_This security documentation is maintained as part of the Learning Hub project security program._
