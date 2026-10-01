# LearningHub — Production Deployment Guide

This document is the **authoritative deployment guide** for the LearningHub platform. It supersedes the older `DEPLOYMENT_GUIDE.md`.

## 1. Pre-Deployment Checklist

Before deploying to production, ensure all items in [PRODUCTION_READINESS_CHECKLIST.md](PRODUCTION_READINESS_CHECKLIST.md) are complete.

## 2. Infrastructure Requirements

### 2.1 Minimum Production Specs

| Component | Specification | Notes |
|-----------|----------------|-------|
| **Frontend (CDN)** | Cloudflare Pro or equivalent | Static asset hosting |
| **Backend Node** | 2 vCPU, 4GB RAM, 20GB SSD | Auto-scaling group |
| **Backend Django** | 2 vCPU, 4GB RAM, 20GB SSD | Auto-scaling group |
| **PostgreSQL** | 4 vCPU, 16GB RAM, 100GB SSD | Multi-AZ, automated backups |
| **Redis** | 2 vCPU, 4GB RAM, 20GB SSD | Cluster mode |
| **Load Balancer** | nginx or AWS ALB | SSL termination |
| **Monitoring** | Prometheus + Grafana | Metrics aggregation |

### 2.2 Recommended Architecture (AWS)

```
Route 53 (DNS)
    │
    ▼
CloudFront (CDN + WAF)
    │
    ├── Static assets (S3)
    │
    ▼
Application Load Balancer
    │
    ├── ECS Fargate (Frontend Container)
    ├── ECS Fargate (Node Backend)
    └── ECS Fargate (Django Backend)
    │
    ├── RDS PostgreSQL (Multi-AZ)
    ├── ElastiCache Redis (Cluster)
    └── S3 (file uploads, certificates)
```

## 3. Environment Variables

### 3.1 Frontend (`.env.production`)

```bash
# Required
VITE_API_URL=/api/v1              # Relative URL (preferred) or absolute
VITE_API_TARGET=https://api.learninghub.app
VITE_BUILD_MODE=production
VITE_ENABLE_DEBUG=false
VITE_ENABLE_MOCK_API=false

# Optional
VITE_GA4_MEASUREMENT_ID=G-XXXXXXX
VITE_SENTRY_DSN=https://...@sentry.io/...
```

### 3.2 Backend Node (env vars)

```bash
# Required
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://user:pass@host:5432/lh_prod
DIRECT_URL=postgresql://user:pass@host:5432/lh_prod
JWT_SECRET=<64-char-random-string>
JWT_REFRESH_SECRET=<64-char-random-string>
CSRF_SECRET=<64-char-random-string>
ADMIN_SECRET=<64-char-random-string>
CORS_ORIGIN=https://learninghub.app
FRONTEND_URL=https://learninghub.app

# Recommended
REDIS_ENABLED=true
REDIS_URL=redis://...
GEMINI_API_KEY=<from-secret-manager>
STRIPE_SECRET_KEY=<from-secret-manager>
STRIPE_WEBHOOK_SECRET=<from-secret-manager>
SENTRY_DSN=<from-sentry>
GOOGLE_CLIENT_ID=<oauth>
GOOGLE_CLIENT_SECRET=<oauth>

# Strong security defaults
COOKIE_SECURE=true
COOKIE_SAMESITE=Strict
TRUST_PROXY=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=1000

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

### 3.3 Backend Django (env vars)

```bash
# Required
DJANGO_SETTINGS_MODULE=learninghub_server.settings
DJANGO_SECRET_KEY=<64-char-random-string>
DJANGO_ALLOWED_HOSTS=api.learninghub.app,localhost
DATABASE_URL=postgresql://user:pass@host:5432/lh_prod
DJANGO_DEBUG=False

# Recommended
REDIS_URL=redis://...
CELERY_BROKER_URL=redis://...
CELERY_RESULT_BACKEND=redis://...
GOOGLE_API_KEY=<gemini-key>
PAYMENT_WEBHOOK_SECRET=<from-secret-manager>
SECURE_SSL_REDIRECT=true
SESSION_COOKIE_SECURE=true
CSRF_COOKIE_SECURE=true

