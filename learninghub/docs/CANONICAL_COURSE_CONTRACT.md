# LearningHub — Canonical Course Domain API Contract

This document defines the **single source of truth** for the course domain API contract.

## Goals

1. Frontend works against either backend without conditional code
2. Course progress is **server-computed** (anti-cheat)
3. Enrollment is atomic (prevents duplicates)
4. Both backends return identical response shapes

## Course Model Comparison

| Feature | Node Backend | Django Backend | Status |
|---------|--------------|----------------|--------|
| Course entity (Test-centric shape) | `Test` (misnamed) | `Course` | PARTIAL — requires Course model migration — tracked, not P0 |
| Chapter model | ❌ Not present | ✅ `Chapter` | DJANGO BETTER |
| Lesson model | ❌ Not present | ✅ `Lesson` | DJANGO BETTER |
| Enrollment model | ❌ Uses `TestResult` | ✅ `Enrollment` | DJANGO BETTER |
| LessonProgress | ❌ Not present | ✅ `LessonProgress` | DJANGO BETTER |
| CourseBookmark | ❌ Not present | ✅ `CourseBookmark` | DJANGO BETTER |

**Migration recommendation:** Node should adopt Django's course architecture (or keep both backends in their current state and migrate features).

## Endpoints

### `GET /api/v1/courses`

**Request Query:**
- `page` (default 1)
- `limit` (default 10, max 50)
- `search` (search by title)
- `category` (filter by category/exam name)
- `difficulty` (filter by difficulty)

