# EGM Codebase Drift Report — 2026-11-02

## `conductor/apps/test_engine/README.md`
- **Missing `TestSection` Model**: The design specification requires section-level timing, cutoffs, and locked navigation gates, but `conductor/apps/test_engine/models.py` lacks a `TestSection` model and `TestQuestion` lacks a foreign key to section entities.
- **Missing Dedicated `QuestionBookmark` Model**: `bookmark_question` in `views.py` attempts `AttemptAnswer.objects.filter(...).update(is_bookmarked=True)`, failing silently if the student hasn't answered the question or bookmarks from the catalog.
- **Proctor Time Extension Disconnect**: `ExamProctorConsumer.handle_time_extension` writes `metadata['time_extension_seconds']`, but `TestAttempt.time_remaining_seconds`, `TestSessionManager.autosave_answer`, and `check_expired_attempts` ignore this field, causing premature candidate ejection.
- **Test Case Security Leakage**: `TestDetailSerializer.get_questions` exposes hidden `test_cases` (input, expected output, assertions) in plaintext over `AllowAny` endpoints during active mock sessions.
- **Negative Marking Floor Clamping**: `TestSessionManager.submit_attempt` clamps total score via `max(0, ...)` irrespective of exam configuration, preventing negative scores required for competitive exams (JEE/GATE).

## `conductor/apps/exams/README.md`
- **Missing PYQ API Routes**: While `PYQ` is defined in `conductor/apps/exams/models.py`, it is not registered in `conductor/apps/exams/urls.py` or exposed via a DRF ViewSet.
- **Incomplete PYQ Schema**: The Django `PYQ` model lacks `shift`, `exam_date`, `paper_code`, and verified source metadata fields that are actively used by the frontend and Express backend.

## `conductor/apps/README.md`
- No drift detected.

## `conductor/README.md`
- **Runtime Serving Truth**: While `conductor` is the canonical production architecture with Daphne/Channels and Django 5, user-facing `/api/v1/tests/` endpoints in the current development and Docker environment are routed to `learninghub/backend` (Express/Prisma on port 5000), while Django handles `/ws/` WebSockets and server-to-server ML evaluation.

## `learninghub/src/components/test/README.md`
- **Palette Active State Visual Masking**: In `learninghub/src/components/test/TestQuestionPalette.tsx`, the `isCurrent` condition unconditionally applies `bg-blue-600 text-white`, which masks the underlying candidate state (Answered, Marked for Review, Answered & Marked for Review) when that question is currently active.

## `learninghub/src/README.md`
- No drift detected.

## `learninghub/README.md`
- No drift detected.

## `README.md`
- No drift detected.
