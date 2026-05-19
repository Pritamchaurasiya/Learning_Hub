# LearningHub SaaS-Grade Refinement Master Plan

## Strategic Objective

Transform LearningHub into a production-ready, high-performance, and maintainable SaaS product by resolving architectural debt and polishing the user experience.

---

## Phase 1: Architectural Refactoring (Slicing the Store) - [COMPLETED]

- **Task 1.1**: Decompose `useStore.ts` into functional slices (AuthSlice, QuizSlice, ProgressSlice, UISlice).
- **Task 1.2**: Standardize API communication. All pages must use unified Service classes instead of direct `fetchApi` calls.
- **Task 1.3**: Resolve Circular Dependencies by restructuring shared types and utility imports.

## Phase 2: UI/UX & Performance Hardening - [COMPLETED]

- **Task 2.1**: Fix "Mobile VH Bug" in `Layout.tsx` using CSS custom properties or `dvh` units.
- **Task 2.2**: Implement "Low Performance Mode" toggle in Settings to disable heavy SVG orbs and complex animations.
- **Task 2.3**: Dynamic Progress Calculation: Replace hardcoded "50" in Sidebar with actual dynamic counts from `courses.ts`.
- **Task 2.4**: Bundle Optimization: Move `marked` and `highlight.js` into truly lazy-loaded wrappers.

## Phase 3: Logic & Security Enhancements - [COMPLETED]

- **Task 3.1**: Robust Sync Logic: Implement "Retry-with-Rollback" for optimistic updates in `useStore`.
- **Task 3.2**: Atomic Token Refresh: Fix potential race conditions in `api.ts` refresh logic using a queue or atomic lock.
- **Task 3.3**: Advanced Error Boundaries: Add detailed error reporting to the existing `ErrorBoundary` to catch production crashes.

## Phase 4: Feature Polish & SaaS Additions

- **Task 4.1**: Smart Onboarding: Improve `OnboardingWizard.tsx` with progress tracking and skip-logic.
- **Task 4.2**: Dashboard Analytics: Enhance `DashboardPage` with better data visualization (Recharts polish).
- **Task 4.3**: Unified Theme Engine: Ensure 100% color consistency between Light/Dark modes in custom components.

## Phase 5: Final Validation & Delivery

- **Task 5.1**: Comprehensive E2E Run: Fix Playwright timeout issues and run full test suite.
- **Task 5.2**: Lighthouse Audit: Achieve 90+ scores in Performance, Accessibility, and SEO.
- **Task 5.3**: Production Documentation: Finalize `DEPLOYMENT.md` with CI/CD pipeline details.

---

## Immediate Next Task

**Phase 4: Feature Polish & SaaS Additions (Task 4.1 - 4.3).**
Enhancing the dashboard analytics and polishing the UI consistency for light/dark modes.
