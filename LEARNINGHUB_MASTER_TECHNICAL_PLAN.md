# LEARNINGHUB — MASTER TECHNICAL AUDIT & IMPLEMENTATION PLAN

> **Date:** May 15, 2026
> **Status:** Phase 0 — Deep Architecture Redesign
> **Target:** AI-Powered Global Test/Practice SaaS Platform

---

## EXECUTIVE SUMMARY

LearningHub currently operates with **two competing backends** (Django + Node.js), **two frontends** (Flutter + React), a bloated 42-app Django monolith, and an AI engine with 206 files that lacks the core product feature: **dynamic AI test generation for any exam, any country**.

This plan transforms LearningHub into a production-ready, AI-powered global testing platform with:
- Unified backend architecture (Django as primary, Node.js as WebSocket/realtime layer)
- Exam-centric database schema with country/exam/subject/topic hierarchy
- AI test generation engine with pattern matching, adaptive difficulty, and caching
- Robust test engine with timed/practice/mock modes, autosave, and analytics
- Subscription-based monetization with usage limits and premium access
- Security-hardened, scalable, globally performant infrastructure

---

## PART 1: DEEP ARCHITECTURAL AUDIT

### 1.1 CRITICAL ARCHITECTURAL PROBLEMS

#### P0 — Dual Backend Split (Architecture Fracture)
**Location:** `conductor/` (Django) + `learninghub/backend/` (Node.js/Express)
**Impact:** Data inconsistency, duplicated logic, maintenance nightmare

**Findings:**
- Django backend has 42 apps, Prisma schema has 20+ models, both define User/Course/Test models
- Node.js backend has its own auth, courses, tests, admin, gamification — all duplicated
- No synchronization between the two databases
- Frontend (React) talks to Node.js, Flutter talks to Django — user data is siloed
- Both backends have separate JWT implementations, separate rate limiting, separate admin panels

**Root Cause:** Two independent development tracks never unified.

**Fix:** Consolidate to Django as primary API backend. Node.js becomes a lightweight WebSocket/realtime proxy that forwards to Django APIs. Single database (PostgreSQL), single auth source.

#### P0 — AI Test Generation Is Incomplete
**Location:** `conductor/apps/ai_engine/quiz_service.py`
**Impact:** Core product feature does not exist

**Findings:**
- `quiz_service.py` only generates quizzes from a single module's content text
- No country selection, no exam pattern selection, no subject/topic hierarchy
- No difficulty adaptation, no IRT (Item Response Theory) scoring
- No explanation generation for answers
- No caching of generated tests — regenerates every time
- Prompt is hardcoded, no template system, no structured output validation
- Falls back to `None` silently on AI failure — no retry, no queue, no user notification

**Root Cause:** Quiz generation was built as a research module feature, not as a global test platform.

**Fix:** Complete redesign of AI test generation layer (detailed in Part 4).

#### P0 — No Exam/Country/Subject Taxonomy
**Location:** Both backends, database schemas
**Impact:** Cannot support "any exam, any country" product vision

**Findings:**
- Django `quiz` app: Questions belong to Quiz → Course. No exam type, no country, no subject taxonomy
- Prisma schema: Has `ExamType` enum (only Indian exams: UPSC, JEE, NEET, CAT, GATE, SSC, BANK)
- No `Country` model, no `ExamPattern` model, no `Subject` → `Topic` hierarchy
- PYQ model exists but is isolated — not connected to test generation
- No way to generate tests based on real exam patterns (marks scheme, negative marking, time limits)

**Root Cause:** Database was designed for course-based learning, not exam-based testing.

**Fix:** New exam-centric schema with Country → Exam → Subject → Topic → Question hierarchy.

#### P1 — Question Storage Anti-Patterns
**Location:** `learninghub/backend/prisma/schema.prisma:297-311`
**Impact:** Inflexible, unqueryable, broken analytics

**Findings:**
- `Question.options` stored as `String` (JSON stringified array) — cannot query by option text
- `Question.correctAnswer` stored as plain string — no relation to options
- No `Option` model in Prisma — options are embedded strings
- No support for multiple correct answers, partial credit, or complex question types
- Django quiz app has proper `Option` model but Prisma backend doesn't

**Root Cause:** Prisma schema was rushed; options were embedded for simplicity.

**Fix:** Proper `Option` model with relations, support for multiple question types.

#### P1 — Test Engine Lacks Critical Features
**Location:** `conductor/apps/quiz/views.py`, `learninghub/backend/src/controllers/testsController.ts`
**Impact:** Not production-ready for real testing

