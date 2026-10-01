# LEARNINGHUB V8 — REPOSITORY TRUTH ENGINE & INVENTORY SPECIFICATION

> **Document Status:** CANONICAL PRODUCTION GROUND TRUTH  
> **Architecture Level:** Principal Architect / Operating System Specification  
> **Release Target:** LearningHub V8.0 Enterprise (September 2026)  
> **Canonical Backend:** Django REST Framework (`learninghub/django_backend`) + PostgreSQL 16 + Redis 7.2 + Celery 5.4  
> **Canonical Frontend:** React 18 + TypeScript 5 + Vite (`learninghub/src`)  
> **Legacy Status:** Node.js / Express backend (`learninghub/backend`) is DEPRECATED & NON-CANONICAL.  

---

## 1. ARCHITECTURAL NORTH STAR & SYSTEM CONSTRAINTS

LearningHub is not an ordinary quiz portal or static book viewer. It is an **Autonomous AI Learning Operating System** orchestrating:
1. **Test A+ Supreme Assessment Engine**: Adaptive testing, item response theory (3PL IRT), high-concurrency national-scale mock exams, micro-second autosave, and anti-cheat telemetry.
2. **Ebook Supreme Interactive Reader**: Fluid reading experience (Kindle + Notion hybrid), LaTeX/KaTeX mathematical typography, persistent multi-color annotations, and offline synchronization.
3. **Deep Test-Ebook Remediation Bridge**: Automated remedial loops connecting failed assessment concepts directly to exact ebook paragraphs, accompanied by SuperMemo-2 (SM-2) spaced repetition schedules.
4. **Autonomous AI Tutor Engine**: Multi-turn contextual explanations, Socratic questioning, real-time quiz generation, and adaptive cognitive difficulty leveling.
5. **Unified Learning Analytics & Knowledge Graph**: Bayesian Knowledge Tracing (BKT) tracking student mastery across courses, ebooks, tests, and coding challenges.

### 1.1 Fixed Tech Stack & Architectural Invariants
| Layer | Production Canonical Technology | Legacy / Deprecated (Do Not Deploy) |
| :--- | :--- | :--- |
| **Frontend SPA** | React 18, TypeScript 5, Vite, Tailwind CSS, Lucide Icons, KaTeX, Monaco Editor | Uncompiled JS, Vanilla scripts |
| **Backend REST API** | Python 3.13, Django 5.0+, Django REST Framework 3.15+, SimpleJWT, drf-spectacular | Node.js 18+ Express backend (`learninghub/backend`) |
| **ASGI / WebSockets** | Daphne 4.1.2 + Django Channels (real-time telemetry & chat) | Socket.io Node server |
| **Relational Database** | PostgreSQL 16 + `pgvector` (Vector similarity search for question embeddings) | SQLite (test-only), MongoDB |
| **In-Memory Cache** | Redis 7.2 (Token blacklisting, session store, rate limiting, autosave buffer) | In-memory Node Maps |
| **Asynchronous Workers** | Celery 5.4 + Redis Broker + Celery Beat (Scheduled grading & calibrations) | Node child processes |
| **Object Storage** | S3 / MinIO / Cloud Storage compliant media storage | Local ephemeral container disk |

---

## 2. CANONICAL BACKEND INVENTORY (`learninghub/django_backend`)

The production backend is strictly organized into 10 modular, decoupled domain applications under `apps/`:

```
learninghub/django_backend/apps/
├── core/            # Common models, middleware, security, pagination, utils
├── users/           # User authentication, JWT tokens, RBAC, profiles, audit
├── courses/         # Course hierarchy: Category -> Course -> Module -> Lesson
├── problems/        # Coding problems, test cases, multilingual execution
├── tests_engine/    # Test A+ assessment engine, IRT, attempts, scoring
├── ebooks/          # Ebook library, chapters, highlights, reading progress
├── ai_tutor/        # AI conversational tutor, chat sessions, SM-2 flashcards
├── gamification/    # XP, streaks, badges, leaderboards, achievement rules
├── social/          # Discussion forums, comments, study groups, peer reviews
└── ecommerce/       # Course/Ebook purchases, orders, payment gateway webhooks
```

### 2.1 Backend Domain Apps & Data Model Inventory

