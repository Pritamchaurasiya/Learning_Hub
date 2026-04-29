# Module 06: The Interface Layer (Networking & Real-Time) 🌐

## 🎯 Overview

The "Interface Layer" is the bridge between your Frontend (Flutter) and Backend (Django). It's more than just REST APIs. This module covers **Real-Time Communication (WebSockets)**, **High-Performance RPC (gRPC)**, and how to manage the state of these connections.

---

## 🔌 Beyond REST: WebSockets

REST is "Request-Response". You ask, server answers.
WebSockets are "Duplex". You open a pipe, and data flows both ways.

### The Protocol

- **Initial Handshake**: Starts as HTTP `Upgrade: websocket`.
- **Frames**: Data is sent in small binary packets.
- **Heartbeats**: PING/PONG frames keep the connection alive.

### Django Channels (The Backend)

In `apps/dsa/routing.py`:

```python
websocket_urlpatterns = [
    re_path(r'ws/dsa/submissions/(?P<user_id>\w+)/$', consumers.SubmissionConsumer.as_asgi()),
]
```

In `consumers.py` (Async is key!):

```python
class SubmissionConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        await self.channel_layer.group_add(f"user_{self.scope['user'].id}", self.channel_name)

    async def receive(self, text_data):
        # Handle client messages
        pass
```

### Flutter Riverpod (The Frontend)

Using `WebSocketChannel` with a StreamProvider is the "God-Tier" pattern.

```dart
@riverpod
Stream<Map<String, dynamic>> submissionUpdates(SubmissionUpdatesRef ref, String userId) {
  final socket = WebSocketChannel.connect(Uri.parse('$wsUrl/$userId/'));

  ref.onDispose(() => socket.sink.close());

  return socket.stream.map((event) => jsonDecode(event));
}
```

---

## 🚀 gRPC: High Performance

REST uses JSON (text, slow). gRPC uses **Protobuf** (binary, fast).

### Why gRPC?

1.  **Strict Schema**: defined in `.proto` files. No more "I thought this field was a string".
2.  **Binary**: Smaller payload, faster parsing.
3.  **Streaming**: Built-in support for streaming large datasets.

### Example `.proto`

```protobuf
service CodingService {
  rpc SubmitCode (SubmissionRequest) returns (SubmissionResponse);
}

message SubmissionRequest {
  string code = 1;
  string language = 2;
}
```

---

## ⚡ Handling Network State (The "God-Tier" Way)

Do not just `setState`. Use a State Machine.

### The 4 States of a Request

1.  **Idle**: Nothing happened yet.
2.  **Loading**: Spinner time. (Optimistic Updates go here!)
3.  **Success**: Data is here.
4.  **Error**: Something blew up.

### Riverpod Implementation

```dart
@riverpod
class CourseController extends _$CourseController {
  @override
  FutureOr<void> build() {}

  Future<void> enroll(String courseId) async {
    state = const AsyncLoading(); // 1. Loading

    state = await AsyncValue.guard(() async { // 2. Guard
      await ref.read(repositoryProvider).enroll(courseId);
    }); // 3. Success/Error handled automatically
  }
}
```

---

## 🛑 Common Interface Mistakes

1.  **No Heartbeats**: Middlewares (Nginx, AWS LB) kill idle connections after 60s. Always verify your PING/PONG.
2.  **JSON over-fetching**: REST endpoints returning 5MB of data for a mobile screen. Use GraphQL or specialized ViewSets (Django serializers).
3.  **Zombie Streams**: Opening a WebSocket in `initState` and forgetting to close it in `dispose`. **Memory Leaks!**

---

## 🏗️ Exercise

1.  **Trace the Packet**: Use Wireshark or Chrome DevTools to see the WebSocket Upgrade handshake.
2.  **Break it**: Turn off your WiFi while the socket is open. Does your Flutter app handle the reconnection automatically? (Hint: It requires extra logic).
