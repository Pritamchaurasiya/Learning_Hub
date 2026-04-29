# 🗄️ DATABASE OPTIMIZATION: FROM BASICS TO EXPERT

## Mastering Query Performance & Database Architecture

---

## 📋 TABLE OF CONTENTS

1. [Query Optimization](#-query-optimization)
2. [Indexing Strategies](#-indexing-strategies)
3. [N+1 Problem](#-the-n1-problem)
4. [Connection Pooling](#-connection-pooling)
5. [Sharding & Partitioning](#-sharding--partitioning)
6. [Caching Strategies](#-caching-strategies)
7. [Database Monitoring](#-database-monitoring)
8. [Migrations Best Practices](#-migrations-best-practices)

---

## ⚡ QUERY OPTIMIZATION

### EXPLAIN Analyze

```sql
-- PostgreSQL
EXPLAIN ANALYZE SELECT * FROM courses WHERE category_id = 5;

--                                                              QUERY PLAN
-- --------------------------------------------------------------------------------------------------------------------------
--  Seq Scan on courses  (cost=0.00..25.00 rows=5 width=100) (actual time=0.015..0.018 rows=5 loops=1)
--    Filter: (category_id = 5)
--    Rows Removed by Filter: 995
--  Planning Time: 0.070 ms
--  Execution Time: 0.035 ms
```

### Reading EXPLAIN Output

| Metric          | Meaning             | Concern         |
| --------------- | ------------------- | --------------- |
| **Seq Scan**    | Full table scan     | ⚠️ Add index    |
| **Index Scan**  | Using index         | ✅ Good         |
| **cost**        | Estimated cost      | Higher = slower |
| **actual time** | Real execution time | Key metric      |
| **rows**        | Rows processed      | Less is better  |

### Django Query Debugging

```python
# Enable SQL logging
LOGGING = {
    'loggers': {
        'django.db.backends': {
            'level': 'DEBUG',
            'handlers': ['console'],
        }
    }
}

# Or use django-debug-toolbar
INSTALLED_APPS += ['debug_toolbar']

# Programmatic inspection
from django.db import connection
print(connection.queries[-1])  # Last query
```

---

## 📊 INDEXING STRATEGIES

### Types of Indexes

| Type       | Use Case                 | Example                      |
| ---------- | ------------------------ | ---------------------------- |
| **B-Tree** | Default, equality, range | `WHERE id = 5`               |
| **Hash**   | Equality only            | `WHERE slug = 'python'`      |
| **GIN**    | Full-text, JSON, arrays  | `WHERE tags @> '{"python"}'` |
| **GiST**   | Geometric, full-text     | Spatial queries              |
| **BRIN**   | Large sequential data    | Time-series                  |

### Creating Indexes in Django

```python
class Course(models.Model):
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)  # Auto-indexed
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            # Simple index
            models.Index(fields=['category']),

            # Compound index
            models.Index(fields=['category', 'is_published']),

            # Descending index
            models.Index(fields=['-created_at']),

            # Partial index (PostgreSQL)
            models.Index(
                fields=['title'],
                condition=models.Q(is_published=True),
                name='published_title_idx'
            ),
        ]
```

### When to Index

| ✅ Index When       | ❌ Don't Index When            |
| ------------------- | ------------------------------ |
| Frequently queried  | Small tables (<1000 rows)      |
| Used in WHERE, JOIN | High INSERT/UPDATE tables      |
| Used in ORDER BY    | Low cardinality columns        |
| Foreign keys        | Already covered by other index |

### Index Maintenance

```sql
-- PostgreSQL: Check index usage
SELECT
    schemaname || '.' || relname AS table,
    indexrelname AS index,
    idx_scan AS times_used,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- Unused indexes: idx_scan = 0
-- Consider dropping these
```

---

## 🔄 THE N+1 PROBLEM

### The Problem

```python
# ❌ BAD: N+1 queries
courses = Course.objects.all()
for course in courses:  # 1 query
    print(course.instructor.name)  # N queries!

# Total: 1 + N queries (if 100 courses = 101 queries)
```

### Solutions

```python
# ✅ select_related (ForeignKey, OneToOne)
courses = Course.objects.select_related('instructor').all()
for course in courses:  # 1 query with JOIN
    print(course.instructor.name)  # No additional query

# ✅ prefetch_related (ManyToMany, reverse ForeignKey)
courses = Course.objects.prefetch_related('lessons').all()
for course in courses:  # 2 queries total
    for lesson in course.lessons.all():  # No additional query
        print(lesson.title)

# ✅ Combined
courses = Course.objects.select_related(
    'instructor', 'category'
).prefetch_related(
    'lessons', 'tags'
).all()  # 3 queries total (main + lessons + tags)
```

### Prefetch with Custom Query

```python
from django.db.models import Prefetch

# Only prefetch published lessons, ordered by position
courses = Course.objects.prefetch_related(
    Prefetch(
        'lessons',
        queryset=Lesson.objects.filter(is_published=True).order_by('order')
    )
).all()
```

---

## 🔌 CONNECTION POOLING

### Why Pool?

```
Without pooling:
Request 1 → Create connection → Query → Close connection
Request 2 → Create connection → Query → Close connection
⚠️ Connection creation is expensive!

With pooling:
Request 1 → Get from pool → Query → Return to pool
Request 2 → Get from pool → Query → Return to pool
✅ Reuse existing connections
```

### PgBouncer Setup

```ini
# pgbouncer.ini
[databases]
learninghub = host=localhost dbname=learninghub

[pgbouncer]
pool_mode = transaction
max_client_conn = 100
default_pool_size = 20
```

### Django Configuration

```python
# settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'learninghub',
        'CONN_MAX_AGE': 600,  # Keep connections alive for 10 minutes
        'OPTIONS': {
            'MAX_CONNS': 20,
        }
    }
}
```

---

## 📦 SHARDING & PARTITIONING

### Partitioning (Single DB)

```sql
-- PostgreSQL: Range partitioning by date
CREATE TABLE enrollments (
    id SERIAL,
    user_id INT,
    course_id INT,
    created_at TIMESTAMPTZ
) PARTITION BY RANGE (created_at);

-- Create partitions
CREATE TABLE enrollments_2024
    PARTITION OF enrollments
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE enrollments_2025
    PARTITION OF enrollments
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
```

### Sharding (Multiple DBs)

```python
# Django database routers
class ShardRouter:
    def db_for_read(self, model, **hints):
        if model._meta.app_label == 'users':
            user_id = hints.get('instance', {}).get('id', 0)
            shard = user_id % 4  # 4 shards
            return f'shard_{shard}'
        return 'default'

    def db_for_write(self, model, **hints):
        return self.db_for_read(model, **hints)

# settings.py
DATABASES = {
    'default': {...},
    'shard_0': {...},
    'shard_1': {...},
    'shard_2': {...},
    'shard_3': {...},
}
```

---

## 💾 CACHING STRATEGIES

### Cache Layers

```
┌──────────────────────────────────────────────────────────┐
│                     Application                           │
├──────────────────────────────────────────────────────────┤
│  L1: Query Cache (per-request)                           │
│  L2: Redis/Memcached (shared)                            │
│  L3: Database Query Cache                                │
│  L4: Database Disk                                       │
└──────────────────────────────────────────────────────────┘
```

### Django Cache Patterns

```python
from django.core.cache import cache

# 1. Simple caching
def get_popular_courses():
    key = 'popular_courses'
    courses = cache.get(key)
    if courses is None:
        courses = list(Course.objects.order_by('-enrollment_count')[:10])
        cache.set(key, courses, timeout=300)  # 5 minutes
    return courses

# 2. Cache-aside pattern
def get_course(slug):
    key = f'course:{slug}'
    course = cache.get(key)
    if course is None:
        course = Course.objects.select_related('instructor').get(slug=slug)
        cache.set(key, course, timeout=3600)  # 1 hour
    return course

# 3. Invalidation
def update_course(course):
    course.save()
    cache.delete(f'course:{course.slug}')
    cache.delete('popular_courses')  # Might have changed

# 4. Decorator pattern
from django.views.decorators.cache import cache_page

@cache_page(60 * 15)  # 15 minutes
def course_list(request):
    pass
```

### Redis for Complex Caching

```python
import redis
import json

r = redis.Redis(host='localhost', port=6379, db=0)

# Leaderboard with sorted sets
def get_leaderboard():
    # Returns [(user_id, xp), ...] sorted by XP
    return r.zrevrange('leaderboard', 0, 9, withscores=True)

def update_xp(user_id, xp):
    r.zincrby('leaderboard', xp, user_id)

# Real-time counters
def get_online_users():
    return r.scard('online_users')

def user_online(user_id):
    r.sadd('online_users', user_id)
    r.expire('online_users', 300)  # 5 minute expiry
```

---

## 📈 DATABASE MONITORING

### Key Metrics

| Metric               | What it Shows       | Alert Threshold |
| -------------------- | ------------------- | --------------- |
| **QPS**              | Queries per second  | Baseline + 50%  |
| **Connection count** | Active connections  | 80% of max      |
| **Slow queries**     | Queries > threshold | Any             |
| **Lock waits**       | Blocked queries     | > 100ms         |
| **Replication lag**  | Slave delay         | > 1 second      |
| **Disk I/O**         | Read/Write ops      | > 80% capacity  |

### PostgreSQL Monitoring Queries

```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

-- Long running queries
SELECT pid, now() - query_start AS runtime, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > interval '5 seconds';

-- Table sizes
SELECT
    relname AS table,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 10;

-- Cache hit ratio (should be > 99%)
SELECT
    sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as cache_hit_ratio
FROM pg_statio_user_tables;
```

---

## 🔄 MIGRATIONS BEST PRACTICES

### Safe Migration Patterns

```python
# ✅ SAFE: Adding nullable column
class Migration(migrations.Migration):
    operations = [
        migrations.AddField(
            model_name='course',
            name='new_field',
            field=models.CharField(max_length=100, null=True),
        ),
    ]

# ⚠️ RISKY: Adding non-nullable column
# Do in two migrations:
# 1. Add as nullable
# 2. Backfill data
# 3. Make non-nullable

# ✅ SAFE: Creating index concurrently (PostgreSQL)
class Migration(migrations.Migration):
    atomic = False  # Required for concurrent operations

    operations = [
        migrations.RunSQL(
            sql='CREATE INDEX CONCURRENTLY idx_course_title ON courses(title);',
            reverse_sql='DROP INDEX CONCURRENTLY idx_course_title;',
        ),
    ]

# ❌ DANGEROUS: Renaming column (breaks reads during migration)
# Instead: Add new column → copy data → remove old column
```

### Zero-Downtime Migrations

1. **Expand**: Add new column/table
2. **Migrate**: Copy data (background job)
3. **Contract**: Remove old column/table

---

## 💎 DATABASE GOLDEN RULES

1. **Index your queries** - Start with EXPLAIN ANALYZE
2. **Avoid N+1** - Always use select_related/prefetch_related
3. **Cache aggressively** - Database is the bottleneck
4. **Monitor continuously** - Set up alerts
5. **Migrate safely** - Never lock tables in production
6. **Pool connections** - Don't waste connection setup time

---

**SINGULARITY ENGINE v16.0**  
_"A fast database is a well-indexed, well-cached, well-monitored database."_
