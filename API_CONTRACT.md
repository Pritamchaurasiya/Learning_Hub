# LEARNINGHUB V8.0 — COMPLETE ENTERPRISE API CONTRACT

> **API Base URL:** `/api/v1/` & legacy fallback `/api/`  
> **Documentation Engine:** OpenAPI 3.0 / DRF Spectacular at `/api/docs/` and `/api/schema/`  
> **Canonical Backend:** Django REST Framework (`learninghub/django_backend`)  
> **Envelope Format:** Uniform JSON envelope across all endpoints  
> **Target Release:** LearningHub V8.0 Enterprise (September 2026)  

---

## 1. UNIFORM RESPONSE & ERROR ENVELOPES

### 1.1 Standard Success Envelope
```json
{
  "status": "success",
  "data": {},
  "message": "Human readable confirmation (optional)",
  "meta": {
    "count": 42,
    "page": 1,
    "page_size": 20
  }
}
```

### 1.2 Standard Error Envelope
```json
{
  "status": "error",
  "message": "Descriptive error message",
  "code": "ERROR_ENUM_CODE",
  "errors": {
    "field_name": ["Validation error message"]
  }
}
```

---

## 2. AUTHENTICATION CONTRACT (`/api/v1/auth/`)

### `POST /api/v1/auth/register/`
- **Request Body:**
  ```json
  {
    "email": "student@example.com",
    "password": "StrongPassword123!",
    "username": "student1",
    "role": "STUDENT"
  }
  ```
- **Response 201 Created:**
  ```json
  {
    "status": "success",
    "data": {
      "user": {
        "id": 1,
        "email": "student@example.com",
        "username": "student1",
        "role": "STUDENT"
      },
      "tokens": {
        "access": "eyJhbGciOi...",
        "refresh": "eyJhbGciOi..."
      }
    }
  }
  ```

### `POST /api/v1/auth/login/`
- **Request Body:**
  ```json
  {
    "email": "student@example.com",
    "password": "StrongPassword123!"
  }
  ```
- **Response 200 OK:** Returns user object, access token, and rotated refresh token.

### `POST /api/v1/auth/refresh/`
- **Request Body:** `{"refresh": "eyJhbGciOi..."}`
- **Response 200 OK:** Returns newly rotated `access` and `refresh` token pair.

### `POST /api/v1/auth/logout/`
- **Request Body:** `{"refresh": "eyJhbGciOi..."}`
- **Response 200 OK:** Blacklists refresh token in Redis and database.

---

## 3. TEST A+ ASSESSMENT ENGINE CONTRACT (`/api/v1/tests/`)

### `GET /api/v1/tests/`
- **Query Params:** `category`, `difficulty`, `mode` (`PRACTICE`, `MOCK_EXAM`, `ADAPTIVE_CAT`), `search`, `page`, `page_size`
- **Response 200 OK:**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "title": "National Engineering Full Mock Test 2026",
        "description": "Timed full-syllabus mock assessment following national entrance test patterns.",
        "duration_minutes": 180,
        "total_marks": 300,
        "pass_marks": 120,
        "negative_marking": true,
        "negative_marking_rate": 0.25,
        "question_count": 75,
        "mode": "MOCK_EXAM",
        "difficulty": "HARD",
        "is_published": true
      }
    ]
  }
  ```

### `POST /api/v1/tests/<id>/start/`
- **Headers:** `Authorization: Bearer <token>`
- **Response 201 Created:**
  ```json
  {
    "status": "success",
    "data": {
      "attempt_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "test_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "title": "National Engineering Full Mock Test 2026",
      "status": "IN_PROGRESS",
      "started_at": "2026-09-19T21:00:00Z",
      "duration_minutes": 180,
      "time_remaining_seconds": 10800,
      "questions": [
        {
          "id": "q-phy-101",
          "order": 1,
          "question_text": "Calculate the escape velocity from Earth's surface in $\\text{km/s}$:",
          "question_type": "MCQ",
          "marks": 4.0,
          "negative_marks": 1.0,
          "options": [
            {"id": "opt-1", "text": "$9.8\\text{ km/s}$", "order": 1},
            {"id": "opt-2", "text": "$11.2\\text{ km/s}$", "order": 2},
            {"id": "opt-3", "text": "$14.1\\text{ km/s}$", "order": 3},
            {"id": "opt-4", "text": "$7.9\\text{ km/s}$", "order": 4}
          ]
        }
      ],
      "saved_answers": {}
    }
  }
  ```

### `POST /api/v1/tests/attempts/<id>/autosave/`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body (Debounced batch or single answer):**
  ```json
  {
    "answers": {
      "q-phy-101": {"selected_option_id": "opt-2", "time_spent_ms": 14200},
      "q-math-102": {"numerical_value": "42.5", "time_spent_ms": 28400}
    },
    "telemetry": {
      "tab_switch_count": 0,
      "blur_duration_ms": 0,
      "fullscreen_exit_count": 0
    }
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "status": "success",
    "data": {
      "attempt_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "saved_count": 2,
      "server_timestamp": "2026-09-19T21:05:42Z"
    }
  }
  ```

### `POST /api/v1/tests/attempts/<id>/submit/`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:** Final answers dictionary and client completion timestamp.
- **Response 200 OK:**
  ```json
  {
    "status": "success",
    "data": {
      "attempt_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "score": 248.0,
      "max_score": 300.0,
      "accuracy_percentage": 86.4,
      "percentile": 98.7,
      "correct_count": 64,
      "incorrect_count": 6,
      "unanswered_count": 5,
      "status": "EVALUATED",
      "xp_awarded": 350
    }
  }
  ```

---

## 4. EBOOK SUPREME CONTRACT (`/api/v1/ebooks/`)

### `GET /api/v1/ebooks/`
- **Query Params:** `category`, `search`, `page`, `page_size`
- **Response 200 OK:** List of published technical textbooks with chapter count and estimated reading hours.

### `GET /api/v1/ebooks/<id>/`
- **Response 200 OK:** Book metadata, author biography, and nested chapter table of contents.

### `GET /api/v1/ebooks/<id>/chapters/<chapter_number>/`
- **Response 200 OK:** Chapter title, structured content (Markdown + KaTeX), word count, reading time estimate, and pre-extracted glossary terms.

### `POST /api/v1/ebooks/progress/`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "ebook_id": "c7b89e24-4f1b-419b-a621-391807d3b0e1",
    "chapter_id": "a9018e42-9901-4b12-b103-018293746a81",
    "scroll_percentage": 74.2,
    "last_read_char_offset": 6240,
    "active_dwell_seconds": 210,
    "wpm": 245
  }
  ```
