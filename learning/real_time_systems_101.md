# Real-Time Systems 101: Beyond HTTP

**Course Instructor:** Antigravity AI
**Level:** Systems Architecture
**Target System:** Gamification Engine (WebSockets)

---

## Module 1: The Request-Response Limit

Traditional HTTP (REST) is **Passive**.

- Client: "Do you have new data?"
- Server: "No."
- Client (5s later): "How about now?"
- Server: "No."

This is **Polling**. It kills batteries and servers.

**God-Tier Solution:** **WebSockets (Active)**.

- Client: "I'm listening."
- ... Silence ...
- Server: "YOU LEVELED UP!" (Push)

---

## Module 2: Django Channels Architecture

Django is synchronous (blocking). To handle WebSockets (async), we use **Channels**.

### 1. ASGI (Asynchronous Server Gateway Interface)

It sits between Nginx and Django.

- `apps.gamification.routing.py` directs `ws/social/` -> `SocialConsumer`.

### 2. Recent Upgrade: Personalized Channels

We don't just blast everyone. We have Topics (Groups).

- **Global Group (`social_global`):**
  - "User123 just hit Level 50!"
  - _Who listens?_ Everyone on the Leaderboard screen.
- **User Group (`user_42`):**
  - "You earned 100 XP"
  - _Who listens?_ Only User 42.

**Security:** In `connect()`, we check `self.scope['user']`. If you aren't logged in, the socket closes.

---

## Module 3: Pub/Sub Pattern (Redis)

How do we send a message from a Django View (Sync) to a WebSocket Consumer (Async)?

**Redis Channel Layer.**

1.  **Publisher (Service):**

    ```python
    channel_layer.group_send('user_42', {'type': 'user_update', 'xp': 100})
    ```

    (This pushes a JSON packet into Redis).

2.  **Subscriber (Consumer):**
    - The Consumer is constantly polling Redis (efficiently).
    - It receives the packet and triggers `user_update(event)`.
    - It forwards it to the frontend via `await self.send()`.

---

## Module 4: Frontend Implementation (Flutter)

In Flutter, we use `web_socket_channel`.

```dart
final channel = WebSocketChannel.connect(
  Uri.parse('wss://api.learninghub.com/ws/social/')
);

channel.stream.listen((message) {
  final event = jsonDecode(message);
  if (event['type'] == 'user_update') {
    showconfetti(); // 🎉
  }
});
```

---

## Assignment

1.  Review `apps/gamification/services.py`: See how `award_xp` triggers the broadcast.
2.  Review `apps/gamification/social_consumer.py`: See the dual-channel subscription.

_Class Dismissed. Stay connected._
