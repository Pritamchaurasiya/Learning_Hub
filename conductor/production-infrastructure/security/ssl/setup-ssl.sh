#!/bin/bash
# SSL Certificate Setup Script
# Sets up SSL certificates for production

set -e

DOMAIN="your-domain.com"
SSL_DIR="/etc/nginx/ssl"

echo "=================================="
echo "SSL Certificate Setup"
echo "=================================="

# Create SSL directory
mkdir -p "$SSL_DIR"

# Generate self-signed certificate for testing (replace with Let's Encrypt in production)
echo "[1/3] Generating SSL certificate..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$SSL_DIR/key.pem" \
    -out "$SSL_DIR/cert.pem" \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN"

# Set proper permissions
echo "[2/3] Setting permissions..."
chmod 600 "$SSL_DIR/key.pem"
chmod 644 "$SSL_DIR/cert.pem"

# Test certificate
echo "[3/3] Testing certificate..."
if openssl x509 -in "$SSL_DIR/cert.pem" -noout -text > /dev/null 2>&1; then
    echo "SSL certificate created successfully"
else
    echo "ERROR: SSL certificate creation failed"
    exit 1
fi

echo "=================================="
echo "SSL setup complete!"
echo "=================================="
