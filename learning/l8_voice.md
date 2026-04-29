## 🎤 Lesson 8: Voice Architecture (Multimodal AI)

**Status**: PLANNED

### 🗣️ The Challenge

Text-based chat is 2010. The future is **Voice-First**.
Users learn while driving, cooking, or walking. They can't type.

### 🏗️ Architecture

1.  **Frontend (Flutter)**:
    - Capture Audio (`flutter_sound` or `record`).
    - Detect Voice Activity (VAD) to auto-stop recording.
    - Send `.aac` or `.wav` file to Backend API.

2.  **Backend (Django + Gemini 1.5)**:
    - Receive File (Multipart upload).
    - Send Audio Bytes -> Gemini 1.5 Flash.
    - **Prompt**: "Transcribe this audio and answer the student's question." (End-to-end Voice-to-Response).

### 🤖 Why Gemini 1.5 Flash?

It is **Multimodal Native**.
Old way: Audio -> Text (Whisper) -> LLM -> Text.
New way: Audio -> LLM -> Text.
This preserves _tone_ and _emotion_.

### 🔊 Text-To-Speech (TTS)

Frontend uses native TTS (`flutter_tts`) for low latency response.
In future, we can stream generated audio from backend (ElevenLabs).
