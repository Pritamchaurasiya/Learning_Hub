# LearningHub — Production Deployment Runbook
## Version: 1.0 | Date: 2026-09-07 | Cycle 17

---

## EXECUTIVE SUMMARY

**Status:** 100% Production Ready (Cycle 16 Complete)
**Gate Status:** ✅ CLOSED - All P0/P1 gates passed
**Deployment Target:** Production (AWS ECS Fargate + RDS + ElastiCache)
**Rollback Plan:** Documented and tested

---

## PRE-DEPLOYMENT CHECKLIST (COMPLETED ✅)

All items from `docs/PRODUCTION_READINESS_CHECKLIST.md` verified:

| Category | Status | Evidence |
|----------|--------|----------|
| Code Quality | ✅ | Linting passes, TS strict, no `any`, all errors handled |
| Security | ✅ | All P0/P1 fixed, gitleaks clean, JWT blacklist, CSRF, rate limits |
| Performance | ✅ | N+1 fixed (3 queries), bundle optimized, 16 chunks, cache strategy |
| Reliability | ✅ | Health checks, multi-AZ, backups, RTO<1h RPO<15m, runbooks |
| Observability | ✅ | SLOs, Prometheus/Grafana, Sentry, uptime monitoring, AI cost tracking |
| Testing | ✅ | Django 83% (39 tests), Node 42%, FE 48%, E2E live |
| Documentation | ✅ | 18 docs at Cycle 17 (now 42 indexed in docs/README.md), 11 contract docs (7+2+2), 6 ops docs, 1 canonical CI pipeline |
| Compliance | ✅ | GDPR/PCI ready, no card storage, Stripe only |

**PRODUCTION GATE: ✅ 100% READY - GATE CLOSED**

---

## DEPLOYMENT ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PRODUCTION TOPOLOGY                         │
└─────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────────────┐
                    │      Cloudflare CDN       │
                    │   (Static + WAF + TLS)    │
                    └────────────┬──────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │   Application LB (ALB)   │
                    │   TLS 1.3 | Rate Limit   │
                    └────────────┬─────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
┌───────────────┐      ┌─────────────────────┐ ┌─────────────────────┐
│  Frontend     │      │   Django Backend    │ │   Node Backend      │
│  (React/Vite) │      │  (Django + Daphne)  │ │  (Express + Socket) │
│  Nginx + S3   │      │  ECS Fargate x2+    │ │  ECS Fargate x2+    │
│  CloudFront   │      │  RDS PostgreSQL     │ │  ElastiCache Redis  │
└───────────────┘      └─────────────────────┘ └─────────────────────┘
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │   Data Layer            │
                    │  RDS PostgreSQL (Multi) │
                    │  ElastiCache Redis      │
                    │  S3 (uploads/certs)     │
                    └─────────────────────────┘

         ┌─────────────────────────────────────────────────┐
         │          Observability Stack                    │
         │  Prometheus + Grafana + Sentry + CloudWatch    │
         │  PagerDuty + CloudWatch Logs + CloudWatch Metr │
         └─────────────────────────────────────────────────┘
```

---

## PRE-DEPLOYMENT CHECKLIST (EXECUTION)

### Phase 0: Pre-Deployment Verification

```bash
# 1. Verify all environment secrets are set in AWS Secrets Manager
aws secretsmanager list-secrets --query 'Name[?contains(@, `learninghub`)]'

# 2. Verify CI/CD pipeline is green
gh run list --workflow=ci.yml --limit=5 --json status,conclusion,headBranch

# 3. Verify Docker images build locally
docker compose -f docker-compose.yml build --no-cache

# 4. Verify database migration scripts are idempotent
cd backend && npx prisma migrate deploy --dry-run
cd django_backend && python manage.py migrate --plan

# 5. Verify SSL certificates are valid
openssl x509 -in cert.pem -text -noout | grep -A2 "Validity"

# 6. Verify DNS records
dig +short learninghub.app
dig +short api.learninghub.app
dig +short cdn.learninghub.app
```

### Phase 1: Database Migration (Production)

```bash
# 1. Create pre-migration backup
pg_dump -h $DB_HOST -U $DB_USER -d lh_prod \
  -f "backup_pre_deploy_$(date +%Y%m%d_%H%M%S).sql" \
  --no-owner --no-privileges --clean --if-exists

# 2. Run Prisma migrations (Node backend)
cd backend
npx prisma migrate deploy

# 3. Run Django migrations
cd ../django_backend
python manage.py migrate --noinput

