# LearningHub V15 — Course Engine & Syllabus Architecture Report (Phase 6)

**Generated:** 2026-09-28  
**Component:** `learninghub/django_backend/apps/courses` & `learninghub/src/pages/LessonPlayerPage.tsx`

---

## 1. Syllabus Hierarchy & Data Model

- **Course**: Title, slug, description, category, level, price, thumbnail, instructor, rating, student count, prerequisites.
- **Chapter**: Title, course FK, sequence order.
- **Lesson**: Title, chapter FK, duration in minutes (`duration_minutes`), content markdown, video URL (`video_url`), preview flag (`is_free_preview`), order.
- **Enrollment**: User FK, course FK, progress percentage (0.0–100.0%), completed_at.
- **LessonProgress**: User FK, lesson FK, completed boolean, last_accessed.

---

## 2. Media Protection & Paywall Enforcement

- **Unauthorized Scrape Prevention**:
  `CourseLessonsListView` masks `video_url` as `None` for all non-preview lessons unless the user is enrolled or holds staff/admin permissions.
- **Attribute Parity**:
  Both `duration` and `duration_minutes` are provided in the response payload to maintain 100% compatibility across legacy and modern components.

---

## 3. Video Player Experience

- **Features**:
  - HLS & MP4 playback with configurable playback speeds (0.75x, 1x, 1.25x, 1.5x, 2x).
  - Auto-advance to next lesson upon completion.
  - Video bookmarking and timestamped note-taking.
  - PiP (Picture-in-Picture) support for multitasking while reviewing lesson code.
