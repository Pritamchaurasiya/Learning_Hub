#!/bin/bash
# ============================================================================
# LINUX PRODUCTION DEPLOYMENT SCRIPT
# Learning Hub Platform - One-Click Production Deployment
# ============================================================================

set -e  # Exit on error

echo "================================================================================"
echo "🚀 LEARNING HUB - LINUX PRODUCTION DEPLOYMENT"
echo "================================================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="learning-hub"
PROJECT_DIR="/opt/$PROJECT_NAME"
BACKUP_DIR="/opt/backups/$PROJECT_NAME"
LOG_FILE="/var/log/learning-hub-deploy.log"

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a $LOG_FILE
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a $LOG_FILE
    exit 1
}

# ============================================================================
# STEP 1: SYSTEM CHECKS
# ============================================================================
echo ""
echo "📋 STEP 1: System Checks"
echo "--------------------------------------------------------------------------------"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    error "Please run as root (use sudo)"
fi

# Check OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VERSION=$VERSION_ID
    log "✓ Operating System: $OS $VERSION"
else
    error "Cannot detect OS"
fi

# Check system resources
CPU_CORES=$(nproc)
MEMORY_GB=$(free -g | awk '/^Mem:/{print $2}')
DISK_GB=$(df -BG / | awk 'NR==2 {print $4}' | tr -d 'G')

log "✓ CPU Cores: $CPU_CORES"
log "✓ Memory: ${MEMORY_GB}GB"
log "✓ Available Disk: ${DISK_GB}GB"

if [ "$MEMORY_GB" -lt 2 ]; then
    warn "Low memory detected. Recommended: 4GB+"
fi

if [ "$DISK_GB" -lt 10 ]; then
    warn "Low disk space detected. Recommended: 20GB+"
fi

# ============================================================================
# STEP 2: INSTALL DEPENDENCIES
# ============================================================================
echo ""
echo "📦 STEP 2: Installing System Dependencies"
echo "--------------------------------------------------------------------------------"

log "Updating package list..."
apt-get update -qq

log "Installing essential packages..."
apt-get install -y -qq \
    python3.11 \
    python3.11-dev \
    python3-pip \
    python3-venv \
    postgresql-15 \
    postgresql-contrib \
    redis-server \
    nginx \
    git \
    curl \
    wget \
    build-essential \
    libpq-dev \
    supervisor \
    fail2ban \
    ufw \
    htop \
    net-tools

log "✓ System dependencies installed"

# Start services
log "Starting PostgreSQL..."
systemctl start postgresql
systemctl enable postgresql

log "Starting Redis..."
systemctl start redis-server
systemctl enable redis-server

log "✓ Services started"

# ============================================================================
# STEP 3: DATABASE SETUP
# ============================================================================
echo ""
echo "🗄️  STEP 3: Database Setup"
echo "--------------------------------------------------------------------------------"

DB_NAME="learning_hub"
DB_USER="lh_admin"
DB_PASSWORD=$(openssl rand -base64 32)

# Create database and user
sudo -u postgres psql <<EOF
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
\q
EOF

log "✓ Database '$DB_NAME' created"
log "✓ Database user '$DB_USER' created"

# Save credentials
mkdir -p /root/.learning-hub
chmod 700 /root/.learning-hub
cat > /root/.learning-hub/db_credentials <<EOF
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
EOF
chmod 600 /root/.learning-hub/db_credentials

# ============================================================================
# STEP 4: APPLICATION SETUP
# ============================================================================
echo ""
echo "🐍 STEP 4: Application Setup"
echo "--------------------------------------------------------------------------------"

# Create project directory
mkdir -p $PROJECT_DIR
chmod 755 $PROJECT_DIR

# Create virtual environment
log "Creating Python virtual environment..."
python3.11 -m venv $PROJECT_DIR/venv
source $PROJECT_DIR/venv/bin/activate

# Upgrade pip
pip install --upgrade pip wheel setuptools

# Create requirements file for production
cat > $PROJECT_DIR/requirements.txt <<'EOF'
# Django & Core
django>=5.0,<5.1
djangorestframework>=3.14
django-cors-headers>=4.3
django-filter>=23.5
django-extensions>=3.2

# Database
dj-database-url>=2.1
psycopg2-binary>=2.9

# Authentication
djangorestframework-simplejwt>=5.3
django-allauth>=0.58

# Async & Channels
channels>=4.0
channels-redis>=4.1
daphne>=4.0

# Celery
celery>=5.3
redis>=5.0
django-celery-beat>=2.5
django-celery-results>=2.5

# AI & ML
openai>=1.6
google-generativeai>=0.3
anthropic>=0.8
sentence-transformers>=2.2
scikit-learn>=1.3
numpy>=1.26
pandas>=2.1

