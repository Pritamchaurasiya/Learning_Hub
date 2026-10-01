# LearningHub V15 — Tests A+ Engine & Adaptive CAT Production Report (Phase 5)

**Generated:** 2026-09-28  
**Component:** `learninghub/django_backend/apps/tests_engine` & `learninghub/src/pages/TestsAPage.tsx`

---

## 1. 3-Parameter Logistic (3PL) Item Response Theory

The Tests A+ engine models student response probability using Lord's 3PL model:

$$P_i(\theta) = c_i + \frac{1 - c_i}{1 + e^{-a_i (\theta - b_i)}}$$

Where:
- $\theta \in [-3.0, +3.0]$ represents the student's latent ability.
- $a_i \in [0.5, 2.5]$ is the item discrimination parameter.
- $b_i \in [-2.5, +2.5]$ is the item difficulty parameter.
- $c_i \in [0.0, 0.25]$ is the pseudo-guessing parameter.

---

## 2. Adaptive Computerized Testing (CAT) & Fisher Information

- **Item Selection Criterion**:
  At any point during the adaptive test with estimated ability $\theta$, the engine evaluates Fisher Information across all unanswered items:
  
  $$I_i(\theta) = a_i^2 \frac{(P_i(\theta) - c_i)^2 (1 - P_i(\theta))}{(1 - c_i)^2 P_i(\theta)}$$
  
  The question that maximizes $I_i(\theta)$ is dynamically selected and served as the next item.

- **Stopping Criterion (SEM Convergence)**:
  $$SEM(\theta) = \frac{1}{\sqrt{\sum_{i=1}^{k} I_i(\theta)}}$$
  The test completes when $SEM(\theta) \le 0.35$ or when the student reaches $k = 25$ questions (with a minimum of 5 questions required).

---

## 3. Test Proctoring & Integrity Checks

- **Fullscreen Guard**: Monitored via HTML5 Fullscreen API; window blur / tab switches increment warning counter.
- **Floating Tools**:
  - In-exam whiteboard with SVG vector canvas drawing.
  - Scientific calculator with trigonometric, logarithmic, and exponent functions.
- **Offline Fallback**:
  - `OfflineAssessmentManager` caches downloaded tests in IndexedDB.
  - Answers recorded locally with millisecond timestamps and synced to `/api/v1/tests-engine/attempts/sync/` once connection is restored.
