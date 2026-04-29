# Next Level Backend Enhancements - Learning Guide

## 🎯 Overview

This document covers the advanced enhancements made to the Learning Hub backend, including enterprise-grade security middleware, robust input validation, API versioning, and sophisticated error tracking.

---

## 1. Security Middleware Architecture 🔐

### Location: `apps/core/security_middleware.py`

### 1.1 SecurityHeadersMiddleware

**What it does:**
Adds essential security headers to ALL HTTP responses.

**Headers Added:**
| Header | Purpose | Value |
|--------|---------|-------|
| Content-Security-Policy | Prevents XSS attacks | Restricts script/style sources |
| X-Content-Type-Options | Prevents MIME sniffing | nosniff |
| X-Frame-Options | Prevents clickjacking | SAMEORIGIN |
| X-XSS-Protection | Legacy XSS filter | 1; mode=block |
| Referrer-Policy | Controls referrer info | strict-origin-when-cross-origin |
| Permissions-Policy | Browser feature control | Restricts camera, mic, etc. |
| Strict-Transport-Security | Enforces HTTPS | max-age=31536000 |

**Why it matters:**
Without these headers, browsers allow dangerous behaviors like:

- Loading scripts from malicious sources
- Clickjacking attacks via iframes
- Leaking sensitive referrer data

**Usage:**

```python
# settings.py
MIDDLEWARE = [
    'apps.core.security_middleware.SecurityHeadersMiddleware',
    # ... other middleware
]
```

---

### 1.2 SQLInjectionDetectionMiddleware

**What it does:**
Detects and blocks SQL injection attempts in:

- Query parameters (?id=1; DROP TABLE--)
- POST request bodies
- Form data

**Detection Patterns:**

- SQL keywords (SELECT, DROP, UNION)
- Comment sequences (--, /\* \*/)
- Boolean injection (OR 1=1)
- Time-based injection (WAITFOR DELAY)

**Response:**

- Returns 403 Forbidden
- Logs to CRITICAL level
- Records in AuditLog

**Mental Model:**
Think of it as a bouncer at a nightclub checking for weapons before entry.

---

### 1.3 IPAnomalyDetectionMiddleware

**What it does:**

- Tracks request rates per IP
- Detects brute force attacks
- Auto-blocks abusive IPs temporarily

**Thresholds:**
| Metric | Limit | Block Duration |
|--------|-------|----------------|
| Requests/minute | 120 | 30 minutes |
| Failed logins/hour | 10 | 30 minutes |

**How it works:**

```
Request → Check if IP blocked → Track rate → Process or Block
              ↓
         [Blocked?] → Return 429
              ↓
         [Rate OK?] → Continue
              ↓
         [Rate Exceeded?] → Block IP
```

---

### 1.4 JWTBlacklistMiddleware

**Problem it solves:**
JWT tokens are stateless - so how do you logout?

**Solution:**
Maintain a blacklist of revoked tokens in cache.

**How to use:**

```python
# When user logs out:
from apps.core.security_middleware import JWTBlacklistMiddleware

JWTBlacklistMiddleware.blacklist_token(
    token=request.auth,  # The JWT token
    expires_in_seconds=3600  # Match token expiry
)
```

---

## 2. Input Validation System 🛡️

### Location: `apps/core/validators.py`

### 2.1 SecurityValidator Class

**Comprehensive validation for:**

- Text inputs (SQL/XSS detection)
- File paths (traversal prevention)
- URLs (SSRF prevention)
- Filenames (malicious extension blocking)

**Example Usage:**

```python
from apps.core.validators import SecurityValidator, ThreatType

validator = SecurityValidator()

# Validate user input
result = validator.validate_text(user_input)
if not result.is_safe:
    print(f"Threat detected: {result.threat_type}")
    # Handle accordingly
```

### 2.2 DRF Field Validators

**Safe Field Types:**

```python
from apps.core.validators import SafeCharField, SafeTextField, SafeURLField

class UserProfileSerializer(serializers.Serializer):
    name = SafeCharField(max_length=100)  # Auto-validates for XSS/SQL
    bio = SafeTextField()  # Safe for long text
    website = SafeURLField()  # Validates SSRF-safe URLs
```

### 2.3 SSRF Prevention

**What is SSRF?**
Server-Side Request Forgery - attacker tricks server into making requests to internal resources.

**Example Attack:**

```
User submits URL: http://169.254.169.254/latest/meta-data/
Server fetches it → Exposes AWS credentials!
```

**Our Protection:**

```python
def validate_url(url):
    # Blocks:
    # - localhost, 127.0.0.1
    # - Private IPs (10.x, 172.16-31.x, 192.168.x)
    # - AWS metadata (169.254.x)
    # - Non-HTTP schemes (file://, ftp://)
```

---

## 3. API Versioning 📦

### Location: `apps/core/api_versioning.py`

### 3.1 Why Version APIs?

- **Backward Compatibility**: Old clients still work
- **Controlled Migration**: Gradual adoption of new versions
- **Deprecation Path**: Clear timeline for sunsetting

### 3.2 Supported Versioning Methods

| Method        | Example                               | Priority    |
| ------------- | ------------------------------------- | ----------- |
| URL Path      | /api/v1/users                         | 1 (highest) |
| Accept Header | Accept: application/json; version=1.0 | 2           |
| Query Param   | ?api_version=1.0                      | 3 (lowest)  |

### 3.3 Using Version Decorators

