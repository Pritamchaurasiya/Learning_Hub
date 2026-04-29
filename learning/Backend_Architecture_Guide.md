# 🏗️ Backend System Architecture: The "God Mode" Guide

## 📡 1. Event-Driven Architecture (EDA)

### 🧠 The Concept

In a traditional "Monolithic" app, component A calls component B directly.

- **Problem**: If B is slow, A waits. If B fails, A crashes. Tightly coupled.
- **Solution (EDA)**: A fires an _Event_ ("User Signed Up"). B listens for it. A doesn't care if B exists, is slow, or fails.

### ⚡ Implementation in Learning Hub

We use **Django Signals** (In-Process) and **Celery** (Distributed) to implement this.

#### A. Django Signals (Synchronous/In-Process)

**Use Case**: Decoupling code within the same transaction.
**Example**: Creating a `UserProfile` when `User` is created.

```python
# signals.py
@receiver(post_save, sender=User)
def create_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)
```

_Why?_: The `User` model shouldn't know about `UserProfile`. It just does its job.

#### B. Celery Tasks (Asynchronous/Distributed)

**Use Case**: Heavy lifting that shouldn't block the API.
**Example**: Running the Docker Sandbox.

```python
# tasks.py
@shared_task
def evaluate_submission(submission_id):
    # This runs in a separate process (Worker)
    # The API returns 200 OK immediately
    pass
```

---

## 🏎️ 2. Caching Strategies (Redis)

### 🧠 The Concept

The fastest query is the one you never make. Caching stores the result of expensive operations in RAM (Redis).

### 🛡️ Strategies

1.  **Cache-Aside (Lazy Loading)**:

    - Check Cache -> Found? Return.
    - Not Found? Query DB -> Return -> Write to Cache.
    - _Pros_: Resilient to cache failure.
    - _Cons_: First hit is slow.

2.  **Write-Through**:
    - Update DB -> Update Cache immediately.
    - _Pros_: Reads are always fast.
    - _Cons_: Write latency increases.

### 🛠️ Implementation

We use **Cache-Aside** for the Leaderboard.

```python
def get_leaderboard():
    cache_key = 'global_leaderboard'
    data = cache.get(cache_key)
    if not data:
        data = calculate_complex_rankings()  # Expensive!
        cache.set(cache_key, data, timeout=300)  # 5 mins
    return data
```

---

## 🔄 3. System Design Patterns

### 🧩 A. The Repository Pattern

**Concept**: Abstraction layer between Business Logic and Data Access.
**Why**: If we swap SQL for NoSQL, our business logic shouldn't break.
**Django Context**: `selectors.py` and `services.py`.

```python
# services.py (Business Logic)
def create_submission(user, code):
    # Validation logic here...
    return submission_repo.create(user=user, code=code)
```

### 🔐 B. The Outbox Pattern (Advanced)

**Problem**: You save to DB but the Event fails to publish. Data inconsistency!
**Solution**: Save the "Event" to a DB table (`Outbox`) _in the same transaction_. A separate worker verifies delivery.

---

## 📈 4. Scaling to 10k Users

### The Bottlenecks

1.  **Database connections**: Django opens a connection per request.
    - _Fix_: **PgBouncer** (Connection Pooling).
2.  **Python GIL**: Python can only do one CPU task at a time.
    - _Fix_: **Gunicorn** with multiple workers (Process-based parallelism).
3.  **Static Files**: Serving CSS/JS from Django is slow.
    - _Fix_: **WhiteNoise** or AWS S3 + CloudFront (CDN).

### CAP Theorem Trade-off

For a Learning Platform, we choose **Availability** and **Partition Tolerance** (AP) over strict Consistency (CP) for things like "View Counts" or "Leaderboards". It's okay if a score updates 5 seconds late, but it's NOT okay if the site goes down.

---

## 🧪 5. Testing & Observability

### Logging vs. Monitoring vs. Tracing

- **Logging**: "Something happened" (Error logs).
- **Monitoring**: "aggregated state" (CPU usage, Requests/sec).
- **Tracing**: "Where did the time go?" (Request ID #123 spent 50ms in DB, 200ms in Redis).

### Prometheus & Grafana

- We expose metrics at `/metrics`.
- Prometheus scrapes them.
- Grafana renders beautiful dashboards.

---

_Master this guide, and you master the backend._
