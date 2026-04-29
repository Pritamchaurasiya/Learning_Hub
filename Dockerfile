# Dockerfile - God Mode Super Container
# Combines:
# 1. Django Backend (Gunicorn)
# 2. Flutter Web Frontend (Nginx)
# 3. AI Services

# --- Stage 1: Build Backend ---
FROM python:3.11-slim as backend-build

WORKDIR /app
COPY conductor/requirements /app/requirements
RUN pip install --no-cache-dir -r requirements/production.txt

COPY conductor /app/backend

# --- Stage 2: Build Frontend (Flutter) ---
# Note: We assume the host has already built the Flutter web assets using deploy_god_mode.py
# This saves massive image size and build time by avoiding installing Flutter in Docker.
# In a true CI/CD, we would use a Flutter image here.
# For this optimized local deployment, we COPY the pre-built artifacts.

# --- Stage 3: Super Runtime ---
FROM python:3.11-slim

# Install System Dep (Nginx, Supervisor)
RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Backend
COPY --from=backend-build /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=backend-build /usr/local/bin /usr/local/bin
COPY --from=backend-build /app/backend /app/backend

# Copy Frontend (Pre-built on Host)
# Ensure deploy_god_mode.py runs before building this image!
COPY windows_app/build/web /app/frontend/web

# Configure Nginx
COPY docker/nginx.conf /etc/nginx/sites-available/default

# Configure Supervisor
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Environment Defaults
ENV PORT=8080
ENV DJANGO_SETTINGS_MODULE=config.settings.production

# Entrypoint
COPY docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 8080

CMD ["/app/entrypoint.sh"]
