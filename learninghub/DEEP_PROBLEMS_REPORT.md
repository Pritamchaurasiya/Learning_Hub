# LearningHub Deep System Problems Report

## 1. Architectural Issues

- **[CRITICAL] Monolithic State Store**: `useStore.ts` is ~600 lines long, violating the Single Responsibility Principle. Auth, UI, Quiz, and Progress logic are all coupled together.
- **[HIGH] Circular Dependencies**: Build process flags circular chunks in vendor files. This can lead to unpredictable initialization order and larger-than-necessary bundle sizes.
- **[MEDIUM] API Inconsistency**: Some services use `userService.getBookmarks()` while the store uses direct `fetchApi`. This duplication of logic makes maintenance difficult.

## 2. UI/UX & Responsiveness Gaps

- **[HIGH] Fixed Height Layout**: `Layout.tsx` uses `h-screen overflow-hidden`, which is notorious for the "100vh bug" on mobile browsers (address bar covering content).
- **[MEDIUM] Performance Overheads**: Decorative SVG orbs and heavy Framer Motion animations are active by default, which may lag on low-end mobile devices.
- **[MEDIUM] Hardcoded Stats**: Sidebar assumes exactly 50 courses for progress calculation, leading to inaccurate percentage bars if the actual course count changes.
- **[LOW] Inconsistent Loading States**: Some pages use `LoadingScreen.tsx` while others use inline skeletons.

## 3. Logic & Security Weaknesses

- **[HIGH] Optimistic State Desync**: Most store actions (Bookmarks, XP) are optimistic but lack a robust "rollback" mechanism if the backend sync fails.
- **[MEDIUM] Token Refresh Edge Cases**: `api.ts` handles token refresh but doesn't handle the case where multiple concurrent requests fail simultaneously (potential "race condition" in refresh logic).
- **[MEDIUM] Quiz State Persistence**: Quiz state is persisted in localStorage, which is good, but doesn't have a "server-side" backup, meaning a user can't switch devices during a test.
- **[LOW] Validation Redundancy**: Both frontend and backend perform Zod-like validations but they aren't shared, leading to potential drift in validation rules.

## 4. Performance Bottlenecks

- **[MEDIUM] Large Bundle Size**: Chunks like `markdown`, `highlight`, and `recharts` are large and could be more aggressively code-split.
- **[LOW] Re-render Propagations**: Massive store state means many components might re-evaluate even if they only need a small slice of state.

## 5. Deployment & Production Readiness

- **[MEDIUM] Environment Variable Leaks**: `VITE_API_URL` has a hardcoded fallback in the code instead of failing fast if not provided.
- **[LOW] Log Noise**: Development logs (console.warn/error) are peppered throughout the code; need a unified logging strategy for production.
