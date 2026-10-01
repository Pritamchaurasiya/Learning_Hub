# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build
RUN npm prune --production

# Stage 2: Production
FROM node:20-alpine AS production
RUN apk add --no-cache openssl dumb-init libc6-compat
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup
WORKDIR /app
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/prisma ./prisma
COPY --from=builder --chown=appuser:appgroup /app/package.json ./

# Ensure uploads directory exists and is owned by appuser
RUN mkdir -p /app/uploads && chown -R appuser:appgroup /app/uploads

USER appuser
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/v1/health || exit 1
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["sh", "-c", "if [ -f dist/src/server.js ]; then node dist/src/server.js; else node dist/server.js; fi"]
