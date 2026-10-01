# LearningHub V15 — API Contract, OpenAPI & WebSockets Report (Phase 9)

**Generated:** 2026-09-28  
**Architecture:** RESTful DRF v1 + Daphne ASGI WebSockets

---

## 1. REST Endpoints Standard

All responses conform to the canonical response schema:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "meta": { "count": 20, "page": 1 }
}
```

Error responses conform to:

```json
{
  "success": false,
  "error": "Error message details",
  "code": "ERROR_CODE",
  "status_code": 400
}
```

---

## 2. API Contract Inventory

| Method | Endpoint | Auth Required | Description |
| :---: | :--- | :---: | :--- |
| `POST` | `/api/v1/auth/login/` | No | JWT access + refresh issuance |
| `POST` | `/api/v1/auth/refresh/` | No | JWT access token rotation |
| `GET` | `/api/v1/courses/` | No | List published courses |
| `GET` | `/api/v1/courses/:id/lessons/` | No/Yes | Syllabus with protected video URLs |
| `POST` | `/api/v1/courses/enroll/` | Yes | Enroll in course |
| `GET` | `/api/v1/tests-engine/tests/` | No | List published exams |
| `POST` | `/api/v1/tests-engine/attempts/start/`| Yes | Begin proctored test attempt |
| `POST` | `/api/v1/tests-engine/attempts/:id/submit/`| Yes | Submit test and calculate 3PL IRT |
| `GET` | `/api/v1/problems/` | No | List DSA problem catalog |
| `POST` | `/api/v1/problems/:id/submit/`| Yes | Evaluate code against testcases in sandbox |
| `POST` | `/api/v1/ai-tutor/query/` | Yes | AI Mentor multi-turn query |
| `GET` | `/api/v1/ebooks/` | No | List published textbooks |
| `GET` | `/api/v1/ebooks/:id/chapters/:order/`| No | Fetch chapter text content |
| `GET` | `/api/v1/gamification/leaderboard/`| No | Ranked leaderboard standings |

---

## 3. WebSockets & Channels

- **Protocol**: `ws://` / `wss://` via Daphne ASGI.
- **Routes**:
  - `/ws/notifications/`: Real-time toast alerts and streak updates.
  - `/ws/live/:session_id/`: Live interactive classroom audio/video signaling.
  - `/ws/collab/:room_id/`: Real-time collaborative code editor syncing.
