# 📊 LOGGING & MONITORING: PRODUCTION GUIDE

## Observability for Production Systems

---

## 📋 TABLE OF CONTENTS

1. [Logging Fundamentals](#-logging-fundamentals)
2. [Structured Logging](#-structured-logging)
3. [Django Logging](#-django-logging)
4. [Flutter Logging](#-flutter-logging)
5. [Metrics & Dashboards](#-metrics--dashboards)
6. [Alerting Strategies](#-alerting-strategies)
7. [Distributed Tracing](#-distributed-tracing)

---

## 📝 LOGGING FUNDAMENTALS

### Log Levels

```
DEBUG   → Detailed diagnostic info (dev only)
INFO    → Normal operation events
WARNING → Potential issues, degraded functionality
ERROR   → Operation failed, but system continues
CRITICAL → System failure, requires immediate action
```

### What to Log

```
✅ DO LOG:
- Request/response for key APIs
- Authentication events (login, logout, failures)
- Business transactions (purchases, enrollments)
- Errors with stack traces
- Performance metrics (slow queries)
- Security events (rate limits, suspicious activity)

❌ DON'T LOG:
- Passwords or tokens
- Credit card numbers
- Personal data (PII)
- Large payloads
- High-frequency debug in production
```

---

## 🏗️ STRUCTURED LOGGING

### Why Structured?

```python
# ❌ Unstructured - hard to parse
logger.info("User john@email.com enrolled in course 123 for $49.99")

# ✅ Structured - easy to query
logger.info("enrollment_created", extra={
    'user_email': 'john@email.com',
    'course_id': 123,
    'amount': 49.99,
    'currency': 'USD'
})
```

### JSON Logging

```python
# settings.py
import json
import logging

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            'timestamp': self.formatTime(record),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
        }

        # Add extra fields
        if hasattr(record, 'user_id'):
            log_data['user_id'] = record.user_id
        if hasattr(record, 'request_id'):
            log_data['request_id'] = record.request_id
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)

        return json.dumps(log_data)

LOGGING = {
    'version': 1,
    'formatters': {
        'json': {
            '()': JSONFormatter,
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}
```

---

## 🐍 DJANGO LOGGING

### Middleware for Request Logging

```python
# middleware.py
import logging
import time
import uuid

logger = logging.getLogger('request')

class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = str(uuid.uuid4())[:8]
        request.request_id = request_id

        start_time = time.time()

        response = self.get_response(request)

        duration = (time.time() - start_time) * 1000

        logger.info("request_completed", extra={
            'request_id': request_id,
            'method': request.method,
            'path': request.path,
            'status': response.status_code,
            'duration_ms': round(duration, 2),
            'user_id': getattr(request.user, 'id', None),
        })

        return response
```

### Performance Logging

```python
from django.db import connection
from functools import wraps
import logging

logger = logging.getLogger('performance')

def log_slow_queries(threshold_ms=100):
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            initial_queries = len(connection.queries)

            response = view_func(request, *args, **kwargs)

            queries = connection.queries[initial_queries:]
            slow_queries = [q for q in queries if float(q['time']) * 1000 > threshold_ms]

            if slow_queries:
                logger.warning("slow_queries_detected", extra={
                    'path': request.path,
                    'slow_query_count': len(slow_queries),
                    'queries': slow_queries[:5],  # Log first 5
                })

            return response
        return wrapper
    return decorator
```

---

## 📱 FLUTTER LOGGING

### Logger Service

```dart
import 'package:logger/logger.dart';

class AppLogger {
  static final Logger _logger = Logger(
    printer: PrettyPrinter(
      methodCount: 2,
      errorMethodCount: 5,
      lineLength: 100,
      colors: true,
      printEmojis: true,
    ),
    level: kReleaseMode ? Level.warning : Level.debug,
  );

  static void debug(String message, [dynamic data]) {
    _logger.d(message, error: data);
  }

  static void info(String message, [dynamic data]) {
    _logger.i(message, error: data);
  }

  static void warning(String message, [dynamic data]) {
    _logger.w(message, error: data);
  }

  static void error(String message, [dynamic error, StackTrace? stack]) {
    _logger.e(message, error: error, stackTrace: stack);

    // Send to crash reporting in production
    if (kReleaseMode) {
      FirebaseCrashlytics.instance.recordError(error, stack);
    }
  }
}

// Usage
AppLogger.info('User logged in', {'user_id': userId});
AppLogger.error('Payment failed', exception, stackTrace);
```

---

## 📈 METRICS & DASHBOARDS

### Key Metrics

| Category       | Metrics                           |
| -------------- | --------------------------------- |
| **Latency**    | p50, p95, p99 response times      |
| **Traffic**    | Requests per second, active users |
| **Errors**     | Error rate, 5xx count             |
| **Saturation** | CPU, memory, DB connections       |

### Prometheus Metrics

```python
# metrics.py
from prometheus_client import Counter, Histogram, Gauge

# Counters
http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

# Histograms
http_request_duration = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration',
    ['method', 'endpoint'],
    buckets=[.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10]
)

# Gauges
active_users = Gauge(
    'active_users',
    'Currently active users'
)

# Usage in middleware
http_requests_total.labels(
    method=request.method,
    endpoint=request.path,
    status=response.status_code
).inc()

with http_request_duration.labels(
    method=request.method,
    endpoint=request.path
).time():
    response = view_func(request)
```

---

## 🚨 ALERTING STRATEGIES

### Alert Levels

| Level           | Response Time | Example                       |
| --------------- | ------------- | ----------------------------- |
| **P1 Critical** | 15 min        | Site down, payments failing   |
| **P2 High**     | 1 hour        | Major feature broken          |
| **P3 Medium**   | 4 hours       | Non-critical feature degraded |
| **P4 Low**      | Next day      | Minor issue, cosmetic         |

### Alert Rules (Prometheus)

```yaml
groups:
  - name: api_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate ({{ $value | humanizePercentage }})"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High p95 latency ({{ $value | humanizeDuration }})"
```

---

## 🔗 DISTRIBUTED TRACING

### OpenTelemetry Setup

```python
from opentelemetry import trace
from opentelemetry.instrumentation.django import DjangoInstrumentor
from opentelemetry.exporter.jaeger.thrift import JaegerExporter

# Initialize tracing
DjangoInstrumentor().instrument()

tracer = trace.get_tracer(__name__)

@tracer.start_as_current_span("enroll_user")
def enroll_user(user_id, course_id):
    span = trace.get_current_span()
    span.set_attribute("user_id", user_id)
    span.set_attribute("course_id", course_id)

    # Nested spans
    with tracer.start_as_current_span("process_payment"):
        payment = process_payment(user_id, course_id)

    with tracer.start_as_current_span("create_enrollment"):
        enrollment = create_enrollment(user_id, course_id)

    return enrollment
```

---

## 💎 LOGGING GOLDEN RULES

1. **Log context** - Include request ID, user ID
2. **Use structured logs** - JSON for parsing
3. **Don't log secrets** - Sanitize sensitive data
4. **Alert on symptoms** - Not every error
5. **Retain appropriately** - 30 days typical

---

**SINGULARITY ENGINE v16.0**  
_"You can't fix what you can't see."_