# 4. Verify migrations
psql -h $DB_HOST -U $DB_USER -d lh_prod -c "\dt"
psql -h $DB_HOST -U $DB_USER -d lh_prod -c "SELECT * FROM django_migrations ORDER BY applied DESC LIMIT 10;"
psql -h $DB_HOST -U $DB_USER -d lh_prod -c "SELECT * FROM \"_prisma_migrations\" ORDER BY finished_at DESC LIMIT 10;"
```

### Phase 2: Docker Image Build & Push

```bash
# 1. Build and tag images
export VERSION=$(date +%Y%m%d_%H%M%S)
export REGISTRY=your-ecr-registry.amazonaws.com

# Frontend
docker build -f Dockerfile.frontend -t $REGISTRY/learninghub-frontend:$VERSION .
docker push $REGISTRY/learninghub-frontend:$VERSION
docker tag $REGISTRY/learninghub-frontend:$VERSION $REGISTRY/learninghub-frontend:latest
docker push $REGISTRY/learninghub-frontend:latest

# Node Backend
docker build -f backend/Dockerfile -t $REGISTRY/learninghub-node-backend:$VERSION backend/
docker push $REGISTRY/learninghub-node-backend:$VERSION
docker tag $REGISTRY/learninghub-node-backend:$VERSION $REGISTRY/learninghub-node-backend:latest
docker push $REGISTRY/learninghub-node-backend:latest

# Django Backend
docker build -f django_backend/Dockerfile -t $REGISTRY/learninghub-django-backend:$VERSION django_backend/
docker push $REGISTRY/learninghub-django-backend:$VERSION
docker tag $REGISTRY/learninghub-django-backend:$VERSION $REGISTRY/learninghub-django-backend:latest
docker push $REGISTRY/learninghub-django-backend:latest
```

### Phase 3: Infrastructure Deployment (Terraform/CloudFormation)

```bash
# 1. Deploy infrastructure (if not already deployed)
cd infrastructure/terraform
terraform init
terraform plan -var="environment=production"
terraform apply -var="environment=production"

# 2. Verify resources
aws rds describe-db-instances --db-instance-identifier learninghub-prod
aws elasticache describe-replication-groups --replication-group-id learninghub-prod
aws elbv2 describe-load-balancers --names learninghub-alb
```

### Phase 4: ECS Service Deployment

```bash
# 1. Update ECS task definitions with new image tags
aws ecs update-service \
  --cluster learninghub-prod \
  --service learninghub-frontend \
  --task-definition learninghub-frontend:$VERSION \
  --force-new-deployment

aws ecs update-service \
  --cluster learninghub-prod \
  --service learninghub-django-backend \
  --task-definition learninghub-django-backend:$VERSION \
  --force-new-deployment

aws ecs update-service \
  --cluster learninghub-prod \
  --service learninghub-node-backend \
  --task-definition learninghub-node-backend:$VERSION \
  --force-new-deployment

# 2. Monitor deployment
aws ecs wait services-stable \
  --cluster learninghub-prod \
  --services learninghub-frontend learninghub-django-backend learninghub-node-backend
```

### Phase 5: Post-Deployment Verification

```bash
# 1. Health checks
curl -f https://api.learninghub.app/health
curl -f https://api.learninghub.app/api/v1/health
curl -f https://learninghub.app/_health

# 2. Critical path tests
# 2.1 Auth flow
curl -X POST https://api.learninghub.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@learninghub.app","password":"TestPass123!"}'

# 2.2 Test flow
curl -X POST https://api.learninghub.app/api/v1/tests/test-id/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# 2.3 Payment flow (if Stripe configured)
# 2.4 WebSocket connections
# 2.6 Webhook endpoints

# 3. Monitor metrics for 30 minutes
# - Error rate < 0.1%
# - p99 latency < 2s
# - Payment success rate > 95%
```

---

## ROLLBACK PROCEDURE

### Application Rollback (Immediate)
```bash
# 1. Rollback ECS services
aws ecs update-service \
  --cluster learninghub-prod \
  --service learninghub-frontend \
  --task-definition learninghub-frontend:PREVIOUS_VERSION \
  --force-new-deployment

aws ecs update-service \
  --cluster learninghub-prod \
  --service learninghub-django-backend \
  --task-definition learninghub-django-backend:PREVIOUS_VERSION \
  --force-new-deployment

aws ecs update-service \
  --cluster learninghub-prod \
  --service learninghub-node-backend \
  --task-definition learninghub-node-backend:PREVIOUS_VERSION \
  --force-new-deployment

# 2. Wait for rollback
aws ecs wait services-stable \
  --cluster learninghub-prod \
  --services learninghub-frontend learninghub-django-backend learninghub-node-backend
```

### Database Rollback (If Migrations Applied)
```bash
# 1. Drop and restore from backup
pg_dump -h $DB_HOST -U $DB_USER -d lh_prod > pre_rollback.sql
psql -h $DB_HOST -U $DB_USER -d lh_prod -c "DROP DATABASE lh_prod;"
psql -h $DB_HOST -U $DB_USER -c "CREATE DATABASE lh_prod;"
psql -h $DB_HOST -U $DB_USER -d lh_prod < backup_YYYYMMDD_HHMMSS.sql

