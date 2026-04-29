#!/bin/bash
# Automated Backup Scheduler
# Setup cron jobs for automated backups

set -e

# Configuration
CRON_FILE="/tmp/learninghub-backup-cron"

# Remove existing cron jobs for this script
crontab -l 2>/dev/null | grep -v "learninghub-backup" | crontab - 2>/dev/null || true

echo "=================================="
echo "Backup Scheduler Setup"
echo "=================================="

# Create new cron file
cat > "$CRON_FILE" << 'EOF'
# Learning Hub Automated Backup Schedule
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# Database backup - every 6 hours
0 */6 * * * /app/scripts/backup-database.sh >> /var/log/backup-database.log 2>&1

# Media backup - daily at 2 AM
0 2 * * * /app/scripts/backup-media.sh >> /var/log/backup-media.log 2>&1

# Full backup - weekly on Sunday at 3 AM
0 3 * * 0 /app/scripts/backup-full.sh >> /var/log/backup-full.log 2>&1

# Cleanup old backups - daily at 4 AM
0 4 * * * find /backups -name "*.gz" -mtime +30 -delete >> /var/log/backup-cleanup.log 2>&1
EOF

echo "[1/2] Installing cron jobs..."
crontab "$CRON_FILE"
rm -f "$CRON_FILE"

echo "  [OK] Cron jobs installed"

# Create log directory
mkdir -p /var/log

echo ""
echo "[2/2] Verifying installation..."
crontab -l | grep -q "learninghub-backup" && echo "  [OK] Cron jobs verified" || echo "  [WARN] Cron jobs not found"

echo ""
echo "=================================="
echo "Backup Schedule Configured!"
echo "=================================="
echo ""
echo "Schedule:"
echo "  - Database backup: Every 6 hours"
echo "  - Media backup: Daily at 2:00 AM"
echo "  - Full backup: Weekly (Sunday 3:00 AM)"
echo "  - Cleanup: Daily at 4:00 AM"
echo ""
echo "Logs: /var/log/backup-*.log"
echo ""
echo "To remove schedule:"
echo "  crontab -l | grep -v backup- | crontab -"