- **Response 200 OK:** Confirms updated progress and returns recalculated book completion percentage.

### `GET /api/v1/ebooks/<id>/highlights/`
- **Headers:** `Authorization: Bearer <token>`
- **Response 200 OK:** Returns all user highlights for the book with anchor offsets, colors, and notes.

### `POST /api/v1/ebooks/highlights/`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "ebook_id": "c7b89e24-4f1b-419b-a621-391807d3b0e1",
    "chapter_id": "a9018e42-9901-4b12-b103-018293746a81",
    "selected_text": "The time complexity of quickselect is O(N) average case.",
    "start_char_offset": 1240,
    "end_char_offset": 1297,
    "color": "yellow",
    "note": "Remember to cite Hoare partition proof."
  }
  ```
- **Response 201 Created:** Returns created highlight object with assigned UUID.

### `DELETE /api/v1/ebooks/highlights/<id>/`
- **Headers:** `Authorization: Bearer <token>`
- **Response 204 No Content:** Deletes highlight.

---

## 5. AI TUTOR & SPACED REPETITION CONTRACT (`/api/v1/ai-tutor/`)

### `POST /api/v1/ai-tutor/chat/`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "session_id": "ses-uuid-optional",
    "message": "Can you explain why the probability distribution integrates to 1 in continuous systems?",
    "cognitive_mode": "ANALOGY",
    "language": "EN",
    "context": {
      "ebook_id": "c7b89e24-4f1b-419b-a621-391807d3b0e1",
      "chapter_id": "a9018e42-9901-4b12-b103-018293746a81"
    }
  }
  ```
- **Response 200 OK:** Returns AI response message, generated KaTeX formula blocks, and suggested follow-up Socratic questions.

### `POST /api/v1/ai-tutor/generate-quiz/`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:** `{"chapter_id": "a9018e42-9901-4b12-b103-018293746a81", "question_count": 3}`
- **Response 200 OK:** Returns mini active-recall diagnostic quiz directly aligned with chapter concepts.

---

## 6. GAMIFICATION & ANALYTICS CONTRACT

### `GET /api/v1/gamification/profile/`
- **Headers:** `Authorization: Bearer <token>`
- **Response 200 OK:** Returns user XP, current level, daily streak count, badges earned, and next badge goal.

### `GET /api/v1/gamification/leaderboard/`
- **Query Params:** `timeframe` (`WEEKLY`, `ALL_TIME`), `scope` (`GLOBAL`, `FRIENDS`)
- **Response 200 OK:** Top 50 students ranked by XP with user's personal rank included.

### `GET /api/v1/analytics/overview/`
- **Headers:** `Authorization: Bearer <token>`
- **Response 200 OK:** 6-axis capability radar, BKT concept mastery percentages, reading velocity trends, and predicted exam readiness score.
