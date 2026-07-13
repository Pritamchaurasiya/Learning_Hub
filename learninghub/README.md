# LearningHub

A full-stack learning management platform with AI-powered tutoring, interactive live classes, gamification, and spaced repetition.

## Tech Stack

| Layer      | Technology                                              |
| ---------- | ------------------------------------------------------- |
| Frontend   | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion |
| State      | Zustand, TanStack Query                                 |
| Backend    | Express 4, TypeScript, Prisma 6, PostgreSQL             |
| Real-time  | Socket.io (WebSocket), Redis adapter                    |
| Queues     | Bull (Redis-backed job queue)                           |
| AI         | Gemini API (AI tutor, test generation)                  |
| Auth       | JWT (access + refresh tokens), bcryptjs                 |
| Payments   | Stripe                                                  |
| Monitoring | Sentry                                                  |
| Testing    | Jest (backend), Vitest + Playwright (frontend/e2e)      |
| Infra      | Docker, docker-compose                                  |

## Project Structure

```
learninghub/
├── src/                    # Frontend React application
│   ├── components/         # Shared UI components
│   ├── hooks/              # Custom React hooks
│   ├── pages/              # Page components
│   ├── services/           # API client services
│   ├── stores/             # Zustand state management
│   └── utils/              # Utility functions
├── backend/                # Express API server
│   ├── src/
│   │   ├── config/         # App configuration, security settings
│   │   ├── controllers/    # Route handlers
│   │   ├── jobs/           # Scheduled jobs (token cleanup, etc.)
│   │   ├── middleware/     # Express middleware (auth, CSRF, rate-limit, etc.)
│   │   ├── routes/         # API route definitions
│   │   ├── services/       # Business logic services
│   │   ├── utils/          # Utilities (auth, logger, response helper)
│   │   ├── validations/    # Zod schemas
│   │   └── websockets/     # Socket.io event handlers
│   ├── prisma/             # Prisma schema + migrations
│   └── tests/              # Jest test suite
├── shared/                 # Types shared between frontend and backend
├── e2e/                    # Playwright end-to-end tests
├── docker-compose.yml      # Orchestration for local dev / deployment
├── Dockerfile              # Frontend production build
└── nginx.conf              # Reverse proxy config
```

## Quick Start

### Prerequisites

- Node.js >= 18
- PostgreSQL >= 15
- Redis >= 7 (optional — app falls back to in-memory)
- npm >= 9

### Environment Variables

Copy `.env.example` to `.env.development` and configure:

```bash
cp .env.example .env.development
```

Key variables:

| Variable             | Description                                                   |
| -------------------- | ------------------------------------------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string                                  |
| `JWT_SECRET`         | Secret for signing JWT tokens (must be changed in production) |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens                                     |
| `REDIS_URL`          | Redis connection string                                       |
| `GEMINI_API_KEY`     | Google Gemini API key for AI features                         |
| `STRIPE_SECRET_KEY`  | Stripe secret key                                             |
| `SENTRY_DSN`         | Sentry error tracking DSN                                     |

### Local Development

```bash
# Install dependencies
npm install
cd backend && npm install

# Start PostgreSQL and Redis (or use docker-compose)
docker-compose up -d db redis

# Run database migrations
cd backend && npx prisma migrate dev

# Start backend (watch mode)
cd backend && npm run dev

# Start frontend (in another terminal)
npm run dev
```

### Docker (full stack)

```bash
docker-compose up --build
```

This starts: PostgreSQL, Redis, backend (Express on :8000), frontend (Nginx on :3000).

## API Overview

All API routes are prefixed with `/api/v1`.

### Authentication

| Method | Path                    | Description               |
| ------ | ----------------------- | ------------------------- |
| POST   | `/auth/register`        | Create account            |
| POST   | `/auth/login`           | Sign in                   |
| POST   | `/auth/refresh`         | Refresh access token      |
| POST   | `/auth/logout`          | Revoke refresh token      |
| POST   | `/auth/forgot-password` | Request password reset    |
| POST   | `/auth/reset-password`  | Reset password with token |

### Protected Routes (require JWT)

| Method | Path                    | Description                     |
| ------ | ----------------------- | ------------------------------- |
| GET    | `/auth/me`              | Current user profile + progress |
| PUT    | `/auth/profile`         | Update profile                  |
| POST   | `/auth/change-password` | Change password                 |
| DELETE | `/auth/delete-account`  | Delete account                  |

### Other Modules

- `/courses` — Course catalog and enrollment
- `/problems` — Coding problems and submissions
- `/tests` — Practice tests and exams
- `/live-sessions` — Live class management
- `/mentors` — Mentor profiles and sessions
- `/payments` — Stripe checkout and webhooks
- `/ai/tutor` — AI tutoring sessions
- `/gamification` — XP, achievements, leaderboards
- `/bookmarks` — Bookmarked resources
- `/admin` — Admin dashboard endpoints

## Key Features

- **AI Tutor**: Gemini-powered chat assistant for personalized learning
- **Live Classes**: Real-time video + chat via WebSocket with WebRTC signaling
- **Adaptive Learning**: Spaced repetition engine for optimal review scheduling
- **Gamification**: XP points, levels, achievements, leaderboards
- **Role-based Access**: Student, Instructor, Admin, Super Admin
- **Full-text Search**: PostgreSQL pg_trgm indexes across 20+ models
- **Rate Limiting**: Per-user/per-IP with Redis backend and in-memory fallback
- **CSRF Protection**: Token-based on state-changing requests
- **Background Jobs**: Bull queue for analytics, XP, certificate generation

## Testing

```bash
# Backend tests (Jest)
cd backend && npm test

# Frontend tests (Vitest)
npm test

# E2E tests (Playwright)
npx playwright test

# With UI
npx playwright test --ui
```

## Deployment

### Production Build

```bash
# Frontend
npm run build        # outputs to dist/

# Backend
cd backend && npm run build   # outputs to dist/
```

### Docker (Production)

```bash
# Build and run
docker-compose -f docker-compose.yml up --build -d

# Or deploy individual services
docker build -t learninghub-frontend -f Dockerfile .
docker build -t learninghub-backend -f backend/Dockerfile .
```

### Security Checklist

Before deploying to production:

1. Set a strong `JWT_SECRET` (min 32 chars, use `openssl rand -hex 32`)
2. Set `JWT_REFRESH_SECRET` to a different strong value
3. Disable `REDIS_ENABLED` or secure Redis with password + TLS
4. Review CORS origins in `backend/src/config/security.ts`
5. Set `NODE_ENV=production`
6. Configure Sentry DSN for error monitoring
7. Enable PostgreSQL SSL for remote connections
8. Change all default passwords in docker-compose.yml
9. Set `GEMINI_API_KEY` to a valid key (falls back to mock if unset)

## Architecture Decisions

- **Token storage**: Access tokens stored in `localStorage` under `lh_token` key (AES-GCM encrypted when `crypto.subtle` is available via `SecureStorage`)
- **Token refresh**: Refresh tokens are sent in the request body (not cookies) — CSRF mitigation relies on token header validation
- **Rate limiting**: Redis-backed with automatic in-memory fallback; circuit breaker prevents cascade failures
- **Full-text search**: PostgreSQL `pg_trgm` extension with GIN indexes for ILIKE queries on 20+ models; courses also get a `tsvector` column for weighted ranking
- **Error handling**: Centralized `errorHandler` middleware; service layer uses typed `AppError` classes via `errorFactory`
