-- LearningHub Data Integrity Fixes
-- This migration adds CHECK constraints and missing indexes

-- ============================================================
-- FIX 1: Add CHECK constraints for data integrity
-- ============================================================

-- TestResult bounds
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_score_check" CHECK ("score" >= 0);
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_totalPoints_check" CHECK ("totalPoints" >= 0);
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_percentage_check" CHECK ("percentage" >= 0 AND "percentage" <= 100);
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_timeTaken_check" CHECK ("timeTaken" >= 0);
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_attemptNumber_check" CHECK ("attemptNumber" >= 1);
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_cbmScore_check" CHECK ("cbmScore" >= 0);

-- User bounds
ALTER TABLE "users" ADD CONSTRAINT "users_xp_check" CHECK ("xp" >= 0);
ALTER TABLE "users" ADD CONSTRAINT "users_level_check" CHECK ("level" >= 1);
ALTER TABLE "users" ADD CONSTRAINT "users_streak_check" CHECK ("streak" >= 0);
ALTER TABLE "users" ADD CONSTRAINT "users_longestStreak_check" CHECK ("longestStreak" >= 0);
ALTER TABLE "users" ADD CONSTRAINT "users_loginCount_check" CHECK ("loginCount" >= 0);
ALTER TABLE "users" ADD CONSTRAINT "users_failedLogins_check" CHECK ("failedLogins" >= 0);

-- TestAttemptAnswer bounds
ALTER TABLE "test_attempt_answers" ADD CONSTRAINT "test_attempt_answers_timeSpent_check" CHECK ("timeSpent" >= 0);
ALTER TABLE "test_attempt_answers" ADD CONSTRAINT "test_attempt_answers_marksObtained_check" CHECK ("marksObtained" >= 0);

-- QuestionResponse bounds
ALTER TABLE "question_responses" ADD CONSTRAINT "question_responses_marksObtained_check" CHECK ("marksObtained" >= 0);
ALTER TABLE "question_responses" ADD CONSTRAINT "question_responses_timeSpentSeconds_check" CHECK ("timeSpentSeconds" >= 0);

-- Problem bounds
ALTER TABLE "problems" ADD CONSTRAINT "problems_points_check" CHECK ("points" >= 0);

-- Question bounds
ALTER TABLE "questions" ADD CONSTRAINT "questions_points_check" CHECK ("points" >= 0);
ALTER TABLE "questions" ADD CONSTRAINT "questions_order_check" CHECK ("order" >= 0);

-- Option bounds
ALTER TABLE "options" ADD CONSTRAINT "options_order_check" CHECK ("order" >= 0);

-- UserDailyStats bounds
ALTER TABLE "user_daily_stats" ADD CONSTRAINT "user_daily_stats_testsCompleted_check" CHECK ("testsCompleted" >= 0);
ALTER TABLE "user_daily_stats" ADD CONSTRAINT "user_daily_stats_problemsSolved_check" CHECK ("problemsSolved" >= 0);
ALTER TABLE "user_daily_stats" ADD CONSTRAINT "user_daily_stats_studyMinutes_check" CHECK ("studyMinutes" >= 0);
ALTER TABLE "user_daily_stats" ADD CONSTRAINT "user_daily_stats_xpEarned_check" CHECK ("xpEarned" >= 0);
ALTER TABLE "user_daily_stats" ADD CONSTRAINT "user_daily_stats_questionsAnswered_check" CHECK ("questionsAnswered" >= 0);
ALTER TABLE "user_daily_stats" ADD CONSTRAINT "user_daily_stats_accuracy_check" CHECK ("accuracy" >= 0 AND "accuracy" <= 100);

-- ============================================================
-- FIX 2: Add missing composite indexes for soft-delete queries
-- ============================================================

-- Exam: deletedAt + isActive (for list queries)
CREATE INDEX IF NOT EXISTS "idx_exam_deleted_active" ON "exams"("deletedAt", "isActive");

-- Subject: deletedAt + isActive
CREATE INDEX IF NOT EXISTS "idx_subject_deleted_active" ON "subjects"("deletedAt", "isActive");

-- Topic: deletedAt + isActive
CREATE INDEX IF NOT EXISTS "idx_topic_deleted_active" ON "topics"("deletedAt", "isActive");

-- TestResult: userId + status + startedAt (for active attempt lookup)
CREATE INDEX IF NOT EXISTS "idx_result_user_status_started" ON "test_results"("userId", "status", "startedAt");

-- TestResult: userId + testId + status + startedAt (for resume)
CREATE INDEX IF NOT EXISTS "idx_result_user_test_status_started" ON "test_results"("userId", "testId", "status", "startedAt");