**Findings:**
- No autosave capability — if browser crashes, all answers lost
- No adaptive difficulty during test
- No question randomization/shuffling
- No bookmarking questions during test
- No "mark for review" flag persisted to backend (frontend has it, backend ignores it)
- No timeout handling server-side — relies on client timer
- No duplicate submission prevention
- No test session management (what if user closes tab and reopens?)

**Root Cause:** Test engine was built as a simple quiz, not a robust examination system.

**Fix:** Complete test engine redesign with session management, autosave, server-side timers.

#### P1 — Analytics & Progress Tracking Is Superficial
**Location:** `conductor/apps/ai_engine/adaptive_engine.py`, `learninghub/backend/src/controllers/`
**Impact:** No actionable insights for users

**Findings:**
- `AdaptiveEngine` calculates skill level from quiz averages — no topic-level analysis
- No weak area identification per subject/topic
- No performance trend over time (improving/declining)
- No percentile ranking against other users
- No personalized recommendations based on test performance
- `LearningInsight` model exists but is updated by Celery tasks that may not run
- No exam-specific analytics (e.g., "your Quant score is improving but Reasoning is declining")

**Root Cause:** Analytics was an afterthought, not designed into the test flow.

**Fix:** Per-topic, per-exam analytics engine with trend analysis and AI recommendations.

#### P2 — 42 Django Apps (Massive Bloat)
**Location:** `conductor/apps/`
**Impact:** Slow startup, maintenance burden, security surface area

**Findings:**
- Only ~15 apps are production-ready: users, courses, quiz, ai_engine, gamification, payments, notifications, discussions, chat, dashboard, tutors, live_sessions, search, analytics, core
- 27 apps are experimental/bloated: metaverse, web3, neuro, photonics, crypto, rl, science, commerce, automation, bio, data, ops, optimization, mlops, monitoring, curriculum, api_compat, api, downloads, study_groups, support
- Many apps have empty or stub implementations
- Every app adds middleware, signals, migrations, URLs — compounds startup time

**Root Cause:** Feature creep without pruning. Every "phase" added apps without removing unused ones.

**Fix:** Archive experimental apps to `conductor/apps/_archive/`. Keep only production apps in `INSTALLED_APPS`.

#### P2 — Security Gaps
**Location:** Multiple locations
**Impact:** Potential vulnerabilities

**Findings:**
- Admin login (`adminLogin`) in Node.js is separate from user auth — no RBAC enforcement
- `requireAdmin` middleware only checks `role === 'admin'` — no permission granularity
- No API key management for AI services
- `SECRET_KEY` fallback to generated key in dev — fine for dev, but `.env` management is inconsistent
- No CSRF protection on Node.js backend
- Rate limiting exists but is not per-endpoint intelligent (e.g., test submission vs. page view)
- No request body size limits on Django side
- No audit logging on Node.js admin actions

**Fix:** Unified auth, granular RBAC, CSRF on Node.js, per-endpoint rate limiting, audit trails.

#### P2 — Performance Bottlenecks
**Location:** Database queries, API responses, frontend bundles
**Impact:** Slow global experience

**Findings:**
- Django quiz views use `select_related` but miss `prefetch_related` for options (N+1 on questions)
- No database connection pooling configuration visible in production settings
- React frontend bundle likely large (38 dependencies, no code splitting analysis)
- No CDN strategy for static assets
- No query result caching for frequently accessed data (exam lists, subject lists)
- No pagination on some list endpoints
- Prisma queries don't use `select` to limit fields — fetches all columns

**Fix:** Query optimization, connection pooling, CDN, caching strategy, bundle analysis.

---

## PART 2: UNIFIED BACKEND ARCHITECTURE

### 2.1 Architecture Decision

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT LAYER                      │
│  React SPA (learninghub/src)    Flutter (windows_app)│
└──────────────────┬──────────────────┬────────────────┘
                   │                  │
              HTTPS/REST         HTTPS/REST
                   │                  │
