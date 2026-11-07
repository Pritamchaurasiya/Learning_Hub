# LearningHub Frontend Application Source (`learninghub/src`)

## Overview
React 18 SPA built with TypeScript, Tailwind CSS, Vite, and Zustand. Provides accessible, mobile-responsive interfaces for students and instructors across courses, coding practice, interactive tests, PYQ vaults, and real-time assessments.

## Directory Structure & Modules

- [`components/`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components): Reusable UI atoms, molecules, and layout shells.
  - [`test/`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/test/README.md): Exam station, question palette, scratchpad, results, and PYQ hub components.
- [`pages/`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/pages): Route-level views.
  - [`TestsAPage.tsx`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/pages/TestsAPage.tsx): Assessment command center housing the Unified PYQ Vault, mock exam catalog, practice mode launcher, and test history.
  - [`ProblemWorkspacePage.tsx`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/pages/ProblemWorkspacePage.tsx): DSA coding workspace with integrated code editor and live judge.
- [`services/`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/services): API client adapters and network transports.
  - [`testsAService.ts`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/services/testsAService.ts): Dual-backend normalizer interface communicating with Conductor Django DRF (`/api/v1/tests/`) and Express prototype fallback.
  - [`api.ts`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/services/api.ts): Axios client configured with JWT interceptors, CSRF tokens, and retry logic.
  - [`offlineSyncService.ts`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/services/offlineSyncService.ts): Client-side queue syncing offline exam attempts with the backend upon network reconnection.
- [`stores/`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/stores): Global reactive state management powered by Zustand.
  - [`slices/testsASlice.ts`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/stores/slices/testsASlice.ts): Reactive state store for active exams, selected options, palette status, countdown timers, and autosave mutations.
- [`types/`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/types): Canonical TypeScript definitions for tests, questions, users, attempts, and analytics.
- [`utils/`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/utils): Client-side utilities including cryptographic scorecard hashing (`storage.ts`), formatting, and analytics.

## Invariants
- Dual normalizer `normalizeTest` in `testsAService.ts` guarantees that downstream UI components always receive standardized `Test` and `Question` interfaces regardless of backend payload structure.
- Client-side timing countdown is synchronized with server `started_at` and `duration_minutes` to prevent local clock manipulation.
- State in `testsASlice.ts` automatically commits local snapshots to IndexedDB during active assessments.

## Verification
- Type check: `npx tsc --noEmit`
- Unit tests: `npm test`
- Production bundle: `npm run build`
