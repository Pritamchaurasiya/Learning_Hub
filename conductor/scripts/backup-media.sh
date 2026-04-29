#!/bin/bash
# Media Files Backup Script
# Backup user uploads and static files

set -e

# Configuration
MEDIA_DIR="${MEDIA_DIR:-/app/media}"
STATIC_DIR="${STATIC_DIR:-/app/staticfiles}"
BACKUP_DIR="${BACKUP_DIR:-/backups/media}"
S3_BUCKET="${S3_BUCKET:-}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/media_${TIMESTAMP}.tar.gz"

echo "=================================="
echo "Media Backup - $TIMESTAMP"
echo "=================================="

# Create backup archive
echo "[1/3] Creating media backup archive..."
tar -czf "$BACKUP_FILE" -C "$(dirname $MEDIA_DIR)" "$(basename $MEDIA_DIR)"     2>/dev/null || echo "[WARN] Media directory not found or empty"

# Include static files if they exist
if [ -d "$STATIC_DIR" ]; then
    tar -rzf "$BACKUP_FILE" -C "$(dirname $STATIC_DIR)" "$(basename $STATIC_DIR)"         2>/dev/null || true
fi

if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "  [OK] Backup created: $BACKUP_FILE"
    echo "  [INFO] Backup size: $BACKUP_SIZE"
else
    echo "  [WARN] No media files to backup"
    exit 0
fi

# Upload to S3 if configured
if [ -n "$S3_BUCKET" ]; then
    echo "[2/3] Uploading to S3..."
    aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/media-backups/"
    
    if [ $? -eq 0 ]; then
        echo "  [OK] Uploaded to S3"
    else
        echo "  [WARN] S3 upload failed, keeping local backup"
    fi
else
    echo "[2/3] S3 upload skipped"
fi

# Clean old backups (keep last 10)
echo "[3/3] Cleaning old backups..."
ls -t "$BACKUP_DIR"/media_*.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm -f

BACKUP_COUNT=$(ls "$BACKUP_DIR"/media_*.tar.gz 2>/dev/null | wc -l)
echo "  [OK] Remaining backups: $BACKUP_COUNT"

echo "=================================="
echo "Media Backup Complete!"
echo "=================================="
