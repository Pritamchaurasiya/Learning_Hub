#!/bin/bash
# SSL Certificate Update Script
# Updates SSL certificates using Let's Encrypt

set -e

echo "=================================="
echo "SSL Certificate Update Script"
echo "=================================="

DOMAIN="your-domain.com"
EMAIL="admin@your-domain.com"
NGINX_DIR="/etc/nginx"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
LOG_FILE="/var/log/ssl-update.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

echo "[1/4] Checking certificate expiration..."
if [ -f "$CERT_DIR/fullchain.pem" ]; then
    EXPIRY_DATE=$(openssl x509 -in "$CERT_DIR/fullchain.pem" -noout -enddate | cut -d= -f2)
    EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
    CURRENT_EPOCH=$(date +%s)
    DAYS_LEFT=$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))
    
    if [ "$DAYS_LEFT" -gt 30 ]; then
        log("Certificate is valid for $DAYS_LEFT days, no update needed")
        exit 0
    fi
else
    log("No certificate found, requesting new one")
fi

echo "[2/4] Requesting new certificate..."
certbot certonly --webroot     -w /var/www/html     -d "$DOMAIN"     --email "$EMAIL"     --agree-tos     --non-interactive     --force-renewal

log("New certificate requested")

echo "[3/4] Installing certificate..."
cp "$CERT_DIR/fullchain.pem" "$NGINX_DIR/ssl/cert.pem"
cp "$CERT_DIR/privkey.pem" "$NGINX_DIR/ssl/key.pem"
log("Certificate installed")

echo "[4/4] Reloading Nginx..."
docker-compose -f deployment/docker-compose/docker-compose.prod.yml exec nginx nginx -s reload
log("Nginx reloaded")

echo "=================================="
echo "SSL certificate update complete!"
echo "=================================="
log("SSL certificate updated successfully")
