#!/usr/bin/env python
"""
MONITORING & ALERTING CONFIGURATION
Comprehensive monitoring setup for Learning Hub Platform
"""

import os
import sys
from pathlib import Path
from datetime import datetime

print("=" * 80)
print("MONITORING & ALERTING CONFIGURATION")
print("=" * 80)

BASE_DIR = Path('c:\\Users\\shiva\\Desktop\\windows_app\\conductor')
os.chdir(BASE_DIR)

def log(message, level="INFO"):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {level}: {message}")

# ============================================================================
# 1. Prometheus Configuration
# ============================================================================
log("Creating Prometheus configuration...")

prometheus_config = '''global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'django-app'
    static_configs:
      - targets: ['web:8000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['redis-exporter:9121']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'nginx-exporter'
    static_configs:
      - targets: ['nginx-exporter:9113']
'''

prometheus_path = BASE_DIR / 'monitoring' / 'prometheus.yml'
prometheus_path.parent.mkdir(parents=True, exist_ok=True)
with open(prometheus_path, 'w') as f:
    f.write(prometheus_config)

log(f"  [OK] Created: {prometheus_path}")

# ============================================================================
# 2. Prometheus Alert Rules
# ============================================================================
log("Creating Prometheus alert rules...")

alert_rules = '''groups:
  - name: django_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(django_http_responses_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is above 5% for more than 5 minutes"
      
      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, rate(django_http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow response time detected"
          description: "95th percentile response time is above 2 seconds"
      
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage"
          description: "CPU usage is above 80% for more than 10 minutes"
      
      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100 > 85
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High memory usage"
          description: "Memory usage is above 85%"
      
      - alert: DatabaseConnectionsHigh
        expr: pg_stat_activity_count > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High database connections"
          description: "PostgreSQL connections above 80"
      
      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Low disk space"
          description: "Less than 10% disk space remaining"
      
      - alert: CeleryWorkerDown
        expr: up{job="celery-worker"} == 0
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Celery worker is down"
          description: "Celery worker has been down for more than 2 minutes"
'''

alert_rules_path = BASE_DIR / 'monitoring' / 'alert_rules.yml'
with open(alert_rules_path, 'w') as f:
    f.write(alert_rules)

log(f"  [OK] Created: {alert_rules_path}")

# ============================================================================
# 3. Grafana Dashboard Configuration
# ============================================================================
log("Creating Grafana dashboard configuration...")

grafana_dashboard = '''{
  "dashboard": {
    "id": null,
    "title": "Learning Hub Platform Monitoring",
    "tags": ["django", "learning-hub"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(django_http_requests_total[5m])",
            "legendFormat": "{{method}} {{handler}}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Response Time (95th percentile)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(django_http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "{{handler}}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
      },
      {
        "id": 3,
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(django_http_responses_total{status=~\"5..\"}[5m])",
            "legendFormat": "Error Rate"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8}
      },
      {
        "id": 4,
        "title": "Active Users",
        "type": "stat",
        "targets": [
          {
            "expr": "django_active_users",
            "legendFormat": "Active Users"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8}
      },
      {
        "id": 5,
        "title": "Database Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "pg_stat_activity_count",
            "legendFormat": "Connections"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 16}
      },
      {
        "id": 6,
        "title": "Cache Hit Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(redis_keyspace_hits_total[5m]) / (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m]))",
            "legendFormat": "Hit Rate"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 16}
      },
      {
        "id": 7,
        "title": "CPU Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "100 - (avg by(instance) (irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
            "legendFormat": "CPU %"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 24}
      },
      {
        "id": 8,
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100",
            "legendFormat": "Memory %"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 24}
      }
    ]
  }
}
'''

grafana_path = BASE_DIR / 'monitoring' / 'grafana-dashboard.json'
with open(grafana_path, 'w') as f:
    f.write(grafana_dashboard)

log(f"  [OK] Created: {grafana_path}")

# ============================================================================
# 4. Docker Compose for Monitoring Stack
# ============================================================================
log("Creating Docker Compose for monitoring stack...")

monitoring_compose = '''version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./monitoring/alert_rules.yml:/etc/prometheus/alert_rules.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana-dashboard.json:/var/lib/grafana/dashboards/dashboard.json
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    depends_on:
      - prometheus

  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "9093:9093"
    volumes:
      - ./monitoring/alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - alertmanager_data:/alertmanager

  node-exporter:
    image: prom/node-exporter:latest
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'

  postgres-exporter:
    image: prometheuscommunity/postgres-exporter:latest
    environment:
      DATA_SOURCE_NAME: "postgresql://postgres:postgres@db:5432/learning_hub?sslmode=disable"
    depends_on:
      - db

  redis-exporter:
    image: oliver006/redis_exporter:latest
    environment:
      REDIS_ADDR: "redis://redis:6379"
    depends_on:
      - redis

volumes:
  prometheus_data:
  grafana_data:
  alertmanager_data:
'''

