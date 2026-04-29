# Learning Hub Backend - Production Deployment Checklist

## Pre-Deployment Verification

### Environment Setup
- [ ] Copy `.env.example` to `.env`
- [ ] Set `SECRET_KEY` (generate new random key)
- [ ] Set `DEBUG=False`
- [ ] Configure `ALLOWED_HOSTS` with production domain(s)
- [ ] Set `DATABASE_URL` with production PostgreSQL credentials
- [ ] Set `REDIS_URL` with production Redis credentials
- [ ] Configure `CORS_ALLOWED_ORIGINS` with frontend URL(s)
- [ ] Set `JWT_SECRET_KEY` (different from SECRET_KEY)
- [ ] Configure `SENTRY_DSN` (optional but recommended)
- [ ] Set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` (if using S3)
- [ ] Configure `EMAIL_HOST_USER` and `EMAIL_HOST_PASSWORD`
- [ ] Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` (for payments)

### Database Preparation
- [ ] Run migrations: `python manage.py migrate`
- [ ] Create superuser: `python manage.py createsuperuser`
- [ ] Load initial data (if applicable): `python manage.py loaddata fixtures/*.json`
- [ ] Verify database indexes are created
- [ ] Run `python manage.py check --deploy` for deployment warnings

### Static & Media Files
- [ ] Collect static files: `python manage.py collectstatic --noinput`
- [ ] Verify WhiteNoise is configured for static file serving
- [ ] Configure S3 bucket for media storage (if applicable)
- [ ] Test static file serving in browser

### Security Hardening
- [ ] Enable HTTPS (SSL certificate installed)
- [ ] Set `SECURE_SSL_REDIRECT=True`
- [ ] Set `SESSION_COOKIE_SECURE=True`
- [ ] Set `CSRF_COOKIE_SECURE=True`
- [ ] Verify `SECURE_HSTS_SECONDS=31536000`
- [ ] Enable `SECURE_HSTS_INCLUDE_SUBDOMAINS=True`
- [ ] Set `SECURE_HSTS_PRELOAD=True`
- [ ] Configure `SECURE_BROWSER_XSS_FILTER=True`
- [ ] Set `SECURE_CONTENT_TYPE_NOSNIFF=True`
- [ ] Verify `X_FRAME_OPTIONS='DENY'`
- [ ] Run security check: `python manage.py check --deploy`

### API Documentation
- [ ] Generate OpenAPI schema: `python manage.py spectacular --file schema.yml`
- [ ] Verify Swagger UI accessible at `/api/docs/`
- [ ] Test API endpoints with schema validation

### Cache Configuration
- [ ] Verify Redis connection working
- [ ] Test cache set/get operations
- [ ] Configure cache TTL values appropriately
- [ ] Enable cache for production endpoints

### WebSocket Setup
- [ ] Verify Daphne is installed: `pip show daphne`
- [ ] Test WebSocket connection at `ws://<domain>/ws/notifications/`
- [ ] Verify channel layer (Redis) is configured
- [ ] Test authentication via WebSocket token

### Background Tasks (Celery)
- [ ] Start Celery worker: `celery -A config worker -l info`
- [ ] Start Celery beat: `celery -A config beat -l info`
- [ ] Verify task routing to correct queues
- [ ] Test scheduled tasks are executing

### Monitoring & Logging
- [ ] Verify Sentry integration (if configured)
- [ ] Check Prometheus metrics endpoint: `/health/metrics/`
- [ ] Verify health check endpoints:
  - [ ] `/health/` - Basic health
  - [ ] `/health/live/` - Liveness probe
  - [ ] `/health/ready/` - Readiness probe
  - [ ] `/health/deep/` - Deep health check
- [ ] Configure log rotation for production logs
- [ ] Verify structured logging (JSON format)

### Performance Optimization
- [ ] Enable Gzip compression
- [ ] Verify database connection pooling
- [ ] Check query optimization with `django-debug-toolbar` (temporarily)
- [ ] Test cache hit rates
- [ ] Verify CDN configuration (if applicable)

## Docker Deployment

### Build & Test
```bash
# Build Docker image
docker build -t learning-hub:latest .

# Test locally with docker-compose
docker-compose up -d

# Run migrations in container
docker-compose exec web python manage.py migrate

# Create superuser
docker-compose exec web python manage.py createsuperuser
```

### Production Docker
- [ ] Use multi-stage Dockerfile (verified)
- [ ] Run as non-root user (verified)
- [ ] Configure health checks
- [ ] Set resource limits (CPU/Memory)
- [ ] Configure restart policies

## Kubernetes Deployment

### K8s Resources
- [ ] Apply namespace: `kubectl apply -f k8s/namespace.yaml`
- [ ] Create secrets: `kubectl apply -f k8s/secrets.yaml`
- [ ] Deploy database: `kubectl apply -f k8s/postgres.yaml`
- [ ] Deploy Redis: `kubectl apply -f k8s/redis.yaml`
- [ ] Deploy Django app: `kubectl apply -f k8s/django.yaml`
- [ ] Deploy Celery worker: `kubectl apply -f k8s/celery-worker.yaml`
- [ ] Deploy Celery beat: `kubectl apply -f k8s/celery-beat.yaml`
- [ ] Configure ingress: `kubectl apply -f k8s/ingress.yaml`

### K8s Verification
- [ ] Check pod status: `kubectl get pods`
- [ ] Verify service endpoints: `kubectl get svc`
- [ ] Test ingress routing
- [ ] Check resource utilization
- [ ] Verify horizontal pod autoscaling (if configured)

## Post-Deployment Verification

### Smoke Tests
- [ ] Homepage loads without errors
- [ ] API documentation accessible
- [ ] Login endpoint returns token
- [ ] WebSocket connection successful
- [ ] File upload works (if applicable)
- [ ] Email sending works (if configured)

### Integration Tests
- [ ] User registration flow
- [ ] Course enrollment flow
- [ ] Payment processing (if applicable)
- [ ] Notification delivery
- [ ] Background task execution

### Security Tests
- [ ] HTTPS redirect working
- [ ] Security headers present
- [ ] CORS properly configured
- [ ] Rate limiting active
- [ ] JWT token validation

### Load Tests
- [ ] Run Locust load test: `locust -f locustfile.py`
- [ ] Verify response times under load
- [ ] Check database connection pool
- [ ] Monitor memory usage

## Rollback Plan

### Before Deployment
- [ ] Create database backup
- [ ] Tag current release in Git
- [ ] Document current configuration
- [ ] Prepare rollback commands

### Rollback Steps
1. Stop new deployment
2. Restore database from backup (if needed)
3. Deploy previous version tag
4. Verify rollback success

## Emergency Contacts

- DevOps Team: [Contact Info]
- Database Admin: [Contact Info]
- Security Team: [Contact Info]
- On-Call Engineer: [Contact Info]

## Post-Deployment Monitoring (First 24 Hours)

- [ ] Monitor error rates (Sentry)
- [ ] Check response times (Prometheus/Grafana)
- [ ] Verify log volumes
- [ ] Monitor database performance
- [ ] Check cache hit rates
- [ ] Review Celery task queue
- [ ] Verify WebSocket connections

## Sign-Off

**Deployment Completed By:** _________________  **Date:** _______

**Verified By:** _________________  **Date:** _______

**Status:** ✅ Production Ready / ⚠️ Issues Found / ❌ Rollback Required

---

**Notes:**
- Keep this checklist with deployment documentation
- Update as infrastructure changes
- Review before each production deployment
