# LearningHub — Canonical Test Engine API Contract

This document defines the **single source of truth** for the test engine API contract that both backends (Node/Express and Django REST) must implement and the frontend must consume.

## Goals

1. Frontend works against either backend without conditional code.
2. Test attempts are idempotent — duplicate submissions don't corrupt data.
3. Autosave is race-condition safe with concurrent requests.
4. Both backends return identical response shapes for the same endpoints.

## Endpoints

### `POST /api/v1/tests/:id/start`

**Request:** Empty body or `{ attemptId?: string }`

**Response 201 (new attempt) or 200 (resume):**
```json
{
  "status": "success",
  "data": {
    "attempt_id": "att-xxx",
    "attemptId": "att-xxx",  // canonical: camelCase alias
    "attempt_number": 1,
    "questions": [
      {
        "id": "q-1",
        "text": "Question text",
        "type": "MCQ",
        "difficulty": 0.5,
        "points": 10,
        "order": 1,
        "options": [
          { "id": "opt-1", "text": "Option A", "order": 1 },
          { "id": "opt-2", "text": "Option B", "order": 2 }
        ]
      }
    ],
    "answers": {},
    "answered_count": 0,
    "time_limit": 60,
    "time_limit_minutes": 60,  // canonical: alias
    "time_limit_seconds": 3600,
    "time_remaining_seconds": 3600,
    "total_marks": 100,
    "mode": "PRACTICE"
  }
}
```

**Status codes:**
- `201` — new attempt created
- `200` — resumed in-progress attempt
- `403` — max attempts reached (code: `MAX_ATTEMPTS_REACHED`)
- `404` — test not found

**Race condition handling:** Backend MUST use `SELECT FOR UPDATE` (Django) or transaction with `findFirst` check (Node) to prevent concurrent `start` calls from creating duplicate attempts.

### `POST /api/v1/tests/:id/autosave`

**Request:**
```json
{
  "answers": {
    "q-1": "opt-1",           // single MCQ
    "q-2": ["opt-1", "opt-2"], // multi-select
    "q-3": "free text"          // subjective/text
  },
  "attempt_id": "att-xxx"       // or "attemptId"
}
```

**Response 200:**
```json
{
  "status": "success",
  "data": {
    "saved": true,             // canonical: boolean for UI state
    "saved_count": 3,          // canonical: count for analytics
    "attempt_id": "att-xxx"
  },
  "message": "Answer autosaved"
}
```

**Status codes:**
- `200` — answers saved
- `400` — invalid input (validation failed)
- `404` — no active attempt

**Race condition handling:**
- Backend MUST process answer entries **sequentially** within a transaction
- `Promise.all` on entries with same `testResultId_questionId` key causes race conditions
- The unique constraint `(testResultId, questionId)` ensures data integrity at DB level

**Idempotency:** Calling autosave with the same answers multiple times is safe — upsert replaces.

### `POST /api/v1/tests/:id/submit`

**Request:**
```json
{
  "answers": {
    "q-1": "opt-1",
    "q-2": "opt-2"
  },
  "timeTaken": 1200,
  "time_taken": 1200,          // alias
  "attempt_id": "att-xxx",
  "confidences": { "q-1": "high", "q-2": "low" },
  "timesSpent": { "q-1": 30, "q-2": 45 }
}
```

**Response 201 (new submission) or 200 (duplicate):**
```json
{
  "status": "success",
  "data": {
    "attempt_id": "att-xxx",
    "attemptId": "att-xxx",
    "test_id": "test-1",
    "testId": "test-1",
    "test_title": "Test Title",
    "mode": "PRACTICE",
    "status": "SUBMITTED",
    "score": 80,
    "total_marks": 100,
    "totalMarks": 100,
    "percentage": 80.0,
    "accuracy": 80.0,
    "passed": true,
    "time_taken": 1200,
    "timeTaken": 1200,
    "time_limit": 60,
    "predictedRank": 1234,
    "irtAbilityTheta": 0.5,
    "correct_count": 8,
    "correctCount": 8,
    "incorrect_count": 2,
    "unanswered_count": 0,
    "total_questions": 10,
    "question_results": [
      {
        "question_id": "q-1",
        "questionId": "q-1",
        "question_text": "...",
        "questionText": "...",
        "question_type": "mcq",
        "questionType": "mcq",
        "selected_options": [{"id": "opt-1", "text": "..."}],
        "selectedOptions": [{"id": "opt-1", "text": "..."}],
        "correct_options": [{"id": "opt-2", "text": "..."}],
        "correctOptions": [{"id": "opt-2", "text": "..."}],
        "is_correct": true,
        "isCorrect": true,
        "marks_obtained": 10,
        "marksObtained": 10,
        "explanation": "...",
        "time_spent": 30,
        "timeSpent": 30,
        "is_flagged": false,
        "isFlagged": false,
        "topic": "Algebra"
      }
    ],
    "xpEarned": 50
  },
  "message": "Test evaluated and scored successfully"
}
```

