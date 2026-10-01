# LEARNINGHUB STUDENT UPDATES HUB — SYSTEM ARCHITECTURE SPECIFICATION

> **Architecture Style:** Django Clean Architecture (HackSoft Services & Selectors Pattern)  
> **Status:** PRODUCTION CANONICAL  
> **Directory Base:** `learninghub/django_backend/apps/updates/`  

---

## 1. HIGH-LEVEL ARCHITECTURE OVERVIEW

```mermaid
flowchart TD
    subgraph External Sources
        S1["Level 1: Official University (MGKVP, AKTU)"]
        S2["Level 1: Exam Authority (NTA, SSC, UPSC)"]
        S3["Level 2: Institution Portal"]
        S4["Level 3: Approved Educational Feed"]
    end

    subgraph Ingestion Layer (Celery Workers)
        Fetcher["Source Polling Engine (SSRF Protected)"]
        Parser["DOM / RSS / Document Parser"]
        Normalizer["Schema Normalizer"]
        Hasher["SHA-256 Change Detector"]
        Deduper["Semantic & Exact Deduplicator"]
    end

    subgraph Persistence & Business Logic (Django 5.0)
        DB[(PostgreSQL / SQLite Database)]
        Services["updates.services (Mutations & Transactions)"]
        Selectors["updates.selectors (Cached & Prefetched Reads)"]
        RedisCache[(Redis Cache & Locks)]
    end

    subgraph Notification & Delivery
        CeleryScheduler["Deadline Reminder Scheduler"]
        WS["Channels WebSocket (/ws/notifications/)"]
        InApp["In-App Notification Center"]
        PushEngine["FCM / Web Push Provider"]
    end

    subgraph Frontend Application (React 18 + Vite)
        UpdatesPage["Student Updates Feed (/updates)"]
        DetailsDrawer["Notice Details & Verification Modal"]
        PersonalizedFeed["For You & Deadlines Timeline"]
        CrossLinks["Test A+ / Ebook / Course Deep Links"]
    end

    S1 & S2 & S3 & S4 -->|Scheduled Poll| Fetcher
    Fetcher --> Parser
    Parser --> Normalizer
    Normalizer --> Hasher
    Hasher --> Deduper
    Deduper -->|Audit & Moderation| Services
    Services --> DB
    Services -.->|Invalidate| RedisCache
    DB --> Selectors
    Selectors --> UpdatesPage
    Services --> CeleryScheduler
    CeleryScheduler --> WS & PushEngine
    WS --> InApp
    UpdatesPage --> DetailsDrawer
    DetailsDrawer --> CrossLinks
```

---

## 2. BACKEND COMPONENT BREAKDOWN (`apps/updates/`)

Following the strict HackSoft Clean Architecture adopted across LearningHub V5.0:

```
learninghub/django_backend/apps/updates/
├── __init__.py
├── admin.py                  # Full Django Admin with search, filters & moderation actions
├── apps.py                   # UpdatesConfig
├── models.py                 # Core schema (Source, Update, Version, Subscription, etc.)
├── permissions.py            # RBAC permissions (IsAdminUserRole, IsStudentOrReadOnly)
├── selectors.py              # Pure reads: feed filtering, search, cached queries
├── serializers.py            # DRF serializers with strict validation
├── services.py               # Pure writes: ingestion, verification, bookmarks, reminders
├── signals.py                # Update publication & notification triggers
├── tasks.py                  # Celery background jobs (poll, remind, cleanup)
├── urls.py                   # RESTful endpoints under /api/v1/updates/
├── validators.py             # URL validation, SSRF checks, date logic
├── sources/                  # Source definitions & configuration
│   ├── registry.py           # Preloaded verified sources (MGKVP, SSC, etc.)
│   └── rate_limiter.py       # Per-domain rate limits & backoff
├── parsers/                  # Ingestion extractors
│   ├── base.py               # Abstract parser interface
│   ├── mgkvp_parser.py       # Official MGKVP notice board extractor
│   ├── rss_parser.py         # Standard RSS 2.0 / Atom feed parser
│   └── generic_parser.py     # Fallback table / list extractor
├── normalizers/              # Schema mapping and date parser
│   └── canonical.py          # Strict canonical normalization
└── tests/                    # Pytest test suite
    ├── __init__.py
    ├── test_ingestion.py
    ├── test_change_detection.py
    ├── test_selectors.py
    ├── test_services.py
    └── test_api.py
```

---

## 3. DATA INGESTION & PIPELINE LIFECYCLE

1. **Scheduled Polling (`tasks.poll_registered_sources`):**
   - Runs on Celery Beat according to each source's configured interval (e.g. 15m for exam periods, 1h normal).
   - Enforces Redis distributed locks (`lock:update_source_{id}`) to prevent duplicate concurrent runs.
2. **SSRF & Safety Guard:**
   - Pre-validates IP resolution: Blocks loopback (`127.0.0.1`), private RFC1918 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local (`169.254.0.0/16`), and metadata services.
   - Enforces strict timeout (10s) and response size cap (5MB).
   - Honors HTTP `ETag` and `If-Modified-Since` headers to prevent redundant bandwidth.
3. **Extraction & Canonical Normalization:**
   - Extracts title, date, canonical URL, attachment links, and categories.
   - Converts dates to timezone-aware UTC timestamps; missing dates are tagged `Date not specified`.
4. **Change Detection & Hashing:**
   - Computes deterministic SHA-256 of `(title.strip().lower() + canonical_url + normalized_date + content_text)`.
   - Compares with stored `content_hash`:
     - **Match:** No action taken. Records fetch success timestamp.
     - **Mismatch (New URL):** Creates new `StudentUpdate` in `DRAFT` or `PUBLISHED` state (based on source trust level).
     - **Mismatch (Existing URL, Changed Content):** Increments version, logs `UpdateVersion` with diff summary, and alerts subscribed users.
5. **Deduplication:**
   - Cross-checks across existing active updates in the same category and institution within a 30-day window to eliminate duplicate syndication.
6. **Notification Dispatch:**
   - Triggers event via Django Channels to WebSocket group `notifications_user_{id}` for subscribed users.

---

## 4. CROSS-FEATURE INTEGRATION ARCHITECTURE

```
StudentUpdate (e.g., MGKVP BCA Exam)
       │
       ├──► Link to Test:   apps.tests_engine.models.Test (Category = 'BCA')
       ├──► Link to Ebook:  apps.ebooks.models.Ebook (Category = 'Computer Science')
       └──► Link to Course: apps.courses.models.Course
```

When a student views an examination update:
1. `UpdateCrossLink` selector queries matching tests and ebooks using category and target exam metadata.
2. The UI renders action cards: **"Prepare Now: Take DBMS Practice Test"** and **"Recommended Reading: Chapter 4 Database Normalization"**.
3. Clicking directly opens the LearningHub Test Engine or Ebook Reader without friction.
