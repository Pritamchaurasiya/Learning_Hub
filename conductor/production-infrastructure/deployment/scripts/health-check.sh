#!/bin/bash
# Health Check Script
# Performs comprehensive health checks on all services

set -e

echo "=================================="
echo "Health Check Script"
echo "=================================="

BASE_URL="https://your-domain.com"
LOG_FILE="/var/log/health-check.log"
ALERT_EMAIL="admin@your-domain.com"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

send_alert() {
    echo "$1" | mail -s "Production Alert: $2" "$ALERT_EMAIL"
}

# Check main application
echo "[1/6] Checking main application..."
if curl -f "$BASE_URL/health/" > /dev/null 2>&1; then
    log("Main application: OK")
else
    log("Main application: FAILED")
    send_alert "Main application health check failed" "Application Health"
fi

# Check database connectivity
echo "[2/6] Checking database..."
if docker-compose -f deployment/docker-compose/docker-compose.prod.yml exec -T postgres pg_isready -U learninghub > /dev/null 2>&1; then
    log("Database: OK")
else
    log("Database: FAILED")
    send_alert "Database health check failed" "Database Health"
fi

# Check Redis connectivity
echo "[3/6] Checking Redis..."
if docker-compose -f deployment/docker-compose/docker-compose.prod.yml exec -T redis redis-cli ping > /dev/null 2>&1; then
    log("Redis: OK")
else
    log("Redis: FAILED")
    send_alert "Redis health check failed" "Redis Health"
fi

# Check SSL certificate
echo "[4/6] Checking SSL certificate..."
if openssl s_client -connect "$BASE_URL:443" -servername "$BASE_URL" < /dev/null 2>/dev/null | grep -q "Certificate"; then
    log("SSL certificate: OK")
else
    log("SSL certificate: FAILED")
    send_alert "SSL certificate check failed" "SSL Certificate"
fi

# Check disk space
echo "[5/6] Checking disk space..."
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    log("Disk space: OK ($DISK_USAGE% used)")
else
    log("Disk space: WARNING ($DISK_USAGE% used)")
    send_alert "Disk space usage is $DISK_USAGE%" "Disk Space"
fi

# Check memory usage
echo "[6/6] Checking memory usage..."
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ "$MEMORY_USAGE" -lt 80 ]; then
    log("Memory usage: OK ($MEMORY_USAGE% used)")
else
    log("Memory usage: WARNING ($MEMORY_USAGE% used)")
    send_alert "Memory usage is $MEMORY_USAGE%" "Memory Usage"
fi

echo "=================================="
echo "Health check complete!"
echo "=================================="
