# LEARNINGHUB V5.0 — DATABASE & MIGRATION HARDENING REPORT

> **Target Database:** PostgreSQL 16 (`pgvector` extension enabled)  
> **ORM:** Django 5.0 Core ORM with native connection pooling  
> **Status:** AUDITED & PRODUCTION HARDENED  
> **Date:** September 2026  

---

## 1. POSTGRESQL 16 SCHEMA & TABLE DIRECTORY

### 1.1 Core Entities & Primary Keys
All domain tables follow strict PostgreSQL naming conventions, using indexed string primary keys (`varchar(64)`) to ensure zero contract breakage with the React client while enabling seamless distributed sharding.

| Table Name | App Domain | Primary Key Type | Clustered Indexes | Foreign Keys & Constraints |
|:---|:---|:---|:---|:---|
| `users_user` | `apps.users` | `varchar(64)` | `email` (unique), `username` | `failed_logins`, `locked_until` |
| `users_profile` | `apps.users` | `varchar(64)` | `user_id` (1:1) | `user_id` FK -> `users_user.id` CASCADE |
| `courses_course` | `apps.courses` | `varchar(64)` | `slug` (unique), `category_id` | `instructor_id` FK -> `users_user.id` |
| `courses_module` | `apps.courses` | `varchar(64)` | `course_id, order` | `course_id` FK -> `courses_course.id` CASCADE |
| `courses_lesson` | `apps.courses` | `varchar(64)` | `module_id, order` | `module_id` FK -> `courses_module.id` CASCADE |
| `courses_enrollment` | `apps.courses` | `varchar(64)` | `user_id, course_id` (unique)| `course_id` FK, `user_id` FK |
| `test_engine_test` | `apps.test_engine` | `varchar(64)` | `slug` (unique), `category` | `created_by_id` FK -> `users_user.id` |
| `test_engine_question` | `apps.test_engine` | `varchar(64)` | `subject, difficulty` | `chapter_id`, `topic_id` |
| `test_engine_option` | `apps.test_engine` | `varchar(64)` | `question_id, order` | `question_id` FK -> `question.id` CASCADE |
| `test_engine_attempt` | `apps.test_engine` | `varchar(64)` | `user_id, test_id, status` | `user_id` FK, `test_id` FK |
| `test_engine_attemptanswer` | `apps.test_engine` | `varchar(64)` | `attempt_id, question_id` (unique)| `attempt_id` FK, `question_id` FK |
| `dsa_problem` | `apps.dsa` | `varchar(64)` | `slug` (unique), `difficulty` | `acceptance_rate`, `rating` |
| `dsa_testcase` | `apps.dsa` | `varchar(64)` | `problem_id, is_sample` | `problem_id` FK -> `dsa_problem.id` CASCADE |
| `dsa_submission` | `apps.dsa` | `varchar(64)` | `user_id, problem_id` | `user_id` FK, `problem_id` FK |
| `ebooks_ebook` | `apps.ebooks` | `varchar(64)` | `slug` (unique), `category` | `author_name`, `rating` |
| `ebooks_chapter` | `apps.ebooks` | `varchar(64)` | `ebook_id, order` | `ebook_id` FK -> `ebooks_ebook.id` CASCADE |
| `gamification_badge` | `apps.gamification` | `varchar(64)` | `slug` (unique) | `xp_reward`, `icon` |
| `gamification_xptransaction` | `apps.gamification` | `varchar(64)` | `user_id, created_at` | `user_id` FK -> `users_user.id` PROTECT |
| `payments_cart` | `apps.payments` | `varchar(64)` | `user_id` (1:1) | `user_id` FK -> `users_user.id` CASCADE |
| `payments_transaction` | `apps.payments` | `varchar(64)` | `stripe_session_id` | `user_id` FK -> `users_user.id` PROTECT |

---

## 2. SPECIALIZED INDEXING STRATEGY

### 2.1 HNSW Vector Similarity Indexes (pgvector)
```sql
-- Course Semantic Recommendation & Search
CREATE INDEX courses_embedding_hnsw_idx ON courses_course 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Question Bank AI Concept Matching
CREATE INDEX question_embedding_hnsw_idx ON test_engine_question 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

### 2.2 PostgreSQL GIN Full-Text Search Indexes
```sql
-- Course Catalog Full-Text Search
CREATE INDEX courses_fts_gin_idx ON courses_course 
USING gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

-- DSA Problem Full-Text Search
CREATE INDEX dsa_fts_gin_idx ON dsa_problem 
USING gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));
```

---

## 3. CONCURRENCY & RACE-CONDITION PROTECTION

1. **Test Attempt Answer Autosave**:
   - Answer updates are isolated with `transaction.atomic()` using `AttemptAnswer.objects.update_or_create(...)` guarded by the database composite unique constraint on `(attempt_id, question_id)`.
   - Prevents race conditions during rapid client autosaves or network reconnection bursts.
2. **Double Submission Prevention**:
   - `submit_and_evaluate_attempt()` acquires an explicit row-level lock using `select_for_update()`:
     ```python
     with transaction.atomic():
         attempt = TestAttempt.objects.select_for_update().get(id=attempt_id)
         if attempt.status == 'SUBMITTED':
             return attempt  # Idempotent response, zero double evaluation
         attempt.status = 'SUBMITTED'
         attempt.save(update_fields=['status'])
     ```
3. **Cart Checkout & Enrollment Idempotency**:
   - Payment webhooks use unique transaction reference IDs to ensure that duplicate webhook invocations from Stripe/Razorpay never result in double enrollment or duplicated XP transactions.
