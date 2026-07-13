-- LearningHub Critical Schema Fixes
-- This migration fixes:
-- 1. Makes legacy test_results.answers and questionResults nullable
-- 2. Adds missing cbmScore column to test_results
-- 3. Creates missing tables required by current schema.prisma

-- ============================================================
-- FIX 1: Make legacy test_results columns nullable
-- ============================================================

ALTER TABLE "test_results" ALTER COLUMN "answers" DROP NOT NULL;
ALTER TABLE "test_results" ALTER COLUMN "questionResults" DROP NOT NULL;

-- Add cbmScore if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'test_results' AND column_name = 'cbmScore') THEN
        ALTER TABLE "test_results" ADD COLUMN "cbmScore" INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- ============================================================
-- FIX 2: Create missing test_attempt_answers table
-- ============================================================

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

-- Create indexes for test_attempt_answers
CREATE INDEX IF NOT EXISTS "idx_attempt_answer_result" ON "test_attempt_answers"("testResultId");
CREATE INDEX IF NOT EXISTS "idx_attempt_answer_question" ON "test_attempt_answers"("questionId");
CREATE INDEX IF NOT EXISTS "idx_attempt_answer_result_question" ON "test_attempt_answers"("testResultId", "questionId");
CREATE INDEX IF NOT EXISTS "idx_attempt_answer_result_correct" ON "test_attempt_answers"("testResultId", "isCorrect");

-- Add foreign keys
ALTER TABLE "test_attempt_answers" ADD CONSTRAINT "test_attempt_answers_testResultId_fkey" FOREIGN KEY ("testResultId") REFERENCES "test_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "test_attempt_answers" ADD CONSTRAINT "test_attempt_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "test_attempt_answers_testResultId_questionId_key" ON "test_attempt_answers"("testResultId", "questionId");

-- ============================================================
-- FIX 3: Create missing question_responses table
-- ============================================================

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

-- Create indexes for question_responses
CREATE INDEX IF NOT EXISTS "idx_question_response_attempt" ON "question_responses"("attemptId");
CREATE INDEX IF NOT EXISTS "idx_question_response_user" ON "question_responses"("userId");
CREATE INDEX IF NOT EXISTS "idx_question_response_question" ON "question_responses"("questionId");
CREATE INDEX IF NOT EXISTS "idx_question_response_test" ON "question_responses"("testId");
CREATE INDEX IF NOT EXISTS "idx_question_response_user_completed" ON "question_responses"("userId", "completedAt");
CREATE INDEX IF NOT EXISTS "idx_question_response_user_test" ON "question_responses"("userId", "testId");
CREATE INDEX IF NOT EXISTS "idx_question_response_attempt_completed" ON "question_responses"("attemptId", "completedAt");

-- Add foreign keys
ALTER TABLE "question_responses" ADD CONSTRAINT "question_responses_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "test_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "question_responses" ADD CONSTRAINT "question_responses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "question_responses" ADD CONSTRAINT "question_responses_testId_fkey" FOREIGN KEY ("testId") REFERENCES "tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "question_responses" ADD CONSTRAINT "question_responses_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- FIX 4: Create missing test_sessions table
-- ============================================================

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

-- Create indexes for test_sessions
CREATE INDEX IF NOT EXISTS "idx_test_session_user" ON "test_sessions"("userId");
CREATE INDEX IF NOT EXISTS "idx_test_session_test" ON "test_sessions"("testId");
CREATE INDEX IF NOT EXISTS "idx_test_session_result" ON "test_sessions"("testResultId");
CREATE INDEX IF NOT EXISTS "idx_test_session_user_expires" ON "test_sessions"("userId", "expiresAt", "status");

-- Add foreign keys
ALTER TABLE "test_sessions" ADD CONSTRAINT "test_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "test_sessions" ADD CONSTRAINT "test_sessions_testId_fkey" FOREIGN KEY ("testId") REFERENCES "tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "test_sessions" ADD CONSTRAINT "test_sessions_testResultId_fkey" FOREIGN KEY ("testResultId") REFERENCES "test_results"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- FIX 5: Create missing ai_chat_sessions table
-- ============================================================

CREATE TABLE IF NOT EXISTS "ai_chat_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_chat_sessions_pkey" PRIMARY KEY ("id")
);

-- Create indexes for ai_chat_sessions
CREATE INDEX IF NOT EXISTS "idx_ai_chat_session_user" ON "ai_chat_sessions"("userId");
CREATE INDEX IF NOT EXISTS "idx_ai_chat_session_user_updated" ON "ai_chat_sessions"("userId", "updatedAt");

-- Add foreign keys
ALTER TABLE "ai_chat_sessions" ADD CONSTRAINT "ai_chat_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- FIX 6: Create missing user_daily_stats table
-- ============================================================

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

-- Create indexes for user_daily_stats
CREATE INDEX IF NOT EXISTS "idx_user_daily_stats_user_date" ON "user_daily_stats"("userId", "date");
CREATE UNIQUE INDEX IF NOT EXISTS "user_daily_stats_userId_date_key" ON "user_daily_stats"("userId", "date");

-- Add foreign keys
ALTER TABLE "user_daily_stats" ADD CONSTRAINT "user_daily_stats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
