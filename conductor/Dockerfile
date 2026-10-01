FROM python:3.11-slim

# Create non-root user for security
RUN addgroup --system appgroup && adduser --system appuser --ingroup appgroup

WORKDIR /app

# Install dependencies first (better layer caching)
COPY requirements/ ./requirements/
RUN pip install --no-cache-dir -r requirements/production.txt && \
    rm -rf /root/.cache/pip

# Copy app code
COPY --chown=appuser:appgroup . .

# Collect static files
RUN python manage.py collectstatic --noinput 2>/dev/null || true

# Switch to non-root user
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health/')" || exit 1

CMD ["gunicorn", "config.wsgi:application", "--config", "gunicorn_config.py"]