┌──────────────────▼──────────────────▼────────────────┐
│              API GATEWAY (Nginx)                      │
│  - TLS termination                                    │
│  - Rate limiting                                      │
│  - Request routing                                    │
│  - Static asset serving (CDN)                         │
└──────────────────┬───────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────────┐
│           PRIMARY BACKEND: Django + DRF               │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │  Core Apps (Production)                      │    │
│  │  - users (auth, profiles, RBAC)              │    │
│  │  - exams (country, exam, subject, topic)     │    │
│  │  - tests (test engine, attempts, scoring)    │    │
│  │  - questions (question bank, options)        │    │
│  │  - analytics (performance, trends, insights)  │    │
│  │  - courses (course content, enrollment)      │    │
│  │  - payments (subscriptions, webhooks)        │    │
│  │  - gamification (XP, badges, leaderboards)   │    │
│  │  - ai_engine (test generation, tutor, RAG)   │    │
│  │  - notifications (push, email, in-app)       │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │  Support Apps                                │    │
│  │  - discussions, chat, search, dashboard      │    │
│  │  - tutors, live_sessions                     │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │  Archived (disabled in INSTALLED_APPS)       │    │
│  │  - metaverse, web3, neuro, photonics, etc.   │    │
│  └─────────────────────────────────────────────┘    │
└──────────────────┬───────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────────┐
│         REALTIME LAYER: Node.js + Socket.IO           │
│  - WebSocket proxy to Django Channels                 │
│  - Live test collaboration                            │
│  - Real-time leaderboard updates                      │
│  - Chat/tutor streaming                               │
└──────────────────┬───────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────────┐
│              DATA LAYER                               │
│  PostgreSQL (primary DB)  Redis (cache + sessions)    │
│  Celery (async tasks)     S3/MinIO (file storage)    │
└──────────────────────────────────────────────────────┘
```

### 2.2 Key Decisions

| Decision | Rationale |
|----------|-----------|
| Django as primary API | Already has 42 apps, DRF, JWT, Celery, Channels, mature ecosystem |
| Node.js as realtime proxy | Good at WebSocket handling, but doesn't need its own DB/models |
| PostgreSQL as single DB | Prisma schema already designed for Postgres, Django supports it natively |
| Redis for cache + sessions | Already configured, needed for Celery + Channels anyway |
| Celery for async tasks | AI test generation, analytics aggregation, email notifications |
| Archive 27 experimental apps | Reduces attack surface, startup time, maintenance burden |

---

## PART 3: DATABASE REDESIGN

### 3.1 New Exam-Centric Schema

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Country  │────<│ Exam     │────<│ Subject  │────<│ Topic    │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                      │                  │
                                      │                  │
                                ┌─────▼──────────────────▼─────┐
                                │       Question Bank           │
                                │  (master repository)          │
                                └─────────────┬────────────────┘
                                              │
                                ┌─────────────▼────────────────┐
                                │       Test                    │
                                │  (generated/curated tests)    │
                                └─────────────┬────────────────┘
                                              │
                                ┌─────────────▼────────────────┐
                                │       TestAttempt             │
                                │  (user's test sessions)       │
                                └─────────────┬────────────────┘
                                              │
                                ┌─────────────▼────────────────┐
                                │       AttemptAnswer           │
                                │  (per-question responses)     │
                                └──────────────────────────────┘
```

### 3.2 Core New Models

