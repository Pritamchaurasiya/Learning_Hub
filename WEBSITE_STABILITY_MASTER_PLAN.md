# LearningHub — Comprehensive Website Stability & Production Master Plan

## Mission
Stabilize and improve the production website without unnecessary rewrites. Preserve healthy code, fix verified defects, complete partially implemented flows, improve React↔Django integration, harden security, improve responsive UX, and add only high-value features whose dependencies are satisfied.

## Runtime Source of Truth
- Frontend: React + TypeScript application under `learninghub/`.
- Target backend: Django + DRF under `conductor/`.
- PostgreSQL for production, Redis/Celery where justified.
- Node/Express/Prisma is a migration target and must not remain a competing production source of truth.

## Execution Loop
OBSERVE → BASELINE → DISCOVER → MAP → ANALYZE → PRIORITIZE → PLAN → REPRODUCE → ROOT CAUSE → IMPLEMENT → TEST → RUN → VERIFY → REGRESSION → SECURITY → PERFORMANCE → RESPONSIVE → API CONTRACT → DATABASE → E2E → ADVERSARIAL REVIEW → RE-SCAN → REPEAT.

## P0 — Stability
1. Verify every frontend route and API contract.
2. Remove dead/fake/mock production behavior from active flows.
3. Verify auth, refresh, logout, protected routes, session expiration.
4. Verify Test A+ start/autosave/resume/submit/result/timeout/idempotency.
5. Verify Courses enrollment/progress/content/permissions.
6. Verify DSA problem/run/submit/result/history/security.
7. Fix broken loading/error/empty states.
8. Fix responsive overflow, clipping, inaccessible controls, layout shifts.
9. Fix N+1 queries, missing indexes, redundant API requests, unnecessary rerenders.
10. Fix critical security findings and avoid duplicate security implementations.

## P1 — UX & Product Quality
- Skeleton loading and deterministic error recovery.
- Offline-aware retry behavior where useful.
- Consistent pagination/filter/search behavior.
- Accessible forms, keyboard navigation, focus states and semantic labels.
- Better dashboard analytics based on real backend data.
- Better recommendations based on actual learner activity.
- Course progress resume and test resume consistency.
- DSA workspace stability and submission feedback clarity.

## P2 — High-value Additions After Stability
- Adaptive assessment engine.
- Topic mastery engine.
- Spaced-repetition revision scheduler.
- Course learning paths.
- DSA skill roadmap and progression.
- Semantic global search.
- AI provider gateway with structured-output validation and quotas.
- Advanced analytics and educator/admin insights.

## Verification Rules
Every change must have evidence. Use statuses: VERIFIED, PARTIALLY VERIFIED, UNVERIFIED, BLOCKED, RISK REMAINS.

Required checks after meaningful changes:
- Django `manage.py check`
- migration check/apply in test environment
- backend unit/API/integration tests
- frontend typecheck/lint/test/build
- API contract tests
- security scan
- performance regression checks
- E2E flow checks where browser automation is available

Never claim 100% bug-free. Never claim browser verification unless a browser was actually controlled and the flow executed.
