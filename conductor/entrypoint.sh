#!/bin/sh
set -e

echo "Waiting for postgres..."
while ! nc -z db 5432 2>/dev/null; do
  sleep 0.5
done
echo "PostgreSQL started"

echo "Running migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Seeding demo data..."
python manage.py seed_all 2>/dev/null || echo "Seed data already exists or skipped"

exec "$@"
