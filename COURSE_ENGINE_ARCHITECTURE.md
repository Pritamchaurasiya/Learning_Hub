# COURSES LMS ENGINE — ARCHITECTURAL SPECIFICATION

> **Module:** `apps.courses`  
> **Status:** PRODUCTION CANONICAL  
> **Target Date:** September 2026  

---

## 1. LMS DOMAIN ENTITIES & HIERARCHY

```mermaid
graph TD
    Course[Course: Slug, Price, Difficulty, Prerequisites] --> Module1[Module 1: Foundations]
    Course --> Module2[Module 2: Advanced Topics]
    
    Module1 --> Lesson1[Lesson 1: Video HLS Stream]
    Module1 --> Lesson2[Lesson 2: Interactive Markdown & Code]
    Module1 --> Lesson3[Lesson 3: Concept Check Quiz]
    
    Course --> Enrollment[Course Enrollment: Student, Progress %]
    Lesson1 --> Progress[Lesson Progress: Timestamp, Completed]
    Enrollment --> Certificate[Cryptographic Completion Certificate]
```

---

## 2. KEY CAPABILITIES

1. **Video Streaming & HLS Transcoding**:
   - Master video uploads processed asynchronously via Celery worker (`generate_course_hls_task`).
   - Generates adaptive bitrate HLS playlists (`720p`, `1080p`, `480p`) with segmented `.ts` files.
2. **Progress & Completion Engine**:
   - `LessonProgress` tracks video watch seconds and completion booleans.
   - When all mandatory lessons reach `completed = True`, a Django signal triggers `generate_certificate_pdf_task`.
3. **Cryptographic Certificate Issuance**:
   - Generates unique verification code: `CERT-<COURSE_PREFIX>-<HEX12>`.
   - Embeds verifiable SHA-256 hash in metadata and outputs signed PDF stored in `media/certificates/`.
