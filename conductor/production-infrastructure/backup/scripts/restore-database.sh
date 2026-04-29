#!/bin/bash
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
    gunzip -c "$BACKUP_FILE" | docker-compose -f deployment/docker-compose/docker-compose.prod.yml exec -T postgres psql \
        -U "$DB_USER" \
        -d "$DB_NAME"
else
    cat "$BACKUP_FILE" | docker-compose -f deployment/docker-compose/docker-compose.prod.yml exec -T postgres psql \
        -U "$DB_USER" \
        -d "$DB_NAME"
fi

echo "Starting application..."
docker-compose -f deployment/docker-compose/docker-compose.prod.yml start web

echo "=================================="
echo "Database restore complete!"
echo "Restored from: $BACKUP_FILE"
echo "=================================="
