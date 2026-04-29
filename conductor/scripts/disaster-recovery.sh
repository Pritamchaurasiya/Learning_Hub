#!/bin/bash
# Disaster Recovery Script
# Restore system from backup

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
S3_BUCKET="${S3_BUCKET:-}"

# Functions
show_help() {
    echo "Disaster Recovery Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -b, --backup-file FILE    Specific backup file to restore"
    echo "  -l, --list               List available backups"
    echo "  -d, --date DATE          Restore from specific date (YYYYMMDD)"
    echo "  -f, --full               Perform full system restore"
    echo "  --database-only          Restore only database"
    echo "  --media-only            Restore only media files"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --list"
    echo "  $0 --date 20240329 --full"
    echo "  $0 --backup-file /backups/full/backup_20240329.tar.gz"
}

list_backups() {
    echo "=================================="
    echo "Available Backups"
    echo "=================================="
    
    echo ""
    echo "Full System Backups:"
    ls -lh "$BACKUP_DIR"/full/learninghub_full_*.tar.gz 2>/dev/null |         awk '{print "  " $9 " (" $5 ")"}' || echo "  None found"
    
    echo ""
    echo "Database Backups:"
    ls -lh "$BACKUP_DIR"/database/learning_hub_*.sql.gz 2>/dev/null |         awk '{print "  " $9 " (" $5 ")"}' || echo "  None found"
    
    echo ""
    echo "Media Backups:"
    ls -lh "$BACKUP_DIR"/media/media_*.tar.gz 2>/dev/null |         awk '{print "  " $9 " (" $5 ")"}' || echo "  None found"
}

restore_database() {
    local backup_file="$1"
    
    echo "=================================="
    echo "Database Restore"
    echo "=================================="
    
    if [ ! -f "$backup_file" ]; then
        echo "[ERROR] Backup file not found: $backup_file"
        exit 1
    fi
    
    echo "[WARNING] This will DROP the current database!"
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo "Restore cancelled."
        exit 0
    fi
    
    # Decompress if needed
    if [[ "$backup_file" == *.gz ]]; then
        echo "[1/3] Decompressing backup..."
        gunzip -c "$backup_file" > /tmp/restore.sql
        backup_file="/tmp/restore.sql"
    fi
    
    echo "[2/3] Dropping and recreating database..."
    dropdb -h "${DB_HOST:-localhost}" -U "${DB_USER:-postgres}"         "${DB_NAME:-learning_hub}" 2>/dev/null || true
    
    createdb -h "${DB_HOST:-localhost}" -U "${DB_USER:-postgres}"         "${DB_NAME:-learning_hub}"
    
    echo "[3/3] Restoring database..."
    psql -h "${DB_HOST:-localhost}" -U "${DB_USER:-postgres}"         -d "${DB_NAME:-learning_hub}" -f "$backup_file"
    
    # Cleanup
    if [ -f "/tmp/restore.sql" ]; then
        rm -f /tmp/restore.sql
    fi
    
    echo ""
    echo "[OK] Database restore complete!"
}

restore_media() {
    local backup_file="$1"
    
    echo "=================================="
    echo "Media Files Restore"
    echo "=================================="
    
    if [ ! -f "$backup_file" ]; then
        echo "[ERROR] Backup file not found: $backup_file"
        exit 1
    fi
    
    echo "[1/2] Backing up current media..."
    if [ -d "/app/media" ]; then
        mv /app/media "/app/media_backup_$(date +%Y%m%d%H%M%S)"
    fi
    
    echo "[2/2] Restoring media from backup..."
    tar -xzf "$backup_file" -C /app
    
    echo ""
    echo "[OK] Media restore complete!"
}

full_restore() {
    local backup_file="$1"
    
    echo "=================================="
    echo "FULL SYSTEM RESTORE"
    echo "=================================="
    echo "[WARNING] This will restore the entire system!"
    read -p "Are you absolutely sure? Type 'RESTORE' to continue: " confirm
    
    if [ "$confirm" != "RESTORE" ]; then
        echo "Restore cancelled."
        exit 0
    fi
    
    # Extract backup
    local temp_dir=$(mktemp -d)
    echo "[1/4] Extracting backup archive..."
    tar -xzf "$backup_file" -C "$temp_dir"
    
    # Find the extracted directory
    local backup_dir=$(find "$temp_dir" -type d -name "20*" | head -1)
    
    echo "[2/4] Restoring database..."
    if [ -f "$backup_dir/database.sql" ]; then
        psql -h "${DB_HOST:-localhost}" -U "${DB_USER:-postgres}"             -d "${DB_NAME:-learning_hub}" -f "$backup_dir/database.sql" 2>/dev/null ||             echo "[WARN] Database restore failed"
    fi
    
    echo "[3/4] Restoring media files..."
    if [ -f "$backup_dir/media.tar.gz" ]; then
        tar -xzf "$backup_dir/media.tar.gz" -C /app
    fi
    
    echo "[4/4] Restoring configuration..."
    if [ -f "$backup_dir/config.tar.gz" ]; then
        tar -xzf "$backup_dir/config.tar.gz" -C /app
    fi
    
    # Cleanup
    rm -rf "$temp_dir"
    
    echo ""
    echo "[OK] Full system restore complete!"
    echo "Please restart the application."
}

# Parse arguments
BACKUP_FILE=""
RESTORE_DATE=""
FULL_RESTORE=false
DB_ONLY=false
MEDIA_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -b|--backup-file)
            BACKUP_FILE="$2"
            shift 2
            ;;
        -l|--list)
            list_backups
            exit 0
            ;;
        -d|--date)
            RESTORE_DATE="$2"
            shift 2
            ;;
        -f|--full)
            FULL_RESTORE=true
            shift
            ;;
        --database-only)
            DB_ONLY=true
            shift
            ;;
        --media-only)
            MEDIA_ONLY=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Main execution
if [ -n "$BACKUP_FILE" ]; then
    # Specific backup file provided
    if [ "$FULL_RESTORE" = true ]; then
        full_restore "$BACKUP_FILE"
    elif [ "$DB_ONLY" = true ]; then
        restore_database "$BACKUP_FILE"
    elif [ "$MEDIA_ONLY" = true ]; then
        restore_media "$BACKUP_FILE"
    else
        echo "Please specify --full, --database-only, or --media-only"
        exit 1
    fi
elif [ -n "$RESTORE_DATE" ]; then
    # Restore by date
    echo "Restoring from date: $RESTORE_DATE"
    
    if [ "$FULL_RESTORE" = true ]; then
        BACKUP_FILE="$BACKUP_DIR/full/learninghub_full_${RESTORE_DATE}_*.tar.gz"
        full_restore $BACKUP_FILE
    elif [ "$DB_ONLY" = true ]; then
        BACKUP_FILE="$BACKUP_DIR/database/learning_hub_${RESTORE_DATE}_*.sql.gz"
        restore_database $BACKUP_FILE
    elif [ "$MEDIA_ONLY" = true ]; then
        BACKUP_FILE="$BACKUP_DIR/media/media_${RESTORE_DATE}_*.tar.gz"
        restore_media $BACKUP_FILE
    else
        echo "Please specify --full, --database-only, or --media-only"
        exit 1
    fi
else
    echo "No backup file or date specified."
    echo "Use --list to see available backups."
    echo "Use --help for usage information."
    exit 1
fi