# API & Documentation
drf-spectacular>=0.27
drf-yasg>=1.21
uritemplate>=4.1

# Security
django-ratelimit>=4.1
django-csp>=3.7
python-dotenv>=1.0

# Performance
gunicorn>=21.2
whitenoise>=6.6
django-redis>=5.4

# Utilities
Pillow>=10.1
requests>=2.31
python-magic>=0.4
structlog>=23.2
inflection>=0.5
pytz>=2023.3

# Testing
pytest>=7.4
pytest-django>=4.7
factory-boy>=3.3

# Monitoring & Logging
sentry-sdk>=1.39
django-prometheus>=2.3

# pydantic-core (Linux compatible)
pydantic-core>=2.14
EOF

log "Installing Python dependencies..."
pip install -r $PROJECT_DIR/requirements.txt --quiet

log "✓ Application dependencies installed"

# ============================================================================
# STEP 5: ENVIRONMENT CONFIGURATION
# ============================================================================
echo ""
echo "⚙️  STEP 5: Environment Configuration"
echo "--------------------------------------------------------------------------------"

# Generate SECRET_KEY
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(60))")

# Create .env file
cat > $PROJECT_DIR/.env <<EOF
# Security
SECRET_KEY=$SECRET_KEY
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,$(curl -s ifconfig.me)

# Database
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_HOST=localhost
DB_PORT=5432

# Redis
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Email (configure as needed)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
DEFAULT_FROM_EMAIL=noreply@localhost

# Admin
ADMIN_EMAIL=admin@localhost

# AI API Keys (add your keys)
GEMINI_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
EOF

chmod 600 $PROJECT_DIR/.env
log "✓ Environment file created"

# ============================================================================
# STEP 6: PROJECT DEPLOYMENT
# ============================================================================
echo ""
echo "📂 STEP 6: Project Deployment"
echo "--------------------------------------------------------------------------------"

# Note: In real deployment, you'd clone from git or copy files
# For now, we'll create the structure

log "Setting up project structure..."
mkdir -p $PROJECT_DIR/{staticfiles,media,logs,backups}

# Create a placeholder for the Django project
log "⚠️  Please copy your Django project files to: $PROJECT_DIR"
log "   Example: cp -r /path/to/your/project/* $PROJECT_DIR/"

# Create gunicorn configuration
cat > $PROJECT_DIR/gunicorn.conf.py <<'EOF'
import multiprocessing

bind = "0.0.0.0:8000"
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
keepalive = 5
timeout = 60
graceful_timeout = 30
max_requests = 1000
max_requests_jitter = 50
preload_app = True

# Logging
accesslog = "/var/log/gunicorn-access.log"
errorlog = "/var/log/gunicorn-error.log"
loglevel = "info"

# Process naming
proc_name = "learning-hub"

# Server mechanics
daemon = False
pidfile = "/tmp/gunicorn.pid"
EOF

log "✓ Gunicorn configuration created"

