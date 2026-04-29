# 🔌 API DESIGN: RESTful & Beyond

## Building World-Class APIs

---

## 📋 TABLE OF CONTENTS

1. [REST Principles](#-rest-principles)
2. [URL Design](#-url-design)
3. [HTTP Methods & Status Codes](#-http-methods--status-codes)
4. [Request/Response Patterns](#-requestresponse-patterns)
5. [Authentication & Authorization](#-authentication--authorization)
6. [Versioning Strategies](#-versioning-strategies)
7. [Error Handling](#-error-handling)
8. [Documentation](#-documentation)
9. [GraphQL Alternative](#-graphql-alternative)

---

## 🏛️ REST PRINCIPLES

### The 6 Constraints

| Constraint            | Meaning                                      |
| --------------------- | -------------------------------------------- |
| **Client-Server**     | Separation of concerns                       |
| **Stateless**         | No client context on server                  |
| **Cacheable**         | Responses must define cacheability           |
| **Uniform Interface** | Consistent resource identification           |
| **Layered System**    | Client can't tell if connected to end server |
| **Code on Demand**    | (Optional) Executable code transfer          |

### Richardson Maturity Model

```
Level 3: HATEOAS (Hypermedia Controls)
         ↑
Level 2: HTTP Verbs (GET, POST, PUT, DELETE)
         ↑
Level 1: Resources (/users, /courses)
         ↑
Level 0: Single URI, single method (RPC-style)

Most APIs aim for Level 2
```

---

## 🔗 URL DESIGN

### Resource Naming

```
✅ GOOD (nouns, plural)
GET /courses
GET /courses/123
GET /courses/123/lessons
GET /users/456/enrollments

❌ BAD (verbs, actions in URL)
GET /getCourses
POST /createCourse
GET /courses/123/getDetails
```

### Hierarchical Resources

```
/courses                    # All courses
/courses/123                # Course 123
/courses/123/lessons        # All lessons in course 123
/courses/123/lessons/456    # Lesson 456 in course 123

# Limit to 3 levels - beyond that, flatten
# Instead of: /courses/123/lessons/456/videos/789
# Use: /videos/789 with course/lesson filters
```

### Query Parameters

```
# Filtering
GET /courses?category=python&difficulty=beginner

# Pagination
GET /courses?page=2&limit=20
GET /courses?offset=20&limit=20  # Alternative

# Sorting
GET /courses?sort=-created_at    # Descending
GET /courses?sort=price,-rating  # Multiple

# Field selection
GET /courses?fields=id,title,price

# Searching
GET /courses?search=machine+learning
```

---

## 🔄 HTTP METHODS & STATUS CODES

### Methods

| Method     | CRUD    | Idempotent | Safe |
| ---------- | ------- | ---------- | ---- |
| **GET**    | Read    | ✅         | ✅   |
| **POST**   | Create  | ❌         | ❌   |
| **PUT**    | Replace | ✅         | ❌   |
| **PATCH**  | Update  | ❌         | ❌   |
| **DELETE** | Delete  | ✅         | ❌   |

### Status Codes

```
2xx SUCCESS
200 OK              - General success
201 Created         - POST created new resource
204 No Content      - DELETE success, no body

3xx REDIRECT
301 Moved Permanently
304 Not Modified    - Cached response valid

4xx CLIENT ERROR
400 Bad Request     - Invalid input
401 Unauthorized    - Auth required
403 Forbidden       - Auth valid but not allowed
404 Not Found       - Resource doesn't exist
409 Conflict        - State conflict (duplicate)
422 Unprocessable   - Validation error
429 Too Many Requests - Rate limited

5xx SERVER ERROR
500 Internal Error  - Bug on server
502 Bad Gateway     - Upstream service failed
503 Service Unavailable - Overloaded/maintenance
504 Gateway Timeout - Upstream timeout
```

---

## 📦 REQUEST/RESPONSE PATTERNS

### Consistent Response Format

```json
// Success
{
  "status": "success",
  "data": {
    "id": 123,
    "title": "Python Basics",
    "instructor": {"id": 1, "name": "John Doe"}
  }
}

// List with pagination
{
  "status": "success",
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}

// Error
{
  "status": "error",
  "message": "Validation failed",
  "errors": {
    "email": ["Invalid email format"],
    "password": ["Must be at least 8 characters"]
  }
}
```

### Django REST Framework Implementation

```python
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

class CourseSerializer(serializers.ModelSerializer):
    instructor = InstructorSerializer(read_only=True)

    class Meta:
        model = Course
        fields = ['id', 'title', 'slug', 'instructor', 'price']

class CourseListView(APIView):
    def get(self, request):
        courses = Course.objects.select_related('instructor').all()
        serializer = CourseSerializer(courses, many=True)
        return Response({
            'status': 'success',
            'data': serializer.data
        })

    def post(self, request):
        serializer = CourseSerializer(data=request.data)
        if serializer.is_valid():
            course = serializer.save(instructor=request.user)
            return Response({
                'status': 'success',
                'data': CourseSerializer(course).data
            }, status=status.HTTP_201_CREATED)

        return Response({
            'status': 'error',
            'message': 'Validation failed',
            'errors': serializer.errors
        }, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
```

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### Authentication Methods

| Method        | Use Case               | Security |
| ------------- | ---------------------- | -------- |
| **API Key**   | Service-to-service     | Low      |
| **JWT**       | Stateless apps, mobile | Medium   |
| **OAuth 2.0** | Third-party access     | High     |
| **Session**   | Web apps with cookies  | Medium   |

### JWT Flow

```python
# Login endpoint
from rest_framework_simplejwt.tokens import RefreshToken

class LoginView(APIView):
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        user = authenticate(email=email, password=password)
        if not user:
            return Response({
                'status': 'error',
                'message': 'Invalid credentials'
            }, status=401)

        refresh = RefreshToken.for_user(user)
        return Response({
            'status': 'success',
            'data': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data
            }
        })

# Protected endpoint
from rest_framework.permissions import IsAuthenticated

class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            'status': 'success',
            'data': UserSerializer(request.user).data
        })
```

### Authorization with Permissions

```python
from rest_framework.permissions import BasePermission

class IsInstructorOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
        return request.user.is_authenticated and request.user.role == 'instructor'

    def has_object_permission(self, request, view, obj):
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
        return obj.instructor == request.user

class CourseDetailView(APIView):
    permission_classes = [IsInstructorOrReadOnly]

    def get_object(self, pk):
        return get_object_or_404(Course, pk=pk)

    def put(self, request, pk):
        course = self.get_object(pk)
        self.check_object_permissions(request, course)
        # ... update logic
```

---

## 🏷️ VERSIONING STRATEGIES

### Options

```
1. URL Path (Recommended)
   /api/v1/courses
   /api/v2/courses

2. Query Parameter
   /api/courses?version=1

3. Header
   Accept: application/vnd.api+json; version=1

4. Subdomain
   v1.api.example.com/courses
```

### Django REST Framework Versioning

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_VERSIONING_CLASS': 'rest_framework.versioning.URLPathVersioning',
    'ALLOWED_VERSIONS': ['v1', 'v2'],
    'DEFAULT_VERSION': 'v1',
}

# urls.py
urlpatterns = [
    path('api/<str:version>/', include('api.urls')),
]

# views.py
class CourseView(APIView):
    def get(self, request):
        if request.version == 'v2':
            # New response format
            return Response({...})
        else:
            # Legacy format
            return Response({...})
```

---

## ⚠️ ERROR HANDLING

### Standardized Error Response

```python
# exceptions.py
from rest_framework.exceptions import APIException

class BusinessLogicError(APIException):
    status_code = 400
    default_detail = 'A business logic error occurred.'
    default_code = 'business_error'

# handlers.py
from rest_framework.views import exception_handler

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        response.data = {
            'status': 'error',
            'code': getattr(exc, 'default_code', 'error'),
            'message': str(exc.detail) if hasattr(exc, 'detail') else str(exc),
            'errors': response.data if isinstance(response.data, dict) else None
        }

    return response

# settings.py
REST_FRAMEWORK = {
    'EXCEPTION_HANDLER': 'api.handlers.custom_exception_handler',
}
```

### Validation Error Example

```json
{
  "status": "error",
  "code": "validation_error",
  "message": "Validation failed",
  "errors": {
    "email": ["This field is required."],
    "password": [
      "This field is required.",
      "Password must be at least 8 characters."
    ]
  }
}
```

---

## 📚 DOCUMENTATION

### OpenAPI/Swagger with drf-spectacular

```python
# settings.py
INSTALLED_APPS += ['drf_spectacular']

REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'Learning Hub API',
    'DESCRIPTION': 'API for the Learning Hub platform',
    'VERSION': '1.0.0',
}

# urls.py
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='docs'),
]

# views.py
from drf_spectacular.utils import extend_schema, OpenApiExample

class CourseView(APIView):
    @extend_schema(
        summary="List all courses",
        responses={200: CourseSerializer(many=True)},
        examples=[
            OpenApiExample(
                'Success',
                value={'status': 'success', 'data': [...]},
            )
        ]
    )
    def get(self, request):
        pass
```

---

## 🔷 GRAPHQL ALTERNATIVE

### When to Use GraphQL

| GraphQL                 | REST              |
| ----------------------- | ----------------- |
| Complex related data    | Simple CRUD       |
| Mobile apps (bandwidth) | Caching critical  |
| Rapidly evolving schema | Stable contracts  |
| Single endpoint         | Multiple services |

### GraphQL Example

```python
# schema.py
import graphene
from graphene_django import DjangoObjectType

class CourseType(DjangoObjectType):
    class Meta:
        model = Course
        fields = ['id', 'title', 'instructor', 'lessons']

class Query(graphene.ObjectType):
    courses = graphene.List(CourseType)
    course = graphene.Field(CourseType, id=graphene.ID())

    def resolve_courses(self, info):
        return Course.objects.all()

    def resolve_course(self, info, id):
        return Course.objects.get(pk=id)

schema = graphene.Schema(query=Query)
```

### Query

```graphql
query {
  course(id: "123") {
    title
    instructor {
      name
    }
    lessons {
      title
      duration
    }
  }
}
```

---

## 💎 API DESIGN GOLDEN RULES

1. **Be consistent** - Same patterns everywhere
2. **Use proper HTTP** - Methods, status codes
3. **Version from day 1** - Breaking changes happen
4. **Document thoroughly** - OpenAPI/Swagger
5. **Handle errors gracefully** - Structured error responses
6. **Paginate everything** - Never return unbounded lists
7. **Cache appropriately** - ETags, Cache-Control headers

---

**SINGULARITY ENGINE v16.0**  
_"A great API is invisible to the user - it just works."_
