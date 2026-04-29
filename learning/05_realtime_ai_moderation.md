# Real-time AI Content Moderation Architecture

## Overview

The Learning Hub uses a sophisticated real-time pipeline to ensure safe and constructive interactions in Live Sessions. By integrating **Django Channels** (WebSockets) with **Gemini AI**, we achieve sub-second content moderation.

## Workflow

1.  **Message Ingest**:
    - Student sends `{'type': 'chat_message', 'message': '...'}` over WebSocket.
    - `LiveSessionConsumer.receive` intercepts the message.
2.  **AI Analysis**:
    - The consumer pauses broadcasting.
    - Calls `AIClient.moderate_content(text)`.
    - **Gemini 2.0 Flash** evaluates the text for:
      - Toxicity
      - Hate Speech
      - Harassment
      - Violence
    - Returns JSON: `{'is_safe': False, 'reason': 'Hate Speech', ...}`.
3.  **Decision Gate**:
    - **IF SAFE**: Message is broadcast to the `session_group`. All students receive it.
    - **IF UNSAFE**: Message is blocked. The sender receives a private `moderation_alert` with the reason.
4.  **Feedback Loop**:
    - Violations are logged (potential future enhancement: auto-ban mechanism).

## Technical Implementation

### Frontend (`dsa_problem_controller.dart` Refactor)

We also refactored the DSA module to use the centralized `ApiClient`.

- **Old**: Hardcoded `http://127.0.0.1:8000` (Broken in Prod).
- **New**: `ApiClient.instance` (Handles Auth Tokens, Base URL, Retries).

### Backend (`consumers.py`)

```python
moderation_result = await database_sync_to_async(AIClient.moderate_content)(message_text)
if moderation_result.get('is_safe', False):
    await self.channel_layer.group_send(...)
```

## Scalability

- **Async I/O**: The AI call is asynchronous, preventing blocking of the WebSocket worker.
- **Redis**: Channel layers use Redis for high-throughput message broadcasting.