**Status codes:**
- `201` — first submission
- `200` — duplicate submission (idempotent)
- `400` — invalid input
- `403` — max attempts reached
- `404` — test/attempt not found

**Idempotency:** Backend MUST check if attempt is in terminal state (`SUBMITTED`, `EXPIRED`, `ABANDONED`, `TIMEOUT`) and return existing result without re-scoring. Over-time attempts are valid in **either** encoding — `TIMEOUT` **or** `SUBMITTED` + `time_overrun: true` (see ANTI_CHEAT_TIMER.md Rule 2) — and both count as terminal. This prevents:
- XP farming exploits
- Double scoring
- Data corruption

### `GET /api/v1/tests/:id/result`

**Response 200:** Same shape as submit response (uses normalized data)

### `GET /api/v1/tests/attempts`

**Response 200:**
```json
{
  "status": "success",
  "data": {
    "results": [
      {
        "id": "att-1",
        "test": "test-1",
        "test_title": "Test Title",
        "score": 80,
        "total_marks": 100,
        "percentage": 80.0,
        "passed": true,
        "time_taken_seconds": 1200,
        "attempt_number": 1,
        "started_at": "2026-01-01T00:00:00Z",
        "submitted_at": "2026-01-01T00:20:00Z"
      }
    ],
    "totalXp": 250
  }
}
```

## Backend Implementation Matrix

| Endpoint | Node Backend | Django Backend | Status |
|----------|--------------|----------------|--------|
| POST /:id/start | ✅ Race-safe with transaction + findFirst check | ✅ Race-safe with select_for_update | ALIGNED |
| POST /:id/autosave | ✅ Sequential processing, upsert pattern | ✅ update_or_create pattern | ALIGNED (now) |
| POST /:id/submit | ✅ isDuplicate idempotency check | ✅ already_submitted check | ALIGNED |
| GET /:id/result | ✅ Returns full result with questions | ✅ Via TestAttemptDetailView | ALIGNED |
| GET /attempts | ✅ Returns history with test info | ✅ Returns history with test info | ALIGNED |

## Frontend Behavior

The frontend (`src/services/testsAService.ts`) will:

1. **Send `attempt_id` (snake_case)** as canonical field on submit/autosave
2. **Accept both `attemptId` and `attempt_id`** in start response
3. **Read `data.saved: boolean`** for autosave success state
4. **Read `data.saved_count: number`** for analytics
5. **Use `submitAttempted` ref** to prevent double-submit in React
6. **Run autosave every 30 seconds** via setInterval

## Security Requirements

1. **Authorization:** All endpoints require `IsAuthenticated` permission
2. **Rate Limiting:**
   - Test mutation (start, autosave, submit): 30/min per user
   - Test read: 60/min per user
3. **Anti-cheat:**
   - Backend must validate `timeTaken` against `startedAt`
   - Backend must validate `attempt_id` belongs to requesting user
   - Backend must prevent submission after timer expires (server-side check)

## Timer Enforcement

**CRITICAL:** Timer expiry must be enforced by backend logic, not just frontend.

**Implementation:**
```typescript
// Backend (canonical)
const expiresAt = new Date(result.startedAt.getTime() + test.timeLimit * 60 * 1000)
if (new Date() > expiresAt && result.status === 'IN_PROGRESS') {
  // Auto-submit or mark as TIMEOUT
  await prisma.testResult.update({
    where: { id: result.id },
    data: { status: 'TIMEOUT' }
  })
  return error_response('Test time has expired', 410)
}
```

## Migration Path

Phase 1 (DONE in this cycle):
- Align autosave response shape between backends
- Add Zod validation for autosave
- Sequential processing to prevent race conditions
- Add canonical contract documentation

Phase 2 (TODO):
- Verify Django timer enforcement
- Add Django views for /result and /attempts if missing
- Add anti-cheat server-side timer validation
- Add integration tests for both backends
