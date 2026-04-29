#!/bin/bash
# Full System Backup Script
# Comprehensive backup of database, media, and configuration

set -e

# Configuration
PROJECT_DIR="${PROJECT_DIR:-/app}"
BACKUP_DIR="${BACKUP_DIR:-/backups/full}"
S3_BUCKET="${S3_BUCKET:-}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

echo "=================================="
echo "Full System Backup"
echo "=================================="

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR_DATE="$BACKUP_DIR/$TIMESTAMP"

echo "[1/5] Creating backup directory..."
mkdir -p "$BACKUP_DIR_DATE"

# Backup database
echo "[2/5] Backing up database..."
DB_BACKUP="$BACKUP_DIR_DATE/database.sql"
pg_dump -h "${DB_HOST:-localhost}" -U "${DB_USER:-postgres}"     "${DB_NAME:-learning_hub}" > "$DB_BACKUP" 2>/dev/null ||     echo "[WARN] Database backup failed or not configured"

# Backup media files
echo "[3/5] Backing up media files..."
MEDIA_BACKUP="$BACKUP_DIR_DATE/media.tar.gz"
if [ -d "$PROJECT_DIR/media" ]; then
    tar -czf "$MEDIA_BACKUP" -C "$PROJECT_DIR" media 2>/dev/null ||         echo "[WARN] Media backup failed"
fi

# Backup configuration
echo "[4/5] Backing up configuration..."
CONFIG_BACKUP="$BACKUP_DIR_DATE/config.tar.gz"
tar -czf "$CONFIG_BACKUP" -C "$PROJECT_DIR"     config requirements apps 2>/dev/null ||     echo "[WARN] Config backup failed"

# Create manifest
echo "[5/5] Creating backup manifest..."
MANIFEST="$BACKUP_DIR_DATE/manifest.json"
cat > "$MANIFEST" << EOF
{
    "backup_timestamp": "$TIMESTAMP",
    "version": "$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')",
    "files": {
        "database": "database.sql",
        "media": "media.tar.gz",
        "config": "config.tar.gz"
    },
    "hostname": "$(hostname)",
    "created_by": "full-backup-script"
}
EOF

# Create final archive
echo "Creating final backup archive..."
FINAL_BACKUP="$BACKUP_DIR/learninghub_full_${TIMESTAMP}.tar.gz"
tar -czf "$FINAL_BACKUP" -C "$BACKUP_DIR" "$TIMESTAMP"

# Remove temporary directory
rm -rf "$BACKUP_DIR_DATE"

# Upload to S3
if [ -n "$S3_BUCKET" ]; then
    echo "Uploading to S3..."
    aws s3 cp "$FINAL_BACKUP" "s3://$S3_BUCKET/full-backups/"
fi

# Clean old backups
find "$BACKUP_DIR" -name "learninghub_full_*.tar.gz" -mtime +$RETENTION_DAYS -delete

BACKUP_SIZE=$(du -h "$FINAL_BACKUP" | cut -f1)
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "learninghub_full_*.tar.gz" | wc -l)

echo "=================================="
echo "Full Backup Complete!"
echo "=================================="
echo "File: $FINAL_BACKUP"
echo "Size: $BACKUP_SIZE"
echo "Total backups: $BACKUP_COUNT"
