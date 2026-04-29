#!/bin/bash
# ============================================================================
# AUTOMATED BACKUP & DISASTER RECOVERY SYSTEM
# Learning Hub Platform - Enterprise Backup Solution
# ============================================================================

set -e

# Configuration
PROJECT_NAME="learning-hub"
BACKUP_DIR="/opt/backups/$PROJECT_NAME"
DB_NAME="learning_hub"
DB_USER="lh_admin"
RETENTION_DAYS=30
LOG_FILE="/var/log/learning-hub-backup.log"
S3_BUCKET="your-backup-bucket"  # Configure if using AWS S3

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a $LOG_FILE
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a $LOG_FILE
}

# ============================================================================
# BACKUP FUNCTIONS
# ============================================================================

backup_database() {
    log "Starting database backup..."
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/db/${DB_NAME}_${TIMESTAMP}.sql"
    
    mkdir -p "$BACKUP_DIR/db"
    
    # Create database backup
    sudo -u postgres pg_dump $DB_NAME > "$BACKUP_FILE"
    
    # Compress backup
    gzip "$BACKUP_FILE"
    
    log "✓ Database backup created: ${BACKUP_FILE}.gz"
    
    # Upload to S3 if configured
    if command -v aws &> /dev/null && [ "$S3_BUCKET" != "your-backup-bucket" ]; then
        aws s3 cp "${BACKUP_FILE}.gz" "s3://${S3_BUCKET}/database/"
        log "✓ Database backup uploaded to S3"
    fi
}

backup_files() {
    log "Starting file backup..."
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/files/files_${TIMESTAMP}.tar.gz"
    
    mkdir -p "$BACKUP_DIR/files"
    
    # Backup important directories
    tar -czf "$BACKUP_FILE" \
        /opt/learning-hub/media \
        /opt/learning-hub/staticfiles \
        /opt/learning-hub/.env \
        2>/dev/null || warn "Some directories not found, backing up available files"
    
    log "✓ File backup created: $BACKUP_FILE"
    
    # Upload to S3 if configured
    if command -v aws &> /dev/null && [ "$S3_BUCKET" != "your-backup-bucket" ]; then
        aws s3 cp "$BACKUP_FILE" "s3://${S3_BUCKET}/files/"
        log "✓ File backup uploaded to S3"
    fi
}

backup_redis() {
    log "Starting Redis backup..."
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/redis/redis_${TIMESTAMP}.rdb"
    
    mkdir -p "$BACKUP_DIR/redis"
    
    # Trigger Redis SAVE
    redis-cli SAVE
    
    # Copy Redis dump
    cp /var/lib/redis/dump.rdb "$BACKUP_FILE" 2>/dev/null || warn "Redis dump file not found"
    
    # Compress
    gzip "$BACKUP_FILE" 2>/dev/null
    
    log "✓ Redis backup created"
}

backup_config() {
    log "Starting configuration backup..."
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/config/config_${TIMESTAMP}.tar.gz"
    
    mkdir -p "$BACKUP_DIR/config"
    
    # Backup configuration files
    tar -czf "$BACKUP_FILE" \
        /opt/learning-hub/config \
        /etc/nginx/sites-available \
        /etc/supervisor/conf.d \
        2>/dev/null || warn "Some config files not found"
    
    log "✓ Configuration backup created: $BACKUP_FILE"
}

# ============================================================================
# RESTORE FUNCTIONS
# ============================================================================

restore_database() {
    local BACKUP_FILE=$1
    
    log "Restoring database from: $BACKUP_FILE"
    
    # Check if file is compressed
    if [[ $BACKUP_FILE == *.gz ]]; then
        gunzip -c "$BACKUP_FILE" | sudo -u postgres psql $DB_NAME
    else
        sudo -u postgres psql $DB_NAME < "$BACKUP_FILE"
    fi
    
    log "✓ Database restored successfully"
}

restore_files() {
    local BACKUP_FILE=$1
    
    log "Restoring files from: $BACKUP_FILE"
    
    # Extract to temp location first
    local TEMP_DIR=$(mktemp -d)
    tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"
    
    # Copy files back
    cp -r "$TEMP_DIR/opt/learning-hub/"* /opt/learning-hub/ 2>/dev/null || true
    
    # Cleanup
    rm -rf "$TEMP_DIR"
    
    log "✓ Files restored successfully"
}

restore_redis() {
    local BACKUP_FILE=$1
    
    log "Restoring Redis from: $BACKUP_FILE"
    
    # Stop Redis
    systemctl stop redis-server
    
    # Restore dump file
    if [[ $BACKUP_FILE == *.gz ]]; then
        gunzip -c "$BACKUP_FILE" > /var/lib/redis/dump.rdb
    else
        cp "$BACKUP_FILE" /var/lib/redis/dump.rdb
    fi
    
    # Start Redis
    systemctl start redis-server
    
    log "✓ Redis restored successfully"
}

# ============================================================================
# MAINTENANCE FUNCTIONS
# ============================================================================

