# LearningHub V15 — Bug Root Cause Engine Report (Phase 2)

**Generated:** 2026-09-28  
**Scope:** Root-cause analysis, mitigation, and verification for critical, high, and medium defects resolved during the V15 production hardening pass.

---

### BUG-001: DSA Sandbox Remote Code Execution (RCE) Exposure in Node.js
- **Severity:** CRITICAL (P0)
- **Component:** `learninghub/django_backend/apps/problems/sandbox.py`
- **Root Cause:** Node.js execution path invoked `['node', temp_path]` without flags to disallow external module imports or dynamic code generation. A student code submission could call `require('child_process').execSync(...)` or `require('fs').readFileSync(...)` to access backend files.
- **Fix Applied:**
  1. Static AST/regex inspection: Reject any code requesting disallowed modules (`child_process`, `fs`, `net`, `http`, `process`, `vm`, `cluster`, `worker_threads`, `tls`).
  2. Subprocess execution flags: Spawn node with flags `['node', '--no-addons', '--disallow-code-generation-from-strings', temp_path]`.
- **Verification:** Verified by Django test cases; execution of blocked modules immediately returns a 0-runtime security violation error.

---

### BUG-002: Loose Substring Match in DSA Submission Verification
- **Severity:** HIGH (P1)
- **Component:** `learninghub/django_backend/apps/problems/views.py`
- **Root Cause:** Verification logic checked `if actual_out == expected_out or expected_out in actual_out:`. If the expected output was "5" and code printed "12345", the condition evaluated to `True`, falsely granting an "Accepted" verdict and awarding XP.
- **Fix Applied:** Replaced substring check with exact token comparison: `if actual_out == expected_out or actual_out.split() == expected_out.split():`.
- **Verification:** Intentional wrong outputs with substring overlaps are correctly categorized as `Wrong Answer`.

---

### BUG-003: AttributeError on Lesson Fields & Paid Video Asset Leakage
- **Severity:** CRITICAL (P0)
- **Component:** `learninghub/django_backend/apps/courses/views.py`
- **Root Cause:**
  1. `CourseLessonsListView` referenced `lesson.duration` and `lesson.is_preview`, but Django `Lesson` model defines `duration_minutes` and `is_free_preview`.
  2. `video_url` was serialized unconditionally for all lessons, allowing unauthenticated guests to scrape paid video sources.
- **Fix Applied:**
  1. Provided dual field compatibility: `duration` & `duration_minutes`, `is_preview` & `is_free_preview`.
  2. Implemented strict authorization check: `can_access_full = is_free_course or is_enrolled or (request.user.is_authenticated and request.user.is_staff)`. `video_url` is set to `None` if not authorized and not preview.
- **Verification:** Tested with anonymous and authenticated non-enrolled requests; paid lesson video URLs are masked as `None`.

---

### BUG-004: Admin Hard-Refresh Hydration Drop
- **Severity:** HIGH (P1)
- **Component:** `learninghub/src/components/AdminRoute.tsx`
- **Root Cause:** `AdminRoute` checked `if (!auth.isAuthenticated)` before checking `auth.isHydrated`. On browser hard refresh (`Ctrl+F5`), Zustand initializes in an unhydrated state (`isAuthenticated: false`), instantly triggering a redirect to `/auth` before localStorage tokens could be loaded.
- **Fix Applied:** Added `if (!auth.isHydrated) return <LoadingScreen />` check before authentication verification.
- **Verification:** Hard refresh on `/admin` cleanly renders the loading spinner until Zustand hydration finishes, maintaining active admin sessions.

---

### BUG-005: Permanent CSRF Mutex Rejection Lockout
- **Severity:** HIGH (P1)
- **Component:** `learninghub/src/utils/api.ts`
- **Root Cause:** `initCsrfToken` stored `csrfTokenPromise`. If an initial network hiccup rejected the promise, `csrfTokenPromise` remained cached in a rejected state. All future mutating requests (`POST`, `PUT`, `DELETE`) failed immediately with `CSRF token fetch failed`.
- **Fix Applied:** Rewrote `initCsrfToken` with an async IIFE resetting `csrfTokenPromise = null` in a `.finally()` block, and cleaned up unused callback closures.
- **Verification:** 7/7 Vitest API integration tests passed, including retry and token refresh flows.

---

### BUG-006: In-Memory Double-Caching Staleness on E-Commerce & Interactive Endpoints
- **Severity:** HIGH (P1)
- **Component:** `learninghub/src/utils/cache.ts`
- **Root Cause:** `fetchApi` maintained a default 60s in-memory cache for all `GET` requests not matching `/auth/`. When users mutated their cart or bookmarks, TanStack React Query invalidated the cache, but `fetchApi` returned the 60s memory-cached payload, resulting in a UI that felt frozen or delayed.
- **Fix Applied:** Expanded `noCachePatterns` to include `/cart`, `/commerce/`, `/users/me`, `/me`, `/analytics`, `/notifications`, `/study-planner`, `/study-goals`, `/bookmarks`, `/attempts`, and `/admin/`.
- **Verification:** Cart service tests and cart page tests pass with immediate state synchronization.

---

### BUG-007: Non-Idempotent Mutation Duplication on Retries
- **Severity:** MEDIUM (P2)
- **Component:** `learninghub/src/utils/api.ts`
- **Root Cause:** Automatic retry for HTTP 502/504 errors was executed without checking HTTP method idempotency. Automatic retry of `POST` requests could duplicate orders, charges, or test attempts.
- **Fix Applied:** Restricted retries to idempotent methods (`GET`, `HEAD`, `OPTIONS`, `PUT`, `DELETE`).
- **Verification:** Vitest retry suite passed.

---

### BUG-008: Public Mobile Navigation "Home" Redirection Trap
- **Severity:** MEDIUM (P2)
- **Component:** `learninghub/src/components/MobileNav.tsx`
- **Root Cause:** `publicNavItems[0].to` pointed to `/dashboard`. When unauthenticated mobile users clicked the Home icon, they were redirected to `/dashboard`, which bounced them to `/auth`.
- **Fix Applied:** Changed `publicNavItems[0].to` to `/`.
- **Verification:** Navigation item resolves to `/` for public visitors.
