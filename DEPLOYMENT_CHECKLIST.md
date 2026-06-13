# Production Deployment Checklist

**Target Date:** TBD  
**Version:** 1.0.0  
**Last Updated:** 2026-06-03

---

## Pre-Deployment Checklist

### Infrastructure ✅

- [ ] **Database backup** automated (daily, 30-day retention)
- [ ] **Redis cluster** deployed (AWS ElastiCache or equivalent)
- [ ] **Load balancer** configured (Nginx with sticky sessions)
- [ ] **CDN** setup for static assets (CloudFlare or CloudFront)
- [ ] **SSL certificate** installed (Let's Encrypt or commercial)
- [ ] **Domain DNS** configured (A/CNAME records)
- [ ] **Environment variables** set in production (no hardcoded secrets)
- [ ] **Firewall rules** configured (allow 80/443, block others)

### Backend ✅

- [ ] **Database migrations** run successfully
- [ ] **Indexes** created (search, analytics queries)
- [ ] **Connection pooling** configured (max 20 connections)
- [ ] **Rate limiting** enabled (per-user and global)
- [ ] **CORS** whitelist configured (production domain only)
- [ ] **Logging** configured (Winston + file rotation)
- [ ] **Error tracking** enabled (Sentry)
- [ ] **Health check** endpoint verified (`/health`, `/health/deep`)

### Frontend ✅

- [ ] **Production build** optimized (`npm run build`)
- [ ] **Bundle size** checked (<2MB total)
- [ ] **Lazy loading** implemented (code splitting)
- [ ] **Service worker** registered (PWA caching)
- [ ] **API base URL** set to production domain
- [ ] **Environment variables** configured (API keys, etc.)

### Security ✅

- [ ] **HTTPS enforced** (HTTP → HTTPS redirect)
- [ ] **Security headers** enabled (HSTS, CSP, X-Frame-Options)
- [ ] **JWT secrets** rotated (unique production keys)
- [ ] **CSRF protection** enabled
- [ ] **Input sanitization** verified
- [ ] **SQL injection** prevention tested
- [ ] **Dependency audit** clean (`npm audit --production`)
- [ ] **Secret scanning** passed (no hardcoded secrets)

### Monitoring & Observability ✅

- [ ] **Prometheus** scraping metrics
- [ ] **Grafana** dashboards configured (3 dashboards minimum)
- [ ] **Alerts** configured (error rate, latency, downtime)
- [ ] **Log aggregation** setup (ELK stack or CloudWatch)
- [ ] **Uptime monitoring** enabled (UptimeRobot or Pingdom)
- [ ] **Error budget** tracking (SLO: 99.9% uptime)

### Performance ✅

- [ ] **Load testing** completed (100+ concurrent users)
- [ ] **P95 latency** <500ms (verified)
- [ ] **Database queries** optimized (no N+1, indexes added)
- [ ] **Caching** enabled (Redis for hot paths)
- [ ] **CDN caching** configured (static assets, images)
- [ ] **Gzip/Brotli** compression enabled

### Compliance ✅

- [ ] **Privacy policy** published
- [ ] **Terms of service** published
- [ ] **Cookie consent** banner (GDPR)
- [ ] **Data export** API functional (`/api/v1/gdpr/export-data`)
- [ ] **Account deletion** API functional (`/api/v1/gdpr/delete-account`)
- [ ] **Audit logging** enabled (all sensitive operations)

### Testing ✅

- [ ] **Unit tests** passing (70%+ coverage)
- [ ] **Integration tests** passing
- [ ] **End-to-end tests** passing (critical flows)
- [ ] **API tests** passing (Postman/Newman collection)
- [ ] **Performance tests** passing (k6 load tests)
- [ ] **Security tests** passing (`scripts/security-audit.sh`)

### Documentation ✅

- [ ] **README** updated (setup instructions)
- [ ] **API documentation** published (Swagger/OpenAPI)
- [ ] **Deployment guide** created
- [ ] **Runbook** created (incident response procedures)
- [ ] **Architecture diagrams** updated

---

## Deployment Steps

### 1. Pre-Deployment (T-24h)

```bash
# Run security audit
bash scripts/security-audit.sh

# Run tests
cd learninghub/backend && npm test
cd ../frontend && npm test

# Build production bundles
cd learninghub/backend && npm run build
cd ../frontend && npm run build

# Database backup
pg_dump -U postgres learninghub > backup-$(date +%Y%m%d).sql
```

### 2. Database Migration (T-2h)

```bash
# Test migration on staging
cd learninghub/backend
npx prisma migrate deploy --preview-feature

# Run on production (during maintenance window)
DATABASE_URL=production_url npx prisma migrate deploy
```

### 3. Backend Deployment (T-1h)

```bash
# Build Docker image
docker build -t learninghub-backend:v1.0.0 -f learninghub/backend/Dockerfile .

# Push to registry
docker tag learninghub-backend:v1.0.0 registry.example.com/learninghub-backend:v1.0.0
docker push registry.example.com/learninghub-backend:v1.0.0

# Deploy (zero-downtime with rolling update)
kubectl set image deployment/learninghub-backend backend=registry.example.com/learninghub-backend:v1.0.0

# Or Docker Compose
docker-compose -f docker-compose.prod.yml up -d --no-deps --build backend
```

### 4. Frontend Deployment (T-30m)

```bash
# Build and deploy to CDN
cd learninghub/frontend
npm run build

# Upload to S3 + CloudFront
aws s3 sync dist/ s3://learninghub-frontend --delete
aws cloudfront create-invalidation --distribution-id XXXXX --paths "/*"
```

### 5. Smoke Tests (T-15m)

```bash
# Health check
curl https://api.learninghub.app/health

# API test
curl -X POST https://api.learninghub.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Metrics endpoint
curl https://api.learninghub.app/api/v1/metrics
```

### 6. Monitoring Verification (T-10m)

- ✅ Prometheus targets up (check http://prometheus:9090/targets)
- ✅ Grafana dashboards showing data
- ✅ Alerts not firing
- ✅ Logs flowing to aggregation system
- ✅ Error rate <1%

---

## Post-Deployment (T+1h)

### Verification

- [ ] **User flows tested** (signup, login, enroll, complete lesson)
- [ ] **Payment flow tested** (test transaction)
- [ ] **Email delivery verified** (welcome email, password reset)
- [ ] **WebSocket connections** working (AI tutor, live classes)
- [ ] **Search functionality** working
- [ ] **Admin dashboard** accessible

### Monitoring

- [ ] **Error rate** <1% (last 1 hour)
- [ ] **P95 latency** <500ms
- [ ] **Active users** count accurate
- [ ] **Database connections** <20 (not saturated)
- [ ] **Memory usage** <80%
- [ ] **CPU usage** <70%

---

## Rollback Plan

### Trigger Conditions

- Error rate >5% for 5 minutes
- P95 latency >2s for 5 minutes
- Critical functionality broken (auth, payments)

### Rollback Steps

```bash
# Backend rollback
kubectl rollout undo deployment/learninghub-backend

# Or Docker Compose
docker-compose -f docker-compose.prod.yml up -d backend:previous-version

# Frontend rollback
aws s3 sync s3://learninghub-frontend-backup/v0.9.0/ s3://learninghub-frontend/ --delete
aws cloudfront create-invalidation --distribution-id XXXXX --paths "/*"

# Database rollback (if schema changed)
psql -U postgres learninghub < backup-previous.sql
```

---

## Success Criteria

- ✅ **Uptime:** 99.9% (43 min downtime/month)
- ✅ **Latency:** P95 <500ms
- ✅ **Error rate:** <1%
- ✅ **User satisfaction:** No critical bug reports in first 24h
- ✅ **Business metrics:** 0% drop in signups/enrollments

---

## Emergency Contacts

- **Backend Lead:** [Name] - [Phone] - [Email]
- **DevOps Lead:** [Name] - [Phone] - [Email]
- **CTO:** [Name] - [Phone] - [Email]
- **On-Call:** [PagerDuty/OpsGenie link]

---

## Post-Launch (Week 1)

- [ ] **Daily standup** with engineering team
- [ ] **Monitor metrics** (error rate, latency, uptime)
- [ ] **User feedback** collection (surveys, support tickets)
- [ ] **Bug triage** (prioritize P0/P1 issues)
- [ ] **Performance optimization** (based on real traffic patterns)
- [ ] **Documentation updates** (based on learnings)

---

**Status:** Ready for deployment after completing checklist items  
**Confidence Level:** 95% (minor GDPR/2FA gaps acceptable for MVP)
