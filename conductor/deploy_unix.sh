#!/bin/bash
# Production Deployment Script for Linux/Mac

set -e

echo "========================================"
echo "Learning Hub - Production Deployment"
echo "========================================"

# Check prerequisites
echo "Checking prerequisites..."
python3 --version || { echo "ERROR: Python3 not found"; exit 1; }
pip3 --version || { echo "ERROR: pip3 not found"; exit 1; }

echo "[OK] Prerequisites met"

# Install dependencies
echo "Installing dependencies..."
pip3 install -r requirements/production.txt

# Run migrations
echo "Running database migrations..."
python3 manage.py migrate --settings=config.settings.production

# Collect static files
echo "Collecting static files..."
python3 manage.py collectstatic --noinput --settings=config.settings.production

# Run system checks
echo "Running system checks..."
python3 manage.py check --deploy --settings=config.settings.production || echo "WARNING: System checks found issues"

echo "========================================"
echo "Deployment Preparation Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Configure environment variables in .env"
echo "2. Set up PostgreSQL database"
echo "3. Configure Redis cache"
echo "4. Start the server: python3 manage.py runserver --settings=config.settings.production"
echo "5. Or use Docker: docker-compose up -d"
echo ""
