#!/bin/sh
set -e

echo "[Docker Entrypoint] Starting LearningHub Backend Container..."

# Apply Prisma database migrations if in production/staging and DATABASE_URL is configured
if [ -n "$DATABASE_URL" ] && [ "$RUN_MIGRATIONS" != "false" ]; then
  echo "[Docker Entrypoint] Running Prisma database migrations (prisma migrate deploy)..."
  if [ -x "./node_modules/.bin/prisma" ] || [ -f "./node_modules/.bin/prisma" ]; then
    ./node_modules/.bin/prisma migrate deploy || {
      echo "[Docker Entrypoint] ⚠️ Warning: prisma migrate deploy returned non-zero code. Proceeding to startup..."
    }
  else
    echo "[Docker Entrypoint] ℹ️ prisma binary not found in node_modules/.bin; skipping migration deploy."
  fi
fi

echo "[Docker Entrypoint] Launching Express server..."
if [ -f "dist/src/server.js" ]; then
  exec node dist/src/server.js
elif [ -f "dist/server.js" ]; then
  exec node dist/server.js
else
  echo "[Docker Entrypoint] ❌ Error: compiled server bundle not found in dist/"
  exit 1
fi
