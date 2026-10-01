## ⚡ Lesson 9: Event-Driven Architecture (Async & Event Bus)

**Status**: COMPLETED ✅
**Components Verified**: `apps.core.event_bus`, `apps.core.event_subscribers`, Celery queues

---

### 🐌 The Problem with Synchronous Chains

In monolithic synchronous request-response models:
$$\text{User completes lesson} \rightarrow \text{Wait for Certificate (100ms)} \rightarrow \text{Wait for Email (400ms)} \rightarrow \text{Wait for XP (150ms)} = 650\text{ms latency}$$

If any secondary task fails (e.g. SMTP server timeout), the entire HTTP request fails.

---

### 🏃 The Solution: Decoupled Pub/Sub Event Bus

1. **Publish**: The main controller emits `EventBus.publish('lesson.completed', payload)` and returns `200 OK` in $<15\text{ms}$.
2. **Subscribers**: Independent subscribers react asynchronously without blocking the user:
   - `GamificationSubscriber`: Calculates XP and advances user streak.
   - `AnalyticsSubscriber`: Records topic mastery index.
   - `NotificationSubscriber`: Dispatches real-time WebSocket notification.
   - `CertificateSubscriber`: Issues verified digital badge.
3. **Dead Letter Queue (DLQ)**: If a subscriber fails after retries, the event payload is routed to a persistent DLQ for replay.

---

[Go to Lesson 10: Kubernetes & Helm](./l10_k8s.md)

