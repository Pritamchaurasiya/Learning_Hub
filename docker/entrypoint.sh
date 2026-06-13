#!/bin/sh
set -e

echo "Waiting for postgres..."
while ! nc -z db 5432 2>/dev/null; do
  sleep 0.5
done
echo "PostgreSQL started"

echo "Running migrations..."
python /app/backend/manage.py migrate --noinput

echo "Collecting static files..."
python /app/backend/manage.py collectstatic --noinput

echo "Starting supervisor..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
