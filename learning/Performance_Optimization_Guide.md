# ⚡ PERFORMANCE OPTIMIZATION: COMPLETE GUIDE

## Making Your Application Blazing Fast

---

## 📋 TABLE OF CONTENTS

1. [Performance Metrics](#-performance-metrics)
2. [Backend Optimization](#-backend-optimization)
3. [Database Optimization](#-database-optimization)
4. [Frontend Optimization](#-frontend-optimization)
5. [Network Optimization](#-network-optimization)
6. [Profiling Tools](#-profiling-tools)

---

## 📊 PERFORMANCE METRICS

### Key Metrics

| Metric                             | Target      | Impact           |
| ---------------------------------- | ----------- | ---------------- |
| **TTFB** (Time to First Byte)      | < 200ms     | Server speed     |
| **FCP** (First Contentful Paint)   | < 1.8s      | Perceived speed  |
| **LCP** (Largest Contentful Paint) | < 2.5s      | Core Web Vitals  |
| **FID** (First Input Delay)        | < 100ms     | Interactivity    |
| **CLS** (Cumulative Layout Shift)  | < 0.1       | Visual stability |
| **API Response**                   | < 500ms p95 | Backend speed    |

---

## 🐍 BACKEND OPTIMIZATION

### Async Processing

```python
# ❌ Slow - synchronous
def enroll_user(user_id, course_id):
    create_enrollment(user_id, course_id)
    send_welcome_email(user_id)  # 500ms
    update_analytics(user_id)    # 200ms
    notify_instructor()          # 300ms
    return {"status": "success"}  # Total: 1000ms

# ✅ Fast - async with Celery
@shared_task
def send_welcome_email(user_id):
    # Runs in background
    pass

def enroll_user(user_id, course_id):
    enrollment = create_enrollment(user_id, course_id)

    # Queue background tasks
    send_welcome_email.delay(user_id)
    update_analytics.delay(user_id)
    notify_instructor.delay()

    return {"status": "success"}  # Total: ~50ms
```

### Connection Pooling

```python
# settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'CONN_MAX_AGE': 600,  # Keep connections alive
        'CONN_HEALTH_CHECKS': True,
        'OPTIONS': {
            'MAX_CONNS': 20,
        }
    }
}
```

### Response Compression

```python
# settings.py
MIDDLEWARE = [
    'django.middleware.gzip.GZipMiddleware',  # First!
    # ... other middleware
]

# Or use WhiteNoise with compression
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
```

---

## 🗄️ DATABASE OPTIMIZATION

### Query Optimization

```python
# ❌ Bad - N+1 problem
courses = Course.objects.all()
for course in courses:  # 1 query
    print(course.instructor.name)  # N queries!

# ✅ Good - eager loading
courses = Course.objects.select_related('instructor').all()  # 1 query

# ✅ For many-to-many
courses = Course.objects.prefetch_related('tags', 'lessons').all()  # 3 queries
```

### Indexing

```python
class Course(models.Model):
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)  # Auto-indexed
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['category', 'is_published']),
            models.Index(fields=['-created_at']),
        ]
```

### Pagination

```python
# ❌ Bad - loads all data
courses = Course.objects.all()  # 10,000 courses in memory!

# ✅ Good - paginated
from django.core.paginator import Paginator

courses = Course.objects.all()
paginator = Paginator(courses, 20)  # 20 per page
page = paginator.page(1)  # Only fetches 20
```

---

## 📱 FRONTEND OPTIMIZATION

### Flutter Performance

```dart
// ❌ Bad - rebuilds entire tree
class CourseList extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Consumer<CourseProvider>(
      builder: (context, provider, child) {
        return Column(
          children: [
            Text('Total: ${provider.courses.length}'),  // Rebuilds all
            ListView.builder(
              itemCount: provider.courses.length,
              itemBuilder: (_, i) => CourseCard(provider.courses[i]),
            ),
          ],
        );
      },
    );
  }
}

// ✅ Good - selective rebuilds
class CourseList extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Selector<CourseProvider, int>(
          selector: (_, p) => p.courses.length,
          builder: (_, count, __) => Text('Total: $count'),
        ),
        Consumer<CourseProvider>(
          builder: (_, provider, __) => ListView.builder(
            itemCount: provider.courses.length,
            itemBuilder: (_, i) => CourseCard(provider.courses[i]),
          ),
        ),
      ],
    );
  }
}
```

### Image Optimization

```dart
// Use cached network images
CachedNetworkImage(
  imageUrl: course.thumbnailUrl,
  placeholder: (_, __) => Shimmer(),
  errorWidget: (_, __, ___) => Icon(Icons.error),
  memCacheWidth: 300,  // Resize in memory
);

// Lazy load images in lists
ListView.builder(
  itemBuilder: (_, i) {
    return VisibilityDetector(
      key: Key('course_$i'),
      onVisibilityChanged: (info) {
        if (info.visibleFraction > 0) {
          // Load image
        }
      },
      child: CourseCard(courses[i]),
    );
  },
);
```

### const Widgets

```dart
// ❌ Bad - creates new instance every build
Widget build(BuildContext context) {
  return Padding(
    padding: EdgeInsets.all(16),  // New instance
    child: Text('Hello'),
  );
}

// ✅ Good - const where possible
Widget build(BuildContext context) {
  return const Padding(
    padding: EdgeInsets.all(16),  // Compile-time constant
    child: Text('Hello'),
  );
}
```

---

## 🌐 NETWORK OPTIMIZATION

### HTTP/2 & Keep-Alive

```python
# Nginx configuration
server {
    listen 443 ssl http2;  # Enable HTTP/2

    keepalive_timeout 65;
    keepalive_requests 100;
}
```

### Response Caching

```python
from django.views.decorators.cache import cache_control

@cache_control(max_age=3600, public=True)
def course_list(request):
    pass

# Or with ETags
from django.views.decorators.http import condition

def course_etag(request, course_id):
    course = Course.objects.get(id=course_id)
    return str(course.updated_at.timestamp())

@condition(etag_func=course_etag)
def course_detail(request, course_id):
    pass
```

### CDN for Static Assets

```python
# settings.py (production)
STATIC_URL = 'https://cdn.example.com/static/'
MEDIA_URL = 'https://cdn.example.com/media/'

# With django-storages + S3
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
AWS_S3_CUSTOM_DOMAIN = 'cdn.example.com'
```

---

## 🔍 PROFILING TOOLS

### Python Profiling

```python
# Django Debug Toolbar
INSTALLED_APPS += ['debug_toolbar']
MIDDLEWARE = ['debug_toolbar.middleware.DebugToolbarMiddleware'] + MIDDLEWARE

# cProfile
python -m cProfile -s cumtime manage.py runserver

# py-spy (production-safe)
py-spy record -o profile.svg --pid 12345
```

### Database Query Analysis

```python
# Django settings
LOGGING = {
    'loggers': {
        'django.db.backends': {
            'level': 'DEBUG',
        }
    }
}

# Or in code
from django.db import connection
print(connection.queries[-1])
```

### Flutter Performance

```dart
// Enable performance overlay
MaterialApp(
  showPerformanceOverlay: true,
);

// Timeline events
import 'dart:developer';
Timeline.startSync('expensive_operation');
// ... operation
Timeline.finishSync();
```

---

## 💎 PERFORMANCE GOLDEN RULES

1. **Measure first** - Don't optimize blindly
2. **Cache aggressively** - Fastest request is cached
3. **Async everything** - Don't block the main thread
4. **Optimize the 80%** - Focus on common paths
5. **Monitor continuously** - Performance degrades over time

---

**SINGULARITY ENGINE v16.0**  
_"Performance is a feature, not an afterthought."_
