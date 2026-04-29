#!/bin/bash
# Linux Production Deployment Script

set -e

echo "=================================="
echo "Linux Production Deployment"
echo "=================================="

# Pre-deployment checks
echo "[1/4] Pre-deployment checks..."
docker-compose -f docker-compose.linux.yml config
echo "  [OK] Configuration valid"

# Build and deploy
echo "[2/4] Building and deploying..."
docker-compose -f docker-compose.linux.yml build
docker-compose -f docker-compose.linux.yml up -d
echo "  [OK] Services deployed"

# Health check
echo "[3/4] Health check..."
sleep 10
curl -f http://localhost:8000/health/ || exit 1
echo "  [OK] Health check passed"

# SSL setup
echo "[4/4] SSL setup reminder..."
echo "  Remember to:"
echo "  1. Place SSL certificates in ./ssl/"
echo "  2. Update domain in nginx/linux.conf"
echo "  3. Run certbot for Let's Encrypt if needed"

echo "=================================="
echo "Linux deployment complete!"
echo "=================================="
