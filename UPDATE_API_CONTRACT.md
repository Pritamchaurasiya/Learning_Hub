# LEARNINGHUB STUDENT UPDATES HUB — API CONTRACT SPECIFICATION (V1.0)

> **Base Route:** `/api/v1/updates/` (with legacy fallback `/api/updates/`)  
> **Standard:** RESTful JSON with Uniform Envelope Architecture  
> **Authentication:** SimpleJWT Bearer Token (`Authorization: Bearer <token>`)  

---

## 1. UNIFORM ENVELOPE FORMAT

### Standard Success Envelope
```json
{
  "status": "success",
  "data": {},
  "message": "Human readable confirmation (optional)",
  "meta": {
    "count": 42,
    "page": 1,
    "page_size": 20,
    "total_pages": 3
  }
}
```

### Standard Error Envelope
```json
{
  "status": "error",
  "message": "Descriptive error message",
  "code": "VALIDATION_FAILED | NOT_FOUND | UNAUTHORIZED | PERMISSION_DENIED",
  "errors": {
    "field_name": ["Specific validation message"]
  }
}
```

---

## 2. PUBLIC & STUDENT ENDPOINTS

### 2.1 List Student Updates (Search & Filters)
`GET /api/v1/updates/`

- **Query Parameters:**
  - `search` (string): Text search across title, summary, institution, course.
  - `category` (string): `ACADEMIC`, `EXAMINATION`, `ADMISSION`, `SCHOLARSHIP`, `CAREER`, `COMPETITIVE_EXAMS`, `GENERAL`.
  - `sub_category` (string): `EXAM_FORM`, `ADMIT_CARD`, `TIMETABLE`, `RESULT`, `REVALUATION`, etc.
  - `institution` (string): e.g. `MGKVP`, `AKTU`, `SSC`.
  - `importance` (string): `NORMAL`, `IMPORTANT`, `URGENT`.
  - `authority_level` (integer): Filter by minimum authority level (`1`, `2`, `3`).
  - `is_verified` (boolean): `true` or `false`.
  - `has_deadline` (boolean): `true` or `false`.
  - `page` (integer, default 1).
  - `page_size` (integer, default 20, max 100).
  - `ordering` (string): `-published_at`, `-created_at`, `deadline`.

