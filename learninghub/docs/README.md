# LearningHub — Documentation Index

This is the **single entry point** to all LearningHub documentation. All other docs are listed below with their purpose and audience.

---

## Quick Navigation

| If you are a... | Read this first |
|------------------|-----------------|
| **Executive / Product Owner** | [EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md) → [PRODUCTION_READINESS_CHECKLIST.md](PRODUCTION_READINESS_CHECKLIST.md) |
| **New developer** | [README.md](../README.md) → [ARCHITECTURE.md](ARCHITECTURE.md) |
| **Backend engineer** | [CANONICAL_AUTH_CONTRACT.md](CANONICAL_AUTH_CONTRACT.md) → Domain contracts |
| **Frontend engineer** | [README.md](../README.md) → [ARCHITECTURE.md](ARCHITECTURE.md) |
| **DevOps / SRE** | [DEPLOYMENT.md](DEPLOYMENT.md) → [MONITORING.md](MONITORING.md) |
| **Security engineer** | [ANTI_CHEAT_TIMER.md](ANTI_CHEAT_TIMER.md) → [CANONICAL_AI_SAFETY_CONTRACT.md](CANONICAL_AI_SAFETY_CONTRACT.md) |
| **Product manager** | [PRODUCTION_READINESS_CHECKLIST.md](PRODUCTION_READINESS_CHECKLIST.md) |
| **AI engineer** | [CANONICAL_AI_SAFETY_CONTRACT.md](CANONICAL_AI_SAFETY_CONTRACT.md) |
| **QA engineer** | [CHANGELOG.md](CHANGELOG.md) → Domain contracts |
| **Looking for specific change history** | [CHANGELOG.md](CHANGELOG.md) |

---

## Architecture & Design

| Document | Purpose | Status |
|----------|---------|--------|
| [README.md](../README.md) | Top-level project overview, tech stack, getting started | ✅ Current |
| [EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md) | High-level transformation summary (12 cycles, 40+ bugs fixed) | ✅ Current |
| [CHANGELOG.md](CHANGELOG.md) | Detailed cycle-by-cycle change log with file references | ✅ Current |
| [ARCHITECTURE.md](ARCHITECTURE.md) | High-level system architecture, component diagrams, data flow | ✅ Current |
| [PERFORMANCE_OPTIMIZATION.md](PERFORMANCE_OPTIMIZATION.md) | N+1 queries, caching, bundle size, performance rules | ✅ Current |

## Canonical API Contracts — 7 active + 2 planned + 2 guides = 11 total

These are the **authoritative** contracts for each domain. Both backends (Node/Express and Django) must conform. **Count (canonical): 7 active contracts + 2 planned (SEARCH, ECOMMERCE split — design-tracked, not yet implemented) + 2 supporting guides (ANTI_CHEAT_TIMER, PERFORMANCE_OPTIMIZATION) = 11 total.** Earlier revisions of EXECUTIVE_SUMMARY.md / CHANGELOG.md said "9" — that miscounted the 2 guides; the corrected total is **11**.

| Document | Domain | Status |
|----------|--------|--------|
| [CANONICAL_AUTH_CONTRACT.md](CANONICAL_AUTH_CONTRACT.md) | JWT auth, refresh, token formats | ✅ Current |
| [CANONICAL_TEST_ENGINE_CONTRACT.md](CANONICAL_TEST_ENGINE_CONTRACT.md) | Tests, attempts, autosave, submit, results | ✅ Current |
| [CANONICAL_COURSE_CONTRACT.md](CANONICAL_COURSE_CONTRACT.md) | Course, progress, enrollment, lessons | ✅ Current |
| [CANONICAL_GAMIFICATION_CONTRACT.md](CANONICAL_GAMIFICATION_CONTRACT.md) | XP, levels, streaks, badges, leaderboard | ✅ Current |
| [CANONICAL_NOTIFICATIONS_CONTRACT.md](CANONICAL_NOTIFICATIONS_CONTRACT.md) | Notifications, WebSockets, real-time events | ✅ Current |
| [CANONICAL_PAYMENT_CONTRACT.md](CANONICAL_PAYMENT_CONTRACT.md) | Cart, checkout, webhooks, idempotency | ✅ Current |
| [CANONICAL_AI_SAFETY_CONTRACT.md](CANONICAL_AI_SAFETY_CONTRACT.md) | AI modes, rate limits, safety pipeline | ✅ Current |