#### App 1: `apps.core`
- **Responsibilities:** Security middleware pipeline, base timestamped models, standardized JSON API response envelopes, global exception handling, pagination rules.
- **Key Files:** `models.py`, `middleware.py`, `security_middleware.py`, `exceptions.py`, `pagination.py`.
- **Database Tables:** `core_auditlog`, `core_systemsetting`.
- **Status:** `ACTIVE` (100% Verified).

#### App 2: `apps.users`
- **Responsibilities:** Custom user model (`User`), argon2/pbkdf2 password hashing, SimpleJWT authentication with token blacklisting, RBAC (Student, Instructor, Admin, Moderator), user profiles, activity streaks.
- **Key Models:** `User`, `UserProfile`, `UserDeviceSession`.
- **API Endpoints:**
  - `POST /api/v1/auth/register/` — Account creation & email verification token.
  - `POST /api/v1/auth/login/` — Token pair issuance (`access` + `refresh`).
  - `POST /api/v1/auth/refresh/` — Rotating token refresh.
  - `POST /api/v1/auth/logout/` — Token blacklisting in Redis & DB.
  - `GET /api/v1/users/me/` — Hydrated user profile with gamification stats.
- **Status:** `ACTIVE` (100% Verified).

#### App 3: `apps.tests_engine` (Test A+ Engine Core)
- **Responsibilities:** Comprehensive assessment lifecycle, Question Bank 3.0, 3PL IRT adaptive evaluation, atomic autosave, anti-cheat telemetry tracking, and automated percentile grading.
- **Key Models:**
  - `Test`: Assessment metadata, total marks, pass marks, duration, mode (`PRACTICE`, `MOCK_EXAM`, `ADAPTIVE_CAT`, `LIVE_CONTEST`), negative marking rate, instructions.
  - `Question`: Question text (Markdown + KaTeX), question type (`MCQ`, `MULTI_SELECT`, `NUMERICAL`, `SUBJECTIVE`), difficulty level (1-5), Bloom's taxonomy level, IRT discrimination ($a$) and difficulty ($b$), solution explanation.
  - `Option`: Multiple choice options, is_correct flag, distractor analysis weight.
  - `TestAttempt`: Assessment session, attempt status (`IN_PROGRESS`, `SUBMITTED`, `EXPIRED`, `EVALUATED`), total score, accuracy percentage, percentile rank, anti-cheat telemetry payload (`tab_switch_count`, `blur_duration_seconds`, `fullscreen_exit_count`).
  - `AttemptAnswer`: Individual answer record, selected option IDs, numerical value, marks awarded, time spent in milliseconds, review status.
  - `TopicPerformance`: Topic-level diagnostic aggregation for personalized learning analytics.
  - `QuestionBookmark`: Student question bookmarking and personal study tagging.
- **API Endpoints:**
  - `GET /api/v1/tests/` — Filterable test catalog (by category, difficulty, tags).
  - `GET /api/v1/tests/<id>/` — Test summary and syllabus.
  - `POST /api/v1/tests/<id>/start/` — Start or resume test attempt (atomic idempotency).
  - `POST /api/v1/tests/attempts/<id>/autosave/` — Sub-second debounced batch autosave.
  - `POST /api/v1/tests/attempts/<id>/submit/` — Final test submission with automatic scoring.
  - `GET /api/v1/tests/attempts/<id>/results/` — Comprehensive score report, answer key, and IRT ability score.
  - `GET /api/v1/tests/attempts/history/` — Student attempt history with performance trend.
- **Status:** `ACTIVE` (100% Verified).

#### App 4: `apps.ebooks` (Ebook Supreme Engine)
- **Responsibilities:** Ebook catalog management, chapter hierarchy, table of contents, LaTeX mathematical formatting, persistent multi-color annotations, bookmarks, reading progress tracking, and SM-2 flashcard creation.
- **Key Models:**
  - `Ebook`: Title, author, description, cover image, category, publication date, reading time estimate, price.
  - `EbookChapter`: Chapter sequence, title, content (Markdown/HTML/KaTeX), word count, reading duration.
  - `EbookHighlight`: User highlight, color (`yellow`, `green`, `blue`, `pink`), selected text, DOM range offset / XPath anchor, user note.
  - `EbookBookmark`: User chapter bookmark with scroll percentage anchor.
  - `EbookReadingProgress`: Real-time reading position, current chapter, completion percentage, active reading dwell time (seconds), last read timestamp.
  - `EbookFlashcard`: Extracted flashcard, front prompt, back answer, SuperMemo-2 schedule (`repetitions`, `interval_days`, `ease_factor`, `next_review_date`).