# ============================================================================
# STEP 7: NGINX CONFIGURATION
# ============================================================================
echo ""
echo "🌐 STEP 7: Nginx Configuration"
echo "--------------------------------------------------------------------------------"

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Create nginx configuration
cat > /etc/nginx/sites-available/learning-hub <<'EOF'
upstream learning_hub {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name _;  # Accept any hostname

    client_max_body_size 100M;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Static files
    location /static/ {
        alias /opt/learning-hub/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Media files
    location /media/ {
        alias /opt/learning-hub/media/;
        expires 30d;
    }

    # Proxy to Gunicorn
    location / {
        proxy_pass http://learning_hub;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/learning-hub /etc/nginx/sites-enabled/

# Test nginx configuration
nginx -t

log "✓ Nginx configured"

# ============================================================================
# STEP 8: SUPERVISOR CONFIGURATION
# ============================================================================
echo ""
echo "🔧 STEP 8: Process Management (Supervisor)"
echo "--------------------------------------------------------------------------------"

# Gunicorn supervisor config
cat > /etc/supervisor/conf.d/learning-hub.conf <<EOF
[program:learning-hub]
directory=$PROJECT_DIR
command=$PROJECT_DIR/venv/bin/gunicorn config.wsgi:application -c $PROJECT_DIR/gunicorn.conf.py
user=www-data
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/learning-hub.log
environment=DJANGO_SETTINGS_MODULE="config.settings.production"
EOF

# Celery worker
cat > /etc/supervisor/conf.d/celery.conf <<EOF
[program:celery]
directory=$PROJECT_DIR
command=$PROJECT_DIR/venv/bin/celery -A config worker -l info
user=www-data
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/celery.log
environment=DJANGO_SETTINGS_MODULE="config.settings.production"
EOF

# Celery beat
cat > /etc/supervisor/conf.d/celery-beat.conf <<EOF
[program:celery-beat]
directory=$PROJECT_DIR
command=$PROJECT_DIR/venv/bin/celery -A config beat -l info
user=www-data
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/celery-beat.log
environment=DJANGO_SETTINGS_MODULE="config.settings.production"
EOF

supervisorctl reread
supervisorctl update

log "✓ Supervisor configured"

# ============================================================================
# STEP 9: SECURITY HARDENING
# ============================================================================
echo ""
echo "🔒 STEP 9: Security Hardening"
echo "--------------------------------------------------------------------------------"

# Configure UFW firewall
log "Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw --force enable

log "✓ Firewall configured"

# Configure fail2ban
log "Configuring fail2ban..."
cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true

[nginx-http-auth]
enabled = true
EOF

systemctl restart fail2ban
systemctl enable fail2ban

log "✓ Fail2ban configured"

# ============================================================================
# STEP 10: FINAL SETUP
# ============================================================================
echo ""
echo "🎯 STEP 10: Final Setup"
echo "--------------------------------------------------------------------------------"

# Create deployment script for updates
cat > $PROJECT_DIR/deploy-update.sh <<'EOF'
#!/bin/bash
set -e

echo "Updating Learning Hub..."

cd /opt/learning-hub
source venv/bin/activate

# Pull latest code (if git)
# git pull origin main

# Install/update dependencies
pip install -r requirements.txt --quiet

# Run migrations
python manage.py migrate --settings=config.settings.production

# Collect static
python manage.py collectstatic --noinput --settings=config.settings.production

# Restart services
supervisorctl restart learning-hub
supervisorctl restart celery
supervisorctl restart celery-beat

echo "Update complete!"
EOF

chmod +x $PROJECT_DIR/deploy-update.sh

# Create status check script
cat > $PROJECT_DIR/status-check.sh <<'EOF'
#!/bin/bash
echo "=========================================="
echo "Learning Hub - Status Check"
echo "=========================================="
echo ""
echo "Services Status:"
systemctl is-active postgresql && echo "✓ PostgreSQL: Running" || echo "✗ PostgreSQL: Stopped"
systemctl is-active redis-server && echo "✓ Redis: Running" || echo "✗ Redis: Stopped"
systemctl is-active nginx && echo "✓ Nginx: Running" || echo "✗ Nginx: Stopped"
supervisorctl status | grep -E "learning-hub|celery"
echo ""
echo "System Resources:"
free -h | grep "^Mem:"
df -h / | tail -1
echo ""
echo "Application Logs (last 10 lines):"
tail -n 10 /var/log/learning-hub.log 2>/dev/null || echo "No logs yet"
EOF

chmod +x $PROJECT_DIR/status-check.sh

log "✓ Utility scripts created"

# ============================================================================
# DEPLOYMENT COMPLETE
# ============================================================================
echo ""
echo "================================================================================"
echo "🎉 DEPLOYMENT PREPARATION COMPLETE!"
echo "================================================================================"
echo ""
echo "📋 SUMMARY:"
echo "   • System dependencies installed"
echo "   • PostgreSQL database created"
echo "   • Redis cache configured"
echo "   • Python virtual environment ready"
echo "   • Nginx reverse proxy configured"
echo "   • Supervisor process management set up"
echo "   • Security hardening applied"
echo ""
echo "📂 PROJECT LOCATION: $PROJECT_DIR"
echo ""
echo "⚠️  NEXT STEPS:"
echo "   1. Copy your Django project files to $PROJECT_DIR"
echo "   2. Configure AI API keys in $PROJECT_DIR/.env"
echo "   3. Run initial migrations:"
echo "      cd $PROJECT_DIR && source venv/bin/activate"
echo "      python manage.py migrate --settings=config.settings.production"
echo "      python manage.py collectstatic --noinput --settings=config.settings.production"
echo "   4. Create superuser:"
echo "      python manage.py createsuperuser --settings=config.settings.production"
echo "   5. Start services:"
echo "      supervisorctl start all"
echo "      systemctl restart nginx"
echo ""
echo "🔍 VERIFY DEPLOYMENT:"
echo "   $PROJECT_DIR/status-check.sh"
echo ""
echo "🔄 FUTURE UPDATES:"
echo "   $PROJECT_DIR/deploy-update.sh"
echo ""
echo "📊 DATABASE CREDENTIALS:"
echo "   User: $DB_USER"
echo "   Database: $DB_NAME"
echo "   Password saved in: /root/.learning-hub/db_credentials"
echo ""
echo "================================================================================"
log "Deployment preparation complete!"
