# Test Engine Core (`conductor/apps/test_engine`)

## Overview
Core assessment engine for LearningHub. Provides multi-mode test administration (Practice, Mock Exam, Timed Challenge, CAT Adaptive, Review, and Offline), Item Response Theory (3PL IRT) parameter estimation, server-authoritative timer enforcement, atomic autosave persistence, automated and subjective AI grading, real-time WebSocket telemetry with live proctoring, and cryptographic scorecard verification.

## Interface
- **Models** ([models.py](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/test_engine/models.py)):
  - [`Question`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/test_engine/models.py#L12-L132): Master question bank model supporting `mcq`, `multiple_select`, `true_false`, `numerical`, `fill_blank`, `subjective`, and `coding` question types. Holds IRT parameters (`difficulty`, `discrimination`, `guess_factor`) and Bloom's taxonomy levels.
  - [`Option`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/test_engine/models.py#L133-L152): Answer choices for MCQ/MSQ questions with `is_correct` indicator.
  - [`Test`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/test_engine/models.py#L153-L263): Exam paper container linked to `apps.exams.Exam`, defining time limits, passing scores, total marks, and negative marking rates.
  - [`TestQuestion`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/test_engine/models.py#L264-L283): Ordered join table mapping questions to tests with marks overriding.
  - [`TestAttempt`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/test_engine/models.py#L284-L386): User exam session tracking status (`not_started`, `in_progress`, `submitted`, `expired`, `abandoned`), score, percentage, device info, and incremental autosave versions.
  - [`AttemptAnswer`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/test_engine/models.py#L387-L431): Candidate's response per question recording selected options, text answers, marks obtained, and review flags.
- **API ViewSets & Actions** ([views.py](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/test_engine/views.py)):
  - [`TestViewSet`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/test_engine/views.py#L36-L633): Read-only viewset with actions: `generate`, `start_attempt` (`POST /api/v1/tests/{id}/start`), `autosave` (`POST /api/v1/tests/{id}/autosave`), `submit_attempt` (`POST /api/v1/tests/{id}/submit`), `get_result` (`GET /api/v1/tests/{id}/result`), `offline_bundle` (`GET /api/v1/tests/{id}/offline-bundle`), `offline_sync` (`POST /api/v1/tests/{id}/offline-sync`), `adaptive_step` (`POST /api/v1/tests/{id}/adaptive/step`), `grade_subjective` (`POST /api/v1/tests/{id}/grade-subjective`), and `verify_scorecard` (`GET/POST /api/v1/tests/verify-scorecard`).
  - [`TestAttemptViewSet`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/test_engine/views.py#L634-L894): Read-only viewset for student attempt history and results list.
  - [`QuestionViewSet`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/test_engine/views.py#L896-L979): Read-only question bank inspection viewset.
  - [`bookmark_question`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/test_engine/views.py#L981-L1006): Question bookmarking toggle endpoint.
  - [`diagnose_misconception`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/test_engine/views.py#L1008-L1032): Conceptual remediation diagnosis endpoint.
- **Services** ([services.py](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/test_engine/services.py)):
  - [`TestSessionManager`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/test_engine/services.py#L24-L982): Session lifecycle orchestrator handling start attempt, autosave validation, submission grading, offline sync reconciliation, and 128-bit scorecard digest verification.
  - [`AdaptiveAssessmentEngine`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/test_engine/services.py#L1151-L1501): 3PL IRT engine calculating Fisher Information and Bayesian Expected A Posteriori (EAP) latent ability $\theta$.
- **Consumers & WebSockets** ([consumers.py](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/test_engine/consumers.py)):
  - [`ExamStationConsumer`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/test_engine/consumers.py#L23-L295): Candidate real-time channel handling heartbeats, live answer streaming, and proctoring telemetry.
  - [`ExamProctorConsumer`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/test_engine/consumers.py#L297-L446): Staff proctor channel receiving incident alerts and dispatching warnings or force-submit commands.
- **Asynchronous Tasks** ([tasks.py](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/test_engine/tasks.py)):
  - [`check_expired_attempts`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/test_engine/tasks.py#L15-L68): Celery Beat worker auto-submitting timed out attempts.
  - [`update_analytics_after_attempt`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/test_engine/tasks.py#L70-L131): Aggregates user topic mastery.
  - [`calibrate_question_bank_irt_parameters`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/test_engine/tasks.py#L190-L257): Recalibrates empirical difficulty and point-biserial discrimination.

## Invariants
- `TestAttempt` uniqueness is strictly enforced per candidate: `unique_together = ['user', 'test', 'attempt_number']`.
- Post-deadline answer mutations are rejected: `autosave_answer` and `submit_attempt` raise errors if server elapsed time exceeds configured test duration plus grace period.
- An attempt in terminal state (`submitted`, `expired`, `abandoned`) cannot be reverted or modified.
- `selected_options` passed to an answer must reference options belonging to the targeted question; foreign option IDs are rejected.
- Correct answer keys and explanations are omitted from test session retrieval and only exposed post-submission via `/result`.

## Side Effects
- Mutates database tables: `tests`, `question_bank`, `question_options`, `test_questions`, `test_attempts`, `attempt_answers`.
- Emits real-time messages to Redis Channels groups: `test_attempt_{attempt_id}` and `test_proctor_{test_id}`.
- Enqueues background analytics and IRT calibration jobs in Celery worker queues (`celery`, `ai_queue`).

## Verification
- Run: `pytest conductor/tests/test_test_engine.py conductor/apps/test_engine/`