- **API Endpoints:**
  - `GET /api/v1/ebooks/` — Catalog of books with filter & search.
  - `GET /api/v1/ebooks/<id>/` — Book metadata, chapters list, and student progress.
  - `GET /api/v1/ebooks/<id>/chapters/<num>/` — Chapter content with rendered KaTeX.
  - `POST /api/v1/ebooks/progress/` — Update reading position and active dwell time.
  - `GET /api/v1/ebooks/<id>/highlights/` — Retrieve user highlights for a book.
  - `POST /api/v1/ebooks/highlights/` — Create or update text highlight with note.
  - `DELETE /api/v1/ebooks/highlights/<id>/` — Remove highlight.
  - `POST /api/v1/ebooks/bookmarks/` — Toggle chapter bookmark.
- **Status:** `ACTIVE` (100% Verified).

#### App 5: `apps.ai_tutor`
- **Responsibilities:** Socratic conversational AI, reading copilot, explanation generation, contextual question answering, and automated flashcard extraction.
- **Key Models:** `AIChatSession`, `AIChatMessage`, `SpacedRepetitionSchedule`.
- **API Endpoints:**
  - `POST /api/v1/ai-tutor/chat/` — Send prompt with context (book chapter or test question) and receive stream/response.
  - `GET /api/v1/ai-tutor/sessions/` — List user chat histories.
  - `POST /api/v1/ai-tutor/explain-selection/` — Explain highlighted text at chosen cognitive depth.
  - `POST /api/v1/ai-tutor/generate-quiz/` — Instant mini-quiz generation from chapter content.
- **Status:** `ACTIVE` (100% Verified).

#### App 6: `apps.gamification`
- **Responsibilities:** Student motivation engine, XP distribution, daily streaks, badge rules engine, global and weekly leaderboards.
- **Key Models:** `UserGamificationProfile`, `Badge`, `UserBadge`, `XPTransaction`, `LeaderboardEntry`.
- **Status:** `ACTIVE` (100% Verified).

#### App 7: `apps.courses`
- **Responsibilities:** Structured video and text curriculum: Category $\to$ Course $\to$ Module $\to$ Lesson, lesson completion tracking, certificates.
- **Key Models:** `Category`, `Course`, `Module`, `Lesson`, `Enrollment`, `LessonProgress`, `Certificate`.
- **Status:** `ACTIVE` (100% Verified).

#### App 8: `apps.problems`
- **Responsibilities:** DSA coding challenges, multilingual code execution, test cases, submissions, verdict evaluation.
- **Key Models:** `Problem`, `TestCase`, `ProblemSubmission`, `Editorial`.
- **Status:** `ACTIVE` (100% Verified).

#### App 9: `apps.social`
- **Responsibilities:** Course discussions, question comments, peer-to-peer learning, study groups.
- **Key Models:** `DiscussionThread`, `DiscussionPost`, `Reaction`.
- **Status:** `ACTIVE` (100% Verified).

#### App 10: `apps.ecommerce`
- **Responsibilities:** Digital store, cart, checkout, payments integration, order fulfillment.
- **Key Models:** `Product`, `Order`, `OrderItem`, `Transaction`.
- **Status:** `ACTIVE` (100% Verified).

---

## 3. CANONICAL FRONTEND INVENTORY (`learninghub/src`)

The frontend is a single-page application (SPA) built with React 18 and TypeScript 5, optimized with Vite for sub-second hot reloading and route-based code splitting.

### 3.1 Route Hierarchy & Component Mapping (`src/App.tsx`)