```python
# Country → Exam → Subject → Topic hierarchy
class Country(models.Model):
    code = CharField(max_length=3, unique=True)  # US, IN, UK, AU
    name = CharField(max_length=100)
    timezone = CharField(max_length=50)
    currency = CharField(max_length=3)
    is_active = BooleanField(default=True)

class Exam(models.Model):
    country = ForeignKey(Country)
    code = CharField(max_length=20, unique=True)  # SAT, JEE_MAIN, UPSC_CSE
    name = CharField(max_length=200)
    description = TextField()
    pattern = JSONField()  # {sections, marks_per_question, negative_marks, duration, total_questions}
    difficulty_distribution = JSONField()  # {easy: 30%, medium: 50%, hard: 20%}
    is_active = BooleanField(default=True)

class Subject(models.Model):
    exam = ForeignKey(Exam)
    code = CharField(max_length=20)
    name = CharField(max_length=200)
    weightage = FloatField()  # percentage weight in exam

class Topic(models.Model):
    subject = ForeignKey(Subject)
    name = CharField(max_length=200)
    parent = ForeignKey('self', null=True)  # hierarchical topics
    difficulty_trend = JSONField()  # historical difficulty data

# Enhanced Question model
class Question(models.Model):
    id = UUIDField(primary_key)
    topic = ForeignKey(Topic)
    text = TextField()
    question_type = CharField()  # mcq, true_false, multiple_select, numerical
    difficulty = FloatField()  # IRT difficulty parameter (0.0-5.0)
    discrimination = FloatField()  # IRT discrimination parameter
    bloom_level = CharField()  # remember, understand, apply, analyze, evaluate, create
    tags = ArrayField(CharField)
    explanation = TextField()
    solution_steps = JSONField()  # step-by-step solution
    is_ai_generated = BooleanField(default=False)
    ai_model = CharField(null=True)  # gemini-2.0-flash, etc.
    ai_prompt_version = CharField(null=True)
    created_by = ForeignKey(User, null=True)
    usage_count = IntegerField(default=0)
    correct_rate = FloatField(null=True)  # historical accuracy rate
    created_at = DateTimeField()
    
    # Soft delete
    is_deleted = BooleanField(default=False)

class Option(models.Model):
    question = ForeignKey(Question, related_name='options')
    text = TextField()
    is_correct = BooleanField()
    explanation = TextField(blank=True)  # why this option is correct/incorrect
    order = IntegerField()

# Test generation
class Test(models.Model):
    id = UUIDField(primary_key)
    exam = ForeignKey(Exam)
    title = CharField()
    description = TextField()
    mode = CharField()  # practice, mock, timed_challenge
    difficulty = CharField()  # easy, medium, hard, adaptive
    time_limit_minutes = IntegerField()
    passing_score = FloatField()
    total_marks = IntegerField()
    negative_marks_per_question = FloatField(default=0)
    is_published = BooleanField(default=False)
    is_ai_generated = BooleanField(default=False)
    generation_config = JSONField()  # AI generation parameters used
    question_count = IntegerField()
    created_by = ForeignKey(User, null=True)
    created_at = DateTimeField()
    
    # Caching
    cache_key = CharField(unique=True, null=True)
    cache_ttl = IntegerField(default=86400)  # 24 hours

class TestQuestion(models.Model):
    """Maps questions to tests with ordering and marks."""
    test = ForeignKey(Test, related_name='test_questions')
    question = ForeignKey(Question)
    order = IntegerField()
    marks = FloatField(default=1)
    is_bookmarked_by_user = BooleanField(default=False)  # per-user bookmark

# Test attempts with session management
class TestAttempt(models.Model):
    id = UUIDField(primary_key)
    user = ForeignKey(User)
    test = ForeignKey(Test)
    session_token = CharField(unique=True)  # for resume capability
    status = CharField()  # not_started, in_progress, submitted, expired, abandoned
    mode = CharField()  # practice, mock, timed_challenge
    
    # Scoring
    score = FloatField(default=0)
    total_marks = FloatField()
    percentage = FloatField(default=0)
    passed = BooleanField(null=True)
    
    # Timing
    started_at = DateTimeField()
    submitted_at = DateTimeField(null=True)
    time_taken_seconds = IntegerField(default=0)
    last_activity_at = DateTimeField(auto_now=True)
    
    # Metadata
    attempt_number = IntegerField(default=1)
    device_info = JSONField(null=True)
    ip_address = GenericIPAddressField(null=True)
    
    # Autosave
    autosave_data = JSONField(default=dict)  # {question_id: {answer, timestamp}}
    autosave_version = IntegerField(default=0)
    
    created_at = DateTimeField(auto_now_add=True)

class AttemptAnswer(models.Model):
    attempt = ForeignKey(TestAttempt, related_name='answers')
    question = ForeignKey(Question)
    selected_options = ManyToManyField(Option, blank=True)  # supports multiple_select
    text_answer = TextField(blank=True)
    is_correct = BooleanField(null=True)  # null = not yet graded
    marks_obtained = FloatField(default=0)
    time_spent_seconds = IntegerField(default=0)
    answered_at = DateTimeField(null=True)
    is_flagged = BooleanField(default=False)  # mark for review
    is_bookmarked = BooleanField(default=False)

# Analytics
class TopicPerformance(models.Model):
    user = ForeignKey(User)
    topic = ForeignKey(Topic)
    total_attempts = IntegerField(default=0)
    correct_attempts = IntegerField(default=0)
    accuracy = FloatField(default=0)
    avg_time_seconds = FloatField(default=0)
    last_attempted = DateTimeField()
    trend = CharField()  # improving, stable, declining
    mastery_level = FloatField(default=0)  # 0-100

class ExamPerformance(models.Model):
    user = ForeignKey(User)
    exam = ForeignKey(Exam)
    total_tests_taken = IntegerField(default=0)
    avg_percentage = FloatField(default=0)
    best_percentage = FloatField(default=0)
    last_test_date = DateTimeField(null=True)
    percentile_rank = FloatField(null=True)  # vs other users
    weak_topics = ArrayField(CharField)
    strong_topics = ArrayField(CharField)
    updated_at = DateTimeField(auto_now=True)

# Subscription/Monetization
class Subscription(models.Model):
    user = ForeignKey(User, related_name='subscriptions')
    plan = CharField()  # free, pro, enterprise
    status = CharField()  # active, expired, cancelled, trial
    started_at = DateTimeField()
    expires_at = DateTimeField()
    auto_renew = BooleanField(default=True)
    payment_provider = CharField(null=True)  # razorpay, stripe
    provider_subscription_id = CharField(null=True)
    features = JSONField(default=dict)  # {daily_test_limit, ai_generations, analytics_depth}

class UsageTracking(models.Model):
    user = ForeignKey(User)
    date = DateField()
    tests_taken = IntegerField(default=0)
    ai_generations = IntegerField(default=0)
    minutes_practiced = IntegerField(default=0)
    
    class Meta:
        unique_together = ['user', 'date']
```

