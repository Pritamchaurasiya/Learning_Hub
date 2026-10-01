# LearningHub — System Architecture

This document is the **authoritative high-level architecture reference** for the LearningHub platform. It supersedes any older architecture documents (PHASE_*, MASTER_PROMPT, etc).

## 1. System Overview

LearningHub is a full-stack learning management platform that provides:

- **Courses & Lessons** — Structured learning with progress tracking
- **Tests & Quizzes** — Practice, mock exams, and adaptive testing with AI
- **DSA Problems** — Coding challenges with execution and scoring
- **AI Tutoring** — Gemini-powered personalized guidance
- **Gamification** — XP, levels, streaks, badges, leaderboard
- **Real-time** — Notifications and live classes via WebSocket
- **Payments** — Course purchases, subscriptions, certificates

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                            CLIENTS                                    │
│   Web Browser (React SPA)    Mobile Browser    Tablet Browser       │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTPS (TLS 1.3)
                                │ WSS (WebSocket Secure)
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         LOAD BALANCER                                 │
│              (nginx / Cloudflare / AWS ALB)                          │
│         • SSL termination    • Rate limiting (1000/min)              │
│         • DDoS protection   • Static asset caching                   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
┌──────────────────────┐ ┌────────────────────┐ ┌────────────────────┐
│   FRONTEND (CDN)     │ │  BACKEND NODE     │ │  BACKEND DJANGO    │
│   Vite + React      │ │  Express + TS      │ │  DRF               │
│   TailwindCSS       │ │  Port 5000         │ │  Port 8000         │
│   TanStack Query    │ │  (Primary API)     │ │  (Migration Target)│
│   Zustand           │ │  Socket.io         │ │  Channels (WS)     │
└──────────────────────┘ └────────────────────┘ └────────────────────┘
                                │                       │
                ┌───────────────┴───────────────┬───────┴────────┐
                ▼               ▼               ▼                ▼