**Response 200:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "course-1",
      "title": "Course Title",
      "description": "...",
      "difficulty": "MEDIUM",
      "category": "DSA",
      "instructor": "Faculty Name",
      "thumbnail_url": "...",
      "level": "Intermediate",
      "price": 0,
      "rating": 4.8,
      "student_count": 1420,
      "duration_hours": 45,
      "is_published": true
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "pages": 10
  }
}
```

### `GET /api/v1/courses/:id`

**Response 200:**
```json
{
  "status": "success",
  "data": {
    "id": "course-1",
    "title": "Course Title",
    "description": "...",
    "category": "DSA",
    "level": "Intermediate",
    "price": 0,
    "rating": 4.8,
    "review_count": 128,
    "student_count": 1420,
    "duration_hours": 45,
    "is_published": true,
    "is_enrolled": false,
    "progress": 0.0,
    "is_bookmarked": false,
    "sections": [
      {
        "id": "ch-1",
        "title": "Chapter 1",
        "lessons": [
          { "id": "lsn-1", "title": "Lesson 1", "duration": 15, "is_free": false, "completed": false, "order": 1 }
        ]
      }
    ]
  }
}
```

### `POST /api/v1/courses/enroll` and `POST /api/v1/courses/:id/enroll`

**Request:**
```json
{ "courseId": "course-1" }
// or
{ "course_id": "course-1" }
```

**Response 201 (new enrollment):**
```json
{
  "status": "success",
  "data": {
    "enrolled": true,
    "courseId": "course-1",
    "course_id": "course-1",
    "enrollment_id": "enr-1",
    "progress": 0.0,
    "message": "Enrolled in course successfully"
  }
}
```

**Response 200 (already enrolled):**
Same shape, `data.message: "Already enrolled"`

### `POST /api/v1/lessons/:lessonId/progress`

**Request:**
```json
{ "completed": true }
```

**Response 200:**
```json
{
  "status": "success",
  "data": {
    "lessonId": "lsn-1",
    "completed": true,
    "courseProgress": 25.0  // server-computed from actual lesson completions
  }
}
```

**SECURITY:** Progress is **server-computed**. The actual progress is calculated as:
`progress = (completed_lessons / total_lessons) * 100`

This prevents users from claiming more progress than they actually earned.

### `POST /api/v1/courses/:id/progress`

**Request:**
```json
{ "progress": 25.0 }
```

**Response 200:**
```json
{
  "status": "success",
  "data": {
    "progress": 25.0,
    "server_computed": 25.0
  }
}
```

**SECURITY (Intentional Divergence — PARTIAL parity):**
- **Django** (`django_backend/apps/courses/views.py:204:CourseProgressView.post`): If `progress > server_progress` → **403 FORBIDDEN** `PROGRESS_INFLATION_BLOCKED` (rejects inflation).
- **Node** (`backend/src/services/CourseService.ts:233:CourseService.updateProgress`): Returns **200** with capped value `final = min(client, server_computed)` (never 403; silently caps). Also throws if `progress >=100` without `passed`.
- Client can only DECREASE progress or set to exact server-computed value via this endpoint; use `POST /lessons/:id/progress` (Django) or legitimate test passing (Node) to increase.

### `GET /api/v1/courses/:id/progress`

**Response 200:**
```json
{
  "status": "success",
  "data": {
    "progress_percent": 25.0,
    "completed_lessons": 1,
    "total_lessons": 4,
    "server_computed": true
  }
}
```

## Anti-Cheat: Progress Validation

**Rule:** Server-computed progress is the source of truth.

**Implementation:**

1. **Node backend** (`backend/src/services/CourseService.ts:233:CourseService.updateProgress` — Test-centric model):
    - Cannot claim 100% without passing test (`if clampedProgress >=100 && !passed → throw`)
    - Server-computed progress **caps** client claim: `final = min(client, server_computed)`
    - **Returns 200** with capped value — intentional divergence (caps rather than rejects)

2. **Django backend** (`django_backend/apps/courses/views.py:204:CourseProgressView.post` — Course/Lesson model):
    - Computes `server_progress = (completed_lessons / total_lessons) * 100`
    - **Rejects with 403** `PROGRESS_INFLATION_BLOCKED` if `progress > server_progress`
    - Intentional divergence: Django's Course model rejects, Node's Test-centric model caps

## Anti-Cheat: Enrollment Validation

1. **Atomic enrollment:** `get_or_create` ensures no duplicate enrollments
2. **Test must exist:** Cannot enroll in non-existent or unpublished courses
3. **Authenticated required:** Anonymous enrollment rejected

## Backend Implementation Matrix

| Endpoint | Node Backend | Django Backend | Status |
|----------|--------------|----------------|--------|
| GET /courses | ✅ | ✅ | ALIGNED |
| GET /courses/:id | ✅ | ✅ | ALIGNED |
| POST /courses/enroll | ✅ | ✅ | ALIGNED (now with proper data) |
| GET /courses/:id/progress | ✅ | ✅ | ALIGNED (now server-computed) |
| POST /courses/:id/progress | ✅ Anti-cheat (200 capped `min(client,server)`) | ✅ Anti-cheat (403 `PROGRESS_INFLATION_BLOCKED`) | PARTIAL — intentional divergence: Node caps (Test model), Django rejects (Course model) |
| POST /lessons/:id/progress | ❌ No lesson model | ✅ | DJANGO ONLY |
| GET /courses/categories | ❌ | ✅ | DJANGO ONLY |
| POST /courses/:id/bookmark | ❌ | ✅ | DJANGO ONLY |
| GET /courses/featured | ✅ | ❌ | NODE ONLY |
| GET /courses/trending | ✅ | ❌ | NODE ONLY |
| Course Test-centric shape | ✅ Test model | ✅ Course model | PARTIAL — requires Course model migration — tracked, not P0 |

**Frontend will need feature detection** to use backend-specific features, OR we need to add missing endpoints to align.

## Migration Path

Phase 1 (DONE in this cycle):
- Add server-side progress validation to Node `updateProgress`
- Add server-side progress validation to Django `CourseProgressView.post`
- Fix Node `enroll` to return proper response data
- Add 13 course security tests

Phase 2 (TODO):
- Add Lesson/Chapter models to Node backend
- Add bookmark endpoint to Node
- Add categories endpoint to Node
- Add featured/trending to Django
- Migrate to Django-style course architecture in Node

Phase 3 (TODO):
- Comprehensive course journey E2E tests
- Anti-cheat logging and monitoring
