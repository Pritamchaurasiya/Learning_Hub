#!/bin/bash
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
docker-compose -f deployment/docker-compose/docker-compose.prod.yml exec -T postgres pg_dump \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-password \
    --verbose \
    --clean \
    --if-exists \
    --format=custom \
    --compress=9 \
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
