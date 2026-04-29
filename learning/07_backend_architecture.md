# Backend Architecture - Learning Hub

## Overview

The Learning Hub backend is built with Django REST Framework (DRF) following enterprise-grade patterns for scalability, security, and maintainability.

---

## Architecture Patterns

### 1. Service Layer Pattern

Business logic is encapsulated in **Service Classes** rather than in views.

```python
# apps/gamification/services.py
class GamificationService:
    @staticmethod
    def award_xp(user, amount, reason="Activity"):
        """Central XP management with level-up logic."""
        xp, _ = UserXP.objects.get_or_create(user=user)
        xp.total_xp = F('total_xp') + amount
        xp.save()
        # ... level up broadcast logic
```

**Why?**

- **Testability**: Services can be unit tested independently
- **Reusability**: Multiple views can use the same service
- **Single Responsibility**: Views handle HTTP, services handle logic

---

### 2. Repository Pattern (DSA App)

Data access is abstracted through repositories.

```python
# apps/dsa/repositories.py
class ProblemRepository:
    @staticmethod
    def get_list_queryset(difficulty=None, tag_slug=None, search=None):
        qs = Problem.objects.filter(is_active=True)
        if difficulty:
            qs = qs.filter(difficulty=difficulty)
        return qs
```

**Benefits:**

- Database queries are centralized
- Easy to swap data sources (e.g., add caching layer)
- Query optimization in one place

---

## Security Implementation

### Authentication Flow

```
User → POST /auth/login/
     → UserLoginSerializer.validate()
     → UserService.generate_tokens()
     → JWT Access + Refresh Tokens
     → Frontend stores securely
```

### Rate Limiting

```python
# apps/core/throttles.py
class LoginRateThrottle(UserRateThrottle):
    rate = '5/min'

class RegistrationRateThrottle(AnonRateThrottle):
    rate = '3/hour'

class AIChatRateThrottle(UserRateThrottle):
    rate = '60/min'
```

### Permission Classes

- `IsAuthenticated`: Standard auth check
- `IsEnrolledInCourse`: Custom permission for course content
- `AllowAny`: Public endpoints (course list, categories)

---

## Caching Strategy

### Redis Caching Patterns

```python
# Leaderboard caching (5 minutes)
cache_key = f"gamification_leaderboard_{period}_{limit}"
cached = cache.get(cache_key)
if cached:
    return cached

# Compute fresh data
data = compute_leaderboard()
cache.set(cache_key, data, 300)  # 5 min TTL
```

### View-Level Caching

```python
@method_decorator(cache_page(60 * 15))  # 15 minutes
def list(self, request, *args, **kwargs):
    return super().list(request, *args, **kwargs)
```

---

## Real-Time Features (WebSockets)

### Django Channels Integration

```python
# Broadcast level-up event
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

channel_layer = get_channel_layer()
async_to_sync(channel_layer.group_send)(
    "global_activity_feed",
    {
        "type": "feed_event",
        "event_type": "level_up",
        "data": {"user_id": user.id, "new_level": level}
    }
)
```

---

## AI Integration

### AIClient Pattern

```python
# apps/ai_engine/ai_client.py
class AIClient:
    @classmethod
    def generate_response(cls, prompt, **kwargs):
        """Central AI interaction point with retry logic."""
        for attempt in range(3):
            try:
                response = model.generate_content(prompt)
                return response.text
            except Exception:
                time.sleep(2 ** attempt)  # Exponential backoff
        return cls._fallback_response()
```

### Personalization Pipeline

```
User Activity → AnalyticsService.track_activity()
             → GamificationService.check_streaks()
             → LearningInsight.update()
             → RemediationService.generate_plan(student_level=dynamic)
```

---

## Database Optimization

### N+1 Prevention

```python
# Bad: N+1 queries
for enrollment in Enrollment.objects.all():
    print(enrollment.course.title)  # Query per iteration!

# Good: Select related
Enrollment.objects.select_related('course', 'user')
```

### Indexed Fields

```python
class ActivityLog(BaseModel):
    class Meta:
        indexes = [
            models.Index(fields=['user', 'action', 'created_at']),
            models.Index(fields=['session_id']),
        ]
```

---

## Error Handling Best Practices

### Service-Level Exception Handling

```python
try:
    result = SomeService.do_action()
except SpecificError as e:
    logger.error(f"Action failed: {e}")
    return Response({"error": str(e)}, status=400)
except Exception as e:
    logger.exception("Unexpected error")
    return Response({"error": "Internal error"}, status=500)
```

### Graceful Degradation

```python
# If WebSocket unavailable, continue without real-time
try:
    channel_layer.group_send(...)
except Exception:
    pass  # Log but don't fail the main operation
```

---

## Testing Strategy

### Unit Tests

```python
class TestGamificationService(TestCase):
    def test_award_xp_increases_total(self):
        user = User.objects.create(username='test')
        GamificationService.award_xp(user, 100)
        xp = UserXP.objects.get(user=user)
        self.assertEqual(xp.total_xp, 100)
```

### Integration Tests

```python
class TestCourseEnrollment(APITestCase):
    def test_enroll_creates_enrollment(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(f'/api/v1/courses/{self.course.slug}/enroll/')
        self.assertEqual(response.status_code, 201)
```

---

## Celery Task Patterns

### Async Processing

```python
# apps/dsa/tasks.py
@shared_task
def evaluate_submission_task(submission_id):
    """Evaluate code submission in background."""
    submission = Submission.objects.get(id=submission_id)
    result = CodeExecutor.run(submission.code, submission.problem.test_cases)
    submission.result = result
    submission.save()
```

---

## API Response Standards

### Consistent Response Format

```python
{
    "status": "success" | "error",
    "message": "Human readable message",
    "data": { ... }  # Actual payload
}
```

### Error Response

```python
{
    "status": "error",
    "message": "Validation failed",
    "errors": {
        "email": ["This field is required"]
    }
}
```

---

## Common Bug Patterns to Avoid

1. **Missing Imports**: Always verify imports at module level
2. **N+1 Queries**: Use `select_related()` and `prefetch_related()`
3. **Timezone Issues**: Always use `django.utils.timezone.now()`
4. **Mutable Default Args**: Don't use `def func(arr=[])`, use `arr=None`
5. **Missing Error Handling**: Wrap external API calls in try/except

---

## Key Files Reference

| Purpose            | File Path                        |
| ------------------ | -------------------------------- |
| User Auth          | `apps/users/views.py`            |
| Course Management  | `apps/courses/views.py`          |
| AI Engine          | `apps/ai_engine/views.py`        |
| Gamification       | `apps/gamification/services.py`  |
| Notifications      | `apps/notifications/services.py` |
| Payment Processing | `apps/payments/views.py`         |
| Live Sessions      | `apps/live_sessions/views.py`    |
| DSA Practice       | `apps/dsa/views.py`              |

---

_This documentation is auto-generated and maintained as part of the Learning Hub project._