# CORS
CORS_ALLOWED_ORIGINS=https://learninghub.app

# Rate limits
THROTTLE_NOTIFICATIONS=30/min
THROTTLE_LEADERBOARD=60/min
THROTTLE_AI_TUTOR=10/min
THROTTLE_AI_TUTOR_ANON=3/min
```

### 3.4 Generate Secure Secrets

```bash
# 64-char random string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
python -c "import secrets; print(secrets.token_hex(32))"
openssl rand -hex 32
```

## 4. Build & Deploy

### 4.1 Frontend Build

```bash
# Install
npm ci --omit=dev

# Build for production
npm run build

# Output: dist/
# Deploy to S3 + CloudFront / equivalent CDN
aws s3 sync dist/ s3://learninghub-frontend-prod/ --delete
aws cloudfront create-invalidation --distribution-id E123 --paths "/*"
```

### 4.2 Node Backend Build

```bash
cd backend

# Install
npm ci --omit=dev

# Generate Prisma client
npx prisma generate

# Type check
npm run typecheck

# Build
npm run build

# Run migrations
npx prisma migrate deploy

# Start (in production)
NODE_ENV=production npm start
```

### 4.3 Django Backend Build

```bash
cd django_backend

# Install
pip install -r requirements.txt --no-cache-dir

# Collect static files
python manage.py collectstatic --noinput

# Run migrations
python manage.py migrate

# Start (in production)
gunicorn learninghub_server.wsgi:application --bind 0.0.0.0:8000 --workers 4
# OR for WebSocket support:
daphne -b 0.0.0.0 -p 8000 learninghub_server.asgi:application
```

### 4.4 Docker Build (Recommended)

```bash
# Frontend
docker build -f Dockerfile.frontend -t learninghub-frontend:v1.0.0 .

# Node backend
docker build -f backend/Dockerfile -t learninghub-node-backend:v1.0.0 backend/

# Django backend
docker build -f django_backend/Dockerfile -t learninghub-django-backend:v1.0.0 django_backend/

# Push to registry
docker push your-registry/learninghub-frontend:v1.0.0
docker push your-registry/learninghub-node-backend:v1.0.0
docker push your-registry/learninghub-django-backend:v1.0.0

# Deploy via Kubernetes / ECS
kubectl apply -f k8s/
```

## 5. Database Migration

### 5.1 First-Time Setup

```bash
# Node (Prisma)
cd backend
npx prisma migrate deploy
npx prisma db seed  # optional seed data

# Django
cd django_backend
python manage.py migrate
python manage.py loaddata initial_data.json  # optional
python manage.py seed_data  # if seed command exists
```

### 5.2 Migrations During Deploy

```bash
# Always backup before migrations
pg_dump -h $DB_HOST -U $DB_USER -d lh_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migrations
npx prisma migrate deploy
python manage.py migrate --noinput

# Verify
psql -h $DB_HOST -U $DB_USER -d lh_prod -c "\dt"
```

## 6. Health Checks

| Endpoint | Check | Expected |
|----------|-------|----------|
| `GET /health` | Returns 200 + `{"status": "ok"}` | 200 |
| `GET /api/v1/health` | Returns 200 + DB/Redis ping | 200 |
| `GET /api/v1/auth/me` | Returns 401 (no auth) or user (with auth) | 401 or 200 |

```bash
# Liveness probe
curl -f http://backend:5000/health

# Readiness probe
curl -f http://backend:5000/api/v1/health
```

## 7. Post-Deployment Verification

After deployment:

1. **Smoke tests** — Run E2E suite against production
2. **Monitor metrics** — Check error rates, latency, request volume
3. **Verify migrations** — Check DB schema is up to date
4. **Test critical paths** — Sign up, login, take test, pay for course
5. **Check logs** — No errors in first 30 minutes
6. **Notify team** — Send deployment notification

## 8. Rollback Procedure

If issues are detected:

```bash
# 1. Rollback to previous version
kubectl rollout undo deployment/learninghub-backend
# OR
aws ecs update-service --service learninghub-backend --task-definition learninghub-backend:previous

