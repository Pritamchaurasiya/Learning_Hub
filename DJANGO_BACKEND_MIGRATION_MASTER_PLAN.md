# LearningHub — Django Backend Migration Master Plan

## Objective
Make Python Django + Django REST Framework the single production backend for LearningHub. Preserve the existing React/TypeScript website and migrate the business logic currently owned by Node.js/Express/Prisma into Django without breaking user-facing behavior.

## Non-negotiable principles
1. Repository/runtime truth beats historical documentation.
2. Preserve working behavior; change only what evidence requires.
3. Never merge duplicate PRs blindly.
4. No destructive database migration without backup and rollback verification.
5. No fake/mock production behavior.
6. Backend owns business rules; frontend owns presentation/state orchestration only.
7. Every meaningful change gets repeated verification.
8. Never claim 100% bug-free without evidence. Use VERIFIED / PARTIALLY VERIFIED / UNVERIFIED / BLOCKED / RISK REMAINS.

## Target architecture
- Frontend: React + TypeScript + Vite.
- Backend: Django 5 + DRF.
- Database: PostgreSQL in production.
- Cache/coordination: Redis where justified.
- Background jobs: Celery + Beat where justified.
- Realtime: Django Channels where required.
- API schema: OpenAPI via drf-spectacular.

## Migration strategy
### Phase 0 — Freeze and inventory
- Establish main branch baseline.
- Inventory every frontend API call.
- Inventory every Node route, controller, service, repository, scheduled job, websocket, webhook, and external integration.
- Inventory every Django route/app/service already implemented.
- Build a Node -> Django parity matrix.

### Phase 1 — Contract parity
For every API operation document:
- HTTP method/path
- authentication requirement
- role/permission
- request schema
- response schema
- error schema
- pagination/filtering/sorting
- rate limit
- side effects
- idempotency/concurrency expectations

### Phase 2 — Django domain completion
Complete Django implementations for:
- users/auth/session/MFA/password reset
- exams/taxonomy
- Tests A+ / question bank / attempts / autosave / scoring
- courses/enrollment/progress
- ebooks/library/progress/bookmarks
- DSA/problems/submissions/sandbox integration
- analytics
- gamification
- AI gateway/tutoring/generation
- search/semantic search
- notifications
- discussions/chat
- subscriptions/payments/webhooks
- admin/monitoring/support

### Phase 3 — Frontend cutover
- Create one canonical Django API base URL/configuration.
- Replace Node-only endpoints with Django equivalents.
- Preserve route UX and response semantics unless a deliberate contract change is required.
- Verify auth bootstrap/session refresh/logout.
- Verify websocket/realtime behavior.

### Phase 4 — Data parity
- Map Prisma entities to Django models.
- Produce an explicit schema/data mapping.
- Validate row counts/checksums/foreign-key relationships where feasible.
- Use reversible migrations and backups.
- Do not delete old schema until parity is verified.

### Phase 5 — Node retirement
Only after all parity gates pass:
- Remove Node backend from the production runtime.
- Remove Prisma runtime ownership.
- Keep archival migration notes only where useful.
- Remove stale scripts/dependencies/configuration.
- Update README, Docker, CI, deployment docs, local setup, and health checks.

## Tests A+ acceptance criteria
Core must work without AI:
- create/select published test
- start attempt
- resume attempt
- deterministic server-side timer
- autosave and reconnect
- answer validation
- objective scoring
- negative marking
- submit idempotency
- timeout auto-submit
- result generation
- analytics update

Stress:
- duplicate start requests
- duplicate autosave requests
- simultaneous autosaves
- double submit
- submit near timeout boundary
- invalid question/option tampering
- cross-user attempt access

## Security acceptance criteria
Audit at minimum:
- authentication and authorization
- IDOR/BOLA
- CSRF
- XSS
- SQL injection
- SSRF where external fetches exist
- insecure file uploads
- rate-limit bypass
- token/session storage
- password reset abuse
- webhook signature verification
- secret leakage
- security headers/CSP
- privilege escalation

## Performance acceptance criteria
- eliminate N+1 queries
- inspect slow endpoints
- use select_related/prefetch_related correctly
- add only evidence-backed indexes
- paginate large responses
- cache only safe/stable data
- background heavy work
- avoid unbounded JSON/session state

## Verification loop
OBSERVE -> BASELINE -> DISCOVER -> MAP -> ROOT CAUSE -> PLAN -> IMPLEMENT -> TEST -> RUN -> VERIFY -> REGRESSION -> SECURITY -> PERFORMANCE -> API CONTRACT -> E2E -> RE-SCAN -> IMPROVE.

Repeat after every meaningful change.

## Release gate
Production-ready only when:
- Django check passes.
- deployment checks pass.
- migrations apply cleanly to a clean database and representative existing data.
- backend tests pass.
- frontend typecheck/build/tests pass.
- API contract tests pass.
- E2E critical journeys pass.
- security scan has no unaccepted critical/high findings.
- health/readiness endpoints work.
- background jobs/realtime paths are verified where enabled.
- Node backend is no longer required for any production path.

## Future features after stabilization
Prioritize by user value and dependency:
1. adaptive assessment engine
2. mastery/skill engine
3. spaced-repetition/revision scheduler
4. advanced recommendation engine
5. semantic search and knowledge graph
6. contest/rating system
7. offline sync
8. educator/institute analytics
9. AI provider routing and quality evaluation
10. career/project intelligence

Do not add these ahead of core parity/stability unless a dependency requires it.
