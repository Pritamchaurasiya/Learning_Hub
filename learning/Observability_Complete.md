# 👁️ OBSERVABILITY COMPLETE GUIDE

## The Three Pillars: Metrics, Logs, Traces

---

## 📋 TABLE OF CONTENTS

1. [What is Observability](#-what-is-observability)
2. [Metrics](#-metrics)
3. [Logs](#-logs)
4. [Traces](#-traces)
5. [OpenTelemetry](#-opentelemetry)
6. [Alerting](#-alerting)
7. [Implementation](#-implementation)
8. [Best Practices](#-best-practices)

---

## 🎯 WHAT IS OBSERVABILITY

### Definition

**Observability** is the ability to understand the internal state of a system by examining its external outputs.

### Monitoring vs Observability

| Monitoring            | Observability           |
| --------------------- | ----------------------- |
| "Is it working?"      | "Why isn't it working?" |
| Known unknowns        | Unknown unknowns        |
| Predefined dashboards | Ad-hoc exploration      |
| Reactive              | Proactive               |

### The Three Pillars

```
┌─────────────────────────────────────────────────────────┐
│                   OBSERVABILITY                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐           │
│  │  METRICS  │  │   LOGS    │  │  TRACES   │           │
│  │           │  │           │  │           │           │
│  │  Numbers  │  │  Events   │  │  Requests │           │
│  │  over     │  │  with     │  │  across   │           │
│  │  time     │  │  context  │  │  services │           │
│  └───────────┘  └───────────┘  └───────────┘           │
│                                                          │
│  "What happened?" → "Why?" → "Where exactly?"           │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 METRICS

### Types of Metrics

| Type          | Description               | Example               |
| ------------- | ------------------------- | --------------------- |
| **Counter**   | Monotonically increasing  | Total requests        |
| **Gauge**     | Current value (up/down)   | CPU usage, queue size |
| **Histogram** | Distribution of values    | Request latency       |
| **Summary**   | Quantiles (p50, p95, p99) | Response times        |

### Prometheus Example

```python
from prometheus_client import Counter, Gauge, Histogram, Summary

# Counter
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

# Gauge
ACTIVE_CONNECTIONS = Gauge(
    'active_connections',
    'Number of active connections'
)

# Histogram
REQUEST_LATENCY = Histogram(
    'http_request_duration_seconds',
    'Request latency in seconds',
    ['endpoint'],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)

# Usage
@REQUEST_LATENCY.labels(endpoint='/api/users').time()
def handle_request():
    REQUEST_COUNT.labels(method='GET', endpoint='/api/users', status=200).inc()
    ACTIVE_CONNECTIONS.inc()
    try:
        # Process...
        pass
    finally:
        ACTIVE_CONNECTIONS.dec()
```

### Django Metrics Middleware

```python
import time
from prometheus_client import Counter, Histogram

REQUEST_COUNT = Counter(
    'django_http_requests_total',
    'Total requests',
    ['method', 'path', 'status']
)

REQUEST_LATENCY = Histogram(
    'django_http_request_duration_seconds',
    'Request latency',
    ['method', 'path']
)

class PrometheusMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.time()

        response = self.get_response(request)

        duration = time.time() - start
        path = self._get_path(request)

        REQUEST_COUNT.labels(
            method=request.method,
            path=path,
            status=response.status_code
        ).inc()

        REQUEST_LATENCY.labels(
            method=request.method,
            path=path
        ).observe(duration)

        return response

    def _get_path(self, request):
        # Normalize paths to avoid cardinality explosion
        # /users/123 → /users/{id}
        return request.resolver_match.route if request.resolver_match else request.path
```

### Key Metrics to Track

```
RED Method (Request-Driven Services):
- Rate: Requests per second
- Errors: Errors per second
- Duration: Latency distribution

USE Method (Resources):
- Utilization: % time resource is busy
- Saturation: Queue depth
- Errors: Error count
```

---

## 📝 LOGS

### Structured Logging

```python
import structlog
import json

# Configure structured logging
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer()
    ]
)

logger = structlog.get_logger()

# Usage
logger.info(
    "user_login",
    user_id="user-123",
    ip_address="192.168.1.1",
    success=True,
    duration_ms=45
)

# Output:
# {"event": "user_login", "user_id": "user-123", "ip_address": "192.168.1.1",
#  "success": true, "duration_ms": 45, "level": "info", "timestamp": "2026-01-07T10:00:00Z"}
```

### Log Levels

| Level        | Usage                         |
| ------------ | ----------------------------- |
| **DEBUG**    | Detailed troubleshooting info |
| **INFO**     | General operational events    |
| **WARNING**  | Unexpected but handled        |
| **ERROR**    | Errors requiring attention    |
| **CRITICAL** | System-wide failures          |

### Django Logging Config

```python
# settings.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(asctime)s %(levelname)s %(name)s %(message)s'
        }
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json'
        },
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': 'logs/app.log',
            'maxBytes': 10*1024*1024,  # 10MB
            'backupCount': 5,
            'formatter': 'json'
        }
    },
    'root': {
        'level': 'INFO',
        'handlers': ['console', 'file']
    }
}
```

### Correlation IDs

```python
import uuid
from contextvars import ContextVar

request_id: ContextVar[str] = ContextVar('request_id', default='')

class RequestIDMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Get or generate request ID
        req_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        request_id.set(req_id)

        response = self.get_response(request)
        response['X-Request-ID'] = req_id
        return response

# In logging
logger.info("Processing order", request_id=request_id.get(), order_id=123)
```

---

## 🔗 TRACES

### Distributed Tracing Concept

```
┌─────────────────────────────────────────────────────────────────┐
│                      Distributed Trace                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Trace ID: abc-123-xyz                                          │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Span: API Gateway (50ms)                                 │   │
│  │ span_id: span-001, parent: null                          │   │
│  └────────┬─────────────────────────────────────────────────┘   │
│           │                                                      │
│           ▼                                                      │
│  ┌──────────────────────────────────────────────────┐           │
│  │ Span: Order Service (35ms)                       │           │
│  │ span_id: span-002, parent: span-001              │           │
│  └────────┬─────────────┬───────────────────────────┘           │
│           │             │                                        │
│           ▼             ▼                                        │
│  ┌─────────────┐   ┌─────────────┐                              │
│  │ Span: DB    │   │ Span: Cache │                              │
│  │ (15ms)      │   │ (5ms)       │                              │
│  │ span-003    │   │ span-004    │                              │
│  └─────────────┘   └─────────────┘                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### OpenTelemetry Tracing

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.jaeger.thrift import JaegerExporter

# Setup
trace.set_tracer_provider(TracerProvider())
tracer = trace.get_tracer(__name__)

jaeger_exporter = JaegerExporter(
    agent_host_name="localhost",
    agent_port=6831,
)
trace.get_tracer_provider().add_span_processor(
    BatchSpanProcessor(jaeger_exporter)
)

# Usage
async def process_order(order_id):
    with tracer.start_as_current_span("process_order") as span:
        span.set_attribute("order.id", order_id)

        # Child span
        with tracer.start_as_current_span("validate_order"):
            await validate(order_id)

        with tracer.start_as_current_span("charge_payment"):
            await charge(order_id)

        span.add_event("order_completed")
```

---

## 🔭 OPENTELEMETRY

### All-in-One Setup

```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.resources import Resource
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Resource identifies your service
resource = Resource.create({
    "service.name": "learning-hub-backend",
    "service.version": "1.0.0",
    "deployment.environment": "production"
})

# Traces
trace.set_tracer_provider(TracerProvider(resource=resource))
trace.get_tracer_provider().add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://otel-collector:4317"))
)

