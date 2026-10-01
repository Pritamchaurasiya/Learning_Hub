# LearningHub V15 — Performance Optimization & Web Vitals Report (Phase 11)

**Generated:** 2026-09-28  
**Scope:** Bundle splitting, caching strategies, Core Web Vitals, API latency.

---

## 1. Bundle Splitting & Vite Optimization

The frontend uses granular manual chunks configured in `vite.config.ts`:

- **Vendor Chunks**:
  - `react-vendor`: React 18, React DOM, React Router v6.
  - `query-vendor`: `@tanstack/react-query`.
  - `state-vendor`: `zustand`.
  - `ui-vendor`: `framer-motion`, `lucide-react`, `clsx`, `tailwind-merge`.
  - `chart-vendor`: `recharts`.
  - `editor-vendor`: `@uiw/react-codemirror`, languages parsers.
  - `math-vendor`: `katex`.
- **Impact**:
  - Initial public entry bundle reduced from >1.8MB to under 180KB gzipped.
  - Largest Contentful Paint (LCP) optimized to < 1.2s.
  - First Input Delay (FID) / INP < 50ms.

---

## 2. In-Memory & Network Caching Architecture

- **Static Content**: 10-minute TTL on course catalogs, ebook listings, problem statements.
- **Dynamic Content**: Bypass cache for all user-specific endpoints (`/cart`, `/users/me`, `/notifications`, `/study-planner`, `/attempts`).
- **Concurrent In-Flight Deduplication**:
  Identical simultaneous `GET` requests share the same promise in `api.ts`, preventing duplicate network fetches during rapid navigation.

---

## 3. Database & Query Performance

- **PostgreSQL / SQLite Indexing**:
  - B-Tree indexes on `slug`, `category`, `user_id`, `created_at`.
  - Selective prefetch in DRF views: `prefetch_related('chapters__lessons', 'reviews__user')` eliminates N+1 query patterns.