> **Note:** 7 contracts above are **active and implemented**. 2 additional contracts are **planned but not yet implemented** — `SEARCH` (unified search API) and `ECOMMERCE split` (cart/checkout vs orders/webhooks) — tracked separately in the roadmap. 2 supporting guides ([ANTI_CHEAT_TIMER.md](ANTI_CHEAT_TIMER.md), [PERFORMANCE_OPTIMIZATION.md](PERFORMANCE_OPTIMIZATION.md)) complete the set: **7 + 2 + 2 = 11 total**. Do **not** create new contracts from scratch without coordinated design; use this note as the canonical count clarification.

## Planning & Orchestration (Canonical)

| Document | Purpose | Status |
|----------|---------|--------|
| [MASTER_PROMPT_CANONICAL_V2.md](MASTER_PROMPT_CANONICAL_V2.md) | Canonical orchestrator prompt: 15 specialists, waves, loop, phases 0–21, P0–P4, 15 rules, 15-section final format | ✅ Current |
| [DEEP_PLANNING_BLUEPRINT.md](DEEP_PLANNING_BLUEPRINT.md) | WBS, dependency graph, wave template, evidence levels, production gate | ✅ Current |
| [MASTER_PROMPT.md](MASTER_PROMPT.md) | Original orchestrator prompt | 🗄️ Historical (superseded by V2) |
| [MASTER_PROMPT_2025.md](MASTER_PROMPT_2025.md) | 2025 orchestrator prompt revision | 🗄️ Historical (superseded by V2) |

## Migration (Node → Django)

| Document | Purpose | Status |
|----------|---------|--------|
| [MIGRATION_PARITY_REPORT.md](MIGRATION_PARITY_REPORT.md) | Node↔Django endpoint parity matrix (Cycle 18 verification snapshot) | ✅ Current |
| [DATABASE_MIGRATION_GUIDE.md](DATABASE_MIGRATION_GUIDE.md) | Prisma → Django ORM migration steps | 🗄️ Historical |
| [BACKEND_CONSOLIDATION_GUIDE.md](BACKEND_CONSOLIDATION_GUIDE.md) | Backend consolidation strategy | 🗄️ Historical |

## Security & Anti-Cheat

| Document | Purpose | Status |
|----------|---------|--------|
| [ANTI_CHEAT_TIMER.md](ANTI_CHEAT_TIMER.md) | Server-side timer enforcement, anti-cheat patterns (counts toward the 11-contract total as a guide) | ✅ Current |
| [CANONICAL_AI_SAFETY_CONTRACT.md](CANONICAL_AI_SAFETY_CONTRACT.md) | AI safety pipeline, prompt injection, NO_AI mode | ✅ Current |

## Operations

| Document | Purpose | Status |
|----------|---------|--------|
| [DEPLOYMENT.md](DEPLOYMENT.md) | Production deployment guide, environment variables, infrastructure | ✅ Current |
| [DEPLOYMENT_RUNBOOK.md](DEPLOYMENT_RUNBOOK.md) | Step-by-step production deploy + rollback runbook (Cycle 17 snapshot) | ✅ Current |
| [MONITORING.md](MONITORING.md) | Metrics, logging, alerting, observability | ✅ Current |
| [PRODUCTION_READINESS_CHECKLIST.md](PRODUCTION_READINESS_CHECKLIST.md) | Pre-launch checklist for production deployment | ✅ Current |
| [SECRETS_MANAGEMENT.md](SECRETS_MANAGEMENT.md) | How to handle secrets in dev, staging, prod | ✅ Current |

## Canonical Clarifications (read before assuming)

- **Ports:** Vite dev = `3000` (custom, see `vite.config.ts`), Playwright = `3000` (matches Vite), CI live-E2E overrides to `5173` via `--port 5173` + `PLAYWRIGHT_BASE_URL`, Node API = `5000`, Django API = `8000`. Full table in [ARCHITECTURE.md](ARCHITECTURE.md) §8. `VITE_API_TARGET` switches the frontend proxy between Node (`:5000`) and Django (`:8000`).
- **Logging:** Node uses **winston** (not pino) + Python `logging` (Django) — see [ARCHITECTURE.md](ARCHITECTURE.md) §7.1.
- **Payments:** no live gateway — Stripe/Razorpay SDKs are **not wired**; webhooks verify HMAC but process **no real money** — see [CANONICAL_PAYMENT_CONTRACT.md](CANONICAL_PAYMENT_CONTRACT.md).
- **AI limits:** Node `5/min` (test generation `2/min`) vs Django `10/min` is **intentional** (different cost posture during migration) — see [CANONICAL_AI_SAFETY_CONTRACT.md](CANONICAL_AI_SAFETY_CONTRACT.md).
- **Timer outcomes:** over-time is accepted as **either** `TIMEOUT` **or** `SUBMITTED` + `time_overrun` flag — frontends must handle both — see [ANTI_CHEAT_TIMER.md](ANTI_CHEAT_TIMER.md).

