#!/bin/bash
# Production Deployment Script
# Deploys PLATINUM-certified Learning Hub platform to production

set -e

echo "=================================="
echo "Production Deployment Script"
echo "=================================="

# Configuration
ENVIRONMENT="production"
BACKUP_DIR="/opt/backups"
LOG_FILE="/var/log/deployment.log"
HEALTH_CHECK_URL="https://your-domain.com/health/"
MAX_RETRIES=5

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Pre-deployment checks
echo "[1/8] Pre-deployment checks..."
if [ ! -f ".env.production" ]; then
    echo "ERROR: .env.production file not found"
    exit 1
fi

# Check if all required services are running
if ! docker ps | grep -q "postgres\|redis\|nginx"; then
    echo "WARNING: Some required services are not running"
fi

log("Pre-deployment checks completed")

# Create backup
echo "[2/8] Creating backup..."
mkdir -p "$BACKUP_DIR"
./backup/scripts/backup-database.sh
log("Database backup created")

# Deploy application
echo "[3/8] Deploying application..."
docker-compose -f deployment/docker-compose/docker-compose.prod.yml down
docker-compose -f deployment/docker-compose/docker-compose.prod.yml pull
docker-compose -f deployment/docker-compose/docker-compose.prod.yml up -d
log("Application deployed")

# Wait for services to be ready
echo "[4/8] Waiting for services to be ready..."
sleep 30

# Health check
echo "[5/8] Performing health check..."
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
        log("Health check passed")
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        echo "Health check failed, retrying... ($RETRY_COUNT/$MAX_RETRIES)"
        sleep 10
    fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "ERROR: Health check failed after $MAX_RETRIES attempts"
    echo "[6/8] Rolling back deployment..."
    ./deployment/scripts/rollback.sh
    exit 1
fi

# Run database migrations
echo "[7/8] Running database migrations..."
docker-compose -f deployment/docker-compose/docker-compose.prod.yml exec web python manage.py migrate
log("Database migrations completed")

# Collect static files
echo "[8/8] Collecting static files..."
docker-compose -f deployment/docker-compose/docker-compose.prod.yml exec web python manage.py collectstatic --noinput
log("Static files collected")

echo "=================================="
echo "Production deployment complete!"
echo "=================================="
log("Production deployment successful")
