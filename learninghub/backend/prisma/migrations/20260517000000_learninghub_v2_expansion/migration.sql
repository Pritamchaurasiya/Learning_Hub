-- LearningHub v2 Expansion Migration
-- Adds: Country, Exam, Subject, Topic, TestTemplate, UserExamPreference,
--        SubscriptionTier, Subscription, UsageLimit, Coupon, QuestionBookmark,
--        TopicPerformance models
-- Converts: Test.mode/difficulty from String to Enums
-- Adds: examId to Test, topicId to Question, countryId to User
-- Converts: TestResult.answers from String to Json

-- ─── New Enums ───────────────────────────────────────────────────────────────

CREATE TYPE "TestMode" AS ENUM ('PRACTICE', 'MOCK', 'TIMED_CHALLENGE', 'ADAPTIVE', 'FLASHCARD');
CREATE TYPE "TestDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD', 'MIXED', 'ADAPTIVE');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'TRIAL', 'PAST_DUE');
CREATE TYPE "SubscriptionInterval" AS ENUM ('MONTHLY', 'YEARLY', 'LIFETIME');

-- ─── New Tables ──────────────────────────────────────────────────────────────

CREATE TABLE "countries" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "flagEmoji" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "exams" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "pattern" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "topics" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "test_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "examId" TEXT,
    "subjectId" TEXT,
    "topicIds" TEXT[],
    "difficulty" "TestDifficulty" NOT NULL DEFAULT 'MIXED',
    "mode" "TestMode" NOT NULL DEFAULT 'PRACTICE',
    "questionCount" INTEGER NOT NULL DEFAULT 10,
    "timeLimit" INTEGER NOT NULL DEFAULT 15,
    "promptTemplate" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_exam_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "countryId" TEXT,
    "examId" TEXT,
    "subjectIds" TEXT[],
    "difficulty" "TestDifficulty" NOT NULL DEFAULT 'MEDIUM',
    "dailyGoal" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_exam_preferences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subscription_tiers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "interval" "SubscriptionInterval" NOT NULL DEFAULT 'MONTHLY',
    "trialDays" INTEGER NOT NULL DEFAULT 0,
    "features" JSONB NOT NULL,
    "limits" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "stripePriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_tiers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "stripeSubscriptionId" TEXT,
    "stripeCustomerId" TEXT,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "usage_limits" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "period" TIMESTAMP(3) NOT NULL,
    "testsTaken" INTEGER NOT NULL DEFAULT 0,
    "aiGenerations" INTEGER NOT NULL DEFAULT 0,
    "questionsAnswered" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_limits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" TEXT NOT NULL,
    "discountValue" DECIMAL(10,2) NOT NULL,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "applicableTierIds" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "question_bookmarks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_bookmarks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "topic_performances" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topicId" TEXT,
    "topicName" TEXT NOT NULL,
    "subjectName" TEXT,
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "accuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgTimeSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "strengthLevel" TEXT NOT NULL DEFAULT 'unknown',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topic_performances_pkey" PRIMARY KEY ("id")
);

-- ─── Alter Existing Tables ──────────────────────────────────────────────────

-- Add countryId to users
ALTER TABLE "users" ADD COLUMN "countryId" TEXT;

-- Add examId to tests, convert mode/difficulty to enums
ALTER TABLE "tests" ADD COLUMN "examId" TEXT;
ALTER TABLE "tests" ADD COLUMN "mode_enum" "TestMode" NOT NULL DEFAULT 'MOCK';
ALTER TABLE "tests" ADD COLUMN "difficulty_enum" "TestDifficulty" NOT NULL DEFAULT 'MIXED';

-- Migrate string values to enums
UPDATE "tests" SET "mode_enum" = CASE
    WHEN "mode" = 'practice' THEN 'PRACTICE'
    WHEN "mode" = 'mock' THEN 'MOCK'
    WHEN "mode" = 'timed_challenge' THEN 'TIMED_CHALLENGE'
    WHEN "mode" = 'adaptive' THEN 'ADAPTIVE'
    ELSE 'MOCK'
END;

UPDATE "tests" SET "difficulty_enum" = CASE
    WHEN "mode" = 'easy' THEN 'EASY'
    WHEN "mode" = 'medium' THEN 'MEDIUM'
    WHEN "mode" = 'hard' THEN 'HARD'
    WHEN "mode" = 'mixed' THEN 'MIXED'
    WHEN "mode" = 'adaptive' THEN 'ADAPTIVE'
    ELSE 'MIXED'
END;

-- Drop old string columns and rename enums
ALTER TABLE "tests" DROP COLUMN "mode";
ALTER TABLE "tests" DROP COLUMN "difficulty";
ALTER TABLE "tests" RENAME COLUMN "mode_enum" TO "mode";
ALTER TABLE "tests" RENAME COLUMN "difficulty_enum" TO "difficulty";

-- Add topicId to questions
ALTER TABLE "questions" ADD COLUMN "topicId" TEXT;

-- Convert test_results.answers from String to Json
ALTER TABLE "test_results" ALTER COLUMN "answers" TYPE JSONB USING answers::jsonb;
ALTER TABLE "test_results" ALTER COLUMN "questionResults" TYPE JSONB USING "questionResults"::jsonb;

-- Add subjectName to PYQs for backward compatibility
ALTER TABLE "pyqs" ADD COLUMN "subjectName" TEXT;

-- ─── Unique Constraints ─────────────────────────────────────────────────────