### 3.3 Migration Strategy

1. Keep existing `quiz`, `courses`, `users` models intact (backward compatible)
2. Add new exam-centric models alongside existing ones
3. Create data migration to map existing quizzes to new structure
4. Gradually migrate API endpoints to use new models
5. Deprecate old quiz endpoints with sunset headers

---

## PART 4: AI TEST GENERATION ENGINE

### 4.1 Architecture

```
┌──────────────────────────────────────────────────────┐
│                 AI Test Generation                    │
│                                                      │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐  │
│  │ Prompt     │───>│ LLM        │───>│ Validation │  │
│  │ Templates  │    │ Orchestrator│   │ & Sanitizer│  │
│  └────────────┘    └────────────┘    └────────────┘  │
│        │                  │                  │        │
│        ▼                  ▼                  ▼        │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐  │
│  │ Exam Pattern│   │ Gemini API │    │ Question   │  │
│  │ Config DB   │   │ + Fallback │    │ Bank Save  │  │
│  └────────────┘    └────────────┘    └────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │               Caching Layer                   │    │
│  │  Redis cache with semantic similarity check   │    │
│  │  Cache key: hash(country+exam+subject+config) │    │
│  └──────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

### 4.2 Prompt Template System

```python
class PromptTemplate:
    """Manages AI prompt templates for test generation."""
    
    TEMPLATES = {
        'mcq_generation': """
You are an expert exam question designer for the {exam_name} exam in {country}.

EXAM PATTERN:
- Sections: {sections}
- Marks per question: {marks}
- Negative marking: {negative_marks}
- Duration: {duration} minutes
- Difficulty distribution: {difficulty_distribution}

Generate {count} multiple-choice questions for the subject "{subject}", topic "{topic}".

REQUIREMENTS:
1. Questions must be ORIGINAL — do not copy from any existing exam paper
2. Follow the exam pattern and difficulty level specified
3. Each question must have exactly 4 options (A, B, C, D)
4. Exactly one option must be correct
5. Provide a detailed explanation for the correct answer
6. Explain why each incorrect option is wrong
7. Tag the question with relevant subtopics
8. Assign a Bloom's taxonomy level (remember/understand/apply/analyze/evaluate/create)

OUTPUT FORMAT (JSON only):
{{
    "questions": [
        {{
            "text": "Question text...",
            "options": [
                {{"text": "Option A", "is_correct": false, "explanation": "Why wrong"}},
                {{"text": "Option B", "is_correct": true, "explanation": "Why correct"}},
                {{"text": "Option C", "is_correct": false, "explanation": "Why wrong"}},
                {{"text": "Option D", "is_correct": false, "explanation": "Why wrong"}}
            ],
            "explanation": "Full detailed explanation...",
            "solution_steps": ["Step 1", "Step 2", "Step 3"],
            "difficulty": 0.7,
            "bloom_level": "apply",
            "tags": ["tag1", "tag2"]
        }}
    ]
}}
""",
        # Additional templates for true_false, numerical, multiple_select...
    }
