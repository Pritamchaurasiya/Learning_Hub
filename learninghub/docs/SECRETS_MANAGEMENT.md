# LearningHub — Secrets Management

This document defines the **secrets management policy** for the LearningHub platform.

## 1. Classification

| Type | Examples | Storage | Rotation |
|------|----------|---------|----------|
| **Critical** | Database password, JWT secret, CSRF secret, admin secret | AWS Secrets Manager / HashiCorp Vault | 90 days |
| **Sensitive** | API keys (Gemini, Stripe, OAuth) | AWS Secrets Manager / Vault | 180 days |
| **Internal** | Service URLs, feature flags | Environment variables | As needed |
| **Public** | VITE_API_URL, GA4 measurement ID | Frontend env vars | Never |

## 2. NEVER Commit Secrets

**Pre-commit hooks** should scan for secrets:

```bash
# Install gitleaks
brew install gitleaks  # macOS
# or
go install github.com/gitleaks/gitleaks/v8@latest

# Add to .pre-commit-config.yaml
- repo: https://github.com/gitleaks/gitleaks
  rev: v8.18.0
  hooks:
    - id: gitleaks
```

**GitHub:** Enable secret scanning in repository settings.

## 3. Secret Storage by Environment

### 3.1 Development (.env files)

```bash
# .gitignore MUST include:
.env
.env.local
.env.*.local
*.pem
*.key
*.crt

# NEVER commit .env files
# Use .env.example for documentation (no real values!)
```

**Best practice:**
- Copy `.env.example` to `.env`
- Fill in development values
- Never use production secrets in dev

### 3.2 Staging / Production

**Use a secrets manager** (not env files):

#### AWS Secrets Manager
```bash
# Create secret
aws secretsmanager create-secret \
  --name lh/prod/jwt-secret \
  --secret-value "$(openssl rand -hex 32)"

# Read in app
import boto3
client = boto3.client('secretsmanager')
response = client.get_secret_value(SecretId='lh/prod/jwt-secret')
JWT_SECRET = response['SecretString']
```

#### HashiCorp Vault
```bash
# Store
vault kv put secret/lh/jwt value="$(openssl rand -hex 32)"

# Read
vault kv get -field=value secret/lh/jwt
```

#### Kubernetes Secrets
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: lh-secrets
type: Opaque
data:
  jwt-secret: <base64-encoded-value>
```

**Mount as env var in pod:**
```yaml
env:
  - name: JWT_SECRET
    valueFrom:
      secretKeyRef:
        name: lh-secrets
        key: jwt-secret
```

## 4. Required Secrets (Production)

### 4.1 Node Backend

| Secret | Source | Length | Rotation |
|--------|--------|--------|----------|
| `JWT_SECRET` | `openssl rand -hex 32` | 64 chars | 90 days |
| `JWT_REFRESH_SECRET` | `openssl rand -hex 32` | 64 chars | 90 days |
| `CSRF_SECRET` | `openssl rand -hex 32` | 64 chars | 90 days |
| `ADMIN_SECRET` | `openssl rand -hex 32` | 64 chars | 90 days |
| `DATABASE_URL` | From RDS | N/A | N/A |
| `REDIS_URL` | From ElastiCache | N/A | N/A |
| `GEMINI_API_KEY` | Google Cloud Console | ~40 chars | 180 days |
| `STRIPE_SECRET_KEY` | Stripe Dashboard | ~100 chars | 180 days |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard | ~64 chars | 180 days |
| `SENTRY_DSN` | Sentry | N/A | N/A |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console | ~24 chars | 180 days |

### 4.2 Django Backend

| Secret | Source | Length | Rotation |
|--------|--------|--------|----------|
| `DJANGO_SECRET_KEY` | `python -c "import secrets; print(secrets.token_hex(32))"` | 64 chars | 90 days |
| `DATABASE_URL` | Same as Node | N/A | N/A |
| `REDIS_URL` | Same as Node | N/A | N/A |
| `GOOGLE_API_KEY` | Same as Node | ~40 chars | 180 days |
| `PAYMENT_WEBHOOK_SECRET` | `openssl rand -hex 32` | 64 chars | 180 days |

### 4.3 Frontend (Public-only)

| Secret | Notes |
|--------|-------|
| `VITE_API_URL` | Public, can be in `.env.production` |
| `VITE_GA4_MEASUREMENT_ID` | Public, in `.env.production` |
| `VITE_SENTRY_DSN` | Public (DSN is intentionally public) |

**NEVER put server secrets in VITE_* variables** — they get bundled into the client!

## 5. Secret Rotation Procedure

### 5.1 JWT Secret Rotation (Critical)

```bash
# Step 1: Generate new secret
NEW_SECRET=$(openssl rand -hex 32)

# Step 2: Update in secrets manager
aws secretsmanager update-secret \
  --secret-id lh/prod/jwt-secret \
  --secret-value "$NEW_SECRET"

# Step 3: Restart backend (with old secret still valid)
# Backend will accept tokens signed with either old or new secret during rotation window

# Step 4: Wait for token expiration (15 min for access, 7 days for refresh)
# Or force logout all users (sets token blacklist)

