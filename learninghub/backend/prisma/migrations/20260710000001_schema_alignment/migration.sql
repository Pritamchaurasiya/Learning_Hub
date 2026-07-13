-- LearningHub Critical Schema Fixes - Part 2
-- This migration fixes:
-- 1. Renames mismatched tables to match schema.prisma @@map directives
-- 2. Adds missing tables required by current schema.prisma
-- 3. Fixes legacy column issues

-- ============================================================
-- FIX 1: Rename tables to match schema.prisma @@map directives
-- ============================================================

-- These tables were created with model names instead of mapped names
-- Renaming them preserves data and foreign keys

DO $$
BEGIN
    -- Rename UserAchievement → user_achievements
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'UserAchievement') THEN
        ALTER TABLE "UserAchievement" RENAME TO "user_achievements";
    END IF;

    -- Rename Note → notes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Note') THEN
        ALTER TABLE "Note" RENAME TO "notes";
    END IF;

    -- Rename Problem → problems
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Problem') THEN
        ALTER TABLE "Problem" RENAME TO "problems";
    END IF;

    -- Rename LiveSession → live_sessions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'LiveSession') THEN
        ALTER TABLE "LiveSession" RENAME TO "live_sessions";
    END IF;

    -- Rename Mentor → mentors
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Mentor') THEN
        ALTER TABLE "Mentor" RENAME TO "mentors";
    END IF;

    -- Rename MentorshipSession → mentorship_sessions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'MentorshipSession') THEN
        ALTER TABLE "MentorshipSession" RENAME TO "mentorship_sessions";
    END IF;

    -- Rename Notification → notifications
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Notification') THEN
        ALTER TABLE "Notification" RENAME TO "notifications";
    END IF;

    -- Rename Module → modules
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Module') THEN
        ALTER TABLE "Module" RENAME TO "modules";
    END IF;

    -- Rename DailyGoal → daily_goals
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'DailyGoal') THEN
        ALTER TABLE "DailyGoal" RENAME TO "daily_goals";
    END IF;
END $$;

-- ============================================================
-- FIX 2: Create missing tables required by current schema.prisma
-- ============================================================

-- test_attempt_answers
CREATE TABLE IF NOT EXISTS "test_attempt_answers" (
    "id" TEXT NOT NULL,
    "testResultId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOptions" TEXT[],
    "textAnswer" TEXT,
    "confidence" TEXT,
    "timeSpent" INTEGER NOT NULL DEFAULT 0,
    "isCorrect" BOOLEAN,
    "marksObtained" INTEGER,
    "aiFeedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_attempt_answers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_attempt_answer_result" ON "test_attempt_answers"("testResultId");
CREATE INDEX IF NOT EXISTS "idx_attempt_answer_question" ON "test_attempt_answers"("questionId");
CREATE INDEX IF NOT EXISTS "idx_attempt_answer_result_question" ON "test_attempt_answers"("testResultId", "questionId");
CREATE INDEX IF NOT EXISTS "idx_attempt_answer_result_correct" ON "test_attempt_answers"("testResultId", "isCorrect");

ALTER TABLE "test_attempt_answers" ADD CONSTRAINT "test_attempt_answers_testResultId_fkey" FOREIGN KEY ("testResultId") REFERENCES "test_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "test_attempt_answers" ADD CONSTRAINT "test_attempt_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "test_attempt_answers_testResultId_questionId_key" ON "test_attempt_answers"("testResultId", "questionId");

-- question_responses
CREATE TABLE IF NOT EXISTS "question_responses" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "examId" TEXT,
    "subjectId" TEXT,
    "topicId" TEXT,
    "selectedOptionId" TEXT,
    "selectedOptions" TEXT[],
    "isCorrect" BOOLEAN NOT NULL,
    "marksObtained" DOUBLE PRECISION NOT NULL,
    "rawAnswer" TEXT,
    "timeSpentSeconds" INTEGER NOT NULL,
    "confidence" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_responses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_question_response_attempt" ON "question_responses"("attemptId");
CREATE INDEX IF NOT EXISTS "idx_question_response_user" ON "question_responses"("userId");
CREATE INDEX IF NOT EXISTS "idx_question_response_question" ON "question_responses"("questionId");
CREATE INDEX IF NOT EXISTS "idx_question_response_test" ON "question_responses"("testId");
CREATE INDEX IF NOT EXISTS "idx_question_response_user_completed" ON "question_responses"("userId", "completedAt");
CREATE INDEX IF NOT EXISTS "idx_question_response_user_test" ON "question_responses"("userId", "testId");
CREATE INDEX IF NOT EXISTS "idx_question_response_attempt_completed" ON "question_responses"("attemptId", "completedAt");

ALTER TABLE "question_responses" ADD CONSTRAINT "question_responses_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "test_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "question_responses" ADD CONSTRAINT "question_responses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "question_responses" ADD CONSTRAINT "question_responses_testId_fkey" FOREIGN KEY ("testId") REFERENCES "tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "question_responses" ADD CONSTRAINT "question_responses_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- test_sessions
CREATE TABLE IF NOT EXISTS "test_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "testResultId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blueprintId" TEXT,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_test_session_user" ON "test_sessions"("userId");
CREATE INDEX IF NOT EXISTS "idx_test_session_test" ON "test_sessions"("testId");
CREATE INDEX IF NOT EXISTS "idx_test_session_result" ON "test_sessions"("testResultId");
CREATE INDEX IF NOT EXISTS "idx_test_session_user_expires" ON "test_sessions"("userId", "expiresAt", "status");

ALTER TABLE "test_sessions" ADD CONSTRAINT "test_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "test_sessions" ADD CONSTRAINT "test_sessions_testId_fkey" FOREIGN KEY ("testId") REFERENCES "tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "test_sessions" ADD CONSTRAINT "test_sessions_testResultId_fkey" FOREIGN KEY ("testResultId") REFERENCES "test_results"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ai_chat_sessions
CREATE TABLE IF NOT EXISTS "ai_chat_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_chat_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_ai_chat_session_user" ON "ai_chat_sessions"("userId");
CREATE INDEX IF NOT EXISTS "idx_ai_chat_session_user_updated" ON "ai_chat_sessions"("userId", "updatedAt");

ALTER TABLE "ai_chat_sessions" ADD CONSTRAINT "ai_chat_session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- user_daily_stats
CREATE TABLE IF NOT EXISTS "user_daily_stats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "testsCompleted" INTEGER NOT NULL DEFAULT 0,
    "problemsSolved" INTEGER NOT NULL DEFAULT 0,
    "studyMinutes" INTEGER NOT NULL DEFAULT 0,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "questionsAnswered" INTEGER NOT NULL DEFAULT 0,
    "accuracy" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_daily_stats_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_user_daily_stats_user_date" ON "user_daily_stats"("userId", "date");
CREATE UNIQUE INDEX IF NOT EXISTS "user_daily_stats_userId_date_key" ON "user_daily_stats"("userId", "date");

ALTER TABLE "user_daily_stats" ADD CONSTRAINT "user_daily_stats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