```

### 4.3 AI Generation Service

```python
class AITestGenerationService:
    """Production-grade AI test generation with caching, retry, and validation."""
    
    def generate_test(self, exam_id, subject_id, topic_ids, config):
        """
        Generate a complete test using AI.
        
        Args:
            exam_id: Exam to pattern-match
            subject_id: Subject area
            topic_ids: Specific topics to cover
            config: {
                'mode': 'practice'|'mock'|'timed_challenge',
                'difficulty': 'easy'|'medium'|'hard'|'adaptive',
                'question_count': int,
                'time_limit': int (minutes),
            }
        
        Returns:
            Test object with generated questions
        """
        # 1. Check cache first
        cache_key = self._build_cache_key(exam_id, subject_id, topic_ids, config)
        cached = cache.get(cache_key)
        if cached:
            return cached
        
        # 2. Get exam pattern
        exam = Exam.objects.select_related('country').get(id=exam_id)
        pattern = exam.pattern
        
        # 3. Build prompt from template
        prompt = self._build_prompt(exam, subject_id, topic_ids, config)
        
        # 4. Call LLM with retry logic
        response = self._call_llm_with_retry(prompt, max_retries=3)
        
        # 5. Validate and sanitize output
        questions = self._validate_questions(response, exam)
        
        # 6. Check for duplicates in question bank
        questions = self._deduplicate_questions(questions)
        
        # 7. Save to question bank and create test
        test = self._save_test(exam, questions, config, cache_key)
        
        # 8. Cache the test
        cache.set(cache_key, test, timeout=config.get('cache_ttl', 86400))
        
        return test
    
    def _call_llm_with_retry(self, prompt, max_retries=3):
        """Call LLM with exponential backoff retry."""
        for attempt in range(max_retries):
            try:
                response = ai_client.generate(
                    prompt=prompt,
                    model='gemini-2.0-flash',
                    response_mime_type='application/json',
                    temperature=0.7,  # Creative but consistent
                )
                return json.loads(response.text)
            except Exception as e:
                if attempt == max_retries - 1:
                    # Final retry: use fallback model
                    return self._call_fallback_llm(prompt)
                time.sleep(2 ** attempt)  # Exponential backoff
    
    def _validate_questions(self, data, exam):
        """Validate AI-generated questions against schema and quality rules."""
        validated = []
        for q in data.get('questions', []):
            # Check required fields
            if not all(k in q for k in ['text', 'options', 'explanation']):
                continue
            
            # Check exactly 4 options
            if len(q['options']) != 4:
                continue
            
            # Check exactly one correct answer
            correct_count = sum(1 for o in q['options'] if o['is_correct'])
            if correct_count != 1:
                continue
            
            # Check for offensive/inappropriate content
            if self._content_moderation(q['text']):
                continue
            
            validated.append(q)
        
        return validated
```

### 4.4 Adaptive Difficulty Engine

```python
class AdaptiveDifficultyEngine:
    """Adjusts question difficulty based on user performance in real-time."""
    
    def __init__(self, user_id):
        self.user_id = user_id
        self.performance_history = self._load_performance()
    
    def get_next_question_difficulty(self, current_streak, current_accuracy):
        """
        Determine difficulty for next question based on performance.
        
        Uses a simplified IRT (Item Response Theory) approach:
        - If user gets 3+ correct in a row → increase difficulty
        - If user gets 2+ wrong in a row → decrease difficulty
        - Otherwise maintain current difficulty
        """
        if current_streak >= 3 and current_accuracy > 0.7:
            return self._increase_difficulty()
        elif current_streak <= -2 and current_accuracy < 0.4:
            return self._decrease_difficulty()
        return self._maintain_difficulty()
    
    def calculate_irt_ability(self, attempt_answers):
        """
        Calculate user's ability parameter using IRT 2PL model.
        theta = ability estimate based on responses and question difficulties
        """
        # Simplified: use weighted average of correct responses
        # weighted by question difficulty
        total_weight = 0
        weighted_score = 0
        
        for answer in attempt_answers:
            difficulty = answer.question.difficulty
            weight = 1 / (1 + math.exp(-1.7 * difficulty))  # IRT probability
            weighted_score += (1 if answer.is_correct else 0) * weight
            total_weight += weight
        
        ability = weighted_score / total_weight if total_weight > 0 else 0
        return ability
