# LearningHub Student Updates Hub (Architecture & Technical Specification)

## 1. Executive Overview
The **Student Updates Hub** is an academic command center within LearningHub designed to solve circular and notice fragmentation for university students (initially targeting MGKVP, AKTU, and expanding to NTA, SSC, and state university boards).

Instead of relying on chaotic WhatsApp groups, misleading YouTube videos, and cluttered, slow university portals, students get a unified, verified, chronological, and noise-filtered stream of:
1. **Exam Timetable Releases & Revisions**
2. **Admit Card & Registration Cutoffs**
3. **Revaluation & Scrutiny Deadlines**
4. **Syllabus & Curriculum Changes**
5. **Scholarship (UP Scholarship / NSP) & Fee Submission Notices**

Crucially, every update is verified with official digital source attribution, cryptographic change-tracking (SHA-256), strict SSRF-safe ingestion, and direct synergy bridges into LearningHub's core study apps (**Test A+** assessment generator, **Ebooks** syllabus notes, and **Study Planner** auto-scheduling).

---

## 2. Core Philosophy & Anti-Noise Safeguards

### A. Non-Authoritative Transparency Policy
- LearningHub **never** poses as the primary university authority.
- Every card prominently features a "Source & Verification" badge with the official domain (e.g. `mgkvp.ac.in`).
- A direct canonical link opens the university's original circular/PDF in a new secure tab.
- Disclaimers highlight that circulars are automatically ingested and verified from public endpoints.

### B. Anti-Noise Notification Rules
1. **Single Notification Cap:** Maximum of 1 reminder notification per update unless a critical official date change (extension or postponement) is detected.
2. **Night Silence Window:** Background notification dispatchers automatically suppress non-critical push/SMS alerts between 22:00 (10 PM) and 07:00 (7 AM) IST.
3. **Deterministic Deduplication:** Ingestion uses normalized notice titles, dates, and content hashes (SHA-256) to ensure zero duplicates even if universities repost identical notices.
4. **Targeted Subscriptions:** Students only receive push notifications for authorities and courses they explicitly follow (e.g. MGKVP BCA Semester 6).

---

## 3. System Architecture

```
                    +------------------------------+
                    | Official University Portals   |
                    | (e.g. mgkvp.ac.in/notices)   |
                    +--------------+---------------+
                                   | HTTP/HTML / RSS (Periodic Poll)
                                   v
             +-------------------------------------------+
             | Celery Ingestion Workers (tasks.py)        |
             |  - Rate-limited fetch (max 1 req/sec)     |
             |  - SSRF URL Validator (Private IP block)  |
             +---------------------+---------------------+
                                   |
                                   v
             +-------------------------------------------+
             | Notice Parsers & Normalizers              |
             |  - MGKVPNoticeParser (Table / DOM parser) |
             |  - RSSFeedParser (XML / Feed parser)      |
             |  - Flexible Indian Date Parsing Engine    |
             |  - Automated Course/Semester Tagging      |
             +---------------------+---------------------+
                                   |
                                   v
             +-------------------------------------------+
             | StudentUpdateService (services.py)        |
             |  - SHA-256 Hash Matching                  |
             |  - UpdateVersion History Creation         |
             |  - Change Detection (Title, Date, Links)  |
             +---------------------+---------------------+
                                   |
                                   v
             +-------------------------------------------+
             | PostgreSQL Canonical Models               |
             |  - UpdateSource, StudentUpdate            |
             |  - UpdateVersion, UpdateAttachment        |
             |  - UpdateBookmark, UpdateReminder         |
             |  - UpdateSubscription, UpdateCrossLink    |
             +---------------------+---------------------+
                                   |
                                   v
             +-------------------------------------------+
             | Django REST Framework API Layer          |
             |  - /api/v1/updates/                       |
             |  - /api/v1/updates/timeline/              |
             |  - /api/v1/updates/feed/                  |
             |  - /api/v1/updates/statistics/            |
             |  - /api/v1/updates/<id>/bookmark/         |
             |  - /api/v1/updates/<id>/reminder/         |
             |  - /api/v1/updates/subscriptions/         |
             +---------------------+---------------------+
                                   |
                                   v
             +-------------------------------------------+
             | React + Tailwind + TypeScript Frontend    |
             |  - StudentUpdatesPage (All, For You, etc.)|
             |  - UpdateDetailsPage (Audit trail, PDF)   |
             |  - UpdateTimeline (Deadlines & countdown) |
             |  - UpdateReminderModal (Anti-noise alerts)|
             |  - UpdateCrossFeaturesWidget (Synergy)    |
             +-------------------------------------------+
```

---

## 4. Cross-Feature Ecosystem Synergy

The Student Updates Hub connects circulars directly to actionable LearningHub learning features via `UpdateCrossLink`:

1. **Test A+ Mock Assessment Bridge:**
   - Exam timetable and syllabus notices include a 1-click action: `"Generate Test A+ Practice Paper for [Course]"`.
   - Pre-seeds chapter and unit boundaries into the AI Test Generator modal.

2. **Ebook & Syllabus Library Bridge:**
   - Syllabi, marking schemes, and question paper blueprint notices link straight into relevant digital textbooks and curated study units (`/library` and `/ebooks/:id`).

3. **Study Planner Integration:**
   - Deadlines (e.g. "Admit Card Download Cutoff", "Semester Examination Starts") allow 1-click addition into the user's personal Study Planner calendar (`/study-planner`).

---

## 5. Security & Reliability Hardening

1. **SSRF Protection (`validators.py`):**
   - All source endpoint URLs are validated via `validate_safe_external_url`.
   - Resolves hostnames and rejects RFC1918 internal networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), IPv4 loopback (`127.0.0.0/8`), IPv6 loopback (`::1`), link-local/cloud metadata services (`169.254.0.0/16`), and non-HTTP/HTTPS protocols.
2. **Audit Logging & Versioning:**
   - When a university revises a previously published notice (e.g., changes an exam date or extends a form deadline), the previous state is archived in `UpdateVersion` with a diff summary, timestamp, and previous raw content.
3. **Resilient Offline / Demo Mode:**
   - Frontend `updatesService.ts` contains built-in mock fallback records so developers and offline learners experience full UI responsiveness even without active backend server connections.

---

## 6. API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/v1/updates/` | `GET` | List/filter updates with search, category, institution, and pagination |
| `/api/v1/updates/<id>/` | `GET` | Retrieve full update details, versions, attachments, and cross-links |
| `/api/v1/updates/feed/` | `GET` | Personalized feed matching user's subscriptions and followed courses |
| `/api/v1/updates/timeline/` | `GET` | Upcoming deadlines ordered chronologically with countdown metadata |
| `/api/v1/updates/statistics/` | `GET` | Aggregated statistics (total, urgent, active deadlines, sources) |
| `/api/v1/updates/sources/` | `GET` | List official crawling sources and their health/status |
| `/api/v1/updates/<id>/bookmark/` | `POST`, `DELETE` | Save or remove update from personal saved bookmarks |
| `/api/v1/updates/<id>/reminder/` | `POST`, `DELETE` | Set or cancel deadline reminder |
| `/api/v1/updates/subscriptions/` | `GET`, `POST`, `DELETE` | Manage followed institutions, categories, and courses |
