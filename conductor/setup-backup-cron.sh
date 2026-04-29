#!/bin/bash
# ============================================================================
# CRON JOB SETUP FOR AUTOMATED BACKUPS
# Learning Hub Platform - Scheduled Backup Automation
# ============================================================================

# This script sets up automated cron jobs for regular backups
# Run as root: sudo ./setup-backup-cron.sh

BACKUP_SCRIPT="/opt/learning-hub/backup-disaster-recovery.sh"
LOG_FILE="/var/log/learning-hub-cron.log"

echo "======================================"
echo "Learning Hub - Backup Cron Setup"
echo "======================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Make backup script executable
if [ -f "$BACKUP_SCRIPT" ]; then
    chmod +x "$BACKBACK_SCRIPT"
    echo "✓ Backup script is executable"
else
    echo "⚠ Backup script not found at: $BACKUP_SCRIPT"
    echo "Please ensure backup-disaster-recovery.sh is in place"
    exit 1
fi

# Create cron jobs
echo "Setting up cron jobs..."

# Daily backup at 2 AM
(crontab -l 2>/dev/null; echo "0 2 * * * $BACKUP_SCRIPT backup >> $LOG_FILE 2>&1") | crontab -

# Weekly full backup verification on Sundays at 3 AM
(crontab -l 2>/dev/null; echo "0 3 * * 0 $BACKUP_SCRIPT verify >> $LOG_FILE 2>&1") | crontab -

# Monthly cleanup on 1st of month at 4 AM
(crontab -l 2>/dev/null; echo "0 4 1 * * $BACKUP_SCRIPT cleanup >> $LOG_FILE 2>&1") | crontab -

echo "✓ Cron jobs configured:"
echo "  • Daily backup at 2:00 AM"
echo "  • Weekly verification at 3:00 AM (Sundays)"
echo "  • Monthly cleanup at 4:00 AM (1st of month)"
echo ""

# Show current cron jobs
echo "Current cron jobs for root:"
crontab -l | grep learning-hub
echo ""

# Test backup
echo "Testing backup system..."
$BACKUP_SCRIPT backup
echo ""

if [ $? -eq 0 ]; then
    echo "✓ Backup system test successful"
    echo "✓ Automated backup scheduling is now active"
else
    echo "⚠ Backup test failed - check logs at: $LOG_FILE"
fi

echo ""
echo "======================================"
echo "Backup automation setup complete!"
echo "======================================"
echo ""
echo "To manage backups manually:"
echo "  $BACKUP_SCRIPT backup     # Create backup"
echo "  $BACKUP_SCRIPT list       # List backups"
echo "  $BACKUP_SCRIPT verify     # Verify integrity"
echo "  $BACKUP_SCRIPT cleanup    # Remove old backups"
echo ""
echo "Logs: tail -f $LOG_FILE"
