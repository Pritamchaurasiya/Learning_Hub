#!/bin/bash
# Rollback Script
# Rolls back to previous deployment

set -e

echo "=================================="
echo "Rollback Script"
echo "=================================="

LOG_FILE="/var/log/deployment.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

echo "[1/4] Stopping current deployment..."
docker-compose -f deployment/docker-compose/docker-compose.prod.yml down
log("Current deployment stopped")

echo "[2/4] Restoring from backup..."
if [ -f "/opt/backups/latest_backup.sql" ]; then
    ./backup/scripts/restore-database.sh /opt/backups/latest_backup.sql
    log("Database restored from backup")
else
    echo "WARNING: No backup found, continuing without database restore"
fi

echo "[3/4] Starting previous version..."
# Get previous image tag from deployment history
PREVIOUS_TAG=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep learning-hub | sed -n '2p')
if [ -n "$PREVIOUS_TAG" ]; then
    export IMAGE_TAG="$PREVIOUS_TAG"
    docker-compose -f deployment/docker-compose/docker-compose.prod.yml up -d
    log("Previous version started: $PREVIOUS_TAG")
else
    echo "ERROR: No previous version found"
    exit 1
fi

echo "[4/4] Verifying rollback..."
sleep 20
if curl -f "https://your-domain.com/health/" > /dev/null 2>&1; then
    log("Rollback successful")
else
    echo "ERROR: Rollback verification failed"
    exit 1
fi

echo "=================================="
echo "Rollback complete!"
echo "=================================="
