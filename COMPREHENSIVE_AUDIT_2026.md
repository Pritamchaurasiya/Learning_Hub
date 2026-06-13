# LearningHub Comprehensive Audit Report 2026

## Executive Summary

Complete end-to-end audit of LearningHub learning platform. The system is well-architected overall with a modern stack (React 18 + TypeScript + Vite, Express 5 + Prisma + PostgreSQL, Zustand + React Query). Below are all findings organized by severity.

---

## CRITICAL ISSUES (Fix Immediately)

### C-1: CSP defined in meta tag (INEFFECTIVE)
- **Location**: `index.html:58-61`
- **Issue**: CSP in `<meta http-equiv>` only restricts content loaded AFTER the meta tag. It cannot restrict resources loaded before it (e.g., inline scripts in `<head>`). CSP MUST be sent as an HTTP header.
- **Fix**: Move CSP to `helmetConfig` in `backend/src/config/security.ts` and remove from HTML.

### C-2: JWT tokens stored in localStorage (XSS vulnerable)
- **Location**: `src/utils/api.ts:172-174` and frontend stores
- **Issue**: Access and refresh tokens in localStorage are accessible to any JS on the page. An XSS vulnerability exposes all tokens.
- **Risk**: Complete account takeover
- **Mitigation**: Use httpOnly cookies for refresh tokens, keep in-memory access tokens with short expiry.

### C-3: Overly aggressive input sanitization destroys content
- **Location**: `backend/src/config/security.ts:264-277`
- **Issue**: `sanitizeInput()` removes SQL keywords (UNION, SELECT, etc.), which can appear in legitimate course content, lesson text, and problem descriptions. Since Prisma uses parameterized queries, this is both unnecessary and destructive.
- **Fix**: Remove SQL keyword stripping. Keep only control character and angle bracket removal.

### C-4: CSP allows `unsafe-inline` and `unsafe-eval` in production
- **Location**: `index.html:58-61` and `backend/src/config/security.ts:117`
- **Issue**: `script-src 'unsafe-inline'` and `'unsafe-eval'` in production CSP defeats XSS protection.
- **Fix**: Generate nonces for inline scripts, remove `unsafe-eval` unless absolutely required.

### C-5: CSRF token stored in localStorage
- **Location**: `src/utils/api.ts:74`
- **Issue**: CSRF token in localStorage is accessible to XSS. Should use httpOnly cookies.
- **Fix**: Move to server-set httpOnly cookie or use double-submit cookie pattern properly.

---

## HIGH PRIORITY ISSUES

### H-1: Sidebar role check is case-sensitive and incomplete
- **Location**: `src/components/Sidebar.tsx:61-64`
- **Issue**: Checks for both 'admin' and 'ADMIN' literals but misses 'INSTRUCTOR'. Should normalize role comparison.
- **Fix**: Use `auth.user?.role?.toUpperCase()` for consistent comparison.

### H-2: No database indexing for full-text search
- **Location**: `backend/prisma/schema.prisma`
- **Issue**: `Course.title`, `Course.description`, `Course.content` lack GIN indexes for full-text search.
- **Fix**: Add PostgreSQL full-text search indexes.

### H-3: Inconsistent API response format
- **Issue**: Some endpoints return `{ status, data }`, others return flat objects, causing fragile destructuring in the frontend (`api.ts:164-165`).
- **Fix**: Standardize all API responses.

### H-4: Error messages leak internal details
- **Issue**: Some error responses may leak stack traces or internal paths.
- **Fix**: Ensure all production errors are sanitized.

### H-5: No brute force protection on MFA endpoints
- **Issue**: MFA verification has no rate limiting separate from auth.
- **Fix**: Add specific rate limiter for MFA attempts.

---

## MEDIUM PRIORITY ISSUES

### M-1: Duplicate toast and monitoring configurations
- **Location**: Both `main.tsx` and `App.tsx` have auth event listeners with slightly different implementations.
- **Fix**: Consolidate into one place.

### M-2: Store hydration reads localStorage synchronously
- **Location**: `src/main.tsx:29`
- **Issue**: `useStore.persist.rehydrate()` before React renders can cause flash of wrong theme/state.
- **Fix**: Use `onRehydrateStorage` callback.

### M-3: No request timeout in fetchApi
- **Location**: `src/utils/api.ts`
- **Issue**: Requests can hang indefinitely if the server doesn't respond.
- **Fix**: Add AbortController timeout.

### M-4: Unnecessary re-renders in Header
- **Location**: `src/components/Header.tsx`
- **Issue**: Header is `memo`'ed but uses `useStore` without selectors, causing re-renders on any store change.
- **Fix**: Use individual selectors.

### M-5: Prisma schema missing cascade deletes
- **Issue**: Several child models missing `onDelete: Cascade` for `User` relations.
- **Fix**: Audit all relations.

---

## LOW PRIORITY ISSUES

### L-1: ManualChunks in vite config uses fragile string matching
- **L-2**: No request compression for large payloads (already have compression middleware)
- **L-3**: Some CSS animations lack `will-change` for GPU acceleration
- **L-4**: `index.html` uses example.com URLs for canonical/OG tags

---

## ROOT CAUSE ANALYSIS

1. **Security weaknesses**: Pandemic of "works in dev" patterns leaking to production (localStorage tokens, meta CSP, unsafe-inline)
2. **Inconsistent API design**: Multiple developers with different patterns over time
3. **Missing test coverage**: Critical flows (auth, payments, admin) lack comprehensive tests
4. **Over-engineering in wrong places**: Complex sanitization where it isn't needed, missing where it is

---

## Priority Fix Order

1. Move CSP from meta tag to HTTP header (C-1)
2. Fix aggressive sanitization (C-3)
3. Remove unsafe-inline from production CSP (C-4)
4. Fix Sidebar role comparison (H-1)
5. Standardize API response format (H-3)
6. Add request timeout to fetchApi (M-3)
7. Add database full-text search indexes (H-2)
8. Consolidate auth event listeners (M-1)
9. Fix Header re-renders (M-4)
10. Add proper error handling to all controllers
