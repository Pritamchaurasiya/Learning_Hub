#!/bin/bash

# Production Deployment Script for Conductor LMS
# Usage: ./deploy_prod.sh

echo "🚀 Starting Deployment..."

# 1. Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# 2. Build Docker Containers
echo "🏗️ Building containers..."
docker-compose -f docker-compose.prod.yml build

# 3. Apply Migrations
echo "🗄️ Applying database migrations..."
docker-compose -f docker-compose.prod.yml run --rm web python manage.py migrate

# 4. Collect Static Files
echo "🎨 Collecting static files..."
docker-compose -f docker-compose.prod.yml run --rm web python manage.py collectstatic --noinput

# 5. Restart Services
echo "🔄 Restarting services..."
docker-compose -f docker-compose.prod.yml up -d

# 6. Verify Health
echo "🏥 Verifying deployment..."
sleep 10
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health/)

if [ "$STATUS" -eq 200 ]; then
    echo "✅ Deployment Successful! System is healthy."
else
    echo "⚠️ Deployment completed but health check returned $STATUS. Please check logs."
fi
