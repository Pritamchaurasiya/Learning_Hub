# LEARNINGHUB — ARCHITECTURE SOURCE OF TRUTH (CANONICAL V1.0)

> **Document Classification:** Ground Truth Architecture & System Inventory  
> **Repository:** `https://github.com/Pritamchaurasiya/Learning_Hub`  
> **Live Site:** `https://learninghub-385.pages.dev/`  
> **Authoritative Date:** October 2026  
> **Verification Status:** Empirically Verified via Codebase Inspection, Process Logs, and Network Topology

---

## 1. EXECUTIVE SOURCE OF TRUTH SUMMARY

The LearningHub platform consists of a multi-runtime hybrid topology resulting from project evolution. This document establishes the strict runtime boundaries between active production systems, unmounted legacy code, and optional edge stubs.

| Tier | Component | Directory Path | Active Technology | Port / Gateway | Production Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Frontend** | React SPA | `learninghub/` | React 18, Vite 5, TypeScript 5, Tailwind CSS | 3000 (Dev) / 80 (Docker) / Cloudflare Pages | **AUTHORITATIVE** |
| **API Gateway** | Express Hub | `learninghub/backend/` | Node 20+, Express 5, TypeScript 5, Prisma 6 | 5000 (Proxied via `/api/`) | **AUTHORITATIVE** |
| **Realtime / ML**| Conductor Engine | `conductor/` | Python 3.13, Django 5, Daphne ASGI, Celery 5.4 | 8000 (Proxied via `/ws/`, `/admin/`) | **AUTHORITATIVE** |
| **Desktop Client**| Flutter App | `windows_app/` | Flutter 3.x, Dart | Native Windows/Android client | **CONSUMER** |
| **Alternate Backend** | Django Backend | `learninghub/django_backend/`| Django 5.0, DRF (11-app modular) | Unmounted in Compose & Bat files | **UNDEPLOYED / LEGACY** |
| **Edge Stubs** | Workers Backend | `learninghub/workers-backend/`| Cloudflare Workers, Neon Serverless | Edge URL (Partially stubbed) | **OPTIONAL EDGE** |
| **Database** | PostgreSQL | Docker `db` container | PostgreSQL 16 with `pgvector` extension | 5432 | **AUTHORITATIVE** |
| **Cache & Queue**| Redis | Docker `redis` container | Redis 7.2 Alpine | 6379 | **AUTHORITATIVE** |

---

## 2. PRODUCTION FRONTEND

- **Root Directory:** `learninghub/`
- **Source Root:** `learninghub/src/`
- **Build System:** Vite 5.1.0 (`vite.config.ts`) with Rollup 21-way granular chunk splitting.
- **Entry Points:** `index.html` (SEO, KaTeX preconnect, theme Anti-FOUC script), `src/main.tsx`, `src/App.tsx`.
- **State Management:** Zustand 4.5.0 (`src/stores/useStore.ts`) with custom localStorage partialize serializer to protect against QuotaExceededError during active assessments.
- **Client Routing:** React Router v6.22 with 50+ routes. Multi-tiered error boundary containment (`ErrorBoundary`, `SectionErrorBoundary`, `LazyRoute`).
- **PWA Service Worker:** `vite-plugin-pwa` with Workbox precaching 134 assets (`sw.js`).
- **Live Deployment:** Cloudflare Pages at `https://learninghub-385.pages.dev/` with `learninghub/public/_redirects` (`/* /index.html 200`).

---

## 3. PRODUCTION API & GATEWAY

- **Reverse Proxy Layer:** Nginx (`learninghub/nginx.conf`)
  - `/api/` $\to$ `http://express_backend:5000` (Core REST API)
  - `/socket.io/` $\to$ `http://express_backend:5000` (WebSockets)
  - `/uploads/` $\to$ `http://express_backend:5000` (Static uploads)
  - `/ws/` $\to$ `http://django_backend:8000` (Django Daphne ASGI WebSockets)
  - `/admin/`, `/god-admin/` $\to$ `http://django_backend:8000` (Django Administration)
