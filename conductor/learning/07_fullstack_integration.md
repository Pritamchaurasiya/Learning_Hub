# 🎓 Module 7: Full-Stack Integration Mastery

## 7.1 API Contract & Response Parsing

### Concept: The API Contract

- **What**: A formal agreement between Backend and Frontend on data structure.
- **Why**: Prevents runtime errors from mismatched field names.
- **Risk**: `TypeError: Cannot read property 'x' of undefined` - The #1 killer of apps.

### Real-World Example

```dart
// ❌ BAD: Assuming structure without checking
final user = data['user']; // Crashes if 'user' is nested inside 'data'

// ✅ GOOD: Defensive parsing
final responseData = data['data'] as Map<String, dynamic>?;
if (responseData == null) throw ServerException('Invalid response');
final user = User.fromJson(responseData['user']);
```

### Backend Response Standard (Learning Hub)

```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "user": { "id": "...", "email": "..." },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

---

## 7.2 JWT Authentication Flow

### The Dance of Tokens

1. **User Login** → Backend returns `accessToken` (short-lived) + `refreshToken` (long-lived)
2. **API Calls** → Frontend sends `Authorization: Bearer <accessToken>`
3. **Token Expired** → Frontend uses `refreshToken` to get new `accessToken`
4. **Refresh Expired** → Force logout, re-login required

### Security Hardening

- **Rotate Refresh Tokens**: Backend issues new refresh token on each use
- **Blacklist Used Tokens**: Prevent replay attacks
- **Store Securely**: `SharedPreferences` (mobile) or `HttpOnly Cookies` (web)

---

## 7.3 Event-Driven Architecture (Signals)

### Concept: Decoupling with Signals

- **What**: Side effects (XP, Notifications) react to core domain events without tight coupling.
- **Why**: Add/remove features without breaking core logic.

### Django Implementation

```python
# core/signals.py
from django.dispatch import Signal
user_enrolled = Signal()  # Args: user, course, enrollment

# apps/courses/services.py
from core.signals import user_enrolled

def enroll_user(user, course):
    enrollment = Enrollment.objects.create(user=user, course=course)
    user_enrolled.send(sender=self.__class__, user=user, course=course)
    return enrollment

# apps/gamification/receivers.py
from django.dispatch import receiver
from core.signals import user_enrolled

@receiver(user_enrolled)
def award_enrollment_xp(sender, user, course, **kwargs):
    _award_xp(user, 50)  # Side effect: completely decoupled
```

---

## 7.4 N+1 Query Problem

### The Performance Killer

```python
# ❌ BAD: N+1 Queries (1 query for categories, N queries for each subcategory)
categories = Category.objects.all()
for cat in categories:
    print(cat.subcategories.all())  # New query for each!

# ✅ GOOD: Prefetch in one query
categories = Category.objects.prefetch_related('subcategories').all()
```

---

_Updated: 2026-01-06 (God Mode v7.0)_
