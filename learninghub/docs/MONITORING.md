# LearningHub — Monitoring & Observability

This document is the **authoritative observability guide** for the LearningHub platform. It covers metrics, logging, alerting, and incident response.

## 1. Observability Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| **Metrics** | Prometheus + Grafana | Time-series metrics, dashboards |
| **Logging** | Loki / ELK | Centralized log aggregation |
| **Tracing** | OpenTelemetry + Jaeger | Distributed request tracing |
| **Errors** | Sentry | Frontend + backend error tracking |
| **Uptime** | BetterUptime / Pingdom | External uptime monitoring |
| **APM** | Datadog / New Relic (optional) | Full APM suite |

## 2. Key Metrics (SLI/SLO)

### 2.1 Availability SLI

```
availability = (successful_requests / total_requests) * 100
```

**SLO Targets:**
- API: 99.9% availability (43 min downtime/month max)
- Frontend: 99.95% availability (22 min downtime/month max)
- WebSocket: 99.5% availability

### 2.2 Latency SLI

**SLO Targets (p95 latency):**
- `/auth/login`: < 300ms
- `/tests/:id/start`: < 500ms
- `/tests/:id/submit`: < 1500ms
- `/ai/tutor`: < 5000ms (or timeout)
- `/api/v1/courses`: < 200ms
- `/api/v1/notifications`: < 100ms

### 2.3 Error Rate SLI

**SLO Targets:**
- 5xx errors: < 0.1% of total requests
- 4xx errors: < 5% of total requests
- WebSocket disconnects: < 1% per hour

## 3. Application Metrics

### 3.1 Business Metrics (Track in Dashboard)

| Metric | Source | Why it matters |
|--------|--------|----------------|
| **DAU (Daily Active Users)** | User activity logs | Engagement |
| **Test Attempts/Day** | TestResult count | Core feature usage |
| **Course Completions/Day** | Enrollment.progress = 100 | Learning outcome |
| **XP Awarded/Day** | XPTransaction | Gamification health |
| **AI Tutor Queries/Day** | AIChatMessage count | AI cost & usage |
| **Payments/Day** | Order count | Revenue |
| **Active Subscriptions** | Subscription count | MRR |
| **Average Score** | TestResult.percentage | Learning quality |
| **Streak Distribution** | User.streak | Engagement |

### 3.2 Technical Metrics (Prometheus)

**HTTP metrics:**
```
http_requests_total{method, route, status}
http_request_duration_seconds{method, route, status}
http_request_size_bytes{method, route}
http_response_size_bytes{method, route}
```

**Database metrics:**
```
db_queries_total{table, operation}
db_query_duration_seconds{table, operation}
db_connection_pool_active
db_connection_pool_idle
```

**Cache metrics:**
```
cache_hits_total{key_prefix}
cache_misses_total{key_prefix}
cache_evictions_total
```

**AI metrics:**
```
ai_requests_total{provider, mode, status}
ai_tokens_total{provider, model, type}  # type: input/output
ai_cost_usd_total{provider, model}
ai_duration_seconds{provider, model}
```

**Auth metrics:**
```
auth_login_total{status}  # status: success/failed
auth_token_refresh_total{status}
auth_failed_attempts_total{user_id, ip}
auth_mfa_total{status}
```

**WebSocket metrics:**
```
ws_connections_active
ws_connections_total{event}
ws_disconnects_total{reason}
ws_messages_total{event, direction}
```

### 3.3 Infrastructure Metrics (Node Exporter / CloudWatch)

- CPU, memory, disk, network I/O
- Container metrics (if using K8s/ECS)
- DB connection pool stats
- Redis memory usage

## 4. Logging Standards

### 4.1 Log Format (JSON)

All logs should be structured JSON:

```json
{
  "timestamp": "2026-01-01T00:00:00.000Z",
  "level": "info",
  "service": "node-backend",
  "trace_id": "abc123",
  "user_id": "user-456",
  "route": "/api/v1/tests/123/submit",
  "method": "POST",
  "status": 200,
  "duration_ms": 234,
  "message": "Test submitted successfully",
  "metadata": {
    "test_id": "test-123",
    "score": 85,
    "xp_awarded": 50
  }
}
```

### 4.2 Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | ISO 8601 | When log was created |
| `level` | string | error / warn / info / debug |
| `service` | string | node-backend, django-backend, frontend |
| `trace_id` | string | For distributed tracing |
| `message` | string | Human-readable |
| `metadata` | object | Additional context |

