# LEARNINGHUB — ALGORITHM AUDIT SPECIFICATION
## Comprehensive Audit of Psychometric, Learning Intelligence, and Assessment Engines

**Document Version:** 1.0.0 (Production Canonical)  
**Audit Date:** October 14, 2026  
**Auditor:** Principal Software & Learning Science Engineer  
**Repository:** `Pritamchaurasiya/Learning_Hub` (`C:\Users\shiva\Desktop\windows_app`)  
**Base Commit:** `c799936a`  
**Active Feature Branch:** `feat/algorithm-intelligence-engineering`

---

## 1. CANONICAL RUNTIME & ARCHITECTURAL EVIDENCE

To eliminate ambiguity between parallel backend implementations, a complete source-of-truth audit was conducted across codebases, configurations, and CI pipelines:

### 1.1 Source-of-Truth Determination
1. **Canonical Frontend SPA:** `learninghub/src/`
   - **Framework:** React 18, Vite 5, TypeScript 5, Tailwind CSS, Zustand, TanStack React Query.
   - **API Client:** `learninghub/src/utils/api.ts` proxies requests to `/api/v1` (`VITE_API_TARGET`).
2. **Canonical Production Backend:** `learninghub/django_backend/`
   - **Framework:** Python 3.13 / Django 5.0.14, Django REST Framework 3.17.2, Daphne ASGI, Channels.
   - **Evidence from CI (`.github/workflows/ci.yml:133-210` & `236-344`):**
     - GitHub Actions runs `pip install -r requirements.txt`, `ruff check .`, `python manage.py check`, `python manage.py migrate`, and `pytest --cov=.`.
     - The live E2E test job (`ci.yml:296-344`) boots `learninghub/django_backend` on `0.0.0.0:8000` with PostgreSQL 16 and Redis 7, then runs Playwright against the live Django endpoints.
   - **Local Test Baseline:** 130 passing tests (`pytest` passed 130/130 in 123.37s).
3. **Flutter / Desktop App Backend:** `conductor/`
   - Dedicated Django backend for the native Flutter mobile client (`windows_app/` / `my_flutter_app/`). It is **not** the production web application target.
4. **Legacy / Transitional Backend:** `learninghub/backend/`
   - Node.js 20, Express, Prisma ORM. Maintained as a transitional reference backend; features are actively being consolidated into Django.

---

## 2. EXISTING ALGORITHM INVENTORY & STATUS

