# LearningHub V15 — Future-Ready Strategic Milestone Roadmap (Phase 15+)

**Generated:** 2026-09-28  
**Horizon:** Next 3 quarters (Q4 2026 – Q2 2027)

---

## 1. High-Impact Enhancements

### Milestone 1: Multi-Agent AI Collaborative Tutor (Q4 2026) — [COMPLETED & VERIFIED]
- **Status**: ✅ Shipped & Tested (100% pass across backend & frontend suites).
- **Architecture**: 3-Agent Cooperative Council:
  1. *Dr. Socratic (Socratic Guide)*: Diagnoses mental models, invariants, and scaffolding questions.
  2. *Staff Reviewer (Code Reviewer)*: Audits asymptotic $O(N)$ / $O(1)$ complexity, bounds, and edge cases.
  3. *Coach Maya (Motivational Coach)*: Analyzes sentiment/frustration signals, cognitive load, and pacing.
- **Components**: [`MultiAgentCouncilService.ts`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/backend/src/services/ai/MultiAgentCouncilService.ts), [`AICouncilModal.tsx`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/AICouncilModal.tsx), `/api/v1/ai/council/consult` and `/specialist` endpoints.

### Milestone 2: Live Collaborative DSA Pair Programming (Q1 2027) — [COMPLETED & VERIFIED]
- **Status**: ✅ Shipped & Tested.
- **Capabilities**:
  - WebSocket collaboration engine with dedicated `collab-` room isolation in [`websockets/index.ts`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/backend/src/websockets/index.ts).
  - Real-time concurrent code syncing without feedback loops via [`useCollaborativeSession.ts`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/hooks/useCollaborativeSession.ts).
  - Remote peer presence, live line/column cursor broadcasting, and WebRTC AV signaling.
  - Synchronous shared testcase execution console broadcasting test runs and execution metrics.
  - Interactive workspace control modal via [`CollabSessionModal.tsx`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/CollabSessionModal.tsx).

### Milestone 3: WebAssembly Native Sandbox Execution (Q1 2027) — [COMPLETED & VERIFIED]
- **Status**: ✅ Shipped & Tested (100% pass across wasm sandbox and workspace test suites).
- **Architecture**:
  - In-browser client-side code execution using Pyodide (Python compiled to WASM) and isolated air-gapped Function/QuickJS workers.
  - Sub-millisecond evaluation latency with zero backend server load.
  - Air-gapped execution intercepting stdout/stderr and cutting off DOM/fetch/network APIs.
- **Components**: [`WasmSandboxService.ts`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/services/wasm/WasmSandboxService.ts), [`WasmTestResultsView.tsx`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/WasmTestResultsView.tsx), and integrated execution switcher in [`ProblemWorkspacePage.tsx`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/pages/ProblemWorkspacePage.tsx).

### Milestone 4: Decentralized Verifiable Credentials (W3C DID) (Q2 2027) — [COMPLETED & VERIFIED]
- **Status**: ✅ Shipped & Tested (100% pass across backend & frontend suites).
- **Architecture**:
  - W3C Verifiable Credentials Data Model v1.1 & v2.0 compliant JSON-LD format with RFC 8785 canonical digest.
  - Decentralized Identifiers (DID): `did:polygon:<address_or_hash>` and official `LEARNINGHUB_ISSUER` anchoring.
  - SHA-256 Merkle Tree inclusion proofs ($O(\log N)$ on-chain verification) anchoring to Polygon PoS & Base L2.
  - IPFS CIDv1 immutable multihash content addressing (`bafy...`).
  - Zero-PII Selective Disclosure: Salted SHA-256 recipient hashes preventing public data leakage.
  - Multi-tier credentials: Course Mastery & Completion credentials, and high-precision CAT / competitive exam percentile credentials.
  - Instant Public Verification Portal: Real-time 6-point cryptographic invariant verification, raw W3C JSON-LD inspection, and downloadable tamper-proof SVG vector certificates.