# Step 5: Remove old secret from code
# All new tokens will use only the new secret
```

**Best practice:** Support multiple valid secrets during rotation:

```typescript
// Node
const secrets = [process.env.JWT_SECRET_NEW, process.env.JWT_SECRET_OLD].filter(Boolean)
const decoded = secrets.map(s => {
  try { return verifyAccessToken(token, s) } catch { return null }
}).find(d => d)
```

### 5.2 Database Password Rotation

```bash
# 1. Create new password
NEW_DB_PASS=$(openssl rand -hex 32)

# 2. Update RDS
aws rds modify-db-instance \
  --db-instance-identifier lh-prod \
  --master-user-password "$NEW_DB_PASS" \
  --apply-immediately

# 3. Update secret
aws secretsmanager update-secret \
  --secret-id lh/prod/database-url \
  --secret-value "postgresql://user:$NEW_DB_PASS@host:5432/db"

# 4. Restart backend pods to pick up new password
kubectl rollout restart deployment/learninghub-backend

# 5. Verify
psql "postgresql://user:$NEW_DB_PASS@host:5432/db" -c "SELECT 1"
```

### 5.3 API Key Rotation

```bash
# 1. Generate new key in provider dashboard (Gemini, Stripe, etc)
# 2. Update secret
aws secretsmanager update-secret \
  --secret-id lh/prod/gemini-api-key \
  --secret-value "new-key"

# 3. Restart backend
kubectl rollout restart deployment/learninghub-backend

# 4. Verify AI features work
curl -X POST http://localhost:5000/api/v1/ai/tutor \
  -H "Authorization: Bearer ..." \
  -d '{"prompt": "test"}'

# 5. Revoke old key in provider dashboard
```

## 6. Secret Leak Response

If a secret is leaked (e.g. committed to git):

### 6.1 Immediate Actions (< 15 min)

1. **Rotate the secret** in the provider dashboard
2. **Update secret manager** with new value
3. **Restart all services** to pick up new secret
4. **Audit logs** for any unauthorized usage
5. **If database**: Check for unauthorized queries/access
6. **If API key**: Check provider dashboard for usage spikes

### 6.2 Git History Cleanup

```bash
# Use BFG Repo-Cleaner or git-filter-repo
bfg --replace-text passwords.txt
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (REQUIRES TEAM COORDINATION)
git push --force
```

**NOTE:** Force-pushing rewrites history. Coordinate with team first.

### 6.3 Post-Leak Audit

1. Check all log files for the leaked secret
2. Search production database for the secret
3. Check if any other systems use the same secret
4. Update all relevant runbooks

## 7. Access Control

### 7.1 Principle of Least Privilege

- Each service has ONLY the secrets it needs
- Read-only access where possible
- Different secrets for different environments (dev/staging/prod)

### 7.2 Audit Logging

All access to secrets manager should be logged:
```json
{
  "event": "secret_access",
  "secret_name": "lh/prod/jwt-secret",
  "user": "arn:aws:iam::123:user/jane",
  "timestamp": "2026-01-01T00:00:00Z",
  "purpose": "deployment"
}
```

## 8. CI/CD Secrets

GitHub Actions / GitLab CI secrets:
- `DATABASE_URL` (for tests)
- `JWT_SECRET` (for tests)
- `DEPLOY_KEY` (for deployment)
- `AWS_ACCESS_KEY_ID` (for deployment)

**Use environment protection rules:**
- Production secrets only on `main` branch
- Require manual approval for production deploys

## 9. Developer Machine Security

- Full disk encryption (FileVault on macOS, BitLocker on Windows)
- Strong password / biometric login
- 2FA on GitHub, AWS, etc
- Don't store secrets in browser password manager
- Use a password manager (1Password, Bitwarden)

## 10. Third-Party Services

When integrating with third-party services:

1. **Read their security documentation**
2. **Use OAuth where possible** (don't store passwords)
3. **Use IP allow-listing** for sensitive APIs
4. **Monitor for security advisories** (subscribe to mailing lists)
5. **Plan for service discontinuation** (don't make them a hard dependency)

## 11. Compliance

### 11.1 GDPR

- Don't store PII unnecessarily
- Document data retention
- Honor data deletion requests
- Encrypt PII at rest and in transit

### 11.2 PCI-DSS (Payments)

- Never store card data (use Stripe)
- Use TLS 1.3 for all transactions
- Log all payment events
- Implement fraud detection
- Regular security audits

### 11.3 SOC 2 (Future)

- Implement access controls
- Document security policies
- Regular security training
- Incident response plan
- Continuous monitoring

## 12. Secret Hygiene Checklist

Use this checklist before each release:

- [ ] No secrets in code (gitleaks passes)
- [ ] No secrets in logs (PII redaction enabled)
- [ ] All env vars in secrets manager (not .env files)
- [ ] Production secrets differ from staging
- [ ] Old secrets revoked in provider dashboards
- [ ] Rotation schedule documented
- [ ] Audit log retention configured
- [ ] Access controls reviewed
- [ ] Third-party service security advisories checked
- [ ] Backup encryption verified

## Related Documentation

- [PRODUCTION_READINESS_CHECKLIST.md](PRODUCTION_READINESS_CHECKLIST.md)
- [DEPLOYMENT.md](DEPLOYMENT.md)
- [MONITORING.md](MONITORING.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)

## Document Status

✅ **Current** — Last updated: 2026-09-04
- Maintained by: Security Team
