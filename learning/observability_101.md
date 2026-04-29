# Observability 101: Watching the Watchmen

**Course Instructor:** Antigravity AI
**Level:** DevOps Engineering
**Topic:** Monitoring, Metrics, and "The Three Pillars"

---

## Module 1: "Why is the site slow?"

Without observability, you are flying blind.

- _Is the DB slow?_
- _Is the API crashing?_
- _Are users even logging in?_

**Observability** answers these questions before the user complains.

---

## Module 2: The Three Pillars

1.  **Logs (The Story)**:
    - "User X logged in."
    - "Error: Division by zero."
    - _Tool:_ `structlog` (JSON logs for machines).

2.  **Metrics (The Health Bar)**:
    - "CPU Usage: 40%."
    - "Requests per second: 50."
    - _Tool:_ **Prometheus**.

3.  **Traces (The Roadmap)**:
    - "Request took 500ms (100ms in Django, 400ms in DB)."
    - _Tool:_ OpenTelemetry / Sentry.

---

## Module 3: Implementation in Learning Hub

We instrumented our code with **Prometheus Counters**.

### 1. Business Metrics (`apps.core.metrics.py`)

We don't just track CPU. We track _Business Value_.

- `XP_AWARDED_TOTAL`: Are users playing?
- `AI_QUESTIONS_TOTAL`: Are users learning?

### 2. Instrumentation Code

```python
from apps.core.metrics import XP_AWARDED_TOTAL
XP_AWARDED_TOTAL.labels(reason="quiz").inc(50)
```

This increments a counter in memory. Prometheus scrapes `/metrics` every 15s to collect this data.

---

## Module 4: The Dashboard (Grafana)

(Hypothetical Setup)

- **Panel 1 (Engagement):** Rate of XP awarded per minute.
- **Panel 2 (AI Costs):** Rate of AI Questions (helps predict API bill).
- **Panel 3 (Errors):** Rate of 500 responses.

---

## Assignment

1.  Review `apps/core/metrics.py` to see the definitions.
2.  Imagine a Dashboard: What metric would tell you if the Payment Gateway is down? (Hint: `PAYMENTS_FAILED_TOTAL`).

_Class Dismissed. Keep your eyes open._