### 4.3 PII Redaction

**NEVER log:**
- Passwords (plain or hashed)
- JWT tokens
- API keys
- Credit card numbers
- Email addresses (use hashed user_id)
- IP addresses (in EU regions - GDPR)

Use a redaction library:
```typescript
import { redactPII } from './utils/redact'
logger.info({ user: redactPII(user) }, 'User logged in')
```

### 4.4 Log Retention

| Environment | Retention |
|-------------|-----------|
| Production | 90 days |
| Staging | 30 days |
| Development | 7 days |

## 5. Alerting Rules

### 5.1 Critical Alerts (Page on-call)

```yaml
# High error rate
- alert: HighErrorRate
  expr: |
    sum(rate(http_requests_total{status=~"5.."}[5m])) /
    sum(rate(http_requests_total[5m])) > 0.01
  for: 5m
  severity: critical
  action: Page on-call

# API down
- alert: APIDown
  expr: up{job="backend"} == 0
  for: 1m
  severity: critical
  action: Page on-call

# Database connection pool exhausted
- alert: DBPoolExhausted
  expr: db_connection_pool_active / db_connection_pool_max > 0.9
  for: 2m
  severity: critical
  action: Page on-call
```

### 5.2 Warning Alerts (Slack notification)

```yaml
# High latency
- alert: HighLatency
  expr: |
    histogram_quantile(0.95, http_request_duration_seconds) > 1
  for: 10m
  severity: warning
  action: Slack #alerts

# AI cost spike
- alert: AICostSpike
  expr: |
    increase(ai_cost_usd_total[1h]) > 100
  for: 5m
  severity: warning
  action: Slack #alerts

# Failed login spike (possible attack)
- alert: FailedLoginSpike
  expr: |
    sum(rate(auth_failed_attempts_total[5m])) > 50
  for: 5m
  severity: warning
  action: Slack #security
```

### 5.3 Info Alerts (Dashboard only)

```yaml
# Daily user count
- alert: DailyUsers
  expr: count(distinct(user_id_active)) > 1000
  for: 1h
  severity: info
  action: Dashboard
```

## 6. Dashboards

### 6.1 Main Dashboard (Grafana)

**Panels:**
1. Request rate (per endpoint)
2. Error rate (4xx, 5xx)
3. p50/p95/p99 latency
4. Active users (DAU, WAU, MAU)
5. CPU / Memory / Disk
6. DB connections
7. Redis memory
8. Top 10 slowest endpoints

### 6.2 Business Dashboard

**Panels:**
1. New signups (per hour)
2. Test attempts (per hour)
3. Course completions (per day)
4. AI tutor usage (per day)
5. Revenue (per day, per week, per month)
6. Conversion funnel (signup → first test → first purchase)

### 6.3 Security Dashboard

**Panels:**
1. Failed login attempts (by IP, by user)
2. Rate limit hits
3. Webhook signature failures
4. Suspicious IP activity
5. CSRF token failures
6. Auth token blacklist size

## 7. Distributed Tracing

### 7.1 OpenTelemetry Setup

```typescript
// Node
import { trace } from '@opentelemetry/api'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'

const sdk = new NodeSDK({
  serviceName: 'learninghub-node-backend',
  traceExporter: new OTLPTraceExporter({ url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT }),
  instrumentations: [getNodeAutoInstrumentations()],
})
sdk.start()
```

```python
# Django
from opentelemetry import trace
from opentelemetry.instrumentation.django import DjangoInstrumentor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

DjangoInstrumentor().instrument()
otlp_exporter = OTLPSpanExporter(endpoint=os.environ.get('OTEL_EXPORTER_OTLP_ENDPOINT'))
```

### 7.2 Trace Propagation

All requests should:
- Generate trace_id at edge (load balancer)
- Propagate via `traceparent` header
- Include trace_id in all logs
- Sample at 10% in production (100% for errors)

## 8. Sentry Configuration

### 8.1 Frontend

```typescript
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  release: import.meta.env.VITE_APP_VERSION,
  tracesSampleRate: 0.1,  // 10% of transactions
  beforeSend(event) {
    // Redact PII
    if (event.user) {
      delete event.user.ip_address
      delete event.user.email
    }
    return event
  },
})
```

### 8.2 Backend

```typescript
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.APP_VERSION,
  tracesSampleRate: 0.1,
})
```

## 9. Uptime Monitoring

External service should ping:

