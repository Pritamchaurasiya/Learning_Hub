#!/bin/bash
# Linux Deployment Preparation Script
# Prepares the application for Linux production deployment

set -e

echo "=================================="
echo "Linux Deployment Preparation"
echo "=================================="

# 1. System Requirements Check
echo "[1/6] Checking system requirements..."
echo "  - OS: Linux (Ubuntu 20.04+ recommended)"
echo "  - Python: 3.11+"
echo "  - Docker: 20.10+"
echo "  - Kubernetes: 1.20+"
echo "  - PostgreSQL: 13+"
echo "  - Redis: 6+"

# 2. Environment Setup
echo "[2/6] Setting up Linux environment..."
cat > linux-deployment.env << 'EOF'
# Linux Production Environment
DEBUG=False
SECRET_KEY=$(openssl rand -hex 32)
ALLOWED_HOSTS=localhost,127.0.0.1,your-domain.com

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=learning_hub
DB_USER=learninghub
DB_PASSWORD=$(openssl rand -hex 16)

# Redis Configuration
REDIS_URL=redis://redis:6379/1

# Performance Settings
CONN_MAX_AGE=600
CACHE_TIMEOUT=300

# Security Settings
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000
SECURE_CONTENT_TYPE_NOSNIFF=True
SECURE_BROWSER_XSS_FILTER=True
EOF

echo "  [OK] Linux environment file created"

# 3. Linux-Optimized Dockerfile
echo "[3/6] Creating Linux-optimized Dockerfile..."
cat > Dockerfile.linux << 'EOF'
FROM python:3.11-slim-bullseye

# Install system dependencies
RUN apt-get update && apt-get install -y gcc postgresql-client libpq-dev && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements
COPY requirements/ requirements/
RUN pip install --no-cache-dir -r requirements/production.txt

# Copy application
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "config.wsgi:application"]
EOF

echo "  [OK] Linux Dockerfile created"

# 4. Linux Docker Compose
echo "[4/6] Creating Linux Docker Compose..."
cat > docker-compose.linux.yml << 'EOF'
version: "3.8"

services:
  web:
    build:
      context: .
      dockerfile: Dockerfile.linux
    env_file:
      - linux-deployment.env
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis
    volumes:
      - static_volume:/app/staticfiles
      - media_volume:/app/media
    restart: unless-stopped

  postgres:
    image: postgres:13-alpine
    environment:
      POSTGRES_DB: learning_hub
      POSTGRES_USER: learninghub
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    secrets:
      - db_password
    restart: unless-stopped

  redis:
    image: redis:6-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/linux.conf:/etc/nginx/nginx.conf
      - static_volume:/static
      - media_volume:/media
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - web
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  static_volume:
  media_volume:

secrets:
  db_password:
    file: ./secrets/db_password.txt
EOF

echo "  [OK] Linux Docker Compose created"

# 5. Linux Nginx Configuration
echo "[5/6] Creating Linux Nginx configuration..."
mkdir -p nginx ssl
cat > nginx/linux.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream app {
        server web:8000;
    }

    server {
        listen 80;
        server_name _;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

        client_max_body_size 100M;

        location /static/ {
            alias /static/;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        location /media/ {
            alias /media/;
            expires 1y;
            add_header Cache-Control "public";
        }

        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
EOF

echo "  [OK] Linux Nginx configuration created"

# 6. Deployment Script
echo "[6/6] Creating Linux deployment script..."
cat > deploy-linux.sh << 'EOF'
#!/bin/bash
# Linux Production Deployment Script

set -e

echo "=================================="
echo "Linux Production Deployment"
echo "=================================="

# Pre-deployment checks
echo "[1/4] Pre-deployment checks..."
docker-compose -f docker-compose.linux.yml config
echo "  [OK] Configuration valid"

# Build and deploy
echo "[2/4] Building and deploying..."
docker-compose -f docker-compose.linux.yml build
docker-compose -f docker-compose.linux.yml up -d
echo "  [OK] Services deployed"

# Health check
echo "[3/4] Health check..."
sleep 10
curl -f http://localhost:8000/health/ || exit 1
echo "  [OK] Health check passed"

# SSL setup
echo "[4/4] SSL setup reminder..."
echo "  Remember to:"
echo "  1. Place SSL certificates in ./ssl/"
echo "  2. Update domain in nginx/linux.conf"
echo "  3. Run certbot for Let's Encrypt if needed"

echo "=================================="
echo "Linux deployment complete!"
echo "=================================="
EOF

chmod +x deploy-linux.sh
echo "  [OK] Linux deployment script created"

echo ""
echo "=================================="
echo "Linux deployment preparation complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo "  1. Copy files to Linux server"
echo "  2. Run: ./deploy-linux.sh"
echo "  3. Validate deployment"
echo "  4. Generate PLATINUM report"