```

---

## PART 5: ROBUST TEST ENGINE

### 5.1 Test Session Management

```python
class TestSessionManager:
    """Manages test lifecycle with autosave, resume, and timeout handling."""
    
    def start_attempt(self, user, test_id, mode='practice'):
        """Start a new test attempt with session token."""
        test = Test.objects.get(id=test_id, is_published=True)
        
        # Check subscription limits
        if not self._check_usage_limit(user, test):
            raise PermissionError("Test limit reached. Upgrade to continue.")
        
        # Check for existing in-progress attempt
        existing = TestAttempt.objects.filter(
            user=user, test=test, status='in_progress'
        ).first()
        
        if existing:
            return existing  # Resume
        
        # Create new attempt
        attempt = TestAttempt.objects.create(
            user=user,
            test=test,
            session_token=uuid4().hex,
            status='in_progress',
            mode=mode,
            total_marks=test.total_marks,
            started_at=timezone.now(),
        )
        
        # Shuffle questions for this attempt
        self._shuffle_questions(attempt)
        
        return attempt
    
    def autosave_answer(self, attempt, question_id, answer_data):
        """Autosave individual answer without submitting."""
        attempt.autosave_data[str(question_id)] = {
            'answer': answer_data,
            'timestamp': timezone.now().isoformat(),
        }
        attempt.autosave_version += 1
        attempt.last_activity_at = timezone.now()
        attempt.save(update_fields=['autosave_data', 'autosave_version', 'last_activity_at'])
    
    def submit_attempt(self, attempt):
        """Submit test attempt with scoring."""
        if attempt.status != 'in_progress':
            raise ValueError("Attempt not in progress")
        
        # Calculate scores
        answers = attempt.answers.all()
        total_obtained = 0
        total_negative = 0
        
        for answer in answers:
            if answer.is_correct:
                total_obtained += answer.marks_obtained
            elif answer.is_correct is False and attempt.test.negative_marks_per_question > 0:
                total_negative += attempt.test.negative_marks_per_question
        
        score = max(0, total_obtained - total_negative)
        percentage = (score / attempt.total_marks * 100) if attempt.total_marks > 0 else 0
        
        attempt.score = score
        attempt.percentage = round(percentage, 2)
        attempt.passed = percentage >= attempt.test.passing_score
        attempt.status = 'submitted'
        attempt.submitted_at = timezone.now()
        attempt.time_taken_seconds = int(
            (attempt.submitted_at - attempt.started_at).total_seconds()
        )
        attempt.save()
        
        # Update analytics
        self._update_analytics(attempt)
        
        # Update gamification
        self._award_xp(attempt)
        
        return attempt
    
    def check_timeout(self, attempt):
        """Server-side timeout check."""
        elapsed = (timezone.now() - attempt.started_at).total_seconds()
        time_limit = attempt.test.time_limit_minutes * 60
        
        if elapsed >= time_limit and attempt.status == 'in_progress':
            attempt.status = 'expired'
            attempt.save()
            self.submit_attempt(attempt)  # Auto-submit with current answers
            return True
        return False
```

### 5.2 API Endpoints (New)

```
POST   /api/v1/tests/generate/          — AI-generate a new test
GET    /api/v1/tests/                   — List available tests (with filters)
GET    /api/v1/tests/{id}/              — Get test details
POST   /api/v1/tests/{id}/start/        — Start attempt (returns session token)
POST   /api/v1/tests/{id}/autosave/     — Autosave answer (during test)
POST   /api/v1/tests/{id}/submit/       — Submit test
GET    /api/v1/tests/{id}/result/       — Get detailed results
GET    /api/v1/tests/{id}/review/       — Review with correct answers
POST   /api/v1/tests/{id}/retry/        — Retry with same config
GET    /api/v1/tests/my-attempts/       — User's test history
GET    /api/v1/tests/my-attempts/{id}/  — Specific attempt detail

GET    /api/v1/exams/                   — List exams (by country filter)
GET    /api/v1/exams/{id}/subjects/     — Subjects for an exam
GET    /api/v1/subjects/{id}/topics/    — Topics for a subject

GET    /api/v1/analytics/performance/   — Overall performance dashboard
GET    /api/v1/analytics/topics/        — Topic-level performance
GET    /api/v1/analytics/trends/        — Performance trends over time
GET    /api/v1/analytics/recommendations/ — AI recommendations
GET    /api/v1/analytics/weak-areas/    — Identified weak areas

GET    /api/v1/subscription/            — Current subscription status
POST   /api/v1/subscription/upgrade/    — Upgrade plan
GET    /api/v1/subscription/usage/      — Current usage vs limits
```

---

## PART 6: SECURITY HARDENING

### 6.1 Unified Authentication & RBAC

```python
# Role hierarchy
ROLES = {
    'student': ['read:exams', 'read:tests', 'create:attempts', 'read:analytics'],
    'instructor': ['read:exams', 'read:tests', 'create:tests', 'read:analytics', 'read:students'],
    'admin': ['*'],  # All permissions
    'superadmin': ['*'],  # All permissions + system management
}

# Permission middleware
class PermissionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        if request.user.is_authenticated:
            permissions = ROLES.get(request.user.role, [])
            if '*' not in permissions:
                required = self._get_required_permission(request)
                if required not in permissions:
                    return JsonResponse({'error': 'Forbidden'}, status=403)
        return self.get_response(request)
