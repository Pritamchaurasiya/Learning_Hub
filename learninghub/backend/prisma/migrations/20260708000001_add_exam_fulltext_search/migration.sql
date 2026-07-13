-- Add full-text search support for exams table

-- Full-text search tsvector column for exams
ALTER TABLE exams ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE INDEX IF NOT EXISTS idx_exam_search_vector ON exams USING gin (search_vector);

CREATE OR REPLACE FUNCTION exam_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_exam_search_vector ON exams;
CREATE TRIGGER trg_exam_search_vector
  BEFORE INSERT OR UPDATE ON exams
  FOR EACH ROW EXECUTE FUNCTION exam_search_vector_update();

-- Backfill existing rows
UPDATE exams SET search_vector =
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B')
WHERE search_vector IS NULL;

-- ============================================================================
-- Also add tsvector for problems and tests (missing from previous migration)
-- ============================================================================

-- Problems full-text search
ALTER TABLE problems ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE INDEX IF NOT EXISTS idx_problem_search_vector ON problems USING gin (search_vector);

CREATE OR REPLACE FUNCTION problem_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_problem_search_vector ON problems;
CREATE TRIGGER trg_problem_search_vector
  BEFORE INSERT OR UPDATE ON problems
  FOR EACH ROW EXECUTE FUNCTION problem_search_vector_update();

UPDATE problems SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B')
WHERE search_vector IS NULL;

-- Tests full-text search
ALTER TABLE tests ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE INDEX IF NOT EXISTS idx_test_search_vector ON tests USING gin (search_vector);

CREATE OR REPLACE FUNCTION test_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_test_search_vector ON tests;
CREATE TRIGGER trg_test_search_vector
  BEFORE INSERT OR UPDATE ON tests
  FOR EACH ROW EXECUTE FUNCTION test_search_vector_update();

UPDATE tests SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B')
WHERE search_vector IS NULL;

-- ============================================================================
-- Prisma migration tracking
-- ============================================================================
INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (
  gen_random_uuid()::text,
  '',
  NOW(),
  '20260708000001_add_exam_fulltext_search',
  'Added tsvector columns and GIN indexes for exams, problems, and tests full-text search',
  NULL,
  NOW(),
  1
);
