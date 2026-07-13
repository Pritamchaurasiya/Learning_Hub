-- Enable pg_trgm extension for efficient ILIKE and trigram-based full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- Course Search
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_course_title_trgm ON courses USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_course_description_trgm ON courses USING gin (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_course_short_description_trgm ON courses USING gin (short_description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_course_tags_gin ON courses USING gin (tags);

-- Full-text search tsvector column for courses
ALTER TABLE courses ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE INDEX IF NOT EXISTS idx_course_search_vector ON courses USING gin (search_vector);

CREATE OR REPLACE FUNCTION course_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.short_description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_course_search_vector ON courses;
CREATE TRIGGER trg_course_search_vector
  BEFORE INSERT OR UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION course_search_vector_update();

-- Backfill existing rows
UPDATE courses SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(short_description, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'C')
WHERE search_vector IS NULL;

-- ============================================================================
-- Problem Search
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_problem_title_trgm ON problems USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_problem_description_trgm ON problems USING gin (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_problem_tags_gin ON problems USING gin (tags);

-- ============================================================================
-- Question Search (Legacy)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_question_text_trgm ON questions USING gin (text gin_trgm_ops);

-- ============================================================================
-- Canonical Question Search (New)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_canonical_question_stem_trgm ON canonical_questions USING gin (stem gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_canonical_question_explanation_trgm ON canonical_questions USING gin (explanation gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_canonical_question_tags_gin ON canonical_questions USING gin (tags);

-- ============================================================================
-- Test Search
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_test_title_trgm ON tests USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_test_description_trgm ON tests USING gin (description gin_trgm_ops);

-- ============================================================================
-- Lesson Search
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_lesson_title_trgm ON lessons USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_lesson_description_trgm ON lessons USING gin (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_lesson_content_trgm ON lessons USING gin (content gin_trgm_ops);

-- ============================================================================
-- User Search
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_user_username_trgm ON users USING gin (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_user_email_trgm ON users USING gin (email gin_trgm_ops);

-- ============================================================================
-- Mentor Search
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_mentor_name_trgm ON mentors USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_mentor_bio_trgm ON mentors USING gin (bio gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_mentor_skills_trgm ON mentors USING gin (skills gin_trgm_ops);

-- ============================================================================
-- Note Search
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_note_content_trgm ON notes USING gin (content gin_trgm_ops);

-- ============================================================================
-- Revision Note Search
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_revision_note_content_trgm ON revision_notes USING gin (content gin_trgm_ops);

-- ============================================================================
-- Formula Search
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_formula_name_trgm ON formulas USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_formula_formula_trgm ON formulas USING gin (formula gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_formula_description_trgm ON formulas USING gin (description gin_trgm_ops);

-- ============================================================================
-- AI Chat Search
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_ai_chat_session_title_trgm ON ai_chat_sessions USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ai_chat_message_content_trgm ON ai_chat_messages USING gin (content gin_trgm_ops);

-- ============================================================================
-- Prisma migration tracking
-- ============================================================================
INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (
  gen_random_uuid()::text,
  '',
  NOW(),
  '20260420000000_add_fulltext_search',
  'Added pg_trgm GIN indexes and tsvector columns for full-text search',
  NULL,
  NOW(),
  1
);