- **Components**:
  - Backend Service: [`VerifiableCredentialService.ts`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/backend/src/services/VerifiableCredentialService.ts) & [`MerkleTree`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/backend/src/services/VerifiableCredentialService.ts#L170-L240)
  - Backend Controller & Routes: [`verifiableCredentialsController.ts`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/backend/src/controllers/verifiableCredentialsController.ts) & [`credentials.routes.ts`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/backend/src/routes/v1/credentials.routes.ts) mounted under `/api/v1/credentials`
  - Frontend Types & Service: [`credentials.ts`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/types/credentials.ts) & [`verifiableCredentialService.ts`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/services/verifiableCredentialService.ts)
  - Frontend Components: [`W3CVerificationAuditCard.tsx`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/credentials/W3CVerificationAuditCard.tsx), [`W3CCredentialBadge.tsx`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/credentials/W3CCredentialBadge.tsx), and enhanced [`VerifyCertificatePage.tsx`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/pages/VerifyCertificatePage.tsx) supporting legacy codes, W3C DID lookup, and JSON credential file uploads.
  - Student Profile Integration: [`StudentCredentialsPortfolio.tsx`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/credentials/StudentCredentialsPortfolio.tsx) integrated directly into [`ProfilePage.tsx`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/pages/ProfilePage.tsx) with interactive filtering, 1-click proof audit, tamper-proof SVG vector certificate generation, JSON-LD export, and instant demo credential minting.

### Milestone 5: Cognitive Mistake Categorization & Intelligent Remediation Engine (Q2 2027) — [COMPLETED & VERIFIED]
- **Status**: ✅ Shipped & Tested (100% pass across vitest suites and typecheck).
- **Architecture**:
  - Psychometric mistake archetype classification: `CONCEPT_GAP` (high time-investment errors), `CALCULATION_SLIP` (distractor traps / precision errors), `TIME_CRUNCH` (<15s rushed errors), `UNANSWERED` (pacing bottlenecks), and `CONFIDENCE_MISMATCH` (overconfidence pitfalls).
  - Instant targeted micro-drill factory generating 5-to-10 question adaptive remediation sessions focused on identified weak topics.
  - Interactive Review Modal: Category breakdown chips, side-by-side answer comparisons, step-by-step LaTeX solution drawer via [`MathRenderer.tsx`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/MathRenderer.tsx), and 1-click Ebook chapter deep links.
  - Results Page Integration: Dynamic Cognitive Error Pattern Analysis snapshot card embedded in [`TestsAPage.tsx`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/pages/TestsAPage.tsx) with primary root cause identification.
- **Components**:
  - Service: [`remediationService.ts`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/services/remediationService.ts) & [`remediationService.test.ts`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/services/remediationService.test.ts)
  - UI Component: [`MistakeRemediationModal.tsx`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/test/MistakeRemediationModal.tsx) & [`MistakeRemediationModal.test.tsx`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/test/MistakeRemediationModal.test.tsx)
  - Page Integration: [`TestsAPage.tsx`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/pages/TestsAPage.tsx) & [`TestsAPage.test.tsx`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/pages/TestsAPage.test.tsx)

### Milestone 6: Real-Time Assessment Integrity Shield & Behavioral Telemetry Engine (Q2 2027) — [COMPLETED & VERIFIED]
- **Status**: ✅ Shipped & Tested (100% pass across backend pytest suites, frontend vitest suites, tsc typecheck, and Vite PWA build).
- **Architecture**:
  - Non-invasive client-side behavioral telemetry monitoring tab switches, window blur/focus loss, clipboard copy/paste interceptions, right-click context menu prevention, and DevTools inspection key shortcuts (`F12`, `Ctrl+Shift+I`, `Ctrl+U`).
  - Real-time client-side and backend scoring engine computing a 0–100 Assessment Integrity Score with category-specific caps and risk levels (`EXCELLENT`, `LOW_RISK`, `MODERATE_RISK`, `HIGH_RISK`).
  - Active Test HUD: Non-intrusive floating status indicator with animated pulse badge and warning dialog on out-of-window events via [`ProctoringWarningBanner.tsx`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/test/ProctoringWarningBanner.tsx).
  - Results Page Scorecard: Dedicated [`AssessmentIntegrityScorecard.tsx`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/test/AssessmentIntegrityScorecard.tsx) presenting integrity scores, behavioral metric breakdown pills, expandable session telemetry audit log, and cryptographic HMAC-SHA256 session proof digest.
  - Backend Telemetry Ingestion: Django endpoints `/api/v1/tests/<pk>/telemetry` and `/api/v1/tests/attempts/<attempt_id>/telemetry` powered by [`AssessmentIntegrityEngine`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/django_backend/apps/tests_engine/telemetry.py) with automated proctor review flagging.
- **Components**:
  - Backend Engine & Endpoints: [`telemetry.py`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/django_backend/apps/tests_engine/telemetry.py), [`views.py`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/django_backend/apps/tests_engine/views.py#L847), [`urls.py`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/django_backend/apps/tests_engine/urls.py#L32), and [`test_assessment_integrity.py`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/django_backend/tests/test_assessment_integrity.py).
  - Frontend Hook & Services: [`useProctoring.ts`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/hooks/useProctoring.ts), [`useProctoring.test.ts`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/hooks/useProctoring.test.ts), and [`testsAService.ts`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/services/testsAService.ts).
  - Frontend Components: [`ProctoringWarningBanner.tsx`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/test/ProctoringWarningBanner.tsx), [`AssessmentIntegrityScorecard.tsx`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/test/AssessmentIntegrityScorecard.tsx), and [`AssessmentIntegrityScorecard.test.tsx`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/test/AssessmentIntegrityScorecard.test.tsx).
  - Page Integration: [`TestsAPage.tsx`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/pages/TestsAPage.tsx) & [`testSlice.ts`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/stores/slices/testSlice.ts).

### Milestone 7: SuperMemo SM-2+ Spaced Repetition Engine & Smart Revision Hub (Q2 2027) — [COMPLETED & VERIFIED]
- **Status**: ✅ Shipped & Tested (100% pass across backend pytest suite, frontend vitest suite, tsc typecheck, and Vite PWA production build).
- **Architecture**:
  - SuperMemo SM-2+ psychometric spaced repetition scheduling engine calibrated against the Ebbinghaus forgetting curve.
  - Dynamically calculates repetition intervals ($I_1 = 1, I_2 = 6, I_n = I_{n-1} \times EF$), adaptive ease factors ($EF \ge 1.3$), memory stability ($S$), and retention probability ($R = e^{-t/S}$).
  - Multi-tier flashcard types: `MISTAKE` (auto-generated from failed assessment items), `FORMULA` (mathematical/statistical identities with KaTeX rendering), `CONCEPT` (core theoretical foundations), and `QUESTION` (targeted practice drills).
  - 1-Click Automated Ingestion: Automated card generation from test session mistakes (`/api/v1/revision/generate` with source `mistakes`) and bookmarked questions (`source: bookmarks`).
  - Interactive 3D Study Deck: Animated card flip mechanics with Framer Motion, keyboard accessibility (Space to flip, 1-4 to rate recall), retention probability indicators, and session summary breakdowns.
  - Retention Analytics Dashboard: Real-time mastery rate tracking, 7-day review forecast, stability distributions, and granular topic-level retention breakdown.
- **Components**:
  - Backend Engine & Endpoints: [`spaced_repetition.py`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/django_backend/apps/tests_engine/spaced_repetition.py), [`models.py`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/django_backend/apps/tests_engine/models.py), [`views.py`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/django_backend/apps/tests_engine/views.py), [`urls.py`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/django_backend/apps/tests_engine/urls.py), and [`test_spaced_repetition.py`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/django_backend/tests/test_spaced_repetition.py).
  - Frontend Services & Types: [`revision.ts`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/types/revision.ts), [`revisionService.ts`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/services/revisionService.ts), and [`revisionService.test.ts`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/services/revisionService.test.ts).
  - Frontend Components: [`SpacedRepetitionCard.tsx`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/revision/SpacedRepetitionCard.tsx), [`RetentionAnalyticsCard.tsx`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/revision/RetentionAnalyticsCard.tsx), and [`RevisionPage.tsx`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/pages/RevisionPage.tsx).
  - Test Suite: [`RevisionPage.test.tsx`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/pages/RevisionPage.test.tsx) (100% pass).

### Milestone 8: Bayesian Knowledge Tracing (BKT) & Interactive Concept Mastery Graph Engine (Q2 2027) — [COMPLETED & VERIFIED]
- **Status**: ✅ Shipped & Tested (100% pass across vitest suites, tsc typecheck, and Vite PWA production build).
- **Architecture**:
  - Full implementation of Bayesian Knowledge Tracing (BKT) psychometric model:
    - $P(L_0) = 0.15$ (Prior mastery), $P(T) = 0.20$ (Learning transition rate), $P(G) = 0.20$ (Guess probability), $P(S) = 0.08$ (Careless slip probability).
    - Dynamic Bayesian posterior updating on evidence $O_t \in \{0, 1\}$ with forward learning acquisition $P(L_{t+1})$.
    - Mastery threshold verification at $P(L_t) \ge 0.85$.
  - 4-Factor Composite Exam Readiness Predictive Engine:
    - Formula: $R_{\text{exam}} = 0.35 \cdot M_{\text{syllabus}} + 0.30 \cdot S_{\text{mock}} + 0.20 \cdot A_{\text{speed}} + 0.15 \cdot R_{\text{retention}}$.
    - Classification into 4 performance bands: `ELITE` ($\ge 85$), `COMPETITIVE` ($\ge 70$), `DEVELOPING` ($\ge 50$), `NEEDS_REINFORCEMENT` ($< 50$).
    - Automated strategic recommendations and strength/weakness diagnostics.
  - Interactive Concept Knowledge Graph Visualizer:
    - Topological DAG rendering grouping nodes into progression tiers (Foundations, Core, Intermediate, Advanced).
    - Status badges (`MASTERED`, `IN_PROGRESS`, `UNLOCKED`, `LOCKED`) with prerequisite dependency satisfaction checks.
    - Interactive slide-over drawer with prerequisite tracking, direct 1-click links to problem practice workspaces, flashcard decks, and textbook chapters.
    - Semicircular animated Exam Readiness Gauge with sub-metric progress indicators.
- **Components**:
  - Services & Types: [`bkt.ts`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/types/bkt.ts), [`bktService.ts`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/services/bktService.ts), and [`bktService.test.ts`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/services/bktService.test.ts).
  - UI Components: [`KnowledgeGraphVisualizer.tsx`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/analytics/KnowledgeGraphVisualizer.tsx), [`KnowledgeGraphVisualizer.test.tsx`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/analytics/KnowledgeGraphVisualizer.test.tsx), [`ExamReadinessGauge.tsx`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/analytics/ExamReadinessGauge.tsx), and [`ExamReadinessGauge.test.tsx`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/analytics/ExamReadinessGauge.test.tsx).
  - Page Integration: [`AnalyticsPage.tsx`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/pages/AnalyticsPage.tsx).

