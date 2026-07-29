# LearningHub Production Deployment Guide

This guide provides step-by-step instructions for deploying the **LearningHub** platform into production across Docker, PM2, or Cloudflare Workers serverless architecture.

---

## Architecture Blueprint

- **Frontend**: Vite SPA with PWA support (`dist/` asset bundle).
- **Backend API**: Express 5 application (`dist/server.js`) running Node.js 18+.
- **Database**: PostgreSQL with Prisma ORM 6.2 (Support for local, AWS RDS, Neon, or Railway).
- **Caching & Realtime**: Redis for session/cache acceleration and Socket.IO adapter.
- **Reverse Proxy**: Nginx with SSL termination (`nginx.conf`).

---

## 1. Environment Configuration

### Backend (`learninghub/backend/.env`)
Ensure production environment variables are configured:

```env
PORT=5000
NODE_ENV=production
DATABASE_URL="postgresql://user:password@host:5432/learninghub?sslmode=require"
DIRECT_URL="postgresql://user:password@host:5432/learninghub"
JWT_SECRET="your-32-character-random-production-jwt-secret-key"
JWT_REFRESH_SECRET="your-32-character-random-production-refresh-secret"
CORS_ORIGIN="https://yourdomain.com"
FRONTEND_URL="https://yourdomain.com"
CSRF_SECRET="your-32-character-random-csrf-secret-key"
```

### Frontend (`learninghub/.env.production`)

```env
VITE_API_URL=/api/v1
VITE_APP_URL=https://yourdomain.com
```

---

## 2. Database Migration & Seeding

```bash
cd backend
npm run db:migrate:deploy
npm run db:seed
```

---

## 3. Production Build & Start (PM2 / Node.js)

### Build Frontend & Backend
```bash
# Build Frontend
cd learninghub
npm run build

# Build Backend
cd backend
npm run build
```

### Start with PM2
```bash
cd backend
npx pm2 start ecosystem.config.js --env production
```

---

## 4. Docker Deployment

Launch using Docker Compose:

```bash
docker-compose -f docker-compose.yml up -d --build
```

---

## 5. Deployment Verification

Verify readiness using the pre-deployment verification script:

```bash
node scripts/verify-deployment-ready.cjs
```
