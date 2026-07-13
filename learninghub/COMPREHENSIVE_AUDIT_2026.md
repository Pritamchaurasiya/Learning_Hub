# LearningHub Comprehensive Audit Report 2026

## Executive Summary

The LearningHub platform is a full-stack learning management system with React 18 + Vite frontend, Express 5 + Prisma 6 backend, and Cloudflare Workers. The codebase shows strong architectural foundations but has several critical issues in security, consistency, performance, and code quality that must be addressed for production readiness.

## Architecture Overview

- **Frontend**: React 18, Vite 5, Zustand (state), React Query (server state), Tailwind CSS, Socket.IO client, i18next, Framer Motion
- **Backend**: Express 5, Prisma 6 ORM (PostgreSQL), Redis, Bull (queues), Socket.IO, JWT auth, Zod validation, Winston logging
- **Infrastructure**: Docker, Nginx, PWA support, Cloudflare Workers (edge), Prometheus metrics
- **Testing**: Vitest (frontend), Jest (backend), Playwright (E2E)

---

## CRITICAL ISSUES (Priority 1 - Fix Immediately)

### 1. User Enumeration Vulnerability (AuthService)

- **File**: `backend/src/services/AuthService.ts:80`
- **Issue**: `register()` throws `'Email already registered'` — attacker can probe which emails exist
- **Impact**: Information disclosure, account enumeration
- **Fix**: Return same generic message for both cases

### 2. Inconsistent Auth: Controller Bypasses AuthService

- **Files**: `backend/src/controllers/authController.ts` vs `backend/src/services/AuthService.ts`
- **Issue**: `login` and `register` controllers make direct Prisma calls instead of using `authService`, bypassing audit logging, session creation, and soft-delete checks
- **Impact**: Security controls bypassed; audit trail incomplete
- **Fix**: Use `authService` consistently in all auth endpoints

### 3. Token Storage in localStorage (XSS Vulnerability)

- **File**: `src/utils/api.ts`, `src/utils/security.ts`
- **Issue**: JWT tokens stored in localStorage (even with AES-GCM encryption via SecureStorage). XSS attack can read and exfiltrate tokens
- **Impact**: Account takeover via XSS
- **Mitigation**: Current encryption helps but doesn't eliminate risk. Recommend httpOnly cookies in production

### 4. CSRF Token Exposed to JavaScript

- **File**: `src/utils/api.ts:86-87`, `backend/src/middleware/csrfMiddleware.ts`
- **Issue**: CSRF token set via `document.cookie` without `HttpOnly` flag, readable by JS. CSRF protection relies on token being inaccessible to XSS, but this contradicts token storage approach
- **Impact**: If XSS is achieved, attacker can read CSRF token AND JWT token
- **Fix**: Implement double-submit cookie pattern properly or use SameSite=Strict

### 5. Empty Hardcoded Data in me Endpoint

- **File**: `backend/src/controllers/authController.ts:287-289`
- **Issue**: `const bookmarks: any[] = []` and `const progress: any[] = []` are hardcoded empty arrays sent in every /auth/me response
- **Impact**: Frontend receives stale/empty data; confuses user profiles

### 6. Rate Limiter Bypass on Test Environment

- **File**: `backend/src/middleware/rateLimiter.ts:62`
- **Issue**: `if (process.env.NODE_ENV === 'test') { next(); return }` — if NODE_ENV is accidentally unset in production, rate limiting is bypassed
- **Fix**: Check for explicit 'test' env AND ensure default is production

---

## HIGH PRIORITY ISSUES (Priority 2 - Fix Soon)

### 7. Division by Zero in IRT Calculation

- **File**: `backend/src/engines/test/AdaptiveTestEngine.ts:33`
- **Issue**: `pDeriv ** 2 / (p * q)` — when accuracy is 0 or 1, `p * q` = 0 → division by zero
- **Impact**: NaN values or crashes in adaptive question selection

### 8. Missing Live Class Route

- **File**: `src/components/Sidebar.tsx:92` references `/live-class` route
- **Issue**: No route for `/live-class` in `App.tsx`
- **Impact**: 404 on navigation to Live Classes

### 9. Duplicate State Management (Quiz vs TestsA Slices)

- **Files**: `src/stores/slices/quizSlice.ts`, `src/stores/slices/testsASlice.ts`
- **Issue**: Almost identical logic for managing test/quiz state, answers, flagged questions, timers, submission
- **Impact**: Code duplication, maintenance burden, inconsistent behavior

### 10. Large localStorage Persistence

