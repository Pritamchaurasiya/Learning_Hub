# LearningHub — Production Readiness Checklist

Use this checklist **before every production deployment** to ensure all critical requirements are met.

**Last Reviewed:** 2026-09-04
**Cycle 11 Documentation Update**

---

## 1. Code Quality

- [ ] All P0 security bugs fixed (see Bug/Error Inventory)
- [ ] No hardcoded secrets in code (gitleaks passes)
- [ ] No `console.log` statements in production code
- [ ] No commented-out code (or documented why)
- [ ] No `TODO` comments without tracking issue
- [ ] Linting passes (ESLint, Ruff)
- [ ] TypeScript strict mode enabled
- [ ] No `any` types (use proper types)
- [ ] All errors handled (no silent failures)
- [ ] All async functions awaited correctly
- [ ] No race conditions verified
- [ ] All magic numbers replaced with constants
- [ ] All `any`/untyped data validated at boundaries

## 2. Security

- [ ] All endpoints require authentication (except public)
- [ ] All authentication uses bcrypt (cost ≥ 12)
- [ ] JWT tokens have appropriate expiration (15min access, 7d refresh)
- [ ] JWT blacklist enabled after rotation
- [ ] CSRF protection on all state-changing endpoints
- [ ] Rate limiting configured on all sensitive endpoints
- [ ] CORS properly configured (not `*` in production)
- [ ] ALLOWED_HOSTS explicitly set (not `*`)
- [ ] DEBUG=False in production
- [ ] HTTPS enforced (HSTS, secure cookies)
- [ ] Security headers set (CSP, X-Frame-Options, etc)
- [ ] Secrets in secrets manager (not env files)
- [ ] Database password rotated in last 90 days
- [ ] API keys rotated in last 180 days
- [ ] No secrets in git history (gitleaks clean)
- [ ] SQL injection prevention (ORM, no raw SQL)
- [ ] XSS prevention (CSP, DOMPurify)
- [ ] CSRF tokens validated on all state changes
- [ ] File upload validation (type, size, name)
- [ ] No debug endpoints in production
- [ ] WebSocket auth enforced
- [ ] Webhook signatures verified
- [ ] No IDOR vulnerabilities (user_id always validated)
- [ ] No race conditions in critical paths
- [ ] Anti-cheat measures active (server-side timer, etc)

## 3. Performance

- [ ] Frontend initial bundle < 500KB
- [ ] Frontend TTI < 2 seconds
- [ ] Frontend LCP < 2.5 seconds
- [ ] Frontend CLS < 0.1
- [ ] Frontend FID < 100ms
- [ ] Backend p50 response time < 100ms
- [ ] Backend p95 response time < 500ms
- [ ] Backend p99 response time < 2s
- [ ] No N+1 queries in hot paths
- [ ] DB queries use proper indexes
- [ ] Cache hit rate > 80% for hot data
- [ ] Static assets cached (1 year)
- [ ] API responses cached appropriately
- [ ] Images optimized (WebP, srcset)
- [ ] Gzip/Brotli compression enabled
- [ ] CDN configured for static assets
- [ ] Database connection pool sized correctly
- [ ] Redis memory usage < 70%
- [ ] AI cost per user < budget

## 4. Reliability

- [ ] All endpoints have health checks
- [ ] Auto-scaling configured (CPU > 70%)
- [ ] Multi-AZ deployment
- [ ] Database automated backups (daily)
- [ ] WAL archiving enabled (point-in-time recovery)
- [ ] Disaster recovery plan documented
- [ ] RTO < 1 hour, RPO < 15 minutes
- [ ] Load balancer health checks
- [ ] Circuit breakers on external services
- [ ] Retry logic with exponential backoff
- [ ] Graceful degradation (NO_AI mode, fallback responses)
- [ ] Idempotency on critical operations
- [ ] Database transactions for multi-step operations
- [ ] Optimistic concurrency for race-prone updates
- [ ] Database migrations are backward-compatible
- [ ] Rollback procedure documented and tested
- [ ] Status page configured
- [ ] On-call rotation established

## 5. Observability

