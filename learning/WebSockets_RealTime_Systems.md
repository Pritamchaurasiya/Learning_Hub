# ⚡ WEBSOCKETS & REAL-TIME SYSTEMS

## Building Live, Interactive Applications

---

## 📋 TABLE OF CONTENTS

1. [WebSocket Fundamentals](#-websocket-fundamentals)
2. [Server Implementation (Django Channels)](#-server-implementation-django-channels)
3. [Client Implementation (Flutter)](#-client-implementation-flutter)
4. [Message Patterns](#-message-patterns)
5. [Scaling WebSockets](#-scaling-websockets)
6. [Error Handling & Reconnection](#-error-handling--reconnection)
7. [Security Considerations](#-security-considerations)
8. [Alternatives to WebSockets](#-alternatives-to-websockets)

---

## 🔌 WEBSOCKET FUNDAMENTALS

### HTTP vs WebSocket

```
HTTP (Request-Response):
Client ──Request──►  Server
       ◄──Response──

WebSocket (Full-Duplex):
Client ◄════════════► Server
       Bidirectional
       Persistent Connection
```

### When to Use WebSockets

| ✅ Use WebSockets     | ❌ Don't Use        |
| --------------------- | ------------------- |
| Real-time chat        | CRUD operations     |
| Live notifications    | Static content      |
| Collaborative editing | Infrequent updates  |
| Gaming/Multiplayer    | SEO-important pages |
| Live dashboards       | Simple forms        |
| Streaming data        | File uploads        |

### WebSocket Lifecycle

```
1. Handshake (HTTP Upgrade)
   GET /ws/chat/ HTTP/1.1
   Upgrade: websocket
   Connection: Upgrade

   HTTP/1.1 101 Switching Protocols
   Upgrade: websocket
   Connection: Upgrade

2. Open Connection
   ← onOpen triggered

3. Message Exchange
   ← → JSON messages

4. Close Connection
   → Close frame
   ← Close frame
   ← onClose triggered
```

---

## 🐍 SERVER IMPLEMENTATION (DJANGO CHANNELS)

### Setup

```bash
pip install channels channels-redis
```

```python
# settings.py
INSTALLED_APPS = [
    'channels',
    # ...
]

ASGI_APPLICATION = 'config.asgi.application'

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [('localhost', 6379)],
        },
    },
}
```

### ASGI Configuration

```python
# config/asgi.py
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

django_asgi_app = get_asgi_application()

from apps.notifications import routing as notification_routing
from apps.dsa import routing as dsa_routing

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': AuthMiddlewareStack(
        URLRouter([
            *notification_routing.websocket_urlpatterns,
            *dsa_routing.websocket_urlpatterns,
        ])
    ),
})
```

### Consumer (WebSocket Handler)

```python
# apps/notifications/consumers.py
import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer

class NotificationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        """Called when client connects."""
        if not self.scope['user'].is_authenticated:
            await self.close(code=4001)
            return

        self.user_id = str(self.scope['user'].id)
        self.room_name = f'user_{self.user_id}'

        # Join user's personal channel
        await self.channel_layer.group_add(
            self.room_name,
            self.channel_name
        )

        await self.accept()

        # Send initial data
        await self.send_json({
            'type': 'connection_established',
            'user_id': self.user_id
        })

    async def disconnect(self, close_code):
        """Called when connection closes."""
        await self.channel_layer.group_discard(
            self.room_name,
            self.channel_name
        )

    async def receive_json(self, content):
        """Called when client sends message."""
        message_type = content.get('type')

        if message_type == 'ping':
            await self.send_json({'type': 'pong'})
        elif message_type == 'mark_read':
            await self.mark_notification_read(content.get('notification_id'))

    async def notification_message(self, event):
        """Handler for notification broadcasts."""
        await self.send_json({
            'type': 'notification',
            'data': event['data']
        })

    async def xp_update(self, event):
        """Handler for XP updates."""
        await self.send_json({
            'type': 'xp_update',
            'data': event['data']
        })
```

### Broadcasting from Anywhere

```python
# apps/gamification/services.py
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

class GamificationService:
    @staticmethod
    def add_xp(user, amount, action):
        # Update database
        user_xp, _ = UserXP.objects.get_or_create(user=user)
        user_xp.total_xp += amount
        user_xp.save()

        # Broadcast to WebSocket
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'user_{user.id}',
            {
                'type': 'xp_update',
                'data': {
                    'new_xp': user_xp.total_xp,
                    'gained': amount,
                    'action': action
                }
            }
        )

        return {'new_xp': user_xp.total_xp}
```

### Routing

```python
# apps/notifications/routing.py
from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path('ws/notifications/', consumers.NotificationConsumer.as_asgi()),
]
```

---

## 📱 CLIENT IMPLEMENTATION (FLUTTER)

### WebSocket Service

```dart
import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';

class WebSocketService {
  WebSocketChannel? _channel;
  Timer? _pingTimer;
  Timer? _reconnectTimer;

  final _messageController = StreamController<Map<String, dynamic>>.broadcast();
  final _connectionController = StreamController<bool>.broadcast();

  Stream<Map<String, dynamic>> get messageStream => _messageController.stream;
  Stream<bool> get connectionStream => _connectionController.stream;

  bool _isConnected = false;
  String? _authToken;

  void connect(String token) {
    _authToken = token;
    _establishConnection();
  }

  void _establishConnection() {
    if (_authToken == null) return;

    try {
      final uri = Uri.parse('ws://localhost:8000/ws/notifications/?token=$_authToken');
      _channel = WebSocketChannel.connect(uri);

      _channel!.stream.listen(
        _onMessage,
        onError: _onError,
        onDone: _onDone,
      );

      _isConnected = true;
      _connectionController.add(true);
      _startPingTimer();

    } catch (e) {
      _scheduleReconnect();
    }
  }

  void _onMessage(dynamic message) {
    try {
      final data = jsonDecode(message as String);
      _messageController.add(data);
    } catch (e) {
      debugPrint('WebSocket parse error: $e');
    }
  }

  void _onError(error) {
    debugPrint('WebSocket error: $error');
    _isConnected = false;
    _connectionController.add(false);
    _scheduleReconnect();
  }

  void _onDone() {
    debugPrint('WebSocket closed');
    _isConnected = false;
    _connectionController.add(false);
    _scheduleReconnect();
  }

  void _startPingTimer() {
    _pingTimer?.cancel();
    _pingTimer = Timer.periodic(Duration(seconds: 30), (_) {
      send({'type': 'ping'});
    });
  }

  void _scheduleReconnect() {
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(Duration(seconds: 5), _establishConnection);
  }

  void send(Map<String, dynamic> message) {
    if (_isConnected && _channel != null) {
      _channel!.sink.add(jsonEncode(message));
    }
  }

  void disconnect() {
    _pingTimer?.cancel();
    _reconnectTimer?.cancel();
    _channel?.sink.close();
    _isConnected = false;
  }

  void dispose() {
    disconnect();
    _messageController.close();
    _connectionController.close();
  }
}
```

### Riverpod Integration

```dart
// providers/websocket_provider.dart
final webSocketServiceProvider = Provider<WebSocketService>((ref) {
  final service = WebSocketService();
  ref.onDispose(() => service.dispose());
  return service;
});

final webSocketMessagesProvider = StreamProvider<Map<String, dynamic>>((ref) {
  return ref.watch(webSocketServiceProvider).messageStream;
});

final isConnectedProvider = StreamProvider<bool>((ref) {
  return ref.watch(webSocketServiceProvider).connectionStream;
});

// Usage in widget
class NotificationIcon extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final messageAsync = ref.watch(webSocketMessagesProvider);

    return messageAsync.when(
      data: (message) {
        if (message['type'] == 'notification') {
          // Show notification badge
          return Badge(child: Icon(Icons.notifications));
        }
        return Icon(Icons.notifications_none);
      },
      loading: () => Icon(Icons.notifications_none),
      error: (_, __) => Icon(Icons.notifications_off),
    );
  }
}
```

---

## 📨 MESSAGE PATTERNS

### Request-Response

```dart
// Client sends
{
  "type": "get_unread_count",
  "request_id": "abc123"
}

// Server responds
{
  "type": "unread_count_response",
  "request_id": "abc123",
  "data": {"count": 5}
}
```

### Pub-Sub (Broadcast)

```python
# Server broadcasts to all users in a room
await self.channel_layer.group_send(
    'course_123',  # All users in this course
    {
        'type': 'course_update',
        'data': {'new_lesson': 'Advanced Topics'}
    }
)
```

### Heartbeat (Keep-Alive)

```dart
// Client
Timer.periodic(Duration(seconds: 30), (_) {
  send({'type': 'ping'});
});

// Server
async def receive_json(self, content):
    if content.get('type') == 'ping':
        await self.send_json({'type': 'pong'})
```

---

## 📈 SCALING WEBSOCKETS

### The Challenge

```
Single Server:
[Server] ← 10,000 connections = 10,000 connections

Multiple Servers:
[Server 1] ← 5,000 connections
[Server 2] ← 5,000 connections

Problem: User A on Server 1 sends message to User B on Server 2
         Server 1 doesn't know about User B!
```

### Solution: Redis Pub/Sub

```
┌──────────────┐     ┌──────────────┐
│   Server 1   │     │   Server 2   │
│ (5k conns)   │     │ (5k conns)   │
└──────┬───────┘     └──────┬───────┘
       │                    │
       └────────┬───────────┘
                │
         ┌──────▼──────┐
         │    Redis    │
         │  (Pub/Sub)  │
         └─────────────┘

All servers publish to Redis
All servers subscribe to Redis
Messages reach all connections!
```

### Django Channels Config

```python
# settings.py
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [
                ('redis-1.example.com', 6379),
                ('redis-2.example.com', 6379),  # Cluster
            ],
            'capacity': 1500,  # Max messages per channel
            'expiry': 10,  # Message TTL
        },
    },
}
```

---

## 🔄 ERROR HANDLING & RECONNECTION

### Exponential Backoff

```dart
class ReconnectionStrategy {
  int _attempts = 0;
  static const _maxAttempts = 10;
  static const _baseDelay = Duration(seconds: 1);
  static const _maxDelay = Duration(seconds: 60);

  Duration get nextDelay {
    if (_attempts >= _maxAttempts) return _maxDelay;

    final delay = _baseDelay * (1 << _attempts);  // 1, 2, 4, 8, 16...
    _attempts++;

    return delay > _maxDelay ? _maxDelay : delay;
  }

  void reset() => _attempts = 0;
}

// Usage
void _scheduleReconnect() {
  final delay = _reconnectionStrategy.nextDelay;
  debugPrint('Reconnecting in ${delay.inSeconds}s...');

  _reconnectTimer = Timer(delay, () {
    _establishConnection();
  });
}

void _onConnected() {
  _reconnectionStrategy.reset();
}
```

### Connection State Machine

```
┌─────────────┐
│ DISCONNECTED│
└──────┬──────┘
       │ connect()
       ▼
┌─────────────┐
│ CONNECTING  │──timeout──► DISCONNECTED
└──────┬──────┘
       │ onOpen
       ▼
┌─────────────┐
│  CONNECTED  │──onClose──► DISCONNECTED
└──────┬──────┘
       │ error
       ▼
┌─────────────┐
│ RECONNECTING│──fail──► DISCONNECTED
└─────────────┘
```

---

## 🔒 SECURITY CONSIDERATIONS

### Authentication

```python
# Custom middleware for JWT auth
class JWTAuthMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        # Get token from query string
        query_string = scope.get('query_string', b'').decode()
        params = dict(param.split('=') for param in query_string.split('&') if '=' in param)
        token = params.get('token')

        if token:
            try:
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
                scope['user'] = await get_user(payload['user_id'])
            except jwt.InvalidTokenError:
                scope['user'] = AnonymousUser()
        else:
            scope['user'] = AnonymousUser()

        return await self.app(scope, receive, send)
```

### Rate Limiting

```python
from collections import defaultdict
import time

class RateLimitedConsumer(AsyncJsonWebsocketConsumer):
    rate_limits = defaultdict(list)
    LIMIT = 100  # messages
    WINDOW = 60  # seconds

    async def receive_json(self, content):
        user_id = self.scope['user'].id
        now = time.time()

        # Clean old entries
        self.rate_limits[user_id] = [
            t for t in self.rate_limits[user_id]
            if now - t < self.WINDOW
        ]

        if len(self.rate_limits[user_id]) >= self.LIMIT:
            await self.send_json({
                'type': 'error',
                'message': 'Rate limit exceeded'
            })
            return

        self.rate_limits[user_id].append(now)
        await self.handle_message(content)
```

---

## 🔄 ALTERNATIVES TO WEBSOCKETS

| Technology         | Use Case             | Pros             | Cons             |
| ------------------ | -------------------- | ---------------- | ---------------- |
| **SSE**            | Server → Client only | Simple, HTTP     | One-way          |
| **Long Polling**   | Fallback             | Works everywhere | Inefficient      |
| **WebRTC**         | P2P, video/audio     | Low latency      | Complex          |
| **gRPC Streaming** | Microservices        | Efficient, typed | Not for browsers |

### Server-Sent Events (SSE)

```python
# Django view
from django.http import StreamingHttpResponse

def events(request):
    def event_stream():
        while True:
            event = get_next_event()  # Your logic
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingHttpResponse(
        event_stream(),
        content_type='text/event-stream'
    )
```

```dart
// Flutter client
import 'package:http/http.dart' as http;

void listenToSSE() async {
  final request = http.Request('GET', Uri.parse('/events'));
  final response = await request.send();

  response.stream.transform(utf8.decoder).listen((data) {
    // Handle event
  });
}
```

---

## 💎 WEBSOCKET GOLDEN RULES

1. **Always implement reconnection** - Connections will drop
2. **Use heartbeats** - Detect dead connections
3. **Authenticate on connect** - Never trust unauthenticated connections
4. **Rate limit** - Prevent abuse
5. **Scale with Redis** - Essential for multiple servers
6. **Graceful degradation** - Fallback to polling if needed

---

**SINGULARITY ENGINE v16.0**  
_"Real-time is the new expectation. WebSockets deliver."_
