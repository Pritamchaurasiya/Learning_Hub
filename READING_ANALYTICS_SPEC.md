# READING & ASSESSMENT ANALYTICS ENGINE SPECIFICATION

> **System Component:** `apps.ebooks.analytics` & `AnalyticsPage`  
> **Status:** CANONICAL PRODUCTION SPECIFICATION  
> **Engineering Level:** Staff Data Scientist & Learning Analytics Architect  
> **Target Release:** LearningHub V8.0 (September 2026)  
> **Metrics Suite:** Velocity Telemetry, Density Heatmaps, Retention Index, Fatigue Heuristics  

---

## 1. OBJECTIVE: MEASURING DEEP READING & COMPREHENSION

Traditional reading apps only track page turns. The LearningHub Reading Analytics Engine measures **cognitive engagement, reading velocity, comprehension retention, and fatigue dynamics**.

---

## 2. READING VELOCITY & DWELL TIME TELEMETRY

### 2.1 Viewport Block Tracking
Chapters are partitioned into content blocks of approximately 100 words. The browser client mounts an `IntersectionObserver` to track when blocks enter and exit the active reading viewport:

```typescript
// Telemetry Block Definition
interface ReadingBlockTelemetry {
  blockId: string;
  wordCount: number;
  entryTimestamp: number;
  exitTimestamp: number;
  activeDwellSeconds: number;
  scrollInteractions: number;
  isReread: boolean;
}
```

### 2.2 Active Dwell vs Idle Filtering
To avoid skewing metrics when a user leaves their tab open:
- If no user input (pointer move, scroll, touch, keypress) is detected for **45 seconds**, the session timer pauses.
- When input resumes, a 45-second debounce window reconciles the true reading duration.

### 2.3 Empirical Velocity Calculation
$$\text{WPM} = \frac{\sum_{i=1}^B \text{word\_count}_i}{\sum_{i=1}^B \text{active\_dwell\_seconds}_i / 60}$$
- **Skimming Speed:** $> 450\text{ WPM}$
- **Deep Technical Reading:** $150 - 280\text{ WPM}$
- **Struggle / High Friction:** $< 100\text{ WPM}$ (frequent pauses or reread loops)

---

## 3. SECTIONAL READING DENSITY & HEATMAPS

The system builds a normalized reading density profile per chapter:

```
[Chapter Section]       [Density Score]     [Visual Diagnostic]
───────────────────────────────────────────────────────────────────
Section 1.1 Intro       █░░░░░░░░░ (12%)     High skip rate (92% skimmed)
Section 1.2 Derivation  █████████░ (91%)     Heavy dwell, 3.4x rereads
Section 1.3 Example 1   ██████░░░░ (62%)     Balanced reading velocity
Section 1.4 Complex Proof ██████████ (98%)   High struggle index
```

### 3.1 Heatmap Scoring Metrics
- **Dwell Ratio ($R_d$):**
  $$R_d = \frac{\text{Actual Dwell Time on Section}}{\text{Expected Dwell Time (Word Count / 220 WPM)}}$$
- **Reread Multiplier ($M_r$):** Number of times a section transitions from out-of-viewport back into the viewport within the same reading session.
- **Skip Rate ($S_r$):** Percentage of students who scroll past the section in $< 2$ seconds.

---

## 4. COMPREHENSION & RETENTION INDEX ($0 - 100\%$)

The system computes an objective **Retention Index ($RI$)** combining reading engagement with empirical post-reading assessment performance:

$$RI = w_1 \cdot E_{\text{reading}} + w_2 \cdot A_{\text{quiz}} + w_3 \cdot S_{\text{recall}}$$
where:
- $E_{\text{reading}} \in [0, 1]$: Reading engagement score based on dwell ratio and completion percentage.
- $A_{\text{quiz}} \in [0, 1]$: Immediate post-chapter 3-question diagnostic quiz accuracy.
- $S_{\text{recall}} \in [0, 1]$: 48-hour SuperMemo-2 flashcard recall rate on chapter concepts.
- Weights: $w_1 = 0.25$, $w_2 = 0.45$, $w_3 = 0.30$.

---

## 5. FATIGUE & BURNOUT DETECTION HEURISTICS

Long reading or test sessions induce cognitive fatigue, leading to careless errors. The system computes a continuous **Fatigue Risk Score ($F \in [0, 1]$)**:

### 5.1 Real-Time Risk Factors
1. **Velocity Degradation:** Reading speed drops $> 35\%$ below the user's personal baseline over a 45-minute window.
2. **Erratic Scrolling:** High-frequency back-and-forth micro-scrolling indicating difficulty sustaining focus.
3. **Consecutive Session Length:** Active reading uninterrupted for $> 90$ minutes.

### 5.2 Proactive Wellness Intervention
When $F \ge 0.75$:
- The reader unobtrusively suggests a **5-minute Pomodoro Eye-Rest break**.
- If in a practice test, the interface offers to save the session state to resume later.
