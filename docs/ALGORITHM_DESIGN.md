# LEARNINGHUB — ALGORITHM DESIGN SPECIFICATION
## Mathematical Formulations, Architecture Contracts, Invariants, and Fallbacks

**Document Version:** 1.0.0 (Production Canonical)  
**Date:** October 14, 2026  
**Auditor & Architect:** Principal Software & Learning Science Engineer  

---

## 1. 3-PARAMETER LOGISTIC (3PL) IRT ADAPTIVE CAT ENGINE

### 1.1 Purpose & User Benefit
Computerized Adaptive Testing (CAT) tailors question difficulty in real time to the student's latent ability ($\theta$), reducing exam fatigue, preventing ceiling/floor effects, and achieving high measurement precision in 50% fewer questions than fixed-length exams.

### 1.2 Mathematical Formulation & Invariants

#### 1. Item Response Function (Probability of Correctness)
For an item $i$ with discrimination $a_i$, difficulty $b_i$, and pseudo-guessing parameter $c_i$:
$$P_i(\theta) = c_i + \frac{1 - c_i}{1 + \exp\left(-a_i (\theta - b_i)\right)}$$

- **Domain Constraints:** $\theta \in [-3.0, +3.0]$, $a_i \in [0.2, 2.5]$, $b_i \in [-3.0, +3.0]$, $c_i = 0.25$ (4-option MCQ standard).
- **Numerical Safeguard:** Clamping exponent argument to $[-15.0, 15.0]$ to prevent IEEE 754 overflow.

#### 2. Fisher Information Function
$$I_i(\theta) = a_i^2 \cdot \frac{\left(P_i(\theta) - c_i\right)^2}{(1 - c_i)^2} \cdot \frac{1 - P_i(\theta)}{P_i(\theta)}$$
- If $P_i(\theta) \le c_i$ or $P_i(\theta) \ge 1.0$, returns minimum baseline information $0.01$.

#### 3. Standard Error of Measurement (SEM)
$$\text{SEM}(\theta) = \frac{1}{\sqrt{\sum_{k=1}^{n} I_k(\theta)}}$$

#### 4. Latent Ability Dynamic Update (Newton-Raphson / Damped Fisher Scoring)
Upon observing response $u_i \in \{0, 1\}$ at step $k$:
$$\text{Residual} = u_i - P_i(\theta)$$
$$\Delta\theta = \frac{1}{\sqrt{k}} \cdot \frac{\text{Residual}}{I_i(\theta) + 0.2}$$
$$\theta_{k+1} = \max\left(-3.0, \, \min\left(3.0, \, \theta_k + \max(-1.0, \min(1.0, \Delta\theta))\right)\right)$$

- **Fixed Operator Precedence:** $\text{Residual} = (1.0 - P_i(\theta))$ when correct, $(0.0 - P_i(\theta))$ when incorrect.

#### 5. Stopping Criteria
An adaptive test terminates when:
1. $\text{SEM}(\theta) \le 0.35$ AND $k \ge N_{\min}$ (where $N_{\min} = 5$), OR
2. $k \ge N_{\max}$ (where $N_{\max} = 25$), OR
3. Item bank for the topic is exhausted.

### 1.3 Inputs, Outputs & Query Budget
- **Inputs:** `attempt_id`, `previous_question_id`, `selected_option_id`, `time_spent_seconds`.
- **Outputs:**
  ```json
  {
    "is_complete": false,
    "ability_theta": 0.425,
    "sem": 0.382,
    "questions_answered": 6,
    "next_question": {
      "id": "q-101",
      "text": "...",
      "difficulty": 0.5,
      "options": [...]
    }
  }
  ```
- **Query Budget:** Maximum 2 queries per step (`SELECT` attempt with answers, `SELECT` next item maximizing Fisher information with tie-breaking randomization).

---

## 2. BAYESIAN KNOWLEDGE TRACING (BKT) WITH UNCERTAINTY & PRACTICE FLOOR

### 2.1 Purpose & User Benefit
Estimates the probability $P(L_t)$ that a student has mastered a concept from their sequential problem and quiz attempts, enabling knowledge-gap detection and unlocking dependent skills.