| Algorithm Name | Component / File Location | Status | Primary Mathematical / Algorithmic Basis | Key Identified Vulnerabilities / Gaps |
| :--- | :--- | :---: | :--- | :--- |
| **3PL IRT CAT Ability Update** | `apps/tests_engine/scoring.py:144-166` | **BROKEN** | 3-Parameter Logistic Model & Newton-Raphson update | Operator precedence bug (`1.0` instead of `1.0 - p`) severely inflates ability updates by up to 10x. |
| **CAT Fisher Information & Item Selection** | `apps/tests_engine/scoring.py:133-142, 168-202` | **PARTIALLY VERIFIED** | Fisher Information maximization $I(\theta)$ | Missing exposure control (Sympson-Hetter); over-exposes top-discrimination items. |
| **CAT SEM Stopping Criteria** | `apps/tests_engine/scoring.py:204-234` | **UNVERIFIED** | $\text{SEM}(\theta) = 1/\sqrt{I(\theta)} \le 0.35$ | Dead code: `has_converged` is never called by `AdaptiveNextQuestionView`. |
| **Classical & Negative Marking Scoring** | `apps/tests_engine/scoring.py:7-118` | **PARTIALLY VERIFIED** | Discrete scoring with negative deduction | Multi-select answers (`selected_option_ids`) not persisted to `AttemptAnswer`. |
| **Bayesian Knowledge Tracing (BKT)** | `apps/tests_engine/bkt_engine.py:18-49` | **PARTIALLY VERIFIED** | Corbett & Anderson (1995) 2-state HMM | False mastery in 2 answers; fixed uncalibrated priors; no uncertainty estimation; race conditions. |
| **Curriculum Skill DAG & ZPD** | `apps/tests_engine/bkt_engine.py:117-236` | **PARTIALLY VERIFIED** | DAG traversal, prerequisite unlock gating | Premature unlock bug when $p_{\text{init}} \ge \text{threshold}$; no cycle detection. |
| **SuperMemo SM-2 Spaced Repetition** | `apps/tests_engine/spaced_repetition.py:21-70` | **PARTIALLY VERIFIED** | SM-2 with exponential decay $R(t) = e^{-t/S}$ | Non-idempotent reviews (rapid retries advance intervals); no daily caps; duplicate cards possible. |
| **Behavioral Assessment Telemetry** | `apps/tests_engine/telemetry.py:15-81` | **PARTIALLY VERIFIED** | Capped linear risk scoring + HMAC-SHA256 digest | Telemetry scores and HMAC proofs are ephemeral (never stored in database models). |
| **Exam Attempt Lifecycle & Timer** | `apps/tests_engine/views.py:50-482` | **BROKEN** | Server-authoritative elapsed time validation | Autosave modifies submitted tests; overdue submit grades late answers; bypasses attempt limits. |
| **DSA Problem Recommendation** | `apps/problems/views.py:10-28` | **BROKEN** | Empty stub (`recommendations = []` in `apps/ai_tutor`) | No recommendation ranking in Django; no weak-area targeting; no solve-status tracking. |
| **DSA Code Sandbox & AST** | `learninghub/django_backend/apps/problems/sandbox.py` | **HARDENED; RUNTIME NOT DEPLOYED** | Docker-isolated Python/JavaScript with network disabled and CPU, memory, process, output, and wall-clock limits | No host-process fallback; unsupported languages and missing Docker fail closed. The Django image does not provide a dedicated sandbox runtime, so execution remains unavailable until one is deployed. |
| **DSA Hidden Testcase Secrecy** | `learninghub/django_backend/apps/problems/views.py` | **FIXED** | Hidden failures return only a generic testcase message | Expected output is not included in hidden-case responses. |
| **Course Prerequisite Enforcement** | `apps/courses/views.py:52-71` | **BROKEN** | Metadata field only | Zero enforcement at enrollment; any user can enroll in advanced courses. |
| **Search Engine & Retrieval** | `apps/courses/views.py:306-317` | **BROKEN** | Basic SQL `LIKE '%query%'` (`__icontains`) | Multi-word queries fail; zero relevance ranking; no tokenization or stemming. |
| **Dashboard Analytics Isolation** | `apps/core/views.py:94-180` | **BROKEN** | Synthetic fallbacks (`or 12`, `or 1450`) | Data fabrication for real zero-progress users; identical mock stats returned to all users. |
| **Guest Cart Isolation** | `apps/ecommerce/views.py:25-28` | **BROKEN** | Fallback to shared string `'guest-session'` | IDOR: unauthenticated users share the same cart, overwriting each other's items. |

---

## 3. IN-DEPTH TECHNICAL & MATHEMATICAL GAPS

### 3.1 Critical Operator Precedence Bug in IRT Scoring
In `learninghub/django_backend/apps/tests_engine/scoring.py:158`:
```python
learning_rate = 1.0 / math.sqrt(max(1, step))
delta = learning_rate * (1.0 if is_correct else 0.0 - p) / (info + 0.2)
```
In Python, subtraction (`-`) binds tighter than the conditional expression (`x if cond else y`).
- On correct answers (`is_correct = True`), `(1.0 if is_correct else 0.0 - p)` evaluates strictly to `1.0`.
- The actual residual $(u_i - P_i(\theta))$ must be $(1.0 - p)$.
- Because $1.0 > 1.0 - p$, every correct response applies an inflated delta. For an easy item ($p = 0.9$), the delta is $(1.0 / 0.1) = 10\times$ larger than intended.

### 3.2 Exam Attempt Lifecycle Flaws
1. **Post-Finalization Autosave Tampering (`views.py:221-265`):**
   `TestAutosaveView` accepts answers without checking if `attempt.status == 'IN_PROGRESS'`. Examinees can edit their recorded choices after submitting.
2. **Attempt Limit Bypass (`views.py:226-232, 293-300`):**
   If an autosave or submit request provides an invalid or missing `attempt_id`, the views automatically create a new attempt without validating `test.max_attempts`.