```

### 6.2 Rate Limiting Strategy

```python
# Per-endpoint rate limits
RATE_LIMITS = {
    'auth:login': '5/minute',
    'auth:register': '3/hour',
    'auth:password_reset': '3/hour',
    'test:start': '10/hour',
    'test:submit': '30/hour',
    'test:autosave': '60/minute',
    'ai:generate': '5/hour (free)', '50/hour (pro)',
    'analytics:view': '100/hour',
    'admin:*': '50/hour',
    'default': '1000/day',
}
```

---

## PART 7: IMPLEMENTATION PHASES

### Phase 1: Foundation (Week 1-2)
- [ ] Archive 27 experimental Django apps
- [ ] Create new exam-centric database models
- [ ] Run migrations, seed with sample data
- [ ] Set up unified JWT auth across both frontends
- [ ] Implement RBAC middleware

### Phase 2: AI Test Generation (Week 3-4)
- [ ] Build prompt template system
- [ ] Implement AITestGenerationService with caching
- [ ] Add exam pattern configuration for 10+ exams
- [ ] Build question validation & deduplication
- [ ] Implement adaptive difficulty engine

### Phase 3: Test Engine (Week 5-6)
- [ ] Build TestSessionManager with autosave
- [ ] Implement server-side timeout handling
- [ ] Build scoring engine with negative marking
- [ ] Add test review system
- [ ] Implement question randomization

### Phase 4: Analytics (Week 7-8)
- [ ] Build topic-level performance tracking
- [ ] Implement trend analysis
- [ ] Build weak area identification
- [ ] Create AI recommendation engine
- [ ] Add percentile ranking

### Phase 5: Monetization (Week 9)
- [ ] Build subscription model & plans
- [ ] Implement usage tracking & limits
- [ ] Add payment gateway integration
- [ ] Build premium feature gating
- [ ] Create admin billing dashboard

### Phase 6: Security & Performance (Week 10)
- [ ] Audit all endpoints for security
- [ ] Implement per-endpoint rate limiting
- [ ] Add CSRF protection to Node.js
- [ ] Optimize database queries (indexes, select_related)
- [ ] Set up CDN for static assets
- [ ] Bundle analysis & code splitting for React

### Phase 7: Frontend Stabilization (Week 11-12)
- [ ] Connect React frontend to unified Django API
- [ ] Fix hardcoded data, make all data API-driven
- [ ] Implement proper loading/empty/error states
- [ ] Add responsive design improvements
- [ ] Fix Flutter backend connection

### Phase 8: QA & Launch Prep (Week 13-14)
- [ ] Write comprehensive API tests
- [ ] Load testing with Locust
- [ ] Security penetration testing
- [ ] Cross-browser testing
- [ ] Mobile responsiveness testing
- [ ] Production deployment preparation

---

## PART 8: SUCCESS METRICS

| Metric | Current | Target |
|--------|---------|--------|
| API response time (p95) | Unknown | < 200ms |
| Test generation time | N/A | < 10s |
| Concurrent test takers | Unknown | 1000+ |
| Database query time (p95) | Unknown | < 50ms |
| Frontend bundle size | Unknown | < 300KB gzipped |
| API test coverage | Unknown | > 80% |
| Zero critical security issues | No | Yes |
| AI test quality score | N/A | > 4.0/5.0 |

---

## APPENDIX: FILES TO MODIFY/CREATE

### New Files (Django Backend)
```
conductor/apps/exams/
├── __init__.py
├── models.py          # Country, Exam, Subject, Topic
├── serializers.py
├── views.py
├── urls.py
├── admin.py
└── services.py        # ExamPatternService

conductor/apps/test_engine/
├── __init__.py
├── models.py          # Test, TestQuestion, TestAttempt, AttemptAnswer
├── serializers.py
├── views.py
├── urls.py
├── services.py        # TestSessionManager, ScoringEngine
└── tasks.py           # Timeout checker, autosave cleanup

conductor/apps/analytics_v2/
├── __init__.py
├── models.py          # TopicPerformance, ExamPerformance
├── serializers.py
├── views.py
├── urls.py
├── services.py        # AnalyticsEngine, TrendAnalyzer
└── tasks.py           # Daily aggregation

conductor/apps/ai_engine/test_generation.py    # AITestGenerationService
conductor/apps/ai_engine/prompt_templates.py   # PromptTemplate system
conductor/apps/ai_engine/adaptive_difficulty.py # AdaptiveDifficultyEngine
conductor/apps/subscriptions/
├── __init__.py
├── models.py          # Subscription, UsageTracking
├── serializers.py
├── views.py
├── urls.py
└── services.py        # SubscriptionManager, UsageLimiter
```

### Modified Files
```
conductor/config/settings/base.py              # Update INSTALLED_APPS
conductor/config/urls.py                        # Add new app URLs
conductor/apps/quiz/views.py                    # Deprecate, redirect to new endpoints
conductor/apps/ai_engine/quiz_service.py        # Replace with new generation service
learninghub/backend/src/routes/index.ts         # Point to Django API
learninghub/src/services/testsAService.ts       # Update to new API format
learninghub/src/pages/TestsAPage.tsx            // Connect to real API
```

---

*End of Master Technical Audit & Implementation Plan*
