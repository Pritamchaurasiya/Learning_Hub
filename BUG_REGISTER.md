# LEARNINGHUB — BUG REGISTER & CODE REMEDIATION LOG (PHASE 14)

> **Mode:** Autonomous Bug Hunter & Remediation Audit  
> **Status:** All Verified Issues Triaged and Remediated  
> **Date:** September 2026

---

## 1. Bug Hunter Methodology

The codebase was subjected to systematic static analysis, AST verification, and runtime contract fuzzing across:
- Broken or orphaned API endpoints
- Dead or misrouted frontend service calls
- Model attribute mismatches between DRF serializers and PostgreSQL schema
- Race conditions during concurrent submissions and autosave flushes
- Unhandled Promise rejections and network disconnection traps

---

## 2. Verified Bug Registry & Remediation Details

### Bug 01: Test Attempt Double Submit Race Condition
- **Category**: Concurrency / Business Logic
- **Component**: `apps.tests_engine.views.SubmitTestView`
- **Symptom**: Rapid double-clicking of the "Submit Test" button or concurrent network retries could invoke evaluation twice, awarding duplicate XP and creating conflicting score entries.
- **Root Cause**: Non-atomic check on `attempt.status == 'in_progress'` prior to evaluation.
- **Fix**: Wrapped the transition in a database transaction with row-level locking (`select_for_update()`) and an atomic status update (`filter(status='in_progress').update(status='submitted')`). Second request receives the already evaluated attempt with HTTP 200 without re-running scoring.

### Bug 02: Autosave Payload Key Inconsistency
- **Category**: API Contract Mismatch
- **Component**: `learninghub/src/services/testsAService.ts` ↔ `apps.tests_engine.views.TestAutosaveView`
- **Symptom**: Periodic batch autosave sent `{ answers: { q1: "opt_a" }, attempt_id: "..." }`, while earlier Django views expected a flat single-question payload `{ question_id: "q1", option_id: "opt_a" }`.
- **Root Cause**: Divergence between legacy single-answer update and bulk autosave specifications.
- **Fix**: Updated `TestAutosaveView` serializer to accept both dictionary format (`answers: Dict[str, Union[str, List[str]]]`) and legacy flat fields, atomically upserting all provided answers in a single query.

### Bug 03: CSRF Header Naming Mismatch in Axios / Fetch Layer
- **Category**: Security / HTTP Headers
- **Component**: `learninghub/src/utils/api.ts` ↔ `learninghub_server/settings.py`
- **Symptom**: Django default looks for `X-CSRFToken`, whereas standard modern frontend frameworks often emit `X-XSRF-Token`.
- **Root Cause**: Missing header normalization middleware on Django backend.
- **Fix**: Verified and ensured `apps.core.middleware.CSRFHeaderNormalizerMiddleware` is active in `MIDDLEWARE`, mapping `HTTP_X_XSRF_TOKEN` to `HTTP_X_CSRFTOKEN` seamlessly before CSRF validation runs.

### Bug 04: DSA Sandbox Timeout Hang on Infinite Loops
- **Category**: Runtime / Resource Exhaustion
- **Component**: `apps.problems.services.CodeSandboxService`
- **Symptom**: User code containing `while True: pass` consumed 100% of a CPU core until host-level kill.
- **Root Cause**: Subprocess execution used `subprocess.Popen` without enforceable CPU wall-clock limits or child process tree termination.
- **Fix**: Replaced with `subprocess.run(..., timeout=timeout_seconds)` wrapped in a process group with `os.killpg()` on timeout, accompanied by `RLIMIT_CPU` enforcement.

### Bug 05: Video Player Progress Timestamp Drift on Rapid Seeks
- **Category**: Frontend UX & State
- **Component**: `src/pages/LessonPlayerPage.tsx`
- **Symptom**: Seeking back and forth triggered multiple out-of-order progress update network calls, occasionally setting total watch progress backward.
- **Root Cause**: Unthrottled API calls without monotonic progress guards.
- **Fix**: Debounced progress sync calls to 5 seconds and added monotonic guard: only persist progress if `new_seconds > current_recorded_seconds` (unless explicitly resetting lesson).

---

## 3. Code Smell & Dead Code Removal Summary

| Code Item | Location | Action Taken | Rationale |
|:---|:---|:---|:---|
| Legacy Web3 / Metaverse experimental stubs | `conductor/apps/web3`, `conductor/apps/metaverse` | Disabled / Quarantined | Deprecated speculative experiments not part of the core educational LMS mission. |
| Incompatible PyTest ignore directives | `pytest.ini` / `.hypothesis` | Cleaned configuration | Prevented deprecation warnings during automated CI test runs. |
| Hardcoded fallback ports in documentation | Various `.md` files | Canonicalized | Enforced port `3000` (React Vite) and port `8000` (Django API). |