- [ ] Structured logging (JSON format)
- [ ] PII redaction in logs
- [ ] Log retention configured (90 days prod)
- [ ] Metrics collection (Prometheus)
- [ ] APM / distributed tracing (OpenTelemetry)
- [ ] Error tracking (Sentry)
- [ ] Uptime monitoring (BetterUptime)
- [ ] Business metrics dashboard
- [ ] Security metrics dashboard
- [ ] Critical alerts configured
- [ ] Warning alerts configured
- [ ] On-call escalation policy
- [ ] Runbooks for common incidents
- [ ] Status page integrated with alerts
- [ ] AI cost monitoring

## 6. Testing

- [ ] Unit tests pass (Jest/Vitest)
- [ ] Integration tests pass
- [ ] E2E tests pass (Playwright)
- [ ] Load tests run (10K concurrent users)
- [ ] Security tests (OWASP Top 10)
- [ ] Accessibility tests (WCAG 2.1 AA)
- [ ] Cross-browser tests (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsive tests
- [ ] API contract tests
- [ ] Database migration tests
- [ ] Rollback tests
- [ ] Chaos engineering tests

## 7. Documentation

- [ ] README is current
- [ ] ARCHITECTURE.md is current
- [ ] All API contracts documented
- [ ] Deployment runbook current
- [ ] Monitoring guide current
- [ ] Secrets management policy current
- [ ] On-call runbooks exist
- [ ] Incident response procedure documented
- [ ] Change log updated
- [ ] Open issues / known limitations documented

## 8. Compliance

- [ ] GDPR compliance review (PII, data retention)
- [ ] PCI-DSS compliance (no card storage, use Stripe)
- [ ] Privacy policy updated
- [ ] Terms of service updated
- [ ] Cookie consent implemented
- [ ] Data deletion procedure (GDPR right to be forgotten)
- [ ] Audit log retention
- [ ] Backup encryption verified

## 9. Operational Readiness

- [ ] On-call rotation schedule set
- [ ] Incident response team identified
- [ ] Escalation contacts documented
- [ ] Slack channels configured (#alerts, #incidents, #deploys)
- [ ] PagerDuty / Opsgenie configured
- [ ] Status page configured
- [ ] Customer support informed
- [ ] Marketing informed
- [ ] Legal informed
- [ ] Documentation updated

## 10. Pre-Launch Verification

- [ ] Deploy to staging first (24 hours)
- [ ] Run E2E test suite in staging
- [ ] Run load test in staging (target load)
- [ ] Verify all health checks
- [ ] Verify all critical paths work
- [ ] Verify payment flow end-to-end
- [ ] Verify email/SMS notifications
- [ ] Verify WebSocket connections
- [ ] Verify AI tutor works (with NO_AI fallback)
- [ ] Verify webhook handling
- [ ] Check log aggregation
- [ ] Check metrics collection
- [ ] Check alert firing
- [ ] Smoke test on production (after deploy)
- [ ] Monitor for 1 hour post-deploy
- [ ] Team notified of successful deploy

---

## Pre-Launch Score

**Score:** ___/100

**Required:** 95/100 to launch
- All P0 security items: 100%
- All P0 reliability items: 100%
- All P0 compliance items: 100%
- All P0 testing items: 100%

**Sign-off:**

- [ ] Engineering Lead
- [ ] Security Engineer
- [ ] DevOps / SRE
- [ ] Product Manager

---

## Post-Launch (Within 24 hours)

- [ ] No P0/P1 incidents
- [ ] Error rate < 0.1%
- [ ] p99 latency < 2s
- [ ] No security alerts
- [ ] Customer support tickets < 5
- [ ] DAU within expected range
- [ ] Payment success rate > 95%

## 1-Week Review

- [ ] Review metrics
- [ ] Review incidents
- [ ] Review customer feedback
- [ ] Adjust SLOs if needed
- [ ] Document lessons learned

## 1-Month Review

- [ ] Full security audit
- [ ] Cost analysis
- [ ] Capacity planning
- [ ] Performance baseline
- [ ] Documentation update

## Related Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md)
- [SECRETS_MANAGEMENT.md](SECRETS_MANAGEMENT.md)
- [MONITORING.md](MONITORING.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)

## Document Status

✅ **Current** — Last updated: 2026-09-04
- Maintained by: Engineering Team