CREATE UNIQUE INDEX "countries_code_key" ON "countries"("code");
CREATE UNIQUE INDEX "exams_slug_key" ON "exams"("slug");
CREATE UNIQUE INDEX "subjects_slug_key" ON "subjects"("slug");
CREATE UNIQUE INDEX "topics_slug_key" ON "topics"("slug");
CREATE UNIQUE INDEX "subscription_tiers_name_key" ON "subscription_tiers"("name");
CREATE UNIQUE INDEX "subscriptions_userId_key" ON "subscriptions"("userId");
CREATE UNIQUE INDEX "usage_limits_subscriptionId_period_key" ON "usage_limits"("subscriptionId", "period");
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");
CREATE UNIQUE INDEX "question_bookmarks_userId_questionId_key" ON "question_bookmarks"("userId", "questionId");
CREATE UNIQUE INDEX "topic_performances_userId_topicName_key" ON "topic_performances"("userId", "topicName");
CREATE UNIQUE INDEX "user_exam_preferences_userId_key" ON "user_exam_preferences"("userId");

-- ─── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX "countries_code_idx" ON "countries"("code");
CREATE INDEX "countries_isActive_idx" ON "countries"("isActive");
CREATE INDEX "exams_countryId_idx" ON "exams"("countryId");
CREATE INDEX "exams_slug_idx" ON "exams"("slug");
CREATE INDEX "exams_isActive_idx" ON "exams"("isActive");
CREATE INDEX "subjects_examId_idx" ON "subjects"("examId");
CREATE INDEX "subjects_slug_idx" ON "subjects"("slug");
CREATE INDEX "topics_subjectId_idx" ON "topics"("subjectId");
CREATE INDEX "topics_slug_idx" ON "topics"("slug");
CREATE INDEX "test_templates_examId_idx" ON "test_templates"("examId");
CREATE INDEX "test_templates_subjectId_idx" ON "test_templates"("subjectId");
CREATE INDEX "test_templates_difficulty_idx" ON "test_templates"("difficulty");
CREATE INDEX "test_templates_mode_idx" ON "test_templates"("mode");
CREATE INDEX "test_templates_isPublished_idx" ON "test_templates"("isPublished");
CREATE INDEX "user_exam_preferences_userId_idx" ON "user_exam_preferences"("userId");
CREATE INDEX "user_exam_preferences_examId_idx" ON "user_exam_preferences"("examId");
CREATE INDEX "subscription_tiers_isActive_idx" ON "subscription_tiers"("isActive");
CREATE INDEX "subscriptions_userId_idx" ON "subscriptions"("userId");
CREATE INDEX "subscriptions_tierId_idx" ON "subscriptions"("tierId");
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");
CREATE INDEX "usage_limits_subscriptionId_idx" ON "usage_limits"("subscriptionId");
CREATE INDEX "usage_limits_period_idx" ON "usage_limits"("period");
CREATE INDEX "coupons_code_idx" ON "coupons"("code");
CREATE INDEX "coupons_isActive_idx" ON "coupons"("isActive");
CREATE INDEX "coupons_validUntil_idx" ON "coupons"("validUntil");
CREATE INDEX "question_bookmarks_userId_idx" ON "question_bookmarks"("userId");
CREATE INDEX "question_bookmarks_questionId_idx" ON "question_bookmarks"("questionId");
CREATE INDEX "topic_performances_userId_idx" ON "topic_performances"("userId");
CREATE INDEX "topic_performances_accuracy_idx" ON "topic_performances"("accuracy");
CREATE INDEX "topic_performances_strengthLevel_idx" ON "topic_performances"("strengthLevel");
CREATE INDEX "tests_examId_idx" ON "tests"("examId");
CREATE INDEX "tests_difficulty_idx" ON "tests"("difficulty");
CREATE INDEX "tests_isAiGenerated_idx" ON "tests"("isAiGenerated");
CREATE INDEX "questions_topicId_idx" ON "questions"("topicId");
CREATE INDEX "questions_isAiGenerated_idx" ON "questions"("isAiGenerated");
CREATE INDEX "test_results_percentage_idx" ON "test_results"("percentage");
CREATE INDEX "test_results_passed_idx" ON "test_results"("passed");
CREATE INDEX "pyqs_examId_idx" ON "pyqs"("examId");
CREATE INDEX "pyqs_subjectId_idx" ON "pyqs"("subjectId");
CREATE INDEX "pyqs_subjectName_idx" ON "pyqs"("subjectName");
CREATE INDEX "formulas_subjectId_idx" ON "formulas"("subjectId");
CREATE INDEX "revision_notes_subjectId_idx" ON "revision_notes"("subjectId");

-- ─── Foreign Keys ───────────────────────────────────────────────────────────

ALTER TABLE "exams" ADD CONSTRAINT "exams_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "topics" ADD CONSTRAINT "topics_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "test_templates" ADD CONSTRAINT "test_templates_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "test_templates" ADD CONSTRAINT "test_templates_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_exam_preferences" ADD CONSTRAINT "user_exam_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_exam_preferences" ADD CONSTRAINT "user_exam_preferences_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_exam_preferences" ADD CONSTRAINT "user_exam_preferences_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "subscription_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "usage_limits" ADD CONSTRAINT "usage_limits_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "question_bookmarks" ADD CONSTRAINT "question_bookmarks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "question_bookmarks" ADD CONSTRAINT "question_bookmarks_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "topic_performances" ADD CONSTRAINT "topic_performances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tests" ADD CONSTRAINT "tests_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "questions" ADD CONSTRAINT "questions_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pyqs" ADD CONSTRAINT "pyqs_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pyqs" ADD CONSTRAINT "pyqs_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "formulas" ADD CONSTRAINT "formulas_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "revision_notes" ADD CONSTRAINT "revision_notes_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