# 2. Rollback database (if migrations were applied)
pg_dump -h $DB_HOST -U $DB_USER -d lh_prod > pre_rollback.sql
# Use backup from before migration
psql -h $DB_HOST -U $DB_USER -d lh_prod -c "DROP DATABASE lh_prod;"
psql -h $DB_HOST -U $DB_USER -c "CREATE DATABASE lh_prod;"
psql -h $DB_HOST -U $DB_USER -d lh_prod < backup_YYYYMMDD_HHMMSS.sql

# 3. Notify team
```

## 9. Domain & SSL

### 9.1 Required Domains

- `learninghub.app` (frontend, marketing)
- `api.learninghub.app` (backend API)
- `admin.learninghub.app` (admin panel, optional)
- `cdn.learninghub.app` (static assets, optional)

### 9.2 SSL Certificates

Use Let's Encrypt or AWS Certificate Manager:
- TLS 1.3 only
- HSTS enabled
- Minimum 2048-bit RSA

## 10. CDN Configuration (CloudFront)

```yaml
Origins:
  - S3-frontend (static)
  - ELB-backend (dynamic API)

Cache Behaviors:
  - /assets/* → S3, Cache: 1 year
  - /*.js, /*.css, /*.woff2 → S3, Cache: 1 year
  - /*.png, /*.jpg, /*.webp → S3, Cache: 1 month
  - /api/* → ELB, Cache: 0 (no-cache)
  - / → S3, Cache: 1 hour

Headers:
  - Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - Content-Security-Policy: default-src 'self'
  - Referrer-Policy: strict-origin-when-cross-origin
```

## 11. Backup Strategy

| Data | Frequency | Retention | Method |
|------|-----------|-----------|--------|
| PostgreSQL | Daily | 30 days | Automated pg_dump + S3 |
| PostgreSQL | Hourly | 24 hours | WAL archiving |
| Redis | Daily | 7 days | RDB snapshot |
| User uploads | Real-time | Indefinite | S3 versioning |
| Logs | Real-time | 90 days | CloudWatch / Loki |

## 12. Scaling Strategy

### 12.1 Horizontal Scaling

- **Frontend:** Auto-scale on CPU > 70%
- **Backend:** Auto-scale on request rate > 1000/min/instance
- **Database:** Vertical scale first, then read replicas
- **Cache:** Cluster mode, shard by key

### 12.2 Capacity Planning

| Users | Backend Instances | DB Size | Cache Size |
|-------|------------------|---------|------------|
| 1K | 2 | 10GB | 1GB |
| 10K | 4 | 50GB | 5GB |
| 100K | 8-16 | 200GB | 20GB |
| 1M | 32+ | 1TB+ | 100GB+ |

## 13. Disaster Recovery

- **RTO (Recovery Time Objective):** 1 hour
- **RPO (Recovery Point Objective):** 15 minutes
- **DR Site:** Different region, async replication
- **Failover:** Automated via Route 53 health checks

## 14. Cost Estimation (AWS, 100K users)

| Service | Estimated Monthly Cost |
|---------|------------------------|
| ECS Fargate (backend) | $300 |
| RDS PostgreSQL (Multi-AZ) | $500 |
| ElastiCache Redis | $150 |
| ALB | $25 |
| S3 + CloudFront | $200 |
| Data transfer | $100 |
| Monitoring (Prometheus/Grafana) | $100 |
| Sentry (errors) | $30 |
| **Total** | **~$1,400/month** |

## Related Documentation

- [PRODUCTION_READINESS_CHECKLIST.md](PRODUCTION_READINESS_CHECKLIST.md) — Pre-launch checklist
- [SECRETS_MANAGEMENT.md](SECRETS_MANAGEMENT.md) — Secrets policy
- [MONITORING.md](MONITORING.md) — Observability
- [ARCHITECTURE.md](ARCHITECTURE.md) — System architecture

## Document Status

✅ **Current** — Last updated: 2026-09-04
- Supersedes: DEPLOYMENT_GUIDE.md
- Maintained by: DevOps / SRE Team
