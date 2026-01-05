# 📚 Learning Hub: Django Backend Guide

## 1. Django Architecture (MTV Pattern)

### What is it?

Django follows the **Model-Template-View** (MTV) pattern:

- **Model**: Data layer (ORM to database)
- **Template**: Presentation layer (HTML rendering - we use DRF serializers instead)
- **View**: Business logic layer

### Why is it important?

- Clean separation of concerns
- Easy to maintain and scale
- Django handles the "Controller" layer automatically

### How it works in our project:

```
Request → URL Router → View → Service → Model → Database
                    ↓
              Serializer → JSON Response
```

---

## 2. Django REST Framework (DRF)

### Core Components

**Serializers**: Convert Python objects ↔ JSON

```python
class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ['id', 'title', 'slug', 'description']
```

**ViewSets**: Handle CRUD operations automatically

```python
class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
```

**Permissions**: Control access

```python
class IsOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.user == request.user
```

---

## 3. JWT Authentication

### What is JWT?

JSON Web Token - stateless authentication

### Token Structure:

```
Header.Payload.Signature
```

**Header**: Algorithm type
**Payload**: User data, expiration
**Signature**: Verification hash

### Our Implementation:

```python
# Login → Get tokens
POST /api/v1/auth/login/
{
    "email": "user@example.com",
    "password": "password"
}

# Response
{
    "access": "eyJ...",  # Short-lived (5 min)
    "refresh": "eyK..."  # Long-lived (1 day)
}

# Use token
GET /api/v1/courses/
Authorization: Bearer eyJ...
```

---

## 4. Security Best Practices

### OWASP Top 10 Protection

| Vulnerability | Our Defense                        |
| ------------- | ---------------------------------- |
| SQL Injection | Django ORM (parameterized queries) |
| XSS           | DRF auto-escaping                  |
| CSRF          | Token validation                   |
| Broken Auth   | JWT with rotation                  |

### Common Mistakes to Avoid:

```python
# ❌ BAD: Raw SQL
cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")

# ✅ GOOD: ORM
User.objects.get(id=user_id)
```

---

## 5. Testing Strategies

### Test Types:

1. **Unit Tests**: Single function/method
2. **Integration Tests**: Multiple components
3. **API Tests**: Full endpoint testing

### Our Test Structure:

```
conductor/
├── apps/
│   └── users/tests/
│       ├── test_models.py    # Unit tests
│       └── test_views.py     # API tests
└── tests/
    ├── test_users.py         # Integration
    └── test_courses.py       # Integration
```

### Running Tests:

```bash
# All tests
python -m pytest

# With coverage
python -m pytest --cov=apps

# Specific app
python -m pytest apps/users/
```

---

## 6. Database Optimization

### The N+1 Problem:

```python
# ❌ BAD: N+1 queries
for course in Course.objects.all():
    print(course.instructor.email)  # New query each time!

# ✅ GOOD: Prefetch
for course in Course.objects.select_related('instructor'):
    print(course.instructor.email)  # Single query
```

### Indexing:

```python
class Course(models.Model):
    slug = models.SlugField(db_index=True)  # Faster lookups
```

---

## 7. API Design Patterns

### RESTful Conventions:

| Action | Method | URL            |
| ------ | ------ | -------------- |
| List   | GET    | /courses/      |
| Create | POST   | /courses/      |
| Read   | GET    | /courses/{id}/ |
| Update | PUT    | /courses/{id}/ |
| Delete | DELETE | /courses/{id}/ |

### Custom Actions:

```python
@action(detail=True, methods=['post'])
def enroll(self, request, slug=None):
    """POST /courses/{slug}/enroll/"""
    course = self.get_object()
    # Enrollment logic
```

---

## 8. Service Layer Pattern

### Why use services?

- Keep views thin
- Reusable business logic
- Easier testing

### Example:

```python
# apps/courses/services.py
class CourseService:
    @staticmethod
    def enroll_user(user, course):
        """
        Enroll a user in a course.
        Validates payment and creates enrollment.
        """
        if Enrollment.objects.filter(user=user, course=course).exists():
            raise ValidationError("Already enrolled")

        return Enrollment.objects.create(user=user, course=course)
```

---

## 9. Error Handling

### Custom Exceptions:

```python
# core/exceptions.py
class PaymentRequiredException(APIException):
    status_code = 402
    default_detail = 'Payment required for this course'
```

### Usage:

```python
if not course.is_free:
    raise PaymentRequiredException()
```

---

## 10. Production Deployment

### Pre-deployment Checklist:

```bash
# Check for issues
python manage.py check --deploy

# Collect static files
python manage.py collectstatic

# Apply migrations
python manage.py migrate
```

### Environment Variables:

```bash
DEBUG=False
SECRET_KEY=your-secure-key-here
DATABASE_URL=postgres://...
```

---

_Learning Hub Backend Guide v1.0_
_Generated: 2026-01-05_
