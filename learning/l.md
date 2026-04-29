# Learning Hub - Instructor Mode: Production Deployment 🚀

**Date**: 2026-01-25
**Lesson**: 6 - Observability & Monitoring 📊
**Status**: PLANNING

---

## 🎓 Concept: Flying Blind vs. Instrument Flying

In development, if something breaks, you see the error in your terminal.
In production, if something breaks for User #4052, **how do you know?**

**Observability** is the ability to understand the internal state of a system from its external outputs.

### The Three Pillars of Observability

1.  **Metrics** (Numerical Data)
    - _Example_: "CPU usage is 80%", "API Latency is 200ms", "500 Errors per minute".
    - _Tool_: **Prometheus** (Collection) + **Grafana** (Visualization).

2.  **Logs** (Event Data)
    - _Example_: "User X failed login", "Payment gateway timed out".
    - _Tool_: **ELK Stack** (Elasticsearch, Logstash, Kibana) or **Loki**.
    - _Best Practice_: Use **Structured Logging** (JSON) so machines can parse it.

3.  **Traces** (Request Lifecyle)
    - _Example_: "Request hit Load Balancer -> Auth Service (50ms) -> Database (100ms) -> Cache (5ms)".
    - _Tool_: **Jaeger** or **OpenTelemetry**.

---

## 🛠️ Implementation Plan: Django + Prometheus

We will use `django-prometheus` to automatically export metrics.

1.  **Install**: `pip install django-prometheus`
2.  **Configure**: Add to `INSTALLED_APPS` and Middleware.
3.  **Expose**: Add `path('', include('django_prometheus.urls'))`.

### The "Golden Signals" of Monitoring

Google SREs recommend monitoring these four:

1.  **Latency**: Time it takes to serve a request.
2.  **Traffic**: How much demand is on your system (req/sec).
3.  **Errors**: rate of requests failing (5xx codes).
4.  **Saturation**: How "full" your service is (CPU/Memory).

---

## 🚀 CI/CD Pipeline (GitHub Actions)

We automate our "Safety Checks" so bad code never reaches production.

**Workflow**:

1.  **Push Code** -> Triggers Action.
2.  **Lint**: Check code style (`ruff`, `flake8`).
3.  **Test**: Run Unit Tests (`pytest`).
4.  **Security**: Run `snyk` (as we did manually).
5.  **Build**: Docker build (optional).
6.  **Deploy**: Only if all above pass.

**Status**: We found existing workflows in `.github/workflows`. We will optimize them for our current stack.

---

[Go to Lesson 7: Vector Databases & RAG](./l7_rag.md)
[Go to Lesson 8: Voice Architecture](./l8_voice.md)
[Go to Lesson 9: Event-Driven Architecture](./l9_async.md)
[Go to Lesson 10: Kubernetes & Helm](./l10_k8s.md)
[Go to Lesson 11: CI/CD for Kubernetes](./l11_cicd.md)
[Go to Lesson 12: Observability](./l12_observability.md)
[Go to Lesson 13: Security Hardening](./l13_security.md)