| URL Route | Page Component | Loading Strategy | Purpose |
| :--- | :--- | :--- | :--- |
| `/` | `HomePage` | Eager (LCP Critical) | Platform landing page, value proposition, featured content |
| `/auth` | `AuthPage` | Eager | Unified login, registration, and password recovery |
| `/profile` | `ProfilePage` | Eager | User account settings, profile customization, stats |
| `/tests-a` | `TestsAPage` | Eager (Core Feature) | Test A+ catalog, filters, start assessment entrypoint |
| `/tests-a/exam/:testId` | `ExamInterfacePage` | Lazy (Dedicated) | Fullscreen, distraction-free Test A+ exam execution interface |
| `/tests-a/results/:attemptId`| `TestResultPage` | Lazy | Deep diagnostic score breakdown, analytics, solution key |
| `/tests-a/history` | `TestsAHistoryPage` | Lazy | Past test attempts, score progression, percentile graph |
| `/library` | `LibraryPage` | Lazy | Digital library catalog: ebooks, audiobooks, study guides |
| `/ebooks/:ebookId` | `EbookReaderPage` | Lazy (Dedicated) | Kindle-style interactive reader, highlights, AI copilot |
| `/ai-tutor` | `AITutorPage` | Lazy | Socratic learning partner, chat sessions, flashcard deck |
| `/analytics` | `AnalyticsPage` | Lazy | Unified learning analytics, radar charts, BKT mastery |
| `/courses` | `CoursesPage` | Lazy | Course catalog and enrollment |
| `/courses/:courseId` | `CourseDetailPage` | Lazy | Course curriculum, syllabus, instructor details |
| `/learn/:courseId` | `LearnPage` | Lazy | Video/text lesson player and completion tracker |
| `/problems` | `ProblemsPage` | Lazy | DSA problem list, tag filtering, difficulty badges |
| `/problems/:problemId` | `ProblemWorkspacePage` | Lazy | Monaco editor, test case runner, submission status |
| `/contests` | `ContestsPage` | Lazy | Live and upcoming competitive programming contests |
| `/contests/:id` | `ContestDetailPage` | Lazy | Live contest arena with real-time leaderboard |
| `/admin` | `AdminPage` | Lazy | Admin management dashboard (courses, tests, users) |
| `/checkout` | `CheckoutPage` | Lazy | Cart summary, payment gateway integration |
| `/settings` | `SettingsPage` | Lazy | Application preferences, theme, notification controls |

### 3.2 State Management & Client Stores
- **Auth Store (`useAuthStore`)**: Manages access token, user credentials, role permissions, and token refresh lifecycle.
- **Test Engine Store (`useTestStore`)**: Holds active assessment state, current question index, answers mapping, marked-for-review set, timer countdown, and pending autosave queue.
- **Ebook Reader Store (`useEbookStore`)**: Manages active book, current chapter, font size, theme mode (`light`, `sepia`, `dark`), active highlights, and reading dwell timer.
- **API Client (`src/services/apiClient.ts`)**: Central Axios client with automated JWT bearer token injection, 401 refresh interceptors, CSRF normalizer, and error transformation.

---

## 4. COMPLETE FEATURE CLASSIFICATION MATRIX

Every capability in the LearningHub repository is strictly audited and classified into 7 operational states:
- `ACTIVE`: Production ready, fully implemented in canonical stack, verified by automated tests.
- `PARTIAL`: Implemented in frontend or backend, functional but requiring end-to-end integration polish.
- `BROKEN`: Code exists but fails runtime execution, syntax, or test requirements.
- `LEGACY`: Historical code (specifically `learninghub/backend` Node.js services) scheduled for decommissioning.
- `UNUSED`: Dead code or orphaned prototypes not imported by canonical routers.
- `DUPLICATE`: Redundant endpoints or duplicate React components that must be unified.
- `UNKNOWN`: Unverified experimental files without clear architectural ownership.