| URL | Expected | Alert if down |
|-----|----------|---------------|
| `https://learninghub.app/` | 200 | 1 minute |
| `https://api.learninghub.app/health` | 200 | 1 minute |
| `https://api.learninghub.app/api/v1/auth/me` | 401 | 1 minute |

## 10. Incident Response

### 10.1 Severity Levels

| Level | Description | Response Time | Escalation |
|-------|-------------|---------------|------------|
| **P0** | Production down, data loss, security breach | 15 min | Immediate all-hands |
| **P1** | Major feature broken, payment issues | 1 hour | On-call + 1 senior eng |
| **P2** | Minor feature broken, performance issue | 4 hours | On-call |
| **P3** | Cosmetic issue, minor bug | 1 business day | Backlog |

### 10.2 Incident Response Procedure

1. **Detect** — Alert fires, on-call paged
2. **Triage** — On-call investigates (15 min for P0/P1)
3. **Mitigate** — Stop the bleeding (rollback, feature flag, rate limit)
4. **Communicate** — Update status page, notify stakeholders
5. **Resolve** — Deploy fix, verify, monitor
6. **Post-mortem** — Within 48 hours, document RCA

### 10.3 Status Page

Use a status page (StatusPage.io, BetterUptime, etc):
- **Operational** (green)
- **Degraded Performance** (yellow)
- **Partial Outage** (orange)
- **Major Outage** (red)
- **Maintenance** (blue)

Update within 5 minutes of confirmed incident.

## 11. Runbooks

### 11.1 Database CPU High

```bash
# 1. Check slow queries
psql -c "SELECT pid, query, state, query_start FROM pg_stat_activity WHERE state='active' ORDER BY query_start;"

# 2. Check connections
psql -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"

# 3. Kill long queries (if needed)
psql -c "SELECT pg_cancel_backend(pid) FROM pg_stat_activity WHERE state='active' AND query_start < now() - interval '5 minutes';"

# 4. Scale up (if not auto-scaling)
aws rds modify-db-instance --db-instance-identifier lh-prod --db-instance-class db.r6g.2xlarge --apply-immediately
```

### 11.2 Redis Memory High

```bash
# 1. Check memory usage
redis-cli INFO memory

# 2. Find largest keys
redis-cli --memkeys

# 3. Clear non-essential caches
redis-cli FLUSHDB

# 4. Scale up cluster
aws elasticache modify-replication-group --replication-group-id lh-redis --cache-node-type cache.r6g.large
```

### 11.3 AI Service Down

```bash
# 1. Check Gemini status
curl https://status.googleapis.com/

# 2. Switch to mock provider
# Set environment: AI_PROVIDER=mock
kubectl set env deployment/learninghub-backend AI_PROVIDER=mock

# 3. Notify users via status page
# "AI features temporarily unavailable. Using rule-based fallback."

# 4. Monitor
# Users should be able to use the app with NO_AI mode.
```

## 12. Cost Monitoring

### 12.1 AI Cost Alerts

```yaml
- alert: AISpendOverBudget
  expr: increase(ai_cost_usd_total[1d]) > 500
  for: 1h
  severity: warning
  action: Slack #finance + #engineering

- alert: AISpendCritical
  expr: increase(ai_cost_usd_total[1d]) > 2000
  for: 1h
  severity: critical
  action: Page on-call + reduce AI rate limits
```

### 12.2 Per-User AI Tracking

Track per-user AI cost:
```sql
SELECT user_id, SUM(cost_usd) as total_cost
FROM ai_usage_logs
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY user_id
ORDER BY total_cost DESC
LIMIT 100;
```

If a single user exceeds budget, switch their account to NO_AI mode.

## 13. Testing the Monitoring

### 13.1 Synthetic Tests

Use Checkly / Pingdom to run E2E tests every 5 minutes:
- Sign up flow
- Login
- Start a test
- Submit a test
- Buy a course
- Use AI tutor

Alert if any flow fails.

### 13.2 Chaos Testing

Regularly test failure scenarios:
- Kill a backend pod (Kubernetes)
- Disable Redis
- Throttle network
- Make AI provider timeout

Verify alerts fire and system degrades gracefully.

## Related Documentation

- [PRODUCTION_READINESS_CHECKLIST.md](PRODUCTION_READINESS_CHECKLIST.md)
- [DEPLOYMENT.md](DEPLOYMENT.md)
- [SECRETS_MANAGEMENT.md](SECRETS_MANAGEMENT.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)

## Document Status

✅ **Current** — Last updated: 2026-09-04
- Maintained by: SRE / DevOps Team
