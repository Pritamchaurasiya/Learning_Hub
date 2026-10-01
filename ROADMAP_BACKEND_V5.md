# LEARNINGHUB V5.0 — BACKEND ENGINEERING ROADMAP

> **Timeline:** Q3 2026 - Q1 2027  
> **Horizon:** Enterprise Scale & Global High-Availability  

---

## 1. PHASED EXECUTION ROADMAP

### Phase 0: Ground Truth & Governance (COMPLETED)
- [x] Create `BACKEND_TRUTH.md` with complete runtime, route, and schema discovery.
- [x] Formalize `SYSTEM_ARCHITECTURE.md`, `API_CONTRACT.md`, and `DATABASE_REPORT.md`.
- [x] Establish automated test baselines (Vitest 226/226, Pytest 43/43).

### Phase 1: Clean Architecture Refactoring (IN PROGRESS)
- [x] Standardize on 12 canonical domain apps: `users`, `courses`, `test_engine`, `dsa`, `analytics`, `ai_engine`, `ebooks`, `gamification`, `notifications`, `payments`, `search`, `core`.
- [ ] Migrate all data access logic out of fat views into `selectors.py`.
- [ ] Migrate all business mutations, atomic transactions, and side-effects into `services.py`.
- [ ] Prune orphaned/experimental apps (`web3`, `metaverse`, `neuro`, `bio`, `rl`, `crypto`).

### Phase 2: Assessment Engine & IRT Calibration
- [ ] Finalize Item Response Theory (IRT) difficulty auto-calibration Celery beat task.
- [ ] Implement browser telemetry anti-cheat risk scoring module.

### Phase 3: DSA Multilingual Sandboxing
- [ ] Deploy containerized gVisor / Docker sandboxing runner for user-submitted code.
- [ ] Add runtime memory and CPU quota enforcement across Python, C, C++, Java, JS.

### Phase 4: Observability & Global Scale
- [ ] Prometheus + Grafana unified telemetry dashboard.
- [ ] Sentry error tracking with distributed request tracing.
- [ ] Read-replica database configuration with PgBouncer connection pooling.
