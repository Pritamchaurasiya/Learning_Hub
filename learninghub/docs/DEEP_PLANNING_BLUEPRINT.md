# LearningHub — DEEP PLANNING BLUEPRINT
## Loop Engineering • Wave-Based Execution • Evidence-Driven

> **Version:** 1.0 (2026-09-07) — Deep planning for perpetual engineering loop
> **Companion:** MASTER_PROMPT_CANONICAL_V2.md
> **Use:** Paste planning section into orchestrator prompt or run as `.kilo` command

---

## 1. PLANNING FUNDAMENTALS

### 1.1 Three Questions Before Any Work

```
1. What is the REAL current state? (not docs, not assumptions — code)
2. What is the HIGHEST-VALUE next fix? (P0 → P1 → P2, not easiest)
3. What is the SMALLEST verifiable change that proves parity?
```

### 1.2 Work Breakdown Structure (WBS)

```
LearningHub Platform
├── 0. Safety & Truth (Phase 0)
│   ├── 0.1 Branch & PR map
│   ├── 0.2 Secrets scan
│   └── 0.3 Repository Truth Report
├── 1. Discovery (Phases 1-4)
│   ├── 1.1 Feature inventory (every route/page/service)
│   ├── 1.2 Bug inventory (76+ categories)
│   └── 1.3 Root cause (5 Whys)
├── 2. Backend Hardening (Phases 6-9)
│   ├── 2.1 Auth (JWT, refresh, MFA, CSRF)
│   ├── 2.2 Test Engine (autosave, submit, timer, scoring)
│   ├── 2.3 Courses (progress, enrollment)
│   ├── 2.4 Gamification (XP, streak, leaderboard)
│   ├── 2.5 Notifications (model, WS auth)
│   └── 2.6 Payments (cart, idempotency, webhook)
├── 3. Frontend Hardening (Phase 5, 14)
│   ├── 3.1 Loading/Success/Empty/Error/Retry
│   ├── 3.2 Performance (memo, stale closure, bundle)
│   └── 3.3 A11y & Responsive
├── 4. Cross-Cutting (Phases 10-15)
│   ├── 4.1 AI Safety (NO_AI, rate limit, sanitize)
│   ├── 4.2 Security Red Team (full sweep)
│   ├── 4.3 Performance (N+1, indexes, cache)
│   └── 4.4 Chaos (failure injection)
└── 5. Release (Phases 16-21)
    ├── 5.1 E2E journeys
    ├── 5.2 Adversarial review
    ├── 5.3 Documentation sync
    └── 5.4 Release gate
```

### 1.3 Dependency Graph

```
Phase 0 (Safety) ──► Phase 1 (Discovery) ──► Phase 2 (Bug Hunt) ──► Phase 4 (Root Cause)
                                                          │
                                ┌─────────────────────────┼─────────────────────────┐
                                ▼                         ▼                         ▼
                          Phase 5 (FE)              Phase 6 (BE)              Phase 8 (DB)
                                │                         │                         │
                                └─────────────┬───────────┴───────────┬─────────────┘
                                              ▼                       ▼
                                        Phase 9 (API Contract) ──► Phase 7 (Migration)
                                              │
                        ┌─────────────────────┼─────────────────────┐
                        ▼                     ▼                     ▼
                  Phase 10 (Tests)      Phase 11 (AI)         Phase 12 (Security)
                        │                     │                     │
                        └─────────────────────┼─────────────────────┘
                                              ▼
                                    Phase 13-15 (Perf/Chaos/E2E)
                                              │
                                    Phase 17-18 (Adversarial/Cross-Check)
                                              │
                                    Phase 19-21 (Docs/Git/Gate)
```

---

## 2. WAVE-BASED EXECUTION — THE ORCHESTRATION ENGINE

### 2.1 Wave Planning Template

Before any implementation, classify subtasks:

```
| Subtask | Files Touched | Depends On | Wave |
|---------|---------------|------------|------|
| Scout git history | .git/* | none | 1 |
| Map Prisma schema | prisma/schema.prisma | none | 1 |
| Bug Hunt auth | authController.ts, schemas.ts | none | 1 |
| Fix auth refresh alias | schemas.ts, authController.ts | Bug Hunt | 2 |
| Fix timer enforcement | tests_engine/views.py | Bug Hunt | 2 |
| Add throttle to AI | ai_tutor/views.py | Security | 3 |
| Write docs | docs/*.md | Fixes | 4 |
```

**Rule:** Same-wave agents MUST touch different files. If two subtasks edit same file → different waves.

### 2.2 Agent Prompt Template (copy-paste)

```
You are the [ROLE] for LearningHub Cycle [N].

Scope: [One-sentence scope]
Files: [Exact file paths]
Constraints: [What NOT to touch, what to preserve]
Prior wave results: [Summary of findings to build on]
Expected output: [What to return — findings table, evidence, file:line]

Steps:
1. Read files (do not assume)
2. State findings with evidence (file:line + snippet)
3. Distinguish symptom vs root cause
4. Propose fix with prevention
5. Verify (re-read after edit, check for regression)

Do NOT edit files outside scope. Use evidence-based language.
```

### 2.3 Parallel Launch Example (single message, multiple task calls)

```typescript
// Wave 1 — 4 parallel explorers (no file overlap)
task({ subagent_type: "explore", prompt: "Security sweep...", description: "Security sweep" })
task({ subagent_type: "explore", prompt: "Frontend audit...", description: "Frontend audit" })
task({ subagent_type: "explore", prompt: "API contract check...", description: "API contract" })
task({ subagent_type: "explore", prompt: "Test coverage audit...", description: "Test audit" })
// → wait for all 4 → synthesize → Wave 2
```

---

## 3. DEEP PLANNING PER DOMAIN

### 3.1 Auth Domain — Deep Plan

```
Goal: Single canonical token contract, both backends identical.

Steps:
1. Map: read authController.ts, schemas.ts, users/views.py, api.ts SecureStorage
2. Baseline: document Node (httpOnly cookies) vs Django (SimpleJWT body) vs FE (Bearer)
3. Gaps: refresh field names (3 variants), MFA session token, cookie vs body
4. Design: canonical shape {token, accessToken, refreshToken, tokens:{access,refresh}}
5. Implement: Zod accept 3 fields, controller read 3 + cookie, return body+cookie
6. Test: 20 auth tests (register/login/refresh/me + MFA + lockout)
7. Verify: FE refresh with refreshToken (camel) succeeds
8. Document: CANONICAL_AUTH_CONTRACT.md

Risks: Token lifetime mismatch (Node 15min vs Django 60min) — align to 15min.
Wave: Scout(1) → Fix validation+controller(2) → Test+Doc(3)
```

### 3.2 Test Engine — Deep Plan

```
Goal: Idempotent, race-safe, timer-enforced, backend-authoritative scoring.

Steps:
1. Map: testsController.ts autosave (Promise.all?), submit (isDuplicate?), scoring (MAX?)
2. Gaps: autosave saved_count vs saved:bool, Promise.all race, missing validation
3. Design: canonical autosave {saved:true, saved_count:N, attempt_id}
4. Implement: sequential for...of, Zod autosaveTestSchema, throttle 30/min
5. Test: 9 tests (start 201/200, autosave canonical, timer TIMEOUT, server wins)
6. Verify: concurrent autosaves via Promise.all([autosave,autosave]) → correct
7. Document: CANONICAL_TEST_ENGINE_CONTRACT + ANTI_CHEAT_TIMER

Risks: isTerminalStatus must include TIMEOUT/EXPIRED/ABANDONED, not just SUBMITTED.
Wave: Scout(1) →Fix autosave+timer(2) →Tests+Doc(3)
```