- **File**: `src/stores/useStore.ts:57-72`
- **Issue**: Tests A+ state (answers, confidences, questions) persists entire test to localStorage. With 500+ questions, this could exceed 5MB storage limit
- **Impact**: Storage quota exceeded on longer tests

### 11. Missing LiveAnnouncer Integration

- **File**: `src/components/a11y/LiveAnnouncer.tsx`
- **Issue**: LiveAnnouncer component exists but is not rendered anywhere in the app
- **Impact**: Screen reader users miss dynamic content updates

### 12. i18n Integration Incomplete

- **Files**: `src/i18n/locales/*.json`
- **Issue**: Locale files exist but many UI strings are hardcoded in English
- **Impact**: Internationalization not fully functional

---

## MEDIUM PRIORITY ISSUES (Priority 3 - Improve)

### 13. Excessive `any` Type Usage

- Throughout codebase, especially in controllers and services
- Reduces TypeScript benefits, masks real type errors

### 14. Implicit `any` in Cache Service

- `backend/src/services/CacheService.ts` uses generic `<T>` but many callers don't type their cache operations

### 15. Prisma Schema: search_vector Causes Migration Issues

- `schema.prisma` lines 109, 238: `Unsupported("tsvector")` — may cause failures in non-PostgreSQL or schema comparisons

### 16. Missing Input Sanitization on Some Endpoints

- Some controllers accept raw user input without Zod validation

### 17. Toast System: No Accessibility

- Toast notifications appear but may not be announced by screen readers

### 18. No Mobile-Specific Viewport Meta

- `index.html` has basic viewport but could be optimized for mobile

### 19. Incomplete Error Boundaries

- `SectionErrorBoundary` exists but not wrapped around all sections

### 20. Route Prefetching Not Fully Leveraged

- `RoutePrefetcher` and `LazyRoute` exist but some critical routes are lazy-loaded

---

## PERFORMANCE ISSUES

### 21. Bundle Size: Framer Motion

- `framer-motion` is a large dependency (~150KB) included in main bundle
- The PWA and Vite config do separate it into own chunk (`animations`)

### 22. No Image Optimization Pipeline

- Images are served as-is without WebP conversion or responsive srcsets

### 23. React Query staleTime Could Be Increased

- Current `staleTime: 5 * 60 * 1000` is reasonable but some data could be cached longer

### 24. No Memoization on Some Heavy Components

- Large lists (TestAPage, ProblemPage) don't always memoize render output

### 25. Font Loading Not Optimized

- Inter font from Google Fonts blocks render. No `font-display: swap` strategy evident

---

## SECURITY ISSUES

### 26. Password Reset Token Not Invalidated After Use

- `authController.forgotPassword` creates tokens but the controller doesn't check `usedAt`
- AuthService.resetPassword does delete tokens, but the old token in URL remains valid until used

### 27. No Brute Force Protection on Password Reset

- `/auth/forgot-password` has no rate limiting beyond global limit

### 28. Audit Log Lacks Critical Events

- Some sensitive operations (profile update, email change) are logged inconsistently

### 29. CORS Configuration: Wildcard Potential

- Dev mode allows all localhost origins — acceptable for dev but must be locked for prod

---

## RECOMMENDATIONS

### Immediate (Week 1)

1. Fix user enumeration — return generic error messages
2. Make auth controller use AuthService consistently
3. Fix hardcoded empty arrays in /auth/me
4. Add rate limiting to password reset
5. Fix division by zero in AdaptiveTestEngine
6. Add /live-class route or remove from sidebar
7. Add accessibility to LiveAnnouncer

### Short-term (Week 2)

8. Migrate token storage to httpOnly cookies (DONE)
9. Clean up duplicate quiz/testsA store logic
10. Add proper TypeScript types, reduce `any` usage
11. Optimize localStorage persistence (limit saved data) (DONE)
12. Add proper i18n integration

### Medium-term (Weeks 3-4)

13. Image optimization pipeline
14. Performance profiling and optimization
15. Complete test coverage
16. Documentation
17. Load testing and scaling

---

## Production Readiness Checklist

- [x] HTTPS configured
- [x] CORS locked to specific origins
- [x] Helmet security headers
- [x] Rate limiting (API, Auth, Admin)
- [x] Input validation (Zod)
- [x] CSRF protection
- [x] SQL injection prevention (Prisma parameterized queries)
- [x] PWA support
- [x] httpOnly cookies for tokens (migrated)
- [ ] Complete error boundary coverage
- [ ] Load testing passed
- [ ] Accessibility audit passed
- [ ] Performance budget met
- [ ] Documentation complete
- [ ] Backup strategy
- [ ] Monitoring and alerting
