# 🏗️ Backend Engineering Deep Dive - Learning Hub

## God Mode v12.0 - From Zero to Production Engineer

---

# 📖 TABLE OF CONTENTS

1. [Django Architecture](#1-django-architecture)
2. [Database Design & Optimization](#2-database-design--optimization)
3. [REST API Design](#3-rest-api-design)
4. [Authentication & Security](#4-authentication--security)
5. [Asynchronous Processing](#5-asynchronous-processing)
6. [Testing Strategies](#6-testing-strategies)
7. [Performance Optimization](#7-performance-optimization)
8. [Deployment & DevOps](#8-deployment--devops)

---

# 1. DJANGO ARCHITECTURE

## What is Django?

Django is a **high-level Python web framework** that follows the **MTV** (Model-Template-View) pattern - similar to MVC but Django-specific.

## Why Django for Backend?

| Feature       | Benefit                                         |
| ------------- | ----------------------------------------------- |
| **ORM**       | Database abstraction - write Python, not SQL    |
| **Admin**     | Auto-generated admin interface                  |
| **Security**  | Built-in protections (CSRF, XSS, SQL Injection) |
| **DRF**       | Django REST Framework for APIs                  |
| **Ecosystem** | Thousands of packages                           |

## Project Structure (Learning Hub)

```
conductor/                 # Root project directory
├── config/               # Settings & configuration
│   ├── settings/
│   │   ├── base.py      # Common settings
│   │   ├── development.py
│   │   └── production.py
│   ├── urls.py          # Root URL routing
│   ├── wsgi.py          # Production server entry
│   └── asgi.py          # Async server entry (WebSockets)
├── apps/                 # Django applications
│   ├── users/           # User authentication
│   ├── courses/         # Course management
│   ├── dsa/             # DSA problems & submissions
│   ├── gamification/    # XP & achievements
│   └── ai_engine/       # AI-powered features
├── tests/               # Centralized tests
├── requirements/        # Dependencies
└── manage.py           # Django CLI
```

## Mental Model

> "Django is like a factory assembly line. Each `app` is a station that handles one concern. They communicate through `models` (shared database) and `signals` (events)."

---

# 2. DATABASE DESIGN & OPTIMIZATION

## Django ORM Basics

```python
# models.py - Define your schema in Python
class Problem(models.Model):
    title = models.CharField(max_length=255)
    difficulty = models.CharField(choices=DIFFICULTY_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']  # Default order
        indexes = [
            models.Index(fields=['difficulty'])  # Speed up filtering
        ]
```

## The N+1 Query Problem

### What is N+1?

When you fetch N records, then make 1 additional query for each record = **N+1 queries**.

### Example of the Problem:

```python
# ❌ BAD: N+1 Query (1 + N database hits)
problems = Problem.objects.all()  # 1 query: SELECT * FROM problems
for problem in problems:
    print(problem.tags.all())    # N queries: SELECT * FROM tags WHERE problem_id = X
```

### The Fix:

```python
# ✅ GOOD: 2 queries total (prefetch_related)
problems = Problem.objects.prefetch_related('tags')
for problem in problems:
    print(problem.tags.all())    # 0 queries - already fetched!

# ✅ For ForeignKey (single object): use select_related
submissions = Submission.objects.select_related('user', 'problem')
for sub in submissions:
    print(sub.user.email)        # No extra query!
```

## When to Use Which?

| Method             | Use Case             | Relationship Type             |
| ------------------ | -------------------- | ----------------------------- |
| `select_related`   | Forward FK, OneToOne | `ForeignKey`, `OneToOneField` |
| `prefetch_related` | Reverse FK, M2M      | `ManyToManyField`, reverse FK |

## Database Indexing

```python
# Why: O(log n) vs O(n) for lookups
# When: Columns used in WHERE, ORDER BY, JOIN

class Problem(models.Model):
    title = models.CharField(max_length=255)
    difficulty = models.CharField(choices=CHOICES, db_index=True)  # Indexed!

    class Meta:
        indexes = [
            models.Index(fields=['difficulty', 'created_at']),  # Composite index
        ]
```

## Common Mistake

> "I added `db_index=True` to every field for speed!"

**Wrong!** Each index:

- Takes storage space
- Slows down INSERT/UPDATE operations
- Only helps if you actually query that field

---

# 3. REST API DESIGN

## RESTful Principles

| HTTP Method | Action           | URL Example            |
| ----------- | ---------------- | ---------------------- |
| GET         | Read             | `/api/v1/problems/`    |
| POST        | Create           | `/api/v1/submissions/` |
| PUT         | Update (full)    | `/api/v1/problems/1/`  |
| PATCH       | Update (partial) | `/api/v1/problems/1/`  |
| DELETE      | Delete           | `/api/v1/problems/1/`  |

## Django REST Framework (DRF)

### Serializers (Data Transformation)

```python
# serializers.py
from rest_framework import serializers
from .models import Problem, Submission

class ProblemListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views"""
    tags = TagSerializer(many=True, read_only=True)

    class Meta:
        model = Problem
        fields = ['id', 'title', 'slug', 'difficulty', 'points', 'tags']

class ProblemDetailSerializer(serializers.ModelSerializer):
    """Full serializer for detail views"""
    example_cases = serializers.SerializerMethodField()

    class Meta:
        model = Problem
        fields = ['id', 'title', 'slug', 'description', 'difficulty',
                  'constraints', 'input_format', 'output_format', 'example_cases']

    def get_example_cases(self, obj):
        """Custom field logic"""
        if obj.examples:
            return obj.examples
        return TestCaseSerializer(obj.test_cases.filter(is_hidden=False), many=True).data
```

### ViewSets (Request Handling)

```python
# views.py
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

class ProblemViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for DSA problems.

    list: Get all problems (paginated)
    retrieve: Get single problem by slug
    """
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = 'slug'  # Use slug instead of id in URL

    def get_serializer_class(self):
        """Return different serializers for list vs detail"""
        if self.action == 'retrieve':
            return ProblemDetailSerializer
        return ProblemListSerializer

    def get_queryset(self):
        """Optimized queryset with filtering"""
        queryset = Problem.objects.filter(is_active=True).prefetch_related('tags')

        # Query parameter filtering
        difficulty = self.request.query_params.get('difficulty')
        if difficulty:
            queryset = queryset.filter(difficulty=difficulty.upper())

        return queryset
```

## Pagination

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}
```

**Response Format:**

```json
{
    "count": 150,
    "next": "http://api.example.com/problems/?page=2",
    "previous": null,
    "results": [...]
}
```

---

# 4. AUTHENTICATION & SECURITY

## JWT (JSON Web Tokens)

### How JWT Works

```
1. User logs in with email/password
2. Server validates credentials
3. Server returns access_token + refresh_token
4. Client stores tokens (secure storage)
5. Client sends access_token with every request
6. Server validates token signature
```

### Implementation

```python
# urls.py (using simplejwt)
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('auth/login/', TokenObtainPairView.as_view()),
    path('auth/refresh/', TokenRefreshView.as_view()),
]
```

### Token Lifecycle

| Token   | Lifetime | Purpose                    |
| ------- | -------- | -------------------------- |
| Access  | 15 min   | Authorization for requests |
| Refresh | 7 days   | Get new access token       |

## Django Security Checklist

### Built-in Protections

```python
# settings/production.py

# HTTPS Enforcement
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000  # 1 year

# Cookie Security
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True

# Content Security
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True

# CORS (be restrictive in production!)
CORS_ALLOWED_ORIGINS = [
    'https://yourdomain.com',
]
```

### Common Security Mistakes

| Mistake                 | Risk                     | Fix                        |
| ----------------------- | ------------------------ | -------------------------- |
| `DEBUG = True` in prod  | Full error pages exposed | Environment variable check |
| `SECRET_KEY` in code    | Token forgery            | Load from environment      |
| `ALLOWED_HOSTS = ['*']` | Host header attacks      | List specific domains      |
| Raw SQL queries         | SQL injection            | Always use ORM             |

---

# 5. ASYNCHRONOUS PROCESSING

## Why Async?

Web requests should complete in <200ms. Some operations take longer:

- Sending emails
- Processing file uploads
- Running code submissions (5-10 seconds)

## Celery + Redis Architecture

```
[Django Web Server]
       ↓ (creates task)
    [Redis Queue]
       ↓ (picks up task)
  [Celery Worker]
       ↓ (executes)
    [Database]
```

### Task Definition

```python
# apps/dsa/tasks.py
from celery import shared_task
from .services import SandboxService
from .models import Submission

@shared_task(bind=True, max_retries=3)
def evaluate_submission_task(self, submission_id):
    """
    Async task to evaluate user code submission.

    Why async?
    - Code execution takes 5-10 seconds
    - Don't block the web request
    - Can retry on failure
    """
    try:
        submission = Submission.objects.get(id=submission_id)
        SandboxService.evaluate(submission)
    except Exception as exc:
        # Exponential backoff retry
        self.retry(exc=exc, countdown=2 ** self.request.retries)
```

### Triggering Tasks

```python
# views.py
def perform_create(self, serializer):
    submission = serializer.save(user=self.request.user)

    # Fire and forget - returns immediately
    evaluate_submission_task.delay(submission.id)
```

## WebSockets for Real-time

```python
# consumers.py (Django Channels)
class SubmissionConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user_id = self.scope['user'].id
        self.room_name = f'user_{self.user_id}'

        await self.channel_layer.group_add(self.room_name, self.channel_name)
        await self.accept()

    async def submission_update(self, event):
        """Send submission status update to client"""
        await self.send(text_data=json.dumps({
            'type': 'submission_update',
            'data': event['data']
        }))
```

---

# 6. TESTING STRATEGIES

## Test Pyramid

```
         /\
        /  \  E2E Tests (few)
       /____\
      /      \  Integration Tests (some)
     /________\
    /          \  Unit Tests (many)
   /______________\
```

## Pytest with Django

### Configuration

```ini
# pytest.ini
[pytest]
DJANGO_SETTINGS_MODULE = config.settings.development
python_files = test_*.py
addopts = --reuse-db --nomigrations --cov=.
```

### Fixtures (Reusable Test Data)

```python
# tests/conftest.py
import pytest
from apps.users.models import User
from apps.dsa.models import Problem, TestCase

@pytest.fixture
def user(db):
    return User.objects.create_user(
        email='test@example.com',
        username='testuser',
        password='TestPass123!'
    )

@pytest.fixture
def problem(db):
    return Problem.objects.create(
        title='Two Sum',
        slug='two-sum',
        difficulty='EASY',
        description='Find two numbers that sum to target.'
    )

@pytest.fixture
def problem_with_tests(problem):
    TestCase.objects.create(
        problem=problem,
        input_data='[2,7,11,15]\n9',
        expected_output='[0, 1]',
        is_hidden=False
    )
    return problem
```

### Unit Test Example

```python
# tests/test_dsa.py
import pytest
from apps.dsa.models import Problem, Submission

class TestProblemModel:
    def test_problem_creation(self, problem):
        assert problem.title == 'Two Sum'
        assert problem.difficulty == 'EASY'

    def test_str_representation(self, problem):
        assert str(problem) == 'Two Sum'

class TestSubmissionAPI:
    def test_list_problems_unauthenticated(self, api_client):
        """Anyone can view problems list"""
        response = api_client.get('/api/v1/dsa/problems/')
        assert response.status_code == 200

    def test_create_submission_authenticated(self, authenticated_client, problem):
        """Authenticated users can submit solutions"""
        response = authenticated_client.post('/api/v1/dsa/submissions/', {
            'problem': problem.id,
            'code': 'def solution(): pass',
            'language': 'python'
        })
        assert response.status_code == 201

    def test_create_submission_unauthenticated(self, api_client, problem):
        """Anonymous users cannot submit"""
        response = api_client.post('/api/v1/dsa/submissions/', {
            'problem': problem.id,
            'code': 'def solution(): pass'
        })
        assert response.status_code == 401  # Unauthorized
```

---

# 7. PERFORMANCE OPTIMIZATION

## Query Optimization

### Measure First

```python
# Enable query logging
LOGGING = {
    'loggers': {
        'django.db.backends': {
            'level': 'DEBUG',
        }
    }
}
```

### Use Django Debug Toolbar

```python
# settings/development.py
INSTALLED_APPS += ['debug_toolbar']
MIDDLEWARE = ['debug_toolbar.middleware.DebugToolbarMiddleware'] + MIDDLEWARE
```

## Caching with Redis

```python
# views.py
from django.core.cache import cache

class ProblemViewSet(viewsets.ReadOnlyModelViewSet):
    def list(self, request):
        cache_key = f'problems_list_{request.query_params}'
        cached = cache.get(cache_key)

        if cached:
            return Response(cached)

        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)

        cache.set(cache_key, serializer.data, timeout=300)  # 5 minutes
        return Response(serializer.data)
```

## Database Connection Pooling

```python
# settings/production.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ['DB_NAME'],
        'CONN_MAX_AGE': 600,  # Keep connections alive for 10 minutes
    }
}
```

---

# 8. DEPLOYMENT & DEVOPS

## Production Stack

```
[Nginx]
   ↓ (reverse proxy)
[Gunicorn/Daphne]
   ↓ (WSGI/ASGI)
[Django App]
   ↓
[PostgreSQL] ← [Redis] → [Celery Workers]
```

## Docker Compose

```yaml
# docker-compose.yml
version: "3.8"

services:
  web:
    build: .
    command: gunicorn config.wsgi:application --bind 0.0.0.0:8000
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/app
    depends_on:
      - db
      - redis

  celery:
    build: .
    command: celery -A config worker -l info

  db:
    image: postgres:15

  redis:
    image: redis:7-alpine
```

## CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/django.yml
name: Django CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: "3.11"
      - name: Install dependencies
        run: pip install -r requirements/development.txt
      - name: Run tests
        run: pytest --cov=.
      - name: Run linting
        run: flake8 apps/
```

---

# 🎓 PRACTICE EXERCISES

## Exercise 1: Fix the N+1

```python
# This code has an N+1 problem. Fix it!
def get_user_submissions(user_id):
    submissions = Submission.objects.filter(user_id=user_id)
    result = []
    for sub in submissions:
        result.append({
            'problem_title': sub.problem.title,  # N+1!
            'tags': [t.name for t in sub.problem.tags.all()]  # More N+1!
        })
    return result
```

## Exercise 2: Add Rate Limiting

Implement a custom throttle that:

- Allows 5 submissions per minute
- Uses the submission problem as part of the key

## Exercise 3: Write Tests

Create tests for:

1. Problem filtering by difficulty
2. Submission creation with validation
3. Unauthorized access prevention

---

# 📚 FURTHER READING

- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Two Scoops of Django](https://www.feldroy.com/books/two-scoops-of-django)
- [High Performance Django](https://highperformancedjango.com/)

---

_God Mode v12.0 - Backend Engineering Mastery_
_Last Updated: 2026-01-06_