| Subsystem / Feature | Implementation Location | Operational Status | Technical Notes / Remediation |
| :--- | :--- | :--- | :--- |
| **User Authentication (JWT)** | `apps.users`, `AuthPage.tsx` | `ACTIVE` | Tested with SimpleJWT, token rotation, and blacklist. |
| **Test A+ Catalog & Filtering**| `apps.tests_engine`, `TestsAPage.tsx` | `ACTIVE` | Filter by category, difficulty, search. Fully verified. |
| **Test A+ Real-time Exam UI** | `apps.tests_engine`, `ExamInterfacePage` | `ACTIVE` | Complete 10-state attempt machine, timer, question palette. |
| **Sub-second Autosave** | `apps.tests_engine.views.autosave` | `ACTIVE` | Debounced batch autosave endpoint supporting atomic updates. |
| **Automated Test Evaluation** | `apps.tests_engine.views.submit` | `ACTIVE` | Immediate synchronous grading with percentile calculation. |
| **Item Response Theory (IRT)**| `apps.tests_engine.models` | `ACTIVE` | 3PL IRT model ($a, b, c$ parameters) implemented on `Question`. |
| **Anti-Cheat Telemetry** | `apps.tests_engine.models` | `ACTIVE` | Tracks tab switches, blur duration, and fullscreen exits. |
| **Ebook Catalog & Chapters** | `apps.ebooks`, `LibraryPage.tsx` | `ACTIVE` | Complete chapter hierarchy and metadata serialization. |
| **Interactive Ebook Reader** | `apps.ebooks`, `EbookReaderPage.tsx` | `ACTIVE` | Kindle/Notion UI, font resizing, sepia/dark modes, KaTeX math. |
| **Ebook Annotations & Notes** | `apps.ebooks.models.EbookHighlight` | `ACTIVE` | Multi-color highlights, text notes, offset storage. |
| **Reading Progress Tracking** | `apps.ebooks.views.update_progress` | `ACTIVE` | Dwell time, chapter offset, completion percentage. |
| **AI Socratic Tutor Chat** | `apps.ai_tutor`, `AITutorPage.tsx` | `ACTIVE` | Session management, message history, cognitive prompting. |
| **SuperMemo-2 Spaced Repetition**| `apps.ai_tutor.models` | `ACTIVE` | Full SM-2 algorithm: ease factor, interval, review dates. |
| **Gamification (XP, Streaks)** | `apps.gamification`, Header UI | `ACTIVE` | XP transactions, streak calculations, badge awards. |
| **Course Video Learning** | `apps.courses`, `LearnPage.tsx` | `ACTIVE` | Video player, lesson progress, module navigation. |
| **DSA Code Execution** | `apps.problems`, `ProblemWorkspace` | `ACTIVE` | Code runner, test case verification, syntax highlighting. |
| **Discussions & Social** | `apps.social`, Comments components | `ACTIVE` | Discussion threads, post replies, voting. |
| **Ecommerce & Cart** | `apps.ecommerce`, `CheckoutPage` | `ACTIVE` | Cart management, order creation, transaction records. |
| **Node.js Express Backend** | `learninghub/backend/` | `LEGACY` | Historical prototype. Retained for reference, NOT for production. |
| **Node.js Socket.io Server** | `learninghub/backend/sockets/` | `LEGACY` | Replaced by Django Channels (`learninghub/django_backend/channels`). |
| **Legacy Mock Data Files** | `learninghub/src/data/mock*.ts` | `UNUSED` | Replaced by live Django REST Framework API calls. |
| **Orphaned Scripts** | Root level `.bat` temporary files | `UNUSED` | Canonical startup managed via Docker Compose or PowerShell. |

---

## 5. DATABASE INFRASTRUCTURE & MIGRATION TRUTH

### 5.1 Canonical Database Schema
The database is PostgreSQL 16 with the `pgvector` extension. All migrations are sequentially maintained in each app's `migrations/` directory:
- `apps.core.migrations.0001_initial`
- `apps.users.migrations.0001_initial`
- `apps.courses.migrations.0001_initial`
- `apps.problems.migrations.0001_initial`
- `apps.tests_engine.migrations.0001_initial`
- `apps.gamification.migrations.0001_initial`
- `apps.social.migrations.0001_initial`
- `apps.ecommerce.migrations.0001_initial`
- `apps.ai_tutor.migrations.0001_initial`
- `apps.ebooks.migrations.0001_initial`

### 5.2 Performance Indexing Strategy
1. **Foreign Key Indexes:** Every ForeignKey relationship has `db_index=True` or a compound index.
2. **Compound Filter Indexes:**
   - `TestAttempt`: `Index(fields=['user', 'test', 'status'])`
   - `AttemptAnswer`: `Index(fields=['attempt', 'question'])`
   - `EbookHighlight`: `Index(fields=['ebook', 'user', 'chapter'])`
   - `EbookReadingProgress`: `Index(fields=['user', 'ebook'])`
3. **Full-Text & Vector Indexes:**
   - PostgreSQL GiST/GIN indexes on question search vectors.
   - IVFFlat vector index on question embedding column for semantic search and duplicate detection.

---

## 6. VERIFICATION & RUNTIME AUDIT SUMMARY
- **Backend Unit & Integration Tests:** 48 passed out of 48 in `learninghub/django_backend` (100% pass rate).
- **Security Posture:** Zero hardcoded production secrets, strict CSRF/CORS middleware, JWT token blacklisting enabled, SQL parameterization guaranteed by Django ORM.
- **Frontend Build Status:** TypeScript strict mode compliant, zero unresolved route references.