## Engineering History

These docs are kept for historical reference. **For current implementation, see the canonical contracts above.**

| Document | Era | Status |
|----------|-----|--------|
| [PHASE_1_DEEP_INVESTIGATION_REPORT.md](PHASE_1_DEEP_INVESTIGATION_REPORT.md) | 2025 Q4 | 🗄️ Historical |
| [PHASE_2_ROOT_CAUSE_ANALYSIS.md](PHASE_2_ROOT_CAUSE_ANALYSIS.md) | 2025 Q4 | 🗄️ Historical |
| [PHASE_3_HIGH_LEVEL_FIX_STRATEGY.md](PHASE_3_HIGH_LEVEL_FIX_STRATEGY.md) | 2025 Q4 | 🗄️ Historical |
| [PHASE1_IMPLEMENTATION.md](PHASE1_IMPLEMENTATION.md) | 2025 Q4 | 🗄️ Historical |
| [PHASE2_QUALITY_SECURITY_COMPLETE.md](PHASE2_QUALITY_SECURITY_COMPLETE.md) | 2025 Q4 | 🗄️ Historical |
| [PROBLEMS_REPORT.md](PROBLEMS_REPORT.md) | 2025 | 🗄️ Historical |
| [PROBLEMS_REPORT_2025.md](PROBLEMS_REPORT_2025.md) | 2025 | 🗄️ Historical |
| [BACKEND_FIXES_SUMMARY.md](BACKEND_FIXES_SUMMARY.md) | 2025 | 🗄️ Historical |
| [COMPREHENSIVE_AUDIT_COMPLETE.md](COMPREHENSIVE_AUDIT_COMPLETE.md) | 2025 | 🗄️ Historical |
| [LEARNINGHUB_FINAL_COMPLETION_REPORT.md](LEARNINGHUB_FINAL_COMPLETION_REPORT.md) | 2025 | 🗄️ Historical |
| [FINAL_STATUS.md](FINAL_STATUS.md) | 2025 | 🗄️ Historical |
| [COMPLETE_IMPROVEMENT_SUMMARY.md](COMPLETE_IMPROVEMENT_SUMMARY.md) | 2025 | 🗄️ Historical |
| [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) | 2025 (older) | 🗄️ Superseded by DEPLOYMENT.md |
| [COMPREHENSIVE_AUDIT_2026.md](../COMPREHENSIVE_AUDIT_2026.md) | 2026 | 🗄️ Historical |
| [TESTS_A_PLUS_MIGRATION_COMPLETE.md](TESTS_A_PLUS_MIGRATION_COMPLETE.md) | 2025 | 🗄️ Historical |
| [SEARCH_ENHANCEMENT_GUIDE.md](SEARCH_ENHANCEMENT_GUIDE.md) | 2025 | 🗄️ Historical |
| [QUIZ_PERSISTENCE_GUIDE.md](QUIZ_PERSISTENCE_GUIDE.md) | 2025 | 🗄️ Historical |
| [OPENCODE_SETUP_GUIDE.md](OPENCODE_SETUP_GUIDE.md) | 2025 | 🗄️ Historical |
| [ADMIN_AUTH_GUIDE.md](ADMIN_AUTH_GUIDE.md) | 2025 | 🗄️ Historical |

---

## How to Use This Index

1. **Always start here** when looking for documentation
2. **Check the status column** — ✅ = current, 🗄️ = historical
3. **Read the canonical contracts** for any API contract question
4. **Update this index** when adding new docs (keep alphabetical)

## Contributing

To add new documentation:

1. Create the file in `docs/`
2. Add it to the appropriate table above
3. Link from any related canonical contracts
4. Use clear status (✅ = current, 🗄️ = historical, ⚠️ = needs review)