- **Response 200 OK:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "upd-b7f30a91",
      "title": "MGKVP BCA 2nd & 4th Semester Examination Form Submission Extended",
      "summary": "Mahatma Gandhi Kashi Vidyapith has extended online examination form filling for BCA even semesters up to October 15, 2026 without late fee.",
      "category": "EXAMINATION",
      "sub_category": "EXAM_FORM",
      "institution": "Mahatma Gandhi Kashi Vidyapith (MGKVP)",
      "exam": "Semester Examination 2026",
      "course": "BCA",
      "semester": "2nd & 4th",
      "authority_level": 1,
      "source_name": "MGKVP Official Notice Board",
      "source_url": "https://mgkvp.ac.in/Home/NoticeList",
      "published_at": "2026-09-28T09:30:00Z",
      "deadline": "2026-10-15T18:29:59Z",
      "importance": "IMPORTANT",
      "verification_status": "VERIFIED",
      "has_attachments": true,
      "attachment_count": 1,
      "is_bookmarked": false,
      "created_at": "2026-09-28T10:00:00Z"
    }
  ],
  "meta": {
    "count": 1,
    "page": 1,
    "page_size": 20,
    "total_pages": 1
  }
}
```

---

### 2.2 Get Notice Details & Cross-Feature Links
`GET /api/v1/updates/{id}/`

- **Response 200 OK:**
```json
{
  "status": "success",
  "data": {
    "id": "upd-b7f30a91",
    "title": "MGKVP BCA 2nd & 4th Semester Examination Form Submission Extended",
    "summary": "Mahatma Gandhi Kashi Vidyapith has extended online examination form filling for BCA even semesters up to October 15, 2026 without late fee.",
    "ai_summary": "Official notice confirms extension of BCA semester exam forms to 15-Oct-2026. Hard copy submission to college counter required by 17-Oct-2026.",
    "is_ai_summarized": true,
    "category": "EXAMINATION",
    "sub_category": "EXAM_FORM",
    "institution": "Mahatma Gandhi Kashi Vidyapith (MGKVP)",
    "course": "BCA",
    "semester": "2nd & 4th",
    "session": "2025-2026",
    "authority_level": 1,
    "source_name": "MGKVP Official Notice Board",
    "source_url": "https://mgkvp.ac.in/Home/NoticeList",
    "published_at": "2026-09-28T09:30:00Z",
    "last_checked_at": "2026-09-28T18:00:00Z",
    "deadline": "2026-10-15T18:29:59Z",
    "event_date": null,
    "importance": "IMPORTANT",
    "verification_status": "VERIFIED",
    "version": 1,
    "attachments": [
      {
        "id": "att-8f12a",
        "title": "Official Notification Circular No. 492/Exam/2026.pdf",
        "file_url": "https://mgkvp.ac.in/Uploads/Notice/492_BCA_Exam.pdf",
        "file_size_bytes": 482910,
        "mime_type": "application/pdf"
      }
    ],
    "history": [],
    "cross_features": {
      "related_tests": [
        {
          "id": "test-bca-dbms-midterm",
          "title": "BCA Semester DBMS Practice Assessment",
          "category": "BCA",
          "duration_minutes": 60,
          "total_marks": 100
        }
      ],
      "related_ebooks": [
        {
          "id": "ebk-dbms-korth",
          "title": "Database System Concepts - BCA Edition",
          "author": "LearningHub Editorial",
          "cover_url": "/assets/covers/dbms.png"
        }
      ],
      "related_courses": []
    },
    "user_state": {
      "is_bookmarked": false,
      "has_reminder": false,
      "reminder_at": null
    }
  }
}
```

---

### 2.3 Personalized "For You" Feed
`GET /api/v1/updates/feed/` (Requires Auth)

- Matches updates against student's target university, target exam, followed courses, and notification preferences.
- **Response 200 OK:** Returns ranked updates prioritized by urgency and personal relevance.

---

### 2.4 Deadlines Timeline
`GET /api/v1/updates/deadlines/`

- Returns chronologically ordered updates that have an active or upcoming deadline (`Today`, `In 3 Days`, `This Week`, `Next Week`).

---

### 2.5 Bookmarks Management
- `GET /api/v1/updates/bookmarks/` — List bookmarked updates with custom notes and collection tags.
- `POST /api/v1/updates/{id}/bookmark/` — Add or toggle bookmark. Body: `{"notes": "Submit before 12th", "tag": "Exam"}`.
- `DELETE /api/v1/updates/{id}/bookmark/` — Remove bookmark.

---

### 2.6 Deadline Reminder Subscriptions
- `POST /api/v1/updates/{id}/reminder/`
  - Body: `{"reminder_types": ["3_DAYS_BEFORE", "1_DAY_BEFORE", "DAY_OF"]}`
  - Schedules background reminders via Celery.
- `DELETE /api/v1/updates/{id}/reminder/` — Cancel reminders.

---

### 2.7 Follow Subscriptions
- `GET /api/v1/updates/subscriptions/` — List followed entities.
- `POST /api/v1/updates/subscriptions/`
  - Body: `{"target_type": "INSTITUTION", "target_value": "MGKVP"}` or `{"target_type": "EXAM", "target_value": "SSC CGL"}`.
- `DELETE /api/v1/updates/subscriptions/{id}/` — Unfollow.

---

## 3. ADMIN MANAGEMENT ENDPOINTS (RBAC: `IsAdminUserRole`)

- `GET /api/v1/updates/admin/sources/` — View all sources with health metrics, last check latency, and error counts.
- `POST /api/v1/updates/admin/sources/` — Register new official source.
- `PATCH /api/v1/updates/admin/sources/{id}/` — Enable/disable or adjust polling frequency.
- `POST /api/v1/updates/admin/ingest/` — Trigger immediate manual polling run for a source.
- `POST /api/v1/updates/admin/{id}/approve/` — Approve drafted/quarantined notice for public delivery.
- `POST /api/v1/updates/admin/{id}/cross-link/` — Bind LearningHub Test, Ebook, or Course ID to the update.