monitoring_compose_path = BASE_DIR / 'monitoring' / 'docker-compose.monitoring.yml'
with open(monitoring_compose_path, 'w') as f:
    f.write(monitoring_compose)

log(f"  [OK] Created: {monitoring_compose_path}")

# ============================================================================
# 5. Alertmanager Configuration
# ============================================================================
log("Creating Alertmanager configuration...")

alertmanager_config = '''global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@learninghub.com'
  smtp_auth_username: 'alerts@learninghub.com'
  smtp_auth_password: 'your-email-password'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'team-emails'

receivers:
  - name: 'team-emails'
    email_configs:
      - to: 'devops@learninghub.com'
        subject: 'Learning Hub Alert: {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Severity: {{ .Labels.severity }}
          {{ end }}

  - name: 'slack'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#alerts'
        title: 'Learning Hub Alert'
        text: 'Alert: {{ .GroupLabels.alertname }}'

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'dev', 'instance']
'''

alertmanager_path = BASE_DIR / 'monitoring' / 'alertmanager.yml'
with open(alertmanager_path, 'w') as f:
    f.write(alertmanager_config)

log(f"  [OK] Created: {alertmanager_path}")

# ============================================================================
# 6. Django Prometheus Metrics Setup
# ============================================================================
log("Creating Django metrics integration...")

django_metrics = '''"""
Django Prometheus Metrics Configuration
Integrates Django with Prometheus for application metrics
"""

# Install django-prometheus
# pip install django-prometheus

# settings.py additions:
INSTALLED_APPS = [
    'django_prometheus',
    # ... other apps
]

MIDDLEWARE = [
    'django_prometheus.middleware.PrometheusBeforeMiddleware',
    # ... other middleware
    'django_prometheus.middleware.PrometheusAfterMiddleware',
]

# Database monitoring
DATABASES = {
    'default': {
        'ENGINE': 'django_prometheus.db.backends.postgresql',
        'NAME': 'learning_hub',
        # ... other settings
    }
}

# Cache monitoring
CACHES = {
    'default': {
        'BACKEND': 'django_prometheus.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
    }
}

# URLs configuration
# from django.urls import path, include
# urlpatterns = [
#     path('metrics/', include('django_prometheus.urls')),
# ]

# Custom metrics example
from prometheus_client import Counter, Histogram, Gauge

# Request counter
http_requests_total = Counter(
    'django_http_requests_total',
    'Total HTTP requests',
    ['method', 'handler', 'status']
)

# Response time histogram
http_request_duration = Histogram(
    'django_http_request_duration_seconds',
    'HTTP request duration',
    ['method', 'handler']
)

# Active users gauge
active_users = Gauge(
    'django_active_users',
    'Number of active users'
)

# Database query histogram
db_query_duration = Histogram(
    'django_db_query_duration_seconds',
    'Database query duration',
    ['query_type']
)

def update_active_users(count):
    """Update active users metric."""
    active_users.set(count)

def record_request(method, handler, status, duration):
    """Record HTTP request metrics."""
    http_requests_total.labels(
        method=method,
        handler=handler,
        status=status
    ).inc()
    
    http_request_duration.labels(
        method=method,
        handler=handler
    ).observe(duration)
'''

django_metrics_path = BASE_DIR / 'monitoring' / 'django_metrics.py'
with open(django_metrics_path, 'w') as f:
    f.write(django_metrics)

log(f"  [OK] Created: {django_metrics_path}")

# ============================================================================
# Summary
# ============================================================================
print("\n" + "=" * 80)
print("MONITORING CONFIGURATION COMPLETE")
print("=" * 80)

print("\n[CREATED] Monitoring Resources:")
print(f"  1. {prometheus_path}")
print(f"     Purpose: Prometheus scraping configuration")
print()
print(f"  2. {alert_rules_path}")
print(f"     Purpose: Alert rules for critical conditions")
print()
print(f"  3. {grafana_path}")
print(f"     Purpose: Dashboard visualization configuration")
print()
print(f"  4. {monitoring_compose_path}")
print(f"     Purpose: Monitoring stack Docker Compose")
print()
print(f"  5. {alertmanager_path}")
print(f"     Purpose: Alert routing and notifications")
print()
print(f"  6. {django_metrics_path}")
print(f"     Purpose: Django Prometheus integration")
print()

print("[ALERTS] Configured alerts for:")
print("  - High error rate (>5%)")
print("  - Slow response time (>2s)")
print("  - High CPU usage (>80%)")
print("  - High memory usage (>85%)")
print("  - Database connections (>80)")
print("  - Low disk space (<10%)")
print("  - Celery worker down")
print()

print("[USAGE] Start monitoring stack:")
print("  cd monitoring && docker-compose -f docker-compose.monitoring.yml up -d")
print()
print("  Access:")
print("    - Prometheus: http://localhost:9090")
print("    - Grafana: http://localhost:3000 (admin/admin)")
print("    - Alertmanager: http://localhost:9093")
print()

print("=" * 80)
print("[DONE] Monitoring and alerting configuration created")
print("=" * 80 + "\n")