### 3.3 Payments — Deep Plan

```
Goal: Server-computed totals, idempotent, webhook-verified, PCI compliant.

Steps:
1. Map: cartController createOrder (client amount fallback?), CheckoutView (PENDING?)
2. Gaps: Node fallback to req.body.amount, Django auto-COMPLETED, no webhook sig
3. Design: PENDING → COMPLETED via HMAC-SHA256 webhook only, X-Idempotency-Key
4. Implement: reject client amount, persist Order with idempotency_key index, HMAC verify
5. Test: idempotent replay (same key → same order), sig invalid → 400, amount ignored
6. Document: CANONICAL_PAYMENT_CONTRACT (5 rules)

Risks: Real Stripe SDK still TODO — current PaymentWebhookView is mock.
Wave: Scout(1) →Fix cart+checkout(2) →Webhook+Doc(3)
```

*(Repeat pattern for Course, Gamification, Notifications, AI)*

---

## 4. EVIDENCE & VERIFICATION FRAMEWORK

### 4.1 Evidence Levels

| Level | Meaning | When to use |
|-------|---------|-------------|
| VERIFIED | Code read + test passed + manual check | After full loop |
| PARTIALLY VERIFIED | Code read, no test run | After inspect, before test |
| UNVERIFIED | Not checked | Before inspect |
| BLOCKED | Cannot check (no tool) | Bash/test runner missing |
| RISK REMAINS | Known gap, documented | In Remaining Risks |

### 4.2 Verification Checklist (per fix)

```
[ ] File re-read after edit — change present?
[ ] No duplicate/contradictory edit in same file?
[ ] Types compile (tsc --noEmit)?
[ ] Unit tests pass (jest/pytest/vitest)?
[ ] Integration: FE call succeeds?
[ ] Security: no new AllowAny, no secret leak?
[ ] Performance: no new N+1, query count same or less?
[ ] Docs updated to reflect real code?
```

### 4.3 Regression Guard

After every fix, re-run:

```
grep -r "AllowAny" apps/*/views.py → should only be on truly public endpoints
grep -r "console.log" src/ → should be 0 (warn/error only)
grep -r "FAKE\|hardcoded.*targetCollege\|courses_completed: 2" → 0
grep -r "refreshToken" backend/src/validations/schemas.ts → must accept 3 variants
```

---

## 5. RISK & PRIORITY MATRIX

### 5.1 Priority Calculation

```
Priority = Severity × Reach × Exploitability

P0: Security breach | Data loss | Auth broken | System down
    → Fix immediately, block release
P1: Critical feature unusable | Incorrect scoring | Payment fail
    → Fix in same cycle
P2: Important feature broken | Perf degradation
    → Fix in next cycle
P3: Minor UI/logic
    → Backlog, fix when touching file
P4: Refinement
    → Backlog
```

### 5.2 Risk Register Template

```
| Risk | Severity | Likelihood | Mitigation | Owner |
|------|----------|------------|------------|-------|
| Timer bypass via client time | P0 | High | MAX(client,server) + TIMEOUT | BE |
| XP grinding via daily goal | P0 | High | Cap 50/1000 | BE |
| Anonymous AI cost attack | P0 | High | IsAuthenticated + 10/min | BE |
| N+1 on 50Q submit | P1 | High | prefetch_related | DB |
| CI false green (threshold 40%) | P1 | High | Raise to 60%, add E2E | QA |
```

---

## 6. PRODUCTION GATE — EVIDENCE REQUIRED

Do NOT declare success because "build passes". Require:

```
[ ] FE build + typecheck
[ ] BE checks + tests (Node Jest + Django pytest --cov)
[ ] Integration tests + E2E (Playwright, live backend)
[ ] DB migrations (both backends)
[ ] API contracts (all 11 canonical docs — 7 active + 2 planned + 2 guides — match code)
[ ] Auth (login→refresh→me→logout)
[ ] Security (no AllowAny on sensitive, webhook sig verified)
[ ] Perf (p50 <100ms, p95 <500ms, no N+1 hot path)
[ ] Responsive (mobile/tablet/desktop)
[ ] Error handling (Loading/Success/Empty/Error/Retry)
[ ] Failure injection (timeout, 401, 429, disconnect, AI down, duplicate submit)
[ ] Critical journeys (full USER + ADMIN on real systems)
```

---

## 7. HANDOFF & CONTINUITY

### 7.1 Documentation Sync

After every 3 cycles:

```
docs/README.md → update index + status
docs/CHANGELOG.md → append cycle
docs/EXECUTIVE_SUMMARY.md → update numbers + prod readiness %
README.md → reflect dual-backend reality + link new docs
```

### 7.2 Next Team Onboarding (1 hour)

```
1. Read README.md (5 min)
2. Read docs/README.md (5 min)
3. Read docs/ARCHITECTURE.md (15 min)
4. Read relevant CANONICAL_* for your domain (10 min each)
5. Setup: .env.example → .env, docker-compose up, npm ci, pip install, migrate, npm run dev (15 min)
6. Verify: npm test, pytest, tsc --noEmit (10 min)
```

---

## 8. TEMPLATES — COPY-PASTE READY

### 8.1 Bug Inventory Row

```
| # | Bug | Location | Evidence (file:line) | Severity | Status |
|---|-----|----------|----------------------|----------|--------|
| 1 | Refresh accepts only 2 field names | schemas.ts:48 | `refresh_token`+`refresh` only, missing `refreshToken` | P0 | FIXED |
```

### 8.2 Fix Commit Message

```
fix(security): [domain] — [one-line fix]

CRITICAL FIXES:
- [what was broken] → [what is now]
- File:line evidence

Tests: Added [N] tests ([names])
Docs: [CANONICAL_* doc]

BREAKING CHANGE: [none / X-Idempotency-Key required]
SECURITY: Closes [vulnerability]
```

### 8.3 Cycle Final Report Header

```
# ORCHESTRATION CYCLE N — FINAL RESPONSE REPORT
## 1. SYSTEM HEALTH  2. ARCHITECTURE TRUTH  3. BUGS FOUND  4. ROOT CAUSES  5. FIXES IMPLEMENTED
## 6. FEATURES VERIFIED  7. MIGRATION STATUS  8. SECURITY  9. PERF  10. TEST  11. E2E
## 12. REMAINING RISKS  13. NEXT HIGHEST-VALUE ACTION  14. FILES CHANGED  15. GIT/PR
```

---

## 9. ANTI-PATTERNS — NEVER DO

```
❌ Big-bang rewrite (migrate domain-by-domain)
❌ Blind merge of all PRs (classify A-G, consolidate)
❌ Remove legacy before parity proven
❌ Document aspirational as implemented
❌ Weaken security to make tests pass
❌ Stop after first green test run
❌ Assume docs == code
❌ Use AI as hard dependency (must have NO_AI)
```

---

## 10. SUCCESS METRICS — HOW YOU KNOW IT'S WORKING

```
After 3 cycles: P0 count drops from 15 → 5, docs index exists
After 6 cycles: Both backends serve same contract for 4 domains, CI green for real
After 9 cycles: N+1 eliminated hot path, AI cost bounded, prod checklist 80%
After 12 cycles: Single ARCHITECTURE.md, 11 contract docs (7+2+2), 1 canonical CI, prod-ready 82%
Perpetual: Every cycle reduces RISK REMAINS, increases VERIFIED
```

---

**Document Status:** ✅ Canonical — Last updated 2026-09-07
**Maintained by:** Lead Engineering Orchestrator
**Next review:** After every 3 cycles
**Companion:** MASTER_PROMPT_CANONICAL_V2.md — use together