# Metrics
metrics.set_meter_provider(MeterProvider(resource=resource))
```

### Auto-Instrumentation

```bash
# Install
pip install opentelemetry-instrumentation-django
pip install opentelemetry-instrumentation-requests
pip install opentelemetry-instrumentation-psycopg2

# Auto-instrument
opentelemetry-instrument python manage.py runserver
```

---

## 🚨 ALERTING

### Alert Rules (Prometheus)

```yaml
# alerts.yaml
groups:
  - name: api_alerts
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) 
          / sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High 5xx error rate"
          description: "Error rate is {{ $value | humanizePercentage }}"

      - alert: HighLatency
        expr: |
          histogram_quantile(0.95, 
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
          ) > 0.5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "P95 latency above 500ms"
```

### Alerting Best Practices

| Do                              | Don't                      |
| ------------------------------- | -------------------------- |
| Alert on symptoms (user impact) | Alert on causes (CPU high) |
| Use SLOs for thresholds         | Use arbitrary limits       |
| Include runbook links           | Leave responders guessing  |
| Have clear ownership            | Alert everyone             |
| Test alerts regularly           | Assume they work           |

---

## 🛠️ IMPLEMENTATION

### Docker Compose Stack

```yaml
version: "3.8"
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686" # UI
      - "6831:6831/udp" # Agent

  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"

volumes:
  grafana-data:
```

---

## 💎 BEST PRACTICES

### Metrics

- ✅ Use consistent naming (`http_requests_total`, not `httpRequests`)
- ✅ Watch cardinality (don't label by user_id)
- ✅ Use histograms for latency, not averages

### Logs

- ✅ Always use structured logging
- ✅ Include correlation IDs
- ✅ Log at appropriate levels

### Traces

- ✅ Propagate context across services
- ✅ Add meaningful span attributes
- ✅ Sample in production (1-10%)

### General

- ✅ Start with RED metrics
- ✅ Build dashboards before you need them
- ✅ Practice incident response

---

**SINGULARITY ENGINE v17.0**  
_"You can't improve what you can't measure."_