- **Primary API Server:** `learninghub/backend/src/server.ts`
  - Express 5 with body limits (256KB default, 2MB AI, 10MB media).
  - CSRF protection via session-bound HMAC tokens (`/api/v1/csrf-token`).
  - Auth rate limiting (5 req / 15m), general rate limiting (200 req / 15m).
  - 45+ mounted v1 domain routes under `/api/v1/*`.

---

## 4. PRODUCTION BACKENDS & SERVICES

### 4.1 Node.js / Express Core Backend (`learninghub/backend/`)
- Handles primary student and teacher workflows:
  - Authentication (Dual-token delivery: HttpOnly cookies + JSON body for mobile compatibility).
  - Test A+ Exam Engine (Atomic transactions, question shuffling, options stripping, Certainty-Based Marking).
  - Question Bank, Bookmarks, Topic Mastery, Revision (FSRS algorithm).
  - Course enrollments, payments (Stripe SDK integration).
  - AI Generation pipelines (Google Gemini, Groq, OpenRouter).

### 4.2 Django Conductor Backend (`conductor/`)
- Handles system infrastructure and background computations:
  - Celery 5.4 distributed worker for heavy async computation.
  - Daphne ASGI handling `/ws/` real-time classroom communication.
  - Django Admin and God-Mode administrative consoles.
  - Serves static Flutter Web bundle from `staticfiles/flutter`.

---

## 5. DATABASE & STORAGE LAYER

- **Authoritative Database:** PostgreSQL 16 with `pgvector` extension enabled.
- **ORM (Node.js):** Prisma 6.2.1 (`learninghub/backend/prisma/schema.prisma`).
  - 2,405 lines defining 50+ models.
  - Strict database constraints: `TestResult @@unique([userId, testId, attemptNumber])`, `TestAttemptAnswer @@unique([testResultId, questionId])`.
  - Migration deployment: `prisma migrate deploy`.
- **In-Memory Cache & Message Broker:** Redis 7.2 Alpine.
  - Distributed caching via `learninghub/backend/src/services/CacheService.ts`.
  - Socket.IO Redis pub/sub adapter.
  - Access token revocation blacklist (`bl:token:<hash>`).
- **Object Storage:** Local filesystem (`/uploads/`) with S3 / Cloudflare R2 presigned client (`@aws-sdk/client-s3`).

---

## 6. EXTERNAL PROVIDERS & SERVICES

- **AI Providers:**
  - Google Gemini API (`@google/generative-ai`): Primary AI tutor, question generation, and subjective rubric grading.
  - Groq & OpenRouter: Fallback AI inference endpoints.
- **Payments:** Stripe (`stripe` Node SDK, `@stripe/stripe-js` on frontend). Webhooks verified with signature checking.
- **Observability:**
  - Sentry (`@sentry/node`, `@sentry/react`): Error monitoring and profiling.
  - Prometheus & Grafana: Scrapes `/metrics` from Express and Django Prometheus middleware.
- **CDN / Hosting:** Cloudflare Pages (Frontend SPA).

---

## 7. RESOLUTION OF CODE DUPLICATION & UNMOUNTED SUBSYSTEMS

1. **`learninghub/django_backend/`:**
   - **Resolution:** Marked as **LEGACY / PARALLEL ARCHITECTURE**. Do not run in production. Production Django execution is consolidated in `conductor/`.
2. **`learninghub/workers-backend/`:**
   - **Resolution:** Marked as **EXPERIMENTAL EDGE PROTOTYPE**. The primary API gateway is Express (`learninghub/backend/`). Edge workers must not receive production traffic until stubs are implemented.
3. **Frontend Fallback Mock Data:**
   - Services contain hardcoded fallbacks (`FALLBACK_COURSES`, `FALLBACK_TESTS`, `FALLBACK_LEADERBOARD`) designed to enable offline resilience. They must only activate when network requests fail and must never masquerade as verified server state during online mode.