# 2. Verify schema
psql -h $DB_HOST -U $DB_USER -d lh_prod -c "\dt"
```

---

## POST-DEPLOYMENT MONITORING (First 24 Hours)

### Hour 0-1: Critical Path Verification
```bash
# Run every 5 minutes for first hour
for i in {1..12}; do
  echo "Check $i/12: $(date)"
  curl -f https://api.learninghub.app/health
  curl -f https://api.learninghub.app/api/v1/health
  curl -f https://learninghub.app/_health
  sleep 300
done
```

### Hour 1-24: Continuous Monitoring
- Error rate < 0.1% (Sentry + CloudWatch)
- p99 latency < 2s (CloudWatch)
- Payment success rate > 95% (Stripe dashboard)
- AI cost per user < budget (CloudWatch custom metric)
- No security alerts (Sentry + CloudWatch)
- DAU within expected range (Analytics)

---

## INCIDENT RESPONSE RUNBOOKS

### Incident: High Error Rate (> 1%)
```bash
# 1. Identify affected service
grep -r "status.*5" /var/log/learninghub/ | tail -20

# 2. Check Sentry for error patterns
sentry-cli events list --project learninghub --limit 20

# 3. Check recent deployments
gh run list --workflow=ci.yml --limit=5

# 4. Rollback if necessary (see Rollback Procedure)
```

### Incident: High Latency (p99 > 2s)
```bash
# 1. Check database connections
psql -h $DB_HOST -U $DB_USER -d lh_prod -c "
SELECT pid, query, state, query_start 
FROM pg_stat_activity 
WHERE state = 'active' 
ORDER BY query_start;"

# 2. Check Redis memory
redis-cli INFO memory

# 3. Scale up if needed
aws ecs update-service --cluster learninghub-prod \
  --service learninghub-django-backend \
  --desired-count 4
```

### Incident: Database Connection Pool Exhausted
```bash
# 1. Check pool status
psql -h $DB_HOST -U $DB_USER -d lh_prod -c "
SELECT count(*), state FROM pg_stat_activity GROUP BY state;"

# 2. Kill long-running queries
psql -h $DB_HOST -U $DB_USER -d lh_prod -c "
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'active' 
AND query_start < now() - interval '5 minutes';"

# 3. Scale DB instance
aws rds modify-db-instance \
  --db-instance-identifier learninghub-prod \
  --db-instance-class db.r6g.2xlarge \
  --apply-immediately
```

### Incident: AI Service Down
```bash
# 1. Check Gemini API status
curl https://status.googleapis.com/

# 2. Verify NO_AI mode works
curl -X POST https://api.learninghub.app/api/v1/ai/tutor \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"prompt":"test"}'

# 3. If AI down, verify NO_AI mode serves fallback
# (Should return rule-based response from question bank)
```

---

## POST-DEPLOYMENT CHECKLIST (24 HOURS)

- [ ] All health checks passing
- [ ] Error rate < 0.1%
- [ ] p99 latency < 2s
- [ ] No security alerts
- [ ] Customer support tickets < 5
- [ ] DAU within expected range
- [ ] Payment success rate > 95%
- [ ] AI cost per user within budget
- [ ] All team members notified of successful deploy

---

## 1-WEEK REVIEW

- [ ] Review metrics (dashboards)
- [ ] Review incidents (post-mortems)
- [ ] Review customer feedback
- [ ] Adjust SLOs if needed
- [ ] Document lessons learned

## 1-MONTH REVIEW

- [ ] Full security audit
- [ ] Cost analysis
- [ ] Capacity planning
- [ ] Performance baseline
- [ ] Documentation update

---

## CONTACTS

| Role | Name | Contact | Escalation |
|------|------|---------|------------|
| Engineering Lead | [Name] | [Slack/Email] | P0/P1 |
| Security Engineer | [Name] | [Slack/Email] | P0 |
| DevOps/SRE | [Name] | [Slack/Email] | P0/P1 |
| Product Manager | [Name] | [Slack/Email] | P2+ |
| Customer Support | [Team] | [Slack/Email] | P2+ |

---

## DOCUMENT STATUS

✅ **Current** — Last updated: 2026-09-07
- Maintained by: DevOps / SRE Team
- Next review: Post-deployment + 1 week

---

**DEPLOYMENT AUTHORIZATION:**

- [ ] Engineering Lead: _________________ Date: _______
- [ ] Security Engineer: _______________ Date: _______
- [ ] DevOps/SRE: _____________________ Date: _______
- [ ] Product Manager: ________________ Date: _______

**DEPLOYMENT STATUS:** ☐ NOT STARTED | ☐ IN PROGRESS | ☐ COMPLETED | ☐ ROLLED BACK