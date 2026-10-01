## 🎤 Lesson 8: Voice Architecture (Multimodal AI)

**Status**: COMPLETED ✅
**Endpoints Verified**: `POST /api/v1/ai/voice/transcribe/`, `POST /api/v1/ai/voice/speak/`

---

### 🗣️ The Challenge

Text-based chat is 2010. The future is **Voice-First**.
Users learn while driving, cooking, or walking. They can't type.

---

### 🏗️ Architecture & Multimodal Pipeline

1. **Audio Capture**:
   - Web & Mobile clients record `.wav`/`.m4a` audio with Voice Activity Detection (VAD).
   - Audio payload sent as multipart/form-data to `/api/v1/ai/voice/transcribe/`.
2. **Multimodal Processing**:
   - Backend ingests audio stream $\rightarrow$ `AIClient.transcribe_audio` processes audio bytes.
   - Context is injected and passed to `TutorService.get_answer` for verified conceptual explanations.
3. **Speech Synthesis (TTS)**:
   - AI response text is synthesized into clean speech audio URLs via `AIClient.generate_speech_url` and returned alongside the text transcription.

---

[Go to Lesson 9: Event-Driven Architecture](./l9_async.md)

