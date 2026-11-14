FROM python:3.12-slim AS builder

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system appgroup \
    && useradd --system --gid appgroup --create-home appuser

COPY --from=builder /root/.local /home/appuser/.local
ENV PATH=/home/appuser/.local/bin:$PATH
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY --chown=appuser:appgroup . .
RUN mkdir -p /app/media /app/staticfiles && chown -R appuser:appgroup /app/media /app/staticfiles

USER appuser

EXPOSE 8000

# Readiness must fail when PostgreSQL is unavailable; /health/live is for liveness.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -fsS -H "Host: localhost" -H "X-Forwarded-Proto: https" \
    "http://127.0.0.1:${PORT:-8000}/api/v1/health/ready" || exit 1

CMD ["sh", "-c", "daphne -b 0.0.0.0 -p ${PORT:-8000} learninghub_server.asgi:application"]