```python
from apps.core.api_versioning import version_range, deprecated

# Limit endpoint to specific versions
@version_range(min_version="1.0", max_version="2.0")
def get_user(request):
    ...

# Mark as deprecated
@deprecated(since_version="1.0", message="Use /api/v2/users instead")
def legacy_get_user(request):
    ...
```

### 3.4 VersionedAPIView

```python
from apps.core.api_versioning import VersionedAPIView, APIVersion

class UserView(VersionedAPIView):
    min_version = '1.0'

    def get(self, request):
        if request.api_version >= APIVersion(2, 0):
            return self.get_v2(request)  # New response format
        return self.get_v1(request)  # Old response format
```

---

## 4. Error Tracking System 📊

### Location: `apps/core/error_tracking.py`

### 4.1 StructuredError Class

**Consistent error representation:**

```python
from apps.core.error_tracking import StructuredError, ErrorCategory, ErrorSeverity

error = StructuredError(
    message="Database timeout",
    code="DB_TIMEOUT",
    category=ErrorCategory.DATABASE,
    severity=ErrorSeverity.ERROR,
    exception=e,
    user_id=str(request.user.id)
)
error.log()  # Automatically logs with correct level
```

### 4.2 Retry Decorator

**Use for flaky external APIs:**

```python
from apps.core.error_tracking import retry_on_failure, RetryConfig

@retry_on_failure(RetryConfig(
    max_retries=3,
    base_delay=1.0,
    exponential_backoff=True
))
def call_external_api():
    response = requests.get("https://api.example.com")
    response.raise_for_status()
    return response.json()
```

**Retry Timeline:**

```
Attempt 1 → Fail → wait 1s
Attempt 2 → Fail → wait 2s
Attempt 3 → Fail → wait 4s
Attempt 4 → Fail → Raise Exception
```

### 4.3 Circuit Breaker Pattern

**Problem:**
External service is down. Every request waits for timeout → Slow app.

**Solution:**
After N failures, stop trying temporarily.

```
State: CLOSED (normal)
    ↓ (5 failures)
State: OPEN (fast-fail for 60s)
    ↓ (after 60s)
State: HALF_OPEN (try 1 request)
    ↓ (success)
State: CLOSED (normal again)
```

**Usage:**

```python
from apps.core.error_tracking import CircuitBreaker

payment_breaker = CircuitBreaker('payment_api', threshold=5, recovery_time=60)

@payment_breaker
def process_payment():
    return stripe_api.charge(...)

# When circuit is OPEN:
# raises CircuitBreakerOpenError immediately (no waiting for timeout)
```

---

## 5. Enhanced Gamification 🎮

### Location: `apps/gamification/services.py`

### 5.1 XP Multiplier Events

**Host Double XP Weekends:**

```python
from apps.gamification.services import GamificationService

# Start double XP for 48 hours
GamificationService.set_xp_multiplier(
    multiplier=2.0,
    duration_hours=48,
    event_name="Weekend Double XP"
)

# All XP awards are now doubled automatically
GamificationService.award_xp(user, 100, "Lesson Complete")
# User receives 200 XP
```

### 5.2 Guild Competitions

**Get guild leaderboard:**

```python
guilds = GamificationService.get_guild_leaderboard(limit=10)
# Returns: [
#   {'rank': 1, 'name': 'Code Warriors', 'total_xp': 50000, ...},
#   {'rank': 2, 'name': 'Algorithm Aces', 'total_xp': 45000, ...},
# ]
```

### 5.3 Achievement System

**Automatic achievement checking:**

```python
# After course completion, check for new badges
achievements = GamificationService.check_achievements(user)
# Returns: ['First Course Complete', 'Problem Solver']
```

**Achievement Tiers:**
| Category | Milestones |
|----------|------------|
| Courses | 1, 5, 10, 25 completed |
| DSA Problems | 1, 10, 50, 100 solved |
| Streaks | 3, 7, 14, 30, 60, 100, 365 days |
| Levels | 5, 10, 25, 50, 100 |

---

## 6. Best Practices Checklist ✅

### Security

- [ ] Add SecurityHeadersMiddleware to production
- [ ] Enable SQLInjectionDetectionMiddleware
- [ ] Configure IP blocking thresholds
- [ ] Implement token blacklisting on logout

### Validation

- [ ] Use SafeFields in serializers
- [ ] Validate URLs for SSRF
- [ ] Check file extensions before upload
- [ ] Sanitize HTML in user content

### Error Tracking

- [ ] Use StructuredError for all errors
- [ ] Wrap external API calls with retry
- [ ] Implement circuit breakers for critical services
- [ ] Configure enhanced exception handler

### API Design

- [ ] Version all API endpoints
- [ ] Add deprecation notices early
- [ ] Document version changes
- [ ] Support multiple version formats

---

## 7. Mental Models 🧠

### Defense in Depth

Think of security like castle defense:

1. **Moat** = Rate limiting
2. **Walls** = Input validation
3. **Guards** = Authentication
4. **Locks** = Authorization
5. **Alarms** = Error tracking

### Fail Fast, Fail Safe

- Circuit breaker: Fail fast (don't wait)
- Validation: Fail early (before processing)
- Error tracking: Fail visible (log everything)

### The Swiss Cheese Model

Multiple overlapping layers catch what individual layers miss:

```
Request → [Rate Limit] → [SQL Check] → [XSS Check] → [Auth] → Process
                ↓            ↓            ↓          ↓
              Block        Block        Sanitize   Deny
```

---

_Document Version: 1.0_
_Last Updated: 2026-02-02_
