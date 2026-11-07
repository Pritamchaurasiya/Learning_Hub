# Test & Assessment UI Components (`learninghub/src/components/test`)

## Overview
Comprehensive assessment user interface component suite supporting Computer-Based Testing (CBT), active practice modes, psychometric analytics, and the Unified PYQ Vault. Designed for high responsiveness, full accessibility (a11y), and zero visual latency during high-stakes exams.

## Interface & Key Components

### Exam Station & Navigation
- [`TestActiveExamStation`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/test/TestActiveExamStation.tsx): Fullscreen CBT assessment station hosting the question pane, palette, section tab bar, server-synchronized countdown timer, and automated submit modal.
- [`TestQuestionPalette`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/test/TestQuestionPalette.tsx): Interactive question grid implementing the 5 standard NTA candidate states:
  1. *Not Visited* (Neutral / Slate)
  2. *Visited & Unanswered* (Amber / Red indicator)
  3. *Answered* (Emerald green)
  4. *Marked for Review* (Purple)
  5. *Answered & Marked for Review* (Purple with check/badge indicator)
- [`TestSectionTabBar`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/test/TestSectionTabBar.tsx): Section switcher supporting sectional timers and locked navigation gates.
- [`TestNavigationControls`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/test/TestNavigationControls.tsx): Action bar for "Save & Next", "Clear Response", "Mark for Review", and "Submit Exam".

### Question Rendering & Practice Tools
- [`QuestionCard`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/test/QuestionCard.tsx): Multi-format question renderer supporting single-choice (MCQ), multiple-choice (MSQ), numerical entry, and code runner questions. Features progressive hint disclosure, concept clues, confidence ratings, and question bookmarking.
- [`ExamScratchpadModal`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/test/ExamScratchpadModal.tsx): Digital drawing canvas and text scratchpad with persistent drawing history.
- [`ExamScientificCalculatorModal`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/test/ExamScientificCalculatorModal.tsx): Standardized virtual scientific calculator for engineering and physics exams.

### PYQ Vault & Catalog
- [`TargetExamPyqHub`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/test/TargetExamPyqHub.tsx): Unified discovery hub for previous year questions filtered by year, exam type, subject, topic, and paper shift.
- [`TestCatalogCardGrid`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/test/TestCatalogCardGrid.tsx): Filterable grid displaying available mock exams, sectional tests, and practice papers.
- [`TestFilterBar`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/test/TestFilterBar.tsx): Multi-select filters for exam taxonomy, difficulty, duration, and test status.

### Results & Psychometric Analytics
- [`ResultsView`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/test/ResultsView.tsx): Post-submission score evaluation view featuring accuracy percentages, speed analysis, and step-by-step explanations.
- [`TestPerformanceSection`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/test/TestPerformanceSection.tsx): Student performance breakdown incorporating IRT latent ability $\theta$, pacing radar charts, and comparative shift benchmarks.
- [`PacingEfficiencyCard`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/test/PacingEfficiencyCard.tsx) & [`QuestionPaceRadar`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/test/QuestionPaceRadar.tsx): Time-spent analysis vs cohort averages.
- [`IRTThetaGauge`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/test/IRTThetaGauge.tsx): Visual psychometric proficiency dial mapping candidate ability $\theta \in [-3.0, +3.0]$.

### Offline & Resilience
- [`OfflineStationBanner`](file:///C:/Users/shiva/Desktop/windows_app/learninghub/src/components/test/OfflineStationBanner.tsx): Network status notification notifying candidates of offline caching and queued synchronization events.

## Invariants
- Palette status for the currently selected question retains its underlying completion state (answered, marked for review) using a high-contrast focus ring instead of flattening the badge color.
- In active exam mode, answer keys and explanations are never rendered or fetched from the server.
- Autosave triggers synchronously on answer mutation and debounces to background storage every 5 seconds.

## Side Effects
- Emits answers to `testsASlice.ts` and syncs with `testsAService.ts`.
- Writes attempt backups to IndexedDB via `OfflineAssessmentManager.ts`.
- Manages browser fullscreen kiosk state via the Fullscreen API.

## Verification
- Run component tests: `npm test learninghub/src/components/test/`