3. **Overdue Submissions Accepted (`views.py:358-368`):**
   When `is_over_time` is detected, the status changes to `TIMEOUT`, but the view still parses late answers in the request body, grades them, and credits score/XP.
4. **Missing Multi-Select Persistence (`scoring.py:50-59`):**
   `AttemptAnswer.objects.update_or_create` records `selected_option_id`, but completely drops `selected_option_ids` (JSONField).

### 3.3 DSA Sandbox & Secret Leakage (rechecked October 18, 2026)
1. **Untrusted code execution:** `learninghub/django_backend/apps/problems/sandbox.py` now launches Python and JavaScript only through Docker with networking disabled, CPU/memory/process/output limits, a read-only root filesystem, an unprivileged UID, and a bounded wall-clock timeout. Static analysis is defense-in-depth, not the isolation boundary.
2. **Fail-closed runtime requirement:** If Docker is missing or cannot start, the API reports a runtime failure and never executes submissions on the Django host. The current Django image does not include a sandbox runner or expose a dedicated isolated runtime, so production code execution must remain disabled until that infrastructure is provisioned. C++, Java, Go, and other unconfigured languages are explicitly rejected.
3. **Hidden testcase secrecy and XP farming:** Hidden-case failures now omit expected output, and repeat accepted submissions do not award XP again; regression tests cover both behaviors.

### 3.4 BKT Engine Premature Mastery & Concurrency
1. **Premature Mastery ($N=2$):**
   With $P(L_0) = 0.15$ and $P(T) = 0.20$, two consecutive correct answers result in $P(L_2) = 0.8786 > 0.85$, falsely declaring mastery on two lucky guesses.
2. **Prerequisite Unlock Bug (`bkt_engine.py:142-143`):**
   If a prerequisite has `minimum_mastery <= 0.15`, child skills unlock for users who have never touched the prerequisite.
3. **Concurrency:**
   `record_interaction` lacks database row locking, leading to lost updates under concurrent submissions.

---

## 4. BACKEND PARITY & RECOVERY PLAN

| Capability | Legacy Node Backend (`backend/`) | Production Django Backend (`django_backend/`) | Parity & Remediation Plan |
| :--- | :--- | :--- | :--- |
| **DSA Recommendations** | Multi-factor priority score, weak-area targeting, Kahn DAG | None (`AIRecommendationsView` returns `[]`) | Implement `DSARecommendationEngine` in Django combining weak topics, solve status, and difficulty. |
| **DSA Solve Status** | Resolves `user_status: SOLVED \| ATTEMPTED \| UNATTEMPTED` | None (raw problem list) | Annotate user solve status in `ProblemListView`. |
| **Code Sandboxing** | Piston container execution for 8 languages | Docker-isolated Python/JavaScript; no host fallback; runtime not deployed | Provision a dedicated isolated sandbox worker and add runtimes only when actually supported. |
| **Search Relevance** | Fuse.js / basic text | Basic `icontains` | Implement multi-word tokenized search with field weighting and ranking in `apps/core/search.py`. |
| **Prerequisites** | Course prerequisite checks | Unchecked `JSONField` | Implement strict prerequisite completion validation in `EnrollCourseView`. |

---

## 5. PRIORITIZED REMEDIATION RECOMMENDATIONS

1. **P0 (Critical Correctness & Security):**
   - Fix IRT ability delta operator precedence in `scoring.py`.
   - Block autosave and answer modifications on finalized attempts (`SUBMITTED`, `TIMEOUT`, `EXPIRED`).
   - Retain hidden-testcase output masking and one-time XP awarding in DSA submissions.
   - Fix shared guest cart isolation in `apps/ecommerce/views.py`.
2. **P1 (Core Learning Intelligence):**
   - Implement `DSARecommendationEngine` with weak-area targeting and explainable reasons.
   - Enforce sample size floor ($N \ge 3$) and uncertainty tracking in BKT.
   - Make Spaced Repetition reviews idempotent with review window guards.
   - Activate SEM stopping criteria in Adaptive CAT testing.
3. **P2 (Platform Enhancements):**
   - Implement multi-word tokenized search with relevance ranking.
   - Enforce course prerequisites upon enrollment.
   - Replace synthetic fallbacks in analytics with true aggregation.
