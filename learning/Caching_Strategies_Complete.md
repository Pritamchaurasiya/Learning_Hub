# 💾 CACHING STRATEGIES: COMPLETE GUIDE

## Boosting Performance with Intelligent Caching

---

## 📋 TABLE OF CONTENTS

1. [Caching Fundamentals](#-caching-fundamentals)
2. [Cache Layers](#-cache-layers)
3. [Caching Patterns](#-caching-patterns)
4. [Redis Deep Dive](#-redis-deep-dive)
5. [Django Caching](#-django-caching)
6. [Flutter Caching](#-flutter-caching)
7. [Cache Invalidation](#-cache-invalidation)
8. [Cache Monitoring](#-cache-monitoring)

---

## 🧠 CACHING FUNDAMENTALS

### Why Cache?

```
Without Cache:
User → App → Database → 50ms response

With Cache:
User → App → Cache Hit → 1ms response ⚡

Speed improvement: 50x faster!
```

### Cache Trade-offs

| Benefit            | Challenge               |
| ------------------ | ----------------------- |
| Faster responses   | Data staleness          |
| Reduced DB load    | Memory cost             |
| Better scalability | Invalidation complexity |
| Lower latency      | Consistency issues      |

### Cache Terminology

```
Hit:       Data found in cache ✅
Miss:      Data not in cache, fetch from source ❌
TTL:       Time-To-Live (expiration time)
Eviction:  Removing data to make room
Warm:      Cache filled with data
Cold:      Empty cache, all misses
```

---

## 📊 CACHE LAYERS

### The Cache Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                        User Request                          │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  L1: Browser Cache (HTTP Headers)                           │
│  - Static assets, API responses                              │
│  - Cache-Control, ETag, Last-Modified                        │
│  - Fastest: 0ms                                              │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  L2: CDN (CloudFlare, CloudFront)                           │
│  - Static files, images, videos                              │
│  - Edge locations worldwide                                   │
│  - Fast: ~10ms                                               │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  L3: Application Cache (Redis/Memcached)                    │
│  - API responses, session data                               │
│  - Shared across instances                                   │
│  - Fast: ~1ms                                                │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  L4: Database Query Cache                                    │
│  - Repeated queries                                          │
│  - Medium: ~5ms                                              │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  L5: Database Disk                                           │
│  - Source of truth                                           │
│  - Slowest: ~50ms+                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 CACHING PATTERNS

### 1. Cache-Aside (Lazy Loading)

```python
def get_course(course_id):
    # Try cache first
    cache_key = f'course:{course_id}'
    course = cache.get(cache_key)

    if course is None:  # Cache miss
        # Fetch from database
        course = Course.objects.get(id=course_id)
        # Store in cache
        cache.set(cache_key, course, timeout=3600)

    return course

# ✅ Pros: Only caches what's needed
# ❌ Cons: Cache miss penalty on first request
```

### 2. Write-Through

```python
def update_course(course_id, data):
    # Update database
    course = Course.objects.get(id=course_id)
    for key, value in data.items():
        setattr(course, key, value)
    course.save()

    # Update cache immediately
    cache_key = f'course:{course_id}'
    cache.set(cache_key, course, timeout=3600)

    return course

# ✅ Pros: Cache always consistent with DB
# ❌ Cons: Every write hits cache (even if never read)
```

### 3. Write-Behind (Async)

```python
from celery import shared_task

def update_course(course_id, data):
    # Update cache immediately
    cache_key = f'course:{course_id}'
    cached = cache.get(cache_key) or {}
    cached.update(data)
    cache.set(cache_key, cached, timeout=3600)

    # Queue database write
    persist_to_db.delay(course_id, data)

    return cached

@shared_task
def persist_to_db(course_id, data):
    Course.objects.filter(id=course_id).update(**data)

# ✅ Pros: Fast writes, DB batching possible
# ❌ Cons: Data loss risk if queue fails
```

### 4. Read-Through

```python
class CacheBackedRepository:
    def __init__(self, model, cache_timeout=3600):
        self.model = model
        self.cache_timeout = cache_timeout

    def get(self, pk):
        cache_key = f'{self.model.__name__}:{pk}'
        obj = cache.get(cache_key)

        if obj is None:
            obj = self.model.objects.get(pk=pk)
            cache.set(cache_key, obj, timeout=self.cache_timeout)

        return obj

# Usage
course_repo = CacheBackedRepository(Course)
course = course_repo.get(123)  # Cache handled transparently
```

---

## 🔴 REDIS DEEP DIVE

### Data Structures

```python
import redis

r = redis.Redis(host='localhost', port=6379, db=0)

# Strings
r.set('user:123:name', 'John')
r.get('user:123:name')  # b'John'
r.setex('session:abc', 3600, 'data')  # With TTL

# Hashes (like dictionaries)
r.hset('user:123', 'name', 'John')
r.hset('user:123', 'email', 'john@example.com')
r.hgetall('user:123')  # {b'name': b'John', b'email': b'...'}

# Lists (queues)
r.lpush('tasks', 'task1')
r.rpop('tasks')  # 'task1'

# Sets (unique values)
r.sadd('online_users', 'user:1')
r.sadd('online_users', 'user:2')
r.smembers('online_users')  # {b'user:1', b'user:2'}
r.scard('online_users')  # 2

# Sorted Sets (leaderboards)
r.zadd('leaderboard', {'user:1': 100, 'user:2': 200})
r.zrevrange('leaderboard', 0, 9, withscores=True)  # Top 10
r.zincrby('leaderboard', 50, 'user:1')  # Add 50 points
```

### Use Cases

| Structure       | Use Case                          |
| --------------- | --------------------------------- |
| **Strings**     | Simple values, counters, sessions |
| **Hashes**      | User profiles, settings           |
| **Lists**       | Queues, activity feeds            |
| **Sets**        | Tags, unique visitors             |
| **Sorted Sets** | Leaderboards, rankings            |

### Redis Commands for LearningHub

```python
# Leaderboard
def update_leaderboard(user_id, xp_gained):
    r.zincrby('leaderboard:daily', xp_gained, f'user:{user_id}')
    r.zincrby('leaderboard:alltime', xp_gained, f'user:{user_id}')

def get_top_10():
    return r.zrevrange('leaderboard:daily', 0, 9, withscores=True)

# Online status
def set_online(user_id):
    r.setex(f'online:{user_id}', 300, '1')  # 5 min TTL

def is_online(user_id):
    return r.exists(f'online:{user_id}')

# Rate limiting
def check_rate_limit(user_id, limit=100, window=60):
    key = f'ratelimit:{user_id}'
    current = r.incr(key)
    if current == 1:
        r.expire(key, window)
    return current <= limit
```

---

## 🐍 DJANGO CACHING

### Configuration

```python
# settings.py
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://localhost:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'SERIALIZER': 'django_redis.serializers.json.JSONSerializer',
        },
        'KEY_PREFIX': 'learninghub',
        'TIMEOUT': 300,  # Default 5 minutes
    }
}
```

### Low-Level API

```python
from django.core.cache import cache

# Basic operations
cache.set('key', 'value', timeout=300)
value = cache.get('key')
value = cache.get('key', default='default')
cache.delete('key')

# Atomic operations
cache.incr('counter')
cache.decr('counter')

# Bulk operations
cache.set_many({'key1': 'val1', 'key2': 'val2'})
cache.get_many(['key1', 'key2'])
cache.delete_many(['key1', 'key2'])

# Pattern-based deletion
cache.delete_pattern('course:*')  # Requires django-redis
```

### View Caching

```python
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator

# Function-based view
@cache_page(60 * 15)  # 15 minutes
def course_list(request):
    courses = Course.objects.all()
    return render(request, 'courses.html', {'courses': courses})

# Class-based view
@method_decorator(cache_page(60 * 15), name='dispatch')
class CourseListView(ListView):
    model = Course

# Per-user caching
from django.views.decorators.vary import vary_on_cookie

@vary_on_cookie
@cache_page(60 * 15)
def my_courses(request):
    # Different cache per user
    pass
```

### Template Fragment Caching

```django
{% load cache %}

{% cache 500 sidebar request.user.id %}
    {# Expensive template fragment #}
    {% for course in user.enrolled_courses.all %}
        {{ course.title }}
    {% endfor %}
{% endcache %}
```

### QuerySet Caching

```python
from django.core.cache import cache

class CourseRepository:
    @staticmethod
    def get_popular_courses(limit=10):
        key = f'popular_courses:{limit}'
        courses = cache.get(key)

        if courses is None:
            courses = list(
                Course.objects
                .annotate(enrollment_count=Count('enrollments'))
                .order_by('-enrollment_count')[:limit]
            )
            cache.set(key, courses, timeout=3600)

        return courses

    @staticmethod
    def invalidate_popular():
        cache.delete_pattern('popular_courses:*')
```

---

## 📱 FLUTTER CACHING

### HTTP Caching with Dio

```dart
import 'package:dio/dio.dart';
import 'package:dio_cache_interceptor/dio_cache_interceptor.dart';

class ApiClient {
  late Dio _dio;
  late CacheStore _cacheStore;

  ApiClient() {
    _cacheStore = HiveCacheStore('api_cache');

    final options = CacheOptions(
      store: _cacheStore,
      policy: CachePolicy.forceCache,
      hitCacheOnErrorExcept: [401, 403],
      maxStale: const Duration(days: 7),
      priority: CachePriority.normal,
      keyBuilder: CacheOptions.defaultCacheKeyBuilder,
    );

    _dio = Dio()
      ..interceptors.add(DioCacheInterceptor(options: options));
  }

  Future<List<Course>> getCourses() async {
    final response = await _dio.get(
      '/api/courses/',
      options: Options(
        extra: {
          'cachePolicy': CachePolicy.refreshForceCache,
        },
      ),
    );
    return (response.data as List).map((e) => Course.fromJson(e)).toList();
  }
}
```

### Local Database Caching

```dart
import 'package:hive_flutter/hive_flutter.dart';

class CourseCache {
  static const _boxName = 'courses';

  static Future<void> init() async {
    await Hive.initFlutter();
    Hive.registerAdapter(CourseAdapter());
    await Hive.openBox<Course>(_boxName);
  }

  static Box<Course> get _box => Hive.box<Course>(_boxName);

  static Future<void> saveCourses(List<Course> courses) async {
    final map = {for (var c in courses) c.id: c};
    await _box.putAll(map);
  }

  static List<Course> getCourses() {
    return _box.values.toList();
  }

  static Course? getCourse(String id) {
    return _box.get(id);
  }

  static Future<void> clear() async {
    await _box.clear();
  }
}
```

### Stale-While-Revalidate Pattern

```dart
class CourseRepository {
  final ApiClient _api;
  final CourseCache _cache;

  Stream<List<Course>> getCourses() async* {
    // Immediately yield cached data
    final cached = _cache.getCourses();
    if (cached.isNotEmpty) {
      yield cached;
    }

    // Fetch fresh data in background
    try {
      final fresh = await _api.getCourses();
      await _cache.saveCourses(fresh);
      yield fresh;
    } catch (e) {
      // If we had cached data, we already yielded it
      if (cached.isEmpty) {
        throw e;  // Rethrow only if no cached data
      }
    }
  }
}

// Usage in UI
class CourseList extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return StreamBuilder<List<Course>>(
      stream: ref.watch(courseRepositoryProvider).getCourses(),
      builder: (context, snapshot) {
        if (snapshot.hasData) {
          return ListView.builder(
            itemCount: snapshot.data!.length,
            itemBuilder: (_, i) => CourseCard(snapshot.data![i]),
          );
        }
        return CircularProgressIndicator();
      },
    );
  }
}
```

---

## 🗑️ CACHE INVALIDATION

### Strategies

| Strategy             | When to Use                   |
| -------------------- | ----------------------------- |
| **Time-based (TTL)** | Data can be slightly stale    |
| **Event-based**      | Data changes via known events |
| **Version-based**    | Infrequent schema changes     |
| **Manual**           | Admin actions                 |

### Django Signals for Invalidation

```python
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache

@receiver([post_save, post_delete], sender=Course)
def invalidate_course_cache(sender, instance, **kwargs):
    # Invalidate specific course
    cache.delete(f'course:{instance.id}')

    # Invalidate lists
    cache.delete_pattern('courses:*')
    cache.delete_pattern('popular_courses:*')

@receiver(post_save, sender=Enrollment)
def invalidate_enrollment_cache(sender, instance, **kwargs):
    cache.delete(f'user:{instance.user_id}:enrollments')
    cache.delete_pattern('popular_courses:*')
```

### Cache Versioning

```python
class CourseCache:
    VERSION = 'v2'  # Increment when schema changes

    @classmethod
    def key(cls, course_id):
        return f'course:{cls.VERSION}:{course_id}'

    @classmethod
    def get(cls, course_id):
        return cache.get(cls.key(course_id))

    @classmethod
    def set(cls, course_id, data):
        cache.set(cls.key(course_id), data, timeout=3600)
```

---

## 📈 CACHE MONITORING

### Key Metrics

| Metric            | Formula                  | Target |
| ----------------- | ------------------------ | ------ |
| **Hit Rate**      | hits / (hits + misses)   | > 95%  |
| **Miss Rate**     | misses / (hits + misses) | < 5%   |
| **Latency**       | avg response time        | < 1ms  |
| **Memory Usage**  | used / total             | < 80%  |
| **Eviction Rate** | evictions / time         | Low    |

### Redis Monitoring

```bash
# CLI monitoring
redis-cli INFO stats

# Key metrics
keyspace_hits: 1000000
keyspace_misses: 50000
# Hit rate = 1000000 / (1000000 + 50000) = 95.2%

# Memory
redis-cli INFO memory
used_memory_human: 500M
maxmemory: 1G
```

---

## 💎 CACHING GOLDEN RULES

1. **Cache hot data** - Not everything needs caching
2. **Set appropriate TTLs** - Balance freshness vs performance
3. **Invalidate correctly** - Stale data is worse than no cache
4. **Monitor hit rates** - < 90% means wasted memory
5. **Plan for cold starts** - Cache warming strategies
6. **Size your cache** - Not too small (thrashing), not too big (waste)

---

**SINGULARITY ENGINE v16.0**  
_"The fastest request is the one you don't make."_