### 2.2 Mathematical Formulation & Invariants

#### 1. BKT Parameter Set
- $P(L_0) \in [0.05, 0.30]$: Initial prior probability of knowing the skill (default $0.15$).
- $P(T) \in [0.05, 0.35]$: Transition probability of learning the skill during a practice step (default $0.20$).
- $P(G) \in [0.05, 0.30]$: Guess probability — answering correctly despite not knowing (default $0.20$).
- $P(S) \in [0.02, 0.20]$: Slip probability — answering incorrectly despite knowing (default $0.10$).

#### 2. Posterior Observation Update
Given observation $Obs_t \in \{0, 1\}$:
$$P(L_{t-1} \mid Obs_t = 1) = \frac{P(L_{t-1})(1 - P(S))}{P(L_{t-1})(1 - P(S)) + (1 - P(L_{t-1}))P(G)}$$
$$P(L_{t-1} \mid Obs_t = 0) = \frac{P(L_{t-1})P(S)}{P(L_{t-1})P(S) + (1 - P(L_{t-1}))(1 - P(G))}$$

#### 3. Latent Transition Update
$$P(L_t) = P(L_{t-1} \mid Obs_t) + \left(1 - P(L_{t-1} \mid Obs_t)\right) P(T)$$
Clamped to $[0.01, 0.99]$.

#### 4. Uncertainty Modeling
$$\sigma^2_t = P(L_t)(1 - P(L_t))$$
$$\text{Standard Error: } \text{SE}(L_t) = \sqrt{\frac{\sigma^2_t}{\max(1, N_{\text{practice}})}}$$

#### 5. Sample Size Floor (Anti-Lucky-Guess Guard)
A skill is declared `MASTERED` if and only if:
$$P(L_t) \ge 0.85 \quad \text{AND} \quad N_{\text{practice}} \ge 3 \quad \text{AND} \quad \text{Streak} \ge 2$$
This prevents 2 lucky guesses from unlocking advanced topics prematurely.

#### 6. Prerequisite Cascading
A child skill in the DAG is unlocked if and only if:
$$\forall p \in \text{Prerequisites}_{\text{HARD}}(\text{skill}): \quad P(L_{\text{prereq}}) \ge \tau_p \quad \text{AND} \quad N_{\text{practice}}(p) \ge 1$$
Where $\tau_p$ is the minimum required mastery (default $0.70$).

---

## 3. SUPERMEMO SM-2+ SPACED REPETITION ENGINE

### 3.1 Purpose & User Benefit
Schedules flashcards and remediation reviews based on retrieval strength, minimizing forgetting while capping daily cognitive workload.

### 3.2 Mathematical Formulation & Invariants

#### 1. Recall Quality Rating ($q \in [0, 5]$)
- $q = 5$: Perfect recall, zero hesitation.
- $q = 4$: Correct response after brief hesitation.
- $q = 3$: Correct response with serious difficulty.
- $q = 2$: Incorrect response; correct answer seemed easy to recall upon viewing.
- $q = 1$: Incorrect response; familiar with the concept.
- $q = 0$: Complete blackout.

#### 2. Ease Factor ($\text{EF}$) Update
$$\text{EF}' = \max\left(1.3, \, \text{EF} + \left(0.1 - (5 - q)(0.08 + (5 - q) \cdot 0.02)\right)\right)$$

