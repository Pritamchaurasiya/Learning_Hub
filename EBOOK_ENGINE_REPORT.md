# LearningHub V15 — Ebook Engine & Interactive Reader Report (Phase 7)

**Generated:** 2026-09-28  
**Component:** `learninghub/django_backend/apps/ebooks` & `learninghub/src/pages/EbookReaderPage.tsx`

---

## 1. Chapter Retrieval & Parameter Hardening

- **Input Sanitization**:
  In `EbookChapterDetailView`, `order` route parameter is parsed through a strict integer validation block:
  ```python
  try:
      chapter_order = int(order)
  except (ValueError, TypeError):
      return error_response("Invalid chapter order", status_code=status.HTTP_400_BAD_REQUEST)
  ```
  Eliminates unexpected 500 exceptions on malformed URL requests.

---

## 2. Text-to-Speech (TTS) Engine

- **SpeechSynthesis Integration**:
  - `useEbookTTS` hook controls browser SpeechSynthesis API.
  - Supports pause, resume, pitch modification, and playback speed adjustment (0.8x to 2.0x).
  - Sentence-level boundary tracking triggers live visual highlighting of current spoken phrase.

---

## 3. Highlighting, Annotations & Flashcard Generation

- **Persistent Annotations**:
  - Highlights saved with color code (Yellow, Green, Blue, Pink), start/end character offsets, and personal notes.
- **AI-Powered Flashcard Creation**:
  - Selected text can be turned into an SM-2 Leitner spaced-repetition card with one click.
