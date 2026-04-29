# 🐳 DOCKER & KUBERNETES: PRODUCTION DEPLOYMENT GUIDE

## From Development to Cloud-Native Production

---

## 📋 TABLE OF CONTENTS

1. [Docker Fundamentals](#-docker-fundamentals)
2. [Multi-Stage Builds](#-multi-stage-builds)
3. [Docker Compose for Development](#-docker-compose-for-development)
4. [Container Security](#-container-security)
5. [Kubernetes Architecture](#-kubernetes-architecture)
6. [Helm Charts](#-helm-charts)
7. [CI/CD Pipeline](#-cicd-pipeline)
8. [Monitoring & Observability](#-monitoring--observability)

---

## 🐳 DOCKER FUNDAMENTALS

### Dockerfile Anatomy

```dockerfile
# Base image
FROM python:3.11-slim

# Labels (metadata)
LABEL maintainer="team@learninghub.com"
LABEL version="1.0"

# Environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Working directory
WORKDIR /app

# Install dependencies (cached layer)
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s \
  CMD curl -f http://localhost:8000/health/ || exit 1

# Run command
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
```

### Layer Caching Strategy

```
┌────────────────────────────────────────────┐
│ Layer 1: FROM python:3.11-slim            │ ← Rarely changes
├────────────────────────────────────────────┤
│ Layer 2: RUN apt-get install...           │ ← System deps
├────────────────────────────────────────────┤
│ Layer 3: COPY requirements.txt            │ ← Changes when deps change
│          RUN pip install                  │
├────────────────────────────────────────────┤
│ Layer 4: COPY . .                         │ ← Changes every build
└────────────────────────────────────────────┘

Rule: Put frequently changing layers at the bottom!
```

---

## 🏗️ MULTI-STAGE BUILDS

### Backend (Django)

```dockerfile
# Stage 1: Build
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Stage 2: Runtime
FROM python:3.11-slim as runtime

WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && apt-get install -y \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Create non-root user
RUN useradd --create-home appuser
USER appuser

# Copy application
COPY --chown=appuser:appuser . .

# Collect static files
RUN python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "4", \
     "--threads", "2"]
```

### Frontend (Flutter Web)

```dockerfile
# Stage 1: Build Flutter
FROM ghcr.io/cirruslabs/flutter:stable as builder

WORKDIR /app

COPY pubspec.* ./
RUN flutter pub get

COPY . .
RUN flutter build web --release

# Stage 2: Serve with Nginx
FROM nginx:alpine as runtime

COPY --from=builder /app/build/web /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

---

## 🔧 DOCKER COMPOSE FOR DEVELOPMENT

### Complete Stack

```yaml
# docker-compose.yml
version: "3.8"

services:
  # Django Backend
  backend:
    build:
      context: ./conductor
      dockerfile: Dockerfile
    command: python manage.py runserver 0.0.0.0:8000
    volumes:
      - ./conductor:/app
    ports:
      - "8000:8000"
    environment:
      - DEBUG=True
      - DATABASE_URL=postgres://user:pass@postgres:5432/learninghub
      - REDIS_URL=redis://redis:6379/0
      - CELERY_BROKER_URL=redis://redis:6379/1
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started

  # Celery Worker
  celery:
    build:
      context: ./conductor
      dockerfile: Dockerfile
    command: celery -A config worker -l info
    volumes:
      - ./conductor:/app
    environment:
      - DATABASE_URL=postgres://user:pass@postgres:5432/learninghub
      - REDIS_URL=redis://redis:6379/0
      - CELERY_BROKER_URL=redis://redis:6379/1
    depends_on:
      - backend
      - redis

  # Celery Beat (Scheduler)
  celery-beat:
    build:
      context: ./conductor
      dockerfile: Dockerfile
    command: celery -A config beat -l info
    volumes:
      - ./conductor:/app
    environment:
      - DATABASE_URL=postgres://user:pass@postgres:5432/learninghub
      - CELERY_BROKER_URL=redis://redis:6379/1
    depends_on:
      - celery

  # PostgreSQL
  postgres:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=learninghub
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d learninghub"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Redis
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  # Flutter Web (development)
  frontend:
    build:
      context: ./my_flutter_app
      dockerfile: Dockerfile.dev
    volumes:
      - ./my_flutter_app:/app
    ports:
      - "3000:3000"
    command: flutter run -d web-server --web-port=3000 --web-hostname=0.0.0.0

volumes:
  postgres_data:
  redis_data:
```

### Useful Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Execute command in container
docker-compose exec backend python manage.py migrate

# Rebuild specific service
docker-compose up -d --build backend

# Stop and remove
docker-compose down -v  # -v removes volumes
```

---

## 🔒 CONTAINER SECURITY

### Security Checklist

| Practice             | Why                   | How                   |
| -------------------- | --------------------- | --------------------- |
| Non-root user        | Limit damage          | `USER appuser`        |
| Minimal base image   | Fewer vulnerabilities | `python:3.11-slim`    |
| No secrets in image  | Prevent leaks         | Use env vars          |
| Read-only filesystem | Prevent tampering     | `--read-only`         |
| Resource limits      | Prevent DoS           | `--memory=512m`       |
| Scan for vulns       | Catch issues          | `snyk container test` |

### Secure Dockerfile

```dockerfile
# Use specific digest, not just tag
FROM python:3.11-slim@sha256:abc123...

# Install security updates
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
      ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r appgroup && \
    useradd -r -g appgroup appuser

# Set ownership
COPY --chown=appuser:appgroup . /app

# Switch to non-root
USER appuser

# Drop all capabilities
# Use in docker run: --cap-drop=ALL
```

### Runtime Security

```bash
docker run \
  --read-only \
  --cap-drop=ALL \
  --security-opt=no-new-privileges:true \
  --memory=512m \
  --cpus=0.5 \
  --network=backend-only \
  myapp:latest
```

---

## ☸️ KUBERNETES ARCHITECTURE

### Core Concepts

```
┌─────────────────────────────────────────────────────────────┐
│                     Kubernetes Cluster                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Namespace: prod                   │   │
│  │                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │  Deployment │  │  Deployment │  │ StatefulSet │ │   │
│  │  │   backend   │  │   celery    │  │  postgres   │ │   │
│  │  │  replicas:3 │  │  replicas:2 │  │  replicas:1 │ │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │   │
│  │         │                │                │        │   │
│  │  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐ │   │
│  │  │   Service   │  │   Service   │  │   Service   │ │   │
│  │  │  ClusterIP  │  │   headless  │  │  ClusterIP  │ │   │
│  │  └──────┬──────┘  └─────────────┘  └─────────────┘ │   │
│  │         │                                          │   │
│  │  ┌──────▼──────┐                                   │   │
│  │  │   Ingress   │ ← External traffic               │   │
│  │  └─────────────┘                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Deployment Manifest

```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  labels:
    app: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
        - name: backend
          image: learninghub/backend:v1.0.0
          ports:
            - containerPort: 8000
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
          livenessProbe:
            httpGet:
              path: /health/
              port: 8000
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /ready/
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 10
```

### Service & Ingress

```yaml
# k8s/backend-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: backend
spec:
  selector:
    app: backend
  ports:
    - port: 80
      targetPort: 8000
  type: ClusterIP
---
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: learninghub-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - api.learninghub.com
      secretName: api-tls
  rules:
    - host: api.learninghub.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: backend
                port:
                  number: 80
```

---

## 📦 HELM CHARTS

### Chart Structure

```
learninghub-chart/
├── Chart.yaml
├── values.yaml
├── values-prod.yaml
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   └── _helpers.tpl
```

### values.yaml

```yaml
# values.yaml
replicaCount: 3

image:
  repository: learninghub/backend
  tag: latest
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: true
  host: api.learninghub.com
  tls: true

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi

database:
  host: postgres
  port: 5432
  name: learninghub

redis:
  host: redis
  port: 6379
```

### Deployment Using Helm

```bash
# Install
helm install learninghub ./learninghub-chart \
  --namespace prod \
  -f values-prod.yaml

# Upgrade
helm upgrade learninghub ./learninghub-chart \
  --namespace prod \
  -f values-prod.yaml

# Rollback
helm rollback learninghub 1
```

---

## 🔄 CI/CD PIPELINE

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run tests
        run: |
          pip install -r requirements.txt
          pytest --cov=apps

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: |
          docker build -t ${{ secrets.REGISTRY }}/backend:${{ github.sha }} .

      - name: Push to registry
        run: |
          echo ${{ secrets.REGISTRY_PASSWORD }} | docker login -u ${{ secrets.REGISTRY_USER }} --password-stdin
          docker push ${{ secrets.REGISTRY }}/backend:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Kubernetes
        uses: azure/k8s-deploy@v4
        with:
          manifests: |
            k8s/deployment.yaml
            k8s/service.yaml
          images: |
            ${{ secrets.REGISTRY }}/backend:${{ github.sha }}
```

---

## 📊 MONITORING & OBSERVABILITY

### The Three Pillars

```
┌───────────────────────────────────────────────────────────┐
│                    Observability                          │
├──────────────────┬───────────────────┬───────────────────┤
│      Logs        │     Metrics       │     Traces        │
│   (What happened)│   (How much)      │   (Where)         │
├──────────────────┼───────────────────┼───────────────────┤
│   ELK Stack      │    Prometheus     │     Jaeger        │
│   Loki           │    Grafana        │     Zipkin        │
│   CloudWatch     │    Datadog        │     OpenTelemetry │
└──────────────────┴───────────────────┴───────────────────┘
```

### Prometheus Metrics

```python
# Django with prometheus-client
from prometheus_client import Counter, Histogram

REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

REQUEST_LATENCY = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency',
    ['method', 'endpoint']
)

class MetricsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.time()
        response = self.get_response(request)

        REQUEST_COUNT.labels(
            method=request.method,
            endpoint=request.path,
            status=response.status_code
        ).inc()

        REQUEST_LATENCY.labels(
            method=request.method,
            endpoint=request.path
        ).observe(time.time() - start)

        return response
```

---

## 💎 DEPLOYMENT GOLDEN RULES

1. **Immutable deployments** - Never modify running containers
2. **Health checks** - Always define liveness/readiness probes
3. **Resource limits** - Prevent resource starvation
4. **Secrets management** - Never hardcode, use K8s secrets
5. **Rolling updates** - Zero-downtime deployments
6. **Monitoring first** - Observe before scaling

---

**SINGULARITY ENGINE v16.0**  
_"Container first, cluster forever."_
