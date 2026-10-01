# LEARNINGHUB STUDENT UPDATES HUB — SOURCE REGISTRY SPECIFICATION

> **Standard:** Official Education Source Trust Architecture  
> **Target Release:** LearningHub Updates Hub V1.0  

---

## 1. SOURCE TRUST LEVEL HIERARCHY

To ensure uncompromising integrity and eliminate fake circulars, every source in LearningHub is assigned an immutable Authority Level:

| Level | Classification | Definition | Badge & Label | Auto-Publish Eligibility |
|---|---|---|---|---|
| **LEVEL 1** | **Official Authority** | Direct website/portal of a recognized university, government department, or statutory exam commission (e.g., MGKVP, SSC, NTA, UPSC). | `Official Authority (Level 1)` (Verified Green Check) | **Yes** (Subject to schema validation & change detection) |
| **LEVEL 2** | **Institutional Portal** | Sub-domain or affiliated college portal operating under direct oversight of an accredited university (e.g., affiliated college notices, department sub-sites). | `Institution Portal (Level 2)` (Verified Blue Check) | **Yes** (For verified partner institutions) |
| **LEVEL 3** | **Approved Educational Organization** | Verified educational body, research council, or recognized competitive coaching consortium (e.g., AICTE, UGC feeds, National Scholarship Portal). | `Approved Organization (Level 3)` | **Requires Fast-Track Review** |
| **LEVEL 4** | **Trusted Secondary Source** | Reputable national education journalism desks (e.g., Press Information Bureau, The Hindu Education, Indian Express). | `Secondary Source (Level 4)` | **Admin Review Required** |
| **LEVEL 5** | **Unverified Source** | User-submitted or unverified external link. Never presented as official. | `Unverified Community Source` | **Strict Sandbox / Quarantine** |

> [!IMPORTANT]
> Only **LEVEL 1** and **LEVEL 2** sources are eligible for automatic "Official Update" labeling. Secondary sources must be explicitly disclaimed as aggregated news. Level 5 sources can never trigger automated push notifications.

---

## 2. CANONICAL SOURCE REGISTRY SCHEMA

```sql
CREATE TABLE lh_update_sources (
    source_id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    source_type VARCHAR(32) NOT NULL, -- 'UNIVERSITY', 'EXAM_BOARD', 'GOVERNMENT', 'COLLEGE'
    authority_level INTEGER NOT NULL DEFAULT 1, -- 1 to 5
    category VARCHAR(64) NOT NULL, -- 'ACADEMIC', 'EXAMINATION', 'ADMISSION', 'SCHOLARSHIP', 'CAREER', 'COMPETITIVE_EXAMS'
    country VARCHAR(64) DEFAULT 'India',
    state VARCHAR(64) DEFAULT 'Uttar Pradesh',
    institution VARCHAR(255) NOT NULL,
    base_url VARCHAR(500) NOT NULL,
    fetch_method VARCHAR(32) DEFAULT 'HTML_TABLE', -- 'REST_API', 'RSS_FEED', 'HTML_TABLE', 'DOM_SCRAPE', 'MANUAL'
    polling_interval_minutes INTEGER DEFAULT 60,
    robots_policy VARCHAR(32) DEFAULT 'COMPLIANT',
    terms_status VARCHAR(32) DEFAULT 'APPROVED',
    is_enabled BOOLEAN DEFAULT TRUE,
    verification_required BOOLEAN DEFAULT FALSE,
    last_success_at TIMESTAMP WITH TIME ZONE NULL,
    last_failure_at TIMESTAMP WITH TIME ZONE NULL,
    failure_count INTEGER DEFAULT 0,
    last_content_hash VARCHAR(64) DEFAULT '',
    last_checked_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lh_update_source_endpoints (
    id VARCHAR(64) PRIMARY KEY,
    source_id VARCHAR(64) REFERENCES lh_update_sources(source_id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    sub_category VARCHAR(64) NOT NULL, -- 'NOTICE_BOARD', 'EXAMINATION', 'TIMETABLE', 'RESULTS', 'ADMISSIONS'
    endpoint_url VARCHAR(500) NOT NULL,
    css_selector VARCHAR(255) DEFAULT '',
    is_active BOOLEAN DEFAULT TRUE,
    last_hash VARCHAR(64) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. SEED REGISTRY: OFFICIAL INDIAN INSTITUTIONS

### 3.1 Mahatma Gandhi Kashi Vidyapith (MGKVP) — Canonical Profile
- **Source ID:** `src-mgkvp-official`
- **Name:** Mahatma Gandhi Kashi Vidyapith Main Portal
- **Domain:** `mgkvp.ac.in`
- **Authority Level:** LEVEL 1
- **Dedicated Public Endpoints:**
  1. **Notice Board:** `https://mgkvp.ac.in/Home/NoticeList` (General academic announcements, holiday orders)
  2. **Examination:** `https://mgkvp.ac.in/Home/ExamNotices` (Exam form release, scrutiny forms, back papers)
  3. **Timetable / Center List:** `https://mgkvp.ac.in/Home/TimeTable` (Datesheet revisions, examination centers)
  4. **Evaluation / Result:** `https://mgkvp.ac.in/Home/Results` (Declaration notices, mark sheet dispatch)
  5. **Admissions:** `https://mgkvp.ac.in/Home/Admissions` (Entrance test, counselling schedules)
- **Polling Strategy:** 30 minutes during exam window; 60 minutes normal.

### 3.2 Dr. A.P.J. Abdul Kalam Technical University (AKTU)
- **Source ID:** `src-aktu-official`
- **Name:** Dr. A.P.J. Abdul Kalam Technical University
- **Domain:** `aktu.ac.in`
- **Authority Level:** LEVEL 1
- **Endpoints:** Circulars & Examination Notices (`aktu.ac.in/circulars.html`)

### 3.3 Staff Selection Commission (SSC)
- **Source ID:** `src-ssc-gov`
- **Name:** Staff Selection Commission Official
- **Domain:** `ssc.gov.in`
- **Authority Level:** LEVEL 1
- **Endpoints:** Notices (`ssc.gov.in/notices`)

### 3.4 National Testing Agency (NTA)
- **Source ID:** `src-nta-gov`
- **Name:** National Testing Agency
- **Domain:** `nta.ac.in`
- **Authority Level:** LEVEL 1
- **Endpoints:** Public Notices (`nta.ac.in/NoticeArchive`)

---

## 4. FAILURE HANDLING & BACKOFF POLICY

1. **Exponential Backoff:**
   - 1st failure: retry in 5 minutes.
   - 2nd failure: retry in 15 minutes.
   - 3rd failure: retry in 60 minutes.
   - >= 5 consecutive failures: source flagged `DEGRADED`; notification sent to Admin Dashboard.
2. **Circuit Breaker:**
   - If an official server returns HTTP 500, 502, 503, or connection timeouts for 6 hours, automated polling pauses to avoid stress on university infrastructure.
3. **Fail-Safe Integrity:**
   - When a source is unreachable, previous notices are preserved. No deletion or speculative notices are ever created.
