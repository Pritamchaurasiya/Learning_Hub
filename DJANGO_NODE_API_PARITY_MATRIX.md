# Node.js -> Django API Parity Matrix

This document is the migration checklist. Do not retire a Node route until the corresponding Django route is verified against the same user journey.

| Node area | Django target | Status | Verification required |
|---|---|---|---|
| auth | `apps.users.urls.auth` | PARTIAL/PARITY AUDIT | login/register/me/refresh/logout/password reset |
| tests | `apps.test_engine.urls` | PARTIAL/PARITY AUDIT | start/autosave/resume/submit/result/timeout |
| analytics | `apps.analytics_v2.urls` | PARTIAL/PARITY AUDIT | dashboard/history/mastery |
| admin | Django admin/custom admin | PARTIAL/PARITY AUDIT | RBAC + admin workflows |
| notifications | `apps.notifications.urls` | PARTIAL/PARITY AUDIT | list/read preferences/realtime |
| exam content | `apps.exams` | PARTIAL/PARITY AUDIT | country/exam/subject/topic |
| AI | `apps.ai_engine` | PARTIAL/PARITY AUDIT | provider/generation/tutor/guardrails |
| gamification | `apps.gamification.urls` | PARTIAL/PARITY AUDIT | XP/streak/badges/leaderboard |
| monitoring | `apps.monitoring` | PARTIAL/PARITY AUDIT | metrics/health/readiness |
| media | Django media/storage | PARTIAL/PARITY AUDIT | signed/upload/download security |
| user analytics | analytics domain | PARTIAL/PARITY AUDIT | profile-specific analytics |
| recommendations | recommendations service | GAP AUDIT | recommendations consistency |
| A/B testing | feature-flag service | GAP AUDIT | deterministic assignment + admin |
| problems | `apps.dsa` | PARTIAL/PARITY AUDIT | browse/run/submit/results |
| courses | `apps.courses` | PARTIAL/PARITY AUDIT | list/detail/enroll/progress |
| jobs | Celery | PARTIAL/PARITY AUDIT | retry/idempotency/visibility |
| search | `apps.search` | PARTIAL/PARITY AUDIT | text/filter/semantic/suggestions |
| course progress | `apps.courses` service | PARTIAL/PARITY AUDIT | atomic progress update |
| health | Django health endpoints | EXISTS | DB/cache/readiness |

## Required status meanings

- VERIFIED — backed by implementation + automated/runtime verification.
- PARTIAL — implementation exists but parity or runtime verification is incomplete.
- GAP — no complete Django equivalent yet.
- RETIRED — Node implementation removed only after parity gate.

## Rule
Do not mark a row VERIFIED based only on a route existing. Verify the complete request -> business logic -> database -> response -> frontend state path.