cleanup_old_backups() {
    log "Cleaning up old backups (retention: $RETENTION_DAYS days)..."
    
    # Remove old database backups
    find "$BACKUP_DIR/db" -name "*.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # Remove old file backups
    find "$BACKUP_DIR/files" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # Remove old Redis backups
    find "$BACKUP_DIR/redis" -name "*.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # Remove old config backups
    find "$BACKUP_DIR/config" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    log "✓ Cleanup complete"
}

verify_backup() {
    log "Verifying backup integrity..."
    
    local LATEST_DB=$(ls -t $BACKUP_DIR/db/*.gz 2>/dev/null | head -1)
    local LATEST_FILES=$(ls -t $BACKUP_DIR/files/*.tar.gz 2>/dev/null | head -1)
    
    if [ -n "$LATEST_DB" ]; then
        if gunzip -t "$LATEST_DB" 2>/dev/null; then
            log "✓ Database backup integrity verified"
        else
            error "Database backup integrity check failed!"
        fi
    fi
    
    if [ -n "$LATEST_FILES" ]; then
        if tar -tzf "$LATEST_FILES" > /dev/null 2>&1; then
            log "✓ File backup integrity verified"
        else
            error "File backup integrity check failed!"
        fi
    fi
}

list_backups() {
    echo "==================================="
    echo "Available Backups"
    echo "==================================="
    echo ""
    echo "Database Backups:"
    ls -lh $BACKUP_DIR/db/*.gz 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}' || echo "  No backups found"
    echo ""
    echo "File Backups:"
    ls -lh $BACKUP_DIR/files/*.tar.gz 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}' || echo "  No backups found"
    echo ""
    echo "Redis Backups:"
    ls -lh $BACKUP_DIR/redis/*.gz 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}' || echo "  No backups found"
    echo ""
    echo "Configuration Backups:"
    ls -lh $BACKUP_DIR/config/*.tar.gz 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}' || echo "  No backups found"
}

# ============================================================================
# DISASTER RECOVERY
# ============================================================================

disaster_recovery() {
    log "INITIATING DISASTER RECOVERY"
    log "This will restore the system to the latest backup"
    
    read -p "Are you sure? This will overwrite current data! (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log "Disaster recovery cancelled"
        exit 0
    fi
    
    # Stop services
    log "Stopping services..."
    supervisorctl stop all
    systemctl stop nginx
    
    # Get latest backups
    local LATEST_DB=$(ls -t $BACKUP_DIR/db/*.gz 2>/dev/null | head -1)
    local LATEST_FILES=$(ls -t $BACKUP_DIR/files/*.tar.gz 2>/dev/null | head -1)
    local LATEST_REDIS=$(ls -t $BACKUP_DIR/redis/*.gz 2>/dev/null | head -1)
    
    # Restore database
    if [ -n "$LATEST_DB" ]; then
        restore_database "$LATEST_DB"
    else
        error "No database backup found!"
    fi
    
    # Restore files
    if [ -n "$LATEST_FILES" ]; then
        restore_files "$LATEST_FILES"
    fi
    
    # Restore Redis
    if [ -n "$LATEST_REDIS" ]; then
        restore_redis "$LATEST_REDIS"
    fi
    
    # Restart services
    log "Restarting services..."
    systemctl start nginx
    supervisorctl start all
    
    log "✓ DISASTER RECOVERY COMPLETE"
    log "System restored from backups"
}

# ============================================================================
# MAIN SCRIPT
# ============================================================================

case "${1:-backup}" in
    backup)
        log "=================================="
        log "LEARNING HUB - BACKUP STARTED"
        log "=================================="
        
        backup_database
        backup_files
        backup_redis
        backup_config
        verify_backup
        cleanup_old_backups
        
        log "=================================="
        log "✓ BACKUP COMPLETE"
        log "=================================="
        ;;
    
    restore-db)
        if [ -z "$2" ]; then
            echo "Usage: $0 restore-db <backup_file>"
            exit 1
        fi
        restore_database "$2"
        ;;
    
    restore-files)
        if [ -z "$2" ]; then
            echo "Usage: $0 restore-files <backup_file>"
            exit 1
        fi
        restore_files "$2"
        ;;
    
    restore-redis)
        if [ -z "$2" ]; then
            echo "Usage: $0 restore-redis <backup_file>"
            exit 1
        fi
        restore_redis "$2"
        ;;
    
    list)
        list_backups
        ;;
    
    verify)
        verify_backup
        ;;
    
    cleanup)
        cleanup_old_backups
        ;;
    
    disaster-recovery)
        disaster_recovery
        ;;
    
    *)
        echo "Learning Hub Backup & Recovery System"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  backup              - Create full backup (default)"
        echo "  restore-db <file>   - Restore database from backup"
        echo "  restore-files <file> - Restore files from backup"
        echo "  restore-redis <file> - Restore Redis from backup"
        echo "  list                - List available backups"
        echo "  verify              - Verify backup integrity"
        echo "  cleanup             - Remove old backups"
        echo "  disaster-recovery   - Full system restore"
        echo ""
        echo "Examples:"
        echo "  $0 backup                    # Create backup"
        echo "  $0 restore-db db_backup.sql.gz  # Restore database"
        echo "  $0 list                      # Show backups"
        ;;
esac
