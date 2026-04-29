#!/usr/bin/env python
"""
Production Infrastructure Part 2 - Monitoring & Security
Create monitoring, security, and backup components for production deployment
"""

import os
import sys
from pathlib import Path
from datetime import datetime

print("=" * 80)
print("PRODUCTION INFRASTRUCTURE - PART 2: MONITORING & SECURITY")
print("=" * 80)

BASE_DIR = Path('c:\\Users\\shiva\\Desktop\\windows_app\\conductor')
os.chdir(BASE_DIR)

def log(message, level="INFO"):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {level}: {message}")

# ============================================================================
# Create Monitoring Configuration
# ============================================================================
log("Creating monitoring configuration...")

# Prometheus configuration
prometheus_config = '''global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules/*.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'learning-hub-web'
    static_configs:
      - targets: ['web:8000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']
    scrape_interval: 30s

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
    scrape_interval: 30s

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:80']
    scrape_interval: 30s
'''

with open('production-infrastructure/monitoring/prometheus/prometheus.yml', 'w') as f:
    f.write(prometheus_config)

log("  [OK] Created prometheus.yml")

# Prometheus alert rules
alert_rules = '''groups:
  - name: learning-hub-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }} seconds"

      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database is down"
          description: "PostgreSQL database has been down for more than 1 minute"

      - alert: RedisDown
        expr: up{job="redis"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis is down"
          description: "Redis cache has been down for more than 1 minute"
'''

os.makedirs('production-infrastructure/monitoring/prometheus/rules', exist_ok=True)
with open('production-infrastructure/monitoring/prometheus/rules/alerts.yml', 'w') as f:
    f.write(alert_rules)

log("  [OK] Created prometheus alert rules")

# Alertmanager configuration
alertmanager_config = '''global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@your-domain.com'
  smtp_auth_username: 'alerts@your-domain.com'
  smtp_auth_password: 'your-app-password'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
    - match:
        severity: warning
      receiver: 'warning-alerts'

receivers:
  - name: 'web.hook'
    webhook_configs:
      - url: 'http://localhost:5001/'

  - name: 'critical-alerts'
    email_configs:
      - to: 'admin@your-domain.com'
        subject: '[CRITICAL] {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}

  - name: 'warning-alerts'
    email_configs:
      - to: 'team@your-domain.com'
        subject: '[WARNING] {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}
'''

with open('production-infrastructure/monitoring/alertmanager/alertmanager.yml', 'w') as f:
    f.write(alertmanager_config)

log("  [OK] Created alertmanager.yml")

# ============================================================================
# Create Grafana Dashboards
# ============================================================================
log("Creating Grafana dashboards...")

# Grafana provisioning configuration
grafana_datasource = '''apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
'''

os.makedirs('production-infrastructure/monitoring/grafana/provisioning/datasources', exist_ok=True)
with open('production-infrastructure/monitoring/grafana/provisioning/datasources/prometheus.yml', 'w') as f:
    f.write(grafana_datasource)

log("  [OK] Created Grafana datasource")

# Grafana dashboard configuration
grafana_dashboard = '''apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
'''

os.makedirs('production-infrastructure/monitoring/grafana/provisioning/dashboards', exist_ok=True)
with open('production-infrastructure/monitoring/grafana/provisioning/dashboards/dashboard.yml', 'w') as f:
    f.write(grafana_dashboard)

log("  [OK] Created Grafana dashboard configuration")

# ============================================================================
# Create Security Configuration
# ============================================================================
log("Creating security configuration...")

# Nginx production configuration
nginx_prod = '''events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    upstream app {
        server web:8000;
    }

    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name your-domain.com www.your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name your-domain.com www.your-domain.com;

        # SSL configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

        # Security
        client_max_body_size 100M;

        # Static files
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

        # API endpoints with rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check
        location /health/ {
            proxy_pass http://app;
            access_log off;
        }

        # Main application
        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
'''

with open('production-infrastructure/security/nginx/production.conf', 'w') as f:
    f.write(nginx_prod)

log("  [OK] Created nginx production.conf")

# SSL certificate setup script
ssl_setup = '''#!/bin/bash
# SSL Certificate Setup Script
# Sets up SSL certificates for production

set -e

DOMAIN="your-domain.com"
SSL_DIR="/etc/nginx/ssl"

echo "=================================="
echo "SSL Certificate Setup"
echo "=================================="

# Create SSL directory
mkdir -p "$SSL_DIR"

# Generate self-signed certificate for testing (replace with Let's Encrypt in production)
echo "[1/3] Generating SSL certificate..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\
    -keyout "$SSL_DIR/key.pem" \\
    -out "$SSL_DIR/cert.pem" \\
    -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN"

# Set proper permissions
echo "[2/3] Setting permissions..."
chmod 600 "$SSL_DIR/key.pem"
chmod 644 "$SSL_DIR/cert.pem"

# Test certificate
echo "[3/3] Testing certificate..."
if openssl x509 -in "$SSL_DIR/cert.pem" -noout -text > /dev/null 2>&1; then
    echo "SSL certificate created successfully"
else
    echo "ERROR: SSL certificate creation failed"
    exit 1
fi

echo "=================================="
echo "SSL setup complete!"
echo "=================================="
'''