#### 3. Interval Progression ($I$, in days)
$$I_n = \begin{cases} 
1 & \text{if } q \ge 3 \text{ and } n = 0 \\
6 & \text{if } q \ge 3 \text{ and } n = 1 \\
\text{round}(I_{n-1} \cdot \text{EF}') & \text{if } q \ge 3 \text{ and } n \ge 2 \\
1 & \text{if } q < 3 \quad (\text{lapse: } n \gets 0, \, \text{lapses} \gets \text{lapses} + 1)
\end{cases}$$

#### 4. Memory Stability & Retention Probability
$$S' = \max\left(0.5, \, I \cdot \left(0.8 + 0.2 \frac{q}{5}\right)\right)$$
$$R(t) = \exp\left(-\frac{t}{\max(S, 0.5)}\right)$$

#### 5. Review Idempotency & Cooldown Guard
If a card was reviewed within the last 5 minutes ($\Delta t < 300\text{s}$), subsequent review submissions return the existing schedule without incrementing repetitions, preventing accidental double-tap interval distortion.

---

## 4. DSA NEXT-BEST-ACTION RECOMMENDATION ENGINE

### 4.1 Purpose & User Benefit
Generates transparent, personalized DSA problem recommendations that guide students to solve weak concepts, respect prerequisites, maintain topic diversity, and progress smoothly.

### 4.2 Candidate Generation & Ranking Formula

#### 1. Candidate Filtering
- Exclude all problems already solved by the user (`status == 'Accepted'`).
- Filter candidates where prerequisite concepts are unlocked in the BKT skill DAG.

#### 2. Multi-Factor Priority Score
For candidate problem $p$ in category $c$:
$$\text{Priority}(p) = W_{\text{weak}} \cdot S_{\text{weak}}(c) + W_{\text{diff}} \cdot S_{\text{diff}}(p) + W_{\text{recency}} \cdot S_{\text{recency}}(p) + W_{\text{novelty}} \cdot S_{\text{novelty}}(p)$$

Where:
- $S_{\text{weak}}(c) = 1.0 - (\text{Accuracy}(c) / 100.0)$ (range $0.0$ to $1.0$; $1.0$ for lowest accuracy).
- $S_{\text{diff}}(p)$: Distance penalty between problem difficulty and student latent ability $\theta$:
  $$S_{\text{diff}}(p) = \exp\left(-\frac{(\text{DifficultyScore}(p) - \theta)^2}{2}\right)$$
- $S_{\text{recency}}(p)$: Urgency bonus for attempted-but-unsolved problems (spaced practice).
- $S_{\text{novelty}}(p)$: Bonus for unattempted problems in fresh topics.
- Weights: $W_{\text{weak}} = 0.40$, $W_{\text{diff}} = 0.30$, $W_{\text{recency}} = 0.15$, $W_{\text{novelty}} = 0.15$.

#### 3. Category Diversity Guard
Recommendations contain at most 2 problems per category in a 6-problem recommended set.

#### 4. Explainable Rationale
Every recommendation includes a human-readable justification:
- *"Recommended to strengthen Binary Search where your accuracy is 42%."*
- *"Recommended because it builds on Arrays & Dynamic Sizing which you mastered."*
- *"Recommended practice to prepare for Medium-level Tree Traversals."*

#### 5. Cold-Start Fallback
If the user has zero submission history:
- Recommend foundational Level 0 DSA problems (`Easy` Arrays, Strings, Two Pointers).
- Explainable reason: *"Foundational core problem to benchmark your problem-solving profile."*

---

## 5. TOKENIZED MULTI-WORD SEARCH & RELEVANCE ENGINE

### 5.1 Purpose & User Benefit
Allows natural, typo-resilient, multi-word search across courses and problems (e.g. "python data structures" matches "Data Structures and Algorithms in Python").

### 5.2 Deterministic Ranking Algorithm

#### 1. Query Normalization & Tokenization
- Convert query to lowercase, strip punctuation, remove stop words (`a`, `an`, `the`, `in`, `on`, `for`, `and`, `to`, `of`).
- Extract tokens: $T = \{t_1, t_2, \dots, t_m\}$.

#### 2. Weighted Multi-Field Match Scoring
For item $d$ with title, tags, and description:
$$\text{Score}(d, T) = \sum_{t \in T} \left( 10.0 \cdot \mathbb{I}(t \in \text{Title}) + 5.0 \cdot \mathbb{I}(t \in \text{Tags}) + 1.0 \cdot \mathbb{I}(t \in \text{Description}) \right)$$
$$\text{Exact Phrase Bonus: } + 25.0 \cdot \mathbb{I}(Q \in \text{Title})$$
$$\text{Full Token Coverage Bonus: } + 15.0 \cdot \mathbb{I}(\forall t \in T: t \in d)$$

#### 3. Query Execution Budget
Single bounded database query using `Q` filter combinations across tokens, followed by Python in-memory score ranking and pagination.