┌──────────────────────┐ ┌────────────────────┐ ┌────────────┐ ┌─────────────┐
│  PostgreSQL         │ │  Redis              │ │  Bull Queue │ │ Sentry      │
│  (Primary DB)       │ │  Cache + Pub/Sub    │ │  (Jobs)     │ │ (Errors)    │
│  Prisma + Django    │ │  Sessions           │ │  Email      │ │ Prometheus  │
│  ORM                │ │  Rate Limits        │ │  AI Queue   │ │ (Metrics)   │
└──────────────────────┘ └────────────────────┘ └────────────┘ └─────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                                │
│  Gemini API (AI)  •  Stripe (Payments)  •  Google OAuth  •  S3/R2   │
└─────────────────────────────────────────────────────────────────────┘
```

## 3. Component Architecture

### 3.1 Frontend (React + TypeScript)

```
src/
├── components/          # Reusable UI components
│   ├── ui/              # Atomic UI (Button, Card, Modal)
│   ├── layout/          # Layout components (Header, Sidebar)
│   └── shared/          # Business components (CourseCard, QuizItem)
├── pages/               # Route-level page components (lazy-loaded)
├── hooks/               # Custom React hooks
├── services/            # API client layer
│   ├── api.ts           # Base fetch with auth/refresh
│   ├── courseService.ts # Domain-specific services
│   └── ...
├── stores/              # Zustand state management
│   ├── useStore.ts      # Root store
│   └── slices/          # Feature slices
├── utils/               # Helpers (security, validation)
├── App.tsx              # Root component with routes
└── main.tsx             # Entry point
```

**Key patterns:**
- Route-level code splitting (`React.lazy()`)
- TanStack Query for server state caching
- Zustand for client state
- WebSocket for real-time notifications
- MSW for development mocking
- Service Worker for offline support

### 3.2 Backend — Node/Express (Current Production)

```
backend/src/
├── controllers/         # HTTP request handlers
│   ├── authController.ts
│   ├── testsController.ts
│   ├── aiController.ts
│   └── ...
├── services/            # Business logic
│   ├── AuthService.ts
│   ├── TestScoringService.ts
│   ├── AITestService.ts
│   ├── GrowthEngineService.ts
│   └── ...
├── routes/v1/           # API routes
├── middleware/          # Express middleware
│   ├── authMiddleware.ts
│   ├── csrfMiddleware.ts
│   ├── rateLimiter.ts
│   └── ...
├── websockets/          # Socket.io handlers
├── utils/               # Helpers
└── prisma/              # Prisma schema
```

### 3.3 Backend — Django REST Framework (Migration Target)

```
django_backend/
├── apps/                # Domain apps
│   ├── users/           # User model, auth
│   ├── courses/         # Course, chapter, lesson
│   ├── tests_engine/    # Test, attempt, scoring
│   ├── problems/        # DSA problems
│   ├── gamification/    # XP, badges, leaderboard
│   ├── social/          # Discussions, notifications
│   ├── ecommerce/       # Cart, orders, payments
│   ├── ai_tutor/        # AI tutor engine
│   └── core/            # Shared utilities
├── learninghub_server/  # Django project config
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py / asgi.py
└── manage.py
```

### 3.4 Database Schema (PostgreSQL)

**Node Prisma Models (60+):** User, Test, Question, Option, TestResult, TestAttemptAnswer, TestSession, DailyGoal, Badge, Notification, AIChatSession, Order, Payment, Subscription, CourseEnrollment, LessonProgress, Streak, Achievement, Certificate, Web3Profile, Contest, Mentor, LiveSession, etc.

**Django Models (15+ apps):** User, Course, Chapter, Lesson, Enrollment, LessonProgress, CourseReview, Test, Question, Option, TestAttempt, AttemptAnswer, Badge, UserBadge, DailyGoal, XPTransaction, Order, OrderItem, PaymentTransaction, Certificate, Web3Profile, Contest, AIChatSession, AIChatMessage, SpacedRepetitionSchedule, Notification, Discussion, Comment, LiveSession, Mentor, CourseBookmark, QuestionBookmark, TopicPerformance

**Shared tables (after migration):** Users, Notifications, Courses, Tests, Orders, Payments

## 4. Data Flow Examples

### 4.1 User Takes a Test

```
[Browser]                  [Node Backend]              [Database]
    │                            │                          │
    │  1. POST /tests/123/start   │                          │
    ├───────────────────────────►│                          │
    │                            │  2. Create TestResult    │
    │                            ├─────────────────────────►│
    │                            │                          │
    │                            │  3. Return questions    │
    │                            │◄─────────────────────────┤
    │  4. Return attemptId + Qs   │                          │
    │◄───────────────────────────┤                          │
    │                            │                          │
    │  5. User answers (30s)      │                          │
    │  6. POST /tests/123/autosave│                          │
    ├───────────────────────────►│                          │
    │                            │  7. Upsert answers       │
    │                            ├─────────────────────────►│
    │                            │                          │
    │  8. POST /tests/123/submit  │                          │
    ├───────────────────────────►│                          │
    │                            │  9. Score + XP award     │
    │                            ├─────────────────────────►│
    │                            │ 10. WebSocket notify     │
    │                            ├──────►[User's WS]        │
    │ 11. Result + Score + XP     │                          │
    │◄───────────────────────────┤                          │
```

### 4.2 Payment Flow

```
[Browser]              [Node Backend]            [Django]              [Stripe]
    │                       │                       │                      │
    │ 1. POST /cart (add)   │                       │                      │
    ├──────────────────────►│                       │                      │
    │                       │                       │                      │
    │ 2. POST /checkout     │                       │                      │
    │   (X-Idempotency-Key) │                       │                      │
    ├──────────────────────►│                       │                      │
    │                       │ 3. Create PENDING order                    │
    │                       │    with idempotency_key                    │
    │                       │                       │                      │
    │ 4. Return checkoutUrl │                       │                      │
    │◄──────────────────────┤                       │                      │
    │                       │                       │                      │
    │ 5. User enters card on Stripe-hosted page    │                      │
    ├───────────────────────┬───────────────────────┼─────────────────────►│
    │                       │                       │                      │
    │                       │                       │ 6. Webhook (signed)  │
    │                       │◄──────────────────────┼──────────────────────┤
    │                       │                       │                      │
    │                       │ 7. Verify HMAC-SHA256                       │
    │                       │ 8. Update order → COMPLETED                 │
    │                       │ 9. Enroll user in courses                   │
    │                       │ 10. Clear cart                              │
    │                       │ 11. Send notification                       │
    │ 12. Realtime notify   │                       │                      │
    │◄──────────────────────┤                       │                      │
```

## 5. Security Architecture

### 5.1 Authentication Flow

```
[Client]                                 [Server]
   │                                        │
   │ 1. POST /auth/login (email, password)  │
   ├───────────────────────────────────────►│
   │                                        │ 2. Verify bcrypt hash
   │                                        │ 3. Generate JWT access (15min)
   │                                        │ 4. Generate refresh (7d)
   │                                        │ 5. Set httpOnly cookies
   │                                        │
   │ 6. Return {token, refreshToken, user}  │
   │◄───────────────────────────────────────┤
   │                                        │
   │ 7. Store in SecureStorage              │
   │ 8. Subsequent: Authorization: Bearer   │
   │                                        │
   │ 9. 15min later: token expired          │
   │ 10. POST /auth/refresh {refreshToken}  │
   ├───────────────────────────────────────►│
   │                                        │ 11. Verify refresh token
   │                                        │ 12. Rotate (revoke old)
   │                                        │ 13. Generate new pair
   │                                        │
   │ 14. Return {token, refreshToken}       │
   │◄───────────────────────────────────────┤
```

### 5.2 CSRF Protection

- **Django:** Built-in `CsrfViewMiddleware`, requires `X-CSRF-Token` header
- **Node:** Custom `csrfMiddleware` validates `csrf-token` cookie matches header
- **Frontend:** Reads cookie, sends header on mutating requests

### 5.3 Rate Limiting

| Endpoint | Limit | Scope |
|----------|-------|-------|
| Auth (login, register) | 5/min | Per IP |
| Auth (refresh) | 10/min | Per IP |
| Test mutations | 30/min | Per user |
| AI tutor | 5-10/min | Per user |
| AI test generation | 2/min | Per user |
| Notifications | 30/min | Per user |
| Leaderboard | 60/min | Per user |
| WebSocket connections | 50/min | Per IP |
| WebSocket messages | 2/sec | Per socket |

### 5.4 Anti-Cheat Layers

1. **Timer:** Server-computed, MAX(client, server) — see ANTI_CHEAT_TIMER.md
2. **Progress:** Server-computed from lesson completions — see CANONICAL_COURSE_CONTRACT.md
3. **XP/Grind:** Atomic increments, daily caps, rate limits — see CANONICAL_GAMIFICATION_CONTRACT.md
4. **Payment:** Webhook signature verification, idempotency — see CANONICAL_PAYMENT_CONTRACT.md
5. **AI:** NO_AI mode, prompt sanitization, rate limits — see CANONICAL_AI_SAFETY_CONTRACT.md

## 6. Deployment Architecture

```
                          Production Topology

                    ┌──────────────────────────┐
                    │   Cloudflare CDN         │
                    │   (Static + WAF)         │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │   nginx / ALB            │
                    │   SSL termination        │
                    │   Rate limit (1000/min)  │
                    └────────────┬─────────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            │                    │                    │
   ┌────────▼────────┐  ┌────────▼────────┐  ┌────────▼────────┐
   │ Frontend        │  │ Backend Node    │  │ Backend Django  │
   │ (S3 + CDN)      │  │ (ECS/K8s)       │  │ (ECS/K8s)       │
   │ Static files    │  │ Auto-scaling    │  │ Auto-scaling    │
   └─────────────────┘  └────────┬────────┘  └────────┬────────┘
                                 │                    │
                          ┌──────┴────────────────────┘
                          │
            ┌─────────────┴─────────────┐
            │  PostgreSQL (RDS)          │
            │  Multi-AZ                  │
            │  Automated backups         │
            └───────────────────────────┘
                          │
            ┌─────────────┴─────────────┐
            │  Redis (ElastiCache)       │
            │  Cluster mode              │
            │  Eviction policy: allkeys  │
            └───────────────────────────┘
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## 7. Observability

### 7.1 Logging

- **Structured logging** (JSON format) with `winston` (+ `winston-daily-rotate-file`, see `backend/src/utils/logger.ts`) on Node and Python `logging` on Django
- **Log levels:** ERROR, WARN, INFO, DEBUG
- **Log aggregation:** ELK / Loki / CloudWatch
- **PII redaction:** Automatic in production

### 7.2 Metrics

- **Application metrics:** Request rate, error rate, p50/p95/p99 latency
- **Business metrics:** Active users, test attempts, course completions
- **Infrastructure metrics:** CPU, memory, DB connections
- **AI metrics:** Token usage, cost per request

### 7.3 Tracing

- Distributed tracing with OpenTelemetry
- Trace IDs propagate across services
- Sampled at 10% in production

See [MONITORING.md](MONITORING.md) for details.

## 8. Development Workflow & Ports (Canonical)

```
Developer
   │
   ├─ 1. Clone repo
   ├─ 2. Copy .env.example to .env
   ├─ 3. docker-compose up (start PostgreSQL + Redis)
   ├─ 4. npm install (backend)
   ├─ 5. cd django_backend && pip install -r requirements.txt
   ├─ 6. python manage.py migrate
   ├─ 7. npm run dev (frontend)
   └─ 8. Open http://localhost:3000
```

### 8.1 Canonical Port Table (single source of truth)

| Service | Port | Source of truth | Notes |
|---------|------|-----------------|-------|
| Vite dev server | `3000` | `vite.config.ts` → `server.port` | Custom setting for this repo (Vite default is 5173 — **not** used locally) |
| Playwright `baseURL` + `webServer.url` | `3000` | `playwright.config.ts` | Matches Vite; `PLAYWRIGHT_BASE_URL` env overrides in CI |
| CI live-E2E frontend | `5173` | `.github/workflows/ci.yml` (`npm run dev -- --port 5173`) | CI-only override with `PLAYWRIGHT_BASE_URL=http://localhost:5173`; legacy docs saying "open :5173" refer to this/Vite default |
| Node/Express API | `5000` | `VITE_API_TARGET` default (`http://127.0.0.1:5000`), DEPLOYMENT health checks | Primary API in local dev |
| Django API | `8000` | `gunicorn --bind 0.0.0.0:8000`, CI `runserver 0.0.0.0:8000` | Migration target |
| PostgreSQL / Redis | `5432` / `6379` | docker-compose, CI services | — |

### 8.2 `VITE_API_TARGET` Switch

The frontend dev proxy (`vite.config.ts` → `/api`, `/uploads`, `/socket.io`) forwards to `VITE_API_TARGET`:

| Value | Backend served |
|-------|----------------|
| `http://127.0.0.1:5000` (default) | Node/Express |
| `http://localhost:8000` | Django (CI live-E2E uses `VITE_API_TARGET=http://localhost:8000` + `VITE_API_URL=http://localhost:8000/api/v1`) |

Old references to "open http://localhost:5173" mean the Vite default / CI override — locally use `:3000`.

## 9. Migration Plan (Node → Django)

The platform is in active migration from Node/Express/Prisma to Django REST Framework.

| Phase | Domains | Status |
|-------|---------|--------|
| 1 | Auth, Tests, Timer, Courses, Gamification, Notifications, Payments, AI, Performance | ✅ Completed (this report) |
| 2 | Contests, Web3, Live Sessions, Mentors | Pending |
| 3 | Discussions, Mentors, Search, Recommendations | Pending |
| 4 | Decommission Node backend | Pending |

**Migration rules:**
- Domain-by-domain migration
- Both backends must serve same canonical contract
- Frontend works with both via `VITE_API_TARGET` env var
- Don't remove Node backend until Django parity proven

## 10. Cross-Cutting Concerns

### 10.1 Internationalization (i18n)
- Currently English only
- All strings should be in a translation file (future)

### 10.2 Accessibility (a11y)
- ESLint plugin `jsx-a11y` configured
- ARIA labels on critical buttons
- Keyboard navigation
- Tested with screen readers (TODO)

### 10.3 Browser Support
- Chrome 100+ (primary)
- Firefox 100+
- Safari 15+
- Edge 100+
- Mobile Safari iOS 15+
- Chrome Android 100+

## Related Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) — Production deployment
- [MONITORING.md](MONITORING.md) — Observability
- [PRODUCTION_READINESS_CHECKLIST.md](PRODUCTION_READINESS_CHECKLIST.md) — Pre-launch checklist
- [SECRETS_MANAGEMENT.md](SECRETS_MANAGEMENT.md) — Secrets policy
- [PERFORMANCE_OPTIMIZATION.md](PERFORMANCE_OPTIMIZATION.md) — Performance rules
- [CANONICAL_*_CONTRACT.md](.) — All API contracts

## Document Status

✅ **Current** — Last updated: 2026-09-04
- Supersedes: PHASE_*_*, MASTER_PROMPT, etc.
- Maintained by: Engineering Team