with open('production-infrastructure/security/ssl/setup-ssl.sh', 'w') as f:
    f.write(ssl_setup)

os.chmod('production-infrastructure/security/ssl/setup-ssl.sh', 0o755)
log("  [OK] Created setup-ssl.sh")

# ============================================================================
# Create Backup Scripts
# ============================================================================
log("Creating backup scripts...")

# Database backup script
backup_db = '''#!/bin/bash
# Database Backup Script
# Creates automated database backups with rotation

set -e

echo "=================================="
echo "Database Backup Script"
echo "=================================="

BACKUP_DIR="/opt/backups/database"
RETENTION_DAYS=30
DB_NAME="learning_hub_prod"
DB_USER="learninghub"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "[1/3] Creating database backup..."
docker-compose -f deployment/docker-compose/docker-compose.prod.yml exec -T postgres pg_dump \\
    -U "$DB_USER" \\
    -d "$DB_NAME" \\
    --no-password \\
    --verbose \\
    --clean \\
    --if-exists \\
    --format=custom \\
    --compress=9 \\
    > "$BACKUP_FILE"

echo "[2/3] Compressing backup..."
gzip "$BACKUP_FILE"
BACKUP_FILE="$BACKUP_FILE.gz"

echo "[3/3] Cleaning old backups..."
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Create latest symlink
ln -sf "$BACKUP_FILE" "$BACKUP_DIR/latest_backup.gz"

echo "=================================="
echo "Database backup complete!"
echo "Backup file: $BACKUP_FILE"
echo "Size: $(du -h "$BACKUP_FILE" | cut -f1)"
echo "=================================="
'''

with open('production-infrastructure/backup/scripts/backup-database.sh', 'w') as f:
    f.write(backup_db)

os.chmod('production-infrastructure/backup/scripts/backup-database.sh', 0o755)
log("  [OK] Created backup-database.sh")

# Database restore script
restore_db = '''#!/bin/bash
# Database Restore Script
# Restores database from backup

set -e

echo "=================================="
echo "Database Restore Script"
echo "=================================="

if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup_file>"
    echo "Example: $0 /opt/backups/database/backup_20231201_120000.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"
DB_NAME="learning_hub_prod"
DB_USER="learninghub"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "[1/2] Stopping application..."
docker-compose -f deployment/docker-compose/docker-compose.prod.yml stop web

echo "[2/2] Restoring database..."
if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | docker-compose -f deployment/docker-compose/docker-compose.prod.yml exec -T postgres psql \\
        -U "$DB_USER" \\
        -d "$DB_NAME"
else
    cat "$BACKUP_FILE" | docker-compose -f deployment/docker-compose/docker-compose.prod.yml exec -T postgres psql \\
        -U "$DB_USER" \\
        -d "$DB_NAME"
fi

echo "Starting application..."
docker-compose -f deployment/docker-compose/docker-compose.prod.yml start web

echo "=================================="
echo "Database restore complete!"
echo "Restored from: $BACKUP_FILE"
echo "=================================="
'''

with open('production-infrastructure/backup/scripts/restore-database.sh', 'w') as f:
    f.write(restore_db)

os.chmod('production-infrastructure/backup/scripts/restore-database.sh', 0o755)
log("  [OK] Created restore-database.sh")

# ============================================================================
# Summary
# ============================================================================
print("\n" + "=" * 80)
print("PRODUCTION INFRASTRUCTURE - PART 2 COMPLETE")
print("=" * 80)

print("\n[CREATED] Monitoring Configuration:")
print("  1. Prometheus configuration with alerting rules")
print("  2. Alertmanager configuration with email notifications")
print("  3. Grafana provisioning with datasources and dashboards")
print()

print("[CREATED] Security Configuration:")
print("  1. Nginx production configuration with security headers")
print("  2. SSL certificate setup script")
print()

print("[CREATED] Backup Scripts:")
print("  1. Database backup script with compression and rotation")
print("  2. Database restore script with validation")
print()

print("[NEXT STEPS]:")
print("  1. Configure domain names and SSL certificates")
print("  2. Set up email notification credentials")
print("  3. Test monitoring and alerting in staging")
print("  4. Configure cloud storage for backups")
print("  5. Create Kubernetes manifests for orchestration")
print()

print("=" * 80)
print("[DONE] Monitoring, security, and backup components created!")
print("=" * 80 + "\n")
