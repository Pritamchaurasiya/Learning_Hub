# Production Secrets Configuration Guide

## Prerequisites

Before deploying to production, you MUST configure the following secrets:

### 1. Generate Strong Secret Key

```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

Copy the output and update in `k8s/secrets.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
stringData:
  secret-key: "YOUR_GENERATED_SECRET_KEY_HERE"
```

### 2. Configure Database Credentials

Update `k8s/secrets.yaml` with your production database:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
stringData:
  url: "postgres://username:password@your-db-host:5432/learning_hub"
  host: "your-db-host"
  port: "5432"
  name: "learning_hub"
  user: "your_db_user"
  password: "your_secure_password"
```

### 3. Configure Redis/Cache

Update `k8s/secrets.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: cache-credentials
stringData:
  url: "redis://your-redis-host:6379/0"
```

### 4. Apply Secrets to Kubernetes

```bash
# For staging
kubectl apply -f k8s/secrets.yaml -n staging

# For production
kubectl apply -f k8s/secrets.yaml -n production
```

### 5. Verify Secrets

```bash
kubectl get secrets -n production
kubectl describe secret app-secrets -n production
```

## Security Best Practices

1. **Never commit secrets to Git**
   - Add `k8s/secrets.yaml` to `.gitignore`
   - Use external secret management (AWS Secrets Manager, Vault, etc.)

2. **Rotate secrets regularly**
   - Change database passwords monthly
   - Rotate Django secret key quarterly

3. **Use strong passwords**
   - Minimum 16 characters
   - Mix of uppercase, lowercase, numbers, symbols
   - Use a password manager

4. **Enable encryption at rest**
   - Database encryption
   - Backup encryption
   - Secrets encryption in Kubernetes

## External Secret Management (Recommended)

For production, consider using:
- AWS Secrets Manager
- HashiCorp Vault
- Azure Key Vault
- Google Secret Manager

Example with AWS Secrets Manager:

```bash
# Install AWS Secrets Manager CSI driver
kubectl apply -k "github.com/aws/secrets-store-csi-driver/deploy/kubernetes/overlays/stable/?ref=release-1.3"

# Create SecretProviderClass
kubectl apply -f k8s/secret-provider-class.yaml
```
