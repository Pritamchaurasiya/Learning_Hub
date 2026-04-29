#!/bin/bash
# Database Backup Script
# Automated PostgreSQL backup with compression and rotation

set -e

# Configuration
DB_NAME="learning_hub"
DB_USER="postgres"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
BACKUP_DIR="${BACKUP_DIR:-/backups/database}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
S3_BUCKET="${S3_BUCKET:-}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"

echo "=================================="
echo "Database Backup - $TIMESTAMP"
echo "=================================="

# Create backup
echo "[1/4] Creating database backup..."
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"     --verbose --clean --if-exists --no-owner --no-privileges     > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "  [OK] Backup created: $BACKUP_FILE"
else
    echo "  [ERROR] Backup failed!"
    exit 1
fi

# Compress backup
echo "[2/4] Compressing backup..."
gzip "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "  [OK] Compressed: $COMPRESSED_FILE"
    BACKUP_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
    echo "  [INFO] Backup size: $BACKUP_SIZE"
else
    echo "  [ERROR] Compression failed!"
    exit 1
fi

# Upload to S3 if configured
if [ -n "$S3_BUCKET" ]; then
    echo "[3/4] Uploading to S3..."
    aws s3 cp "$COMPRESSED_FILE" "s3://$S3_BUCKET/backups/"
    
    if [ $? -eq 0 ]; then
        echo "  [OK] Uploaded to S3: s3://$S3_BUCKET/backups/"
    else
        echo "  [WARN] S3 upload failed, keeping local backup"
    fi
else
    echo "[3/4] S3 upload skipped (no bucket configured)"
fi

# Clean old backups
echo "[4/4] Cleaning old backups (retention: $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Count remaining backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" | wc -l)
echo "  [OK] Cleaned old backups. Remaining: $BACKUP_COUNT"

echo "=================================="
echo "Backup Complete!"
echo "=================================="
echo "File: $COMPRESSED_FILE"
echo "Size: $BACKUP_SIZE"
