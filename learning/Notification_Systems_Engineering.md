# 🔔 NOTIFICATION SYSTEMS & REAL-TIME ENGINEERING

## Building Scalable Push & Real-Time Notification Infrastructure

---

## 📋 TABLE OF CONTENTS

1. [Notification Architecture](#-notification-architecture)
2. [Push Notifications](#-push-notifications-fcm)
3. [Real-Time with WebSockets](#-real-time-with-websockets)
4. [Email Notifications](#-email-notifications)
5. [In-App Notifications](#-in-app-notifications)
6. [Notification Preferences](#-notification-preferences)
7. [Scaling Strategies](#-scaling-strategies)
8. [Best Practices](#-best-practices)

---

## 🏗️ NOTIFICATION ARCHITECTURE

### Multi-Channel System

```
                    ┌─────────────────────────────────┐
                    │      Notification Service       │
                    │   (Central Orchestrator)        │
                    └─────────────┬───────────────────┘
                                  │
          ┌───────────┬───────────┼───────────┬───────────┐
          ▼           ▼           ▼           ▼           ▼
    ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
    │  Push   │ │  Email  │ │   SMS   │ │ In-App  │ │ WebSock │
    │  (FCM)  │ │ (SMTP)  │ │(Twilio) │ │  (DB)   │ │ (Redis) │
    └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
         │           │           │           │           │
         ▼           ▼           ▼           ▼           ▼
    ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
    │  Phone  │ │  Email  │ │  Phone  │ │   App   │ │ Browser │
    │   App   │ │  Client │ │   SMS   │ │   UI    │ │   Tab   │
    └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
```

### Our Implementation

```python
# notifications/models.py
class Notification(BaseModel):
    class Type(models.TextChoices):
        COURSE_ENROLLED = "course_enrolled", "Course Enrolled"
        LESSON_COMPLETED = "lesson_completed", "Lesson Completed"
        BADGE_EARNED = "badge_earned", "Badge Earned"
        STREAK_MILESTONE = "streak_milestone", "Streak Milestone"
        PAYMENT_SUCCESS = "payment_success", "Payment Success"
        SYSTEM = "system", "System"

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    type = models.CharField(max_length=50, choices=Type.choices)
    title = models.CharField(max_length=200)
    message = models.TextField()
    data = models.JSONField(default=dict)  # Extra context

    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['user', '-created_at']),
        ]
```

---

## 📱 PUSH NOTIFICATIONS (FCM)

### Device Token Management

```python
# notifications/models.py
class DeviceToken(BaseModel):
    class Platform(models.TextChoices):
        ANDROID = "android", "Android"
        IOS = "ios", "iOS"
        WEB = "web", "Web"

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.CharField(max_length=500, unique=True)
    platform = models.CharField(max_length=20, choices=Platform.choices)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ['user', 'token']
```

### FCM Integration

```python
import firebase_admin
from firebase_admin import credentials, messaging

# Initialize once
cred = credentials.Certificate("firebase-credentials.json")
firebase_admin.initialize_app(cred)

def send_push_notification(user_id: int, title: str, body: str, data: dict = None):
    """Send push notification to all user devices."""
    tokens = DeviceToken.objects.filter(
        user_id=user_id,
        is_active=True
    ).values_list('token', flat=True)

    if not tokens:
        return

    message = messaging.MulticastMessage(
        tokens=list(tokens),
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        data=data or {},
        android=messaging.AndroidConfig(
            priority='high',
            notification=messaging.AndroidNotification(
                sound='default',
                click_action='FLUTTER_NOTIFICATION_CLICK'
            )
        ),
        apns=messaging.APNSConfig(
            payload=messaging.APNSPayload(
                aps=messaging.Aps(
                    sound='default',
                    badge=1
                )
            )
        )
    )

    response = messaging.send_multicast(message)

    # Handle failed tokens
    if response.failure_count > 0:
        for idx, result in enumerate(response.responses):
            if not result.success:
                if result.exception.code in ['UNREGISTERED', 'INVALID_ARGUMENT']:
                    DeviceToken.objects.filter(token=tokens[idx]).update(is_active=False)
```

### Flutter Client

```dart
// lib/services/push_notification_service.dart
class PushNotificationService {
  final FirebaseMessaging _fcm = FirebaseMessaging.instance;

  Future<void> initialize() async {
    // Request permission
    await _fcm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    // Get token
    final token = await _fcm.getToken();
    if (token != null) {
      await _registerToken(token);
    }

    // Listen for token refresh
    _fcm.onTokenRefresh.listen(_registerToken);

    // Handle foreground messages
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

    // Handle background messages
    FirebaseMessaging.onBackgroundMessage(_handleBackgroundMessage);
  }

  Future<void> _registerToken(String token) async {
    await apiClient.post('/notifications/register-device/', data: {
      'token': token,
      'platform': Platform.isAndroid ? 'android' : 'ios',
    });
  }

  void _handleForegroundMessage(RemoteMessage message) {
    // Show local notification or update UI
    showLocalNotification(
      title: message.notification?.title ?? '',
      body: message.notification?.body ?? '',
    );
  }
}
```

---

## ⚡ REAL-TIME WITH WEBSOCKETS

### Django Channels Setup

```python
# notifications/consumers.py
from channels.generic.websocket import AsyncJsonWebsocketConsumer

class NotificationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        if not self.scope["user"].is_authenticated:
            await self.close()
            return

        self.user_id = str(self.scope["user"].id)
        self.room_name = f"user_{self.user_id}"

        await self.channel_layer.group_add(
            self.room_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(
            self.room_name,
            self.channel_name
        )

    async def notification_message(self, event):
        """Send notification to WebSocket."""
        await self.send_json({
            'type': 'notification',
            'notification': event['notification']
        })

# Broadcasting from anywhere in Django
async def broadcast_notification(user_id: int, notification: dict):
    channel_layer = get_channel_layer()
    await channel_layer.group_send(
        f"user_{user_id}",
        {
            "type": "notification_message",
            "notification": notification
        }
    )
```

### Flutter WebSocket Client

```dart
class WebSocketNotificationService {
  WebSocketChannel? _channel;
  final _notificationController = StreamController<Notification>.broadcast();

  Stream<Notification> get notifications => _notificationController.stream;

  void connect(String token) {
    final uri = Uri.parse('ws://host/ws/notifications/?token=$token');
    _channel = WebSocketChannel.connect(uri);

    _channel!.stream.listen(
      (message) {
        final data = jsonDecode(message);
        if (data['type'] == 'notification') {
          _notificationController.add(
            Notification.fromJson(data['notification'])
          );
        }
      },
      onError: (error) => _reconnect(token),
      onDone: () => _reconnect(token),
    );
  }

  void _reconnect(String token) {
    Future.delayed(Duration(seconds: 5), () => connect(token));
  }

  void dispose() {
    _channel?.sink.close();
    _notificationController.close();
  }
}
```

---

## 📧 EMAIL NOTIFICATIONS

### Template-Based Emails

```python
# notifications/services.py
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags

class EmailService:
    @staticmethod
    def send_templated_email(
        user,
        template_name: str,
        subject: str,
        context: dict
    ):
        context.update({
            'user': user,
            'site_name': 'Learning Hub',
            'support_email': 'support@learninghub.com'
        })

        html_message = render_to_string(
            f'emails/{template_name}.html',
            context
        )
        plain_message = strip_tags(html_message)

        send_mail(
            subject=subject,
            message=plain_message,
            from_email='noreply@learninghub.com',
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False
        )

# Usage
EmailService.send_templated_email(
    user=user,
    template_name='course_enrolled',
    subject='Welcome to Your New Course!',
    context={'course': course}
)
```

### Async Email with Celery

```python
# notifications/tasks.py
from celery import shared_task

@shared_task
def send_email_async(user_id: int, template: str, subject: str, context: dict):
    user = User.objects.get(id=user_id)
    EmailService.send_templated_email(user, template, subject, context)

# Usage (non-blocking)
send_email_async.delay(user.id, 'welcome', 'Welcome!', {})
```

---

## 📬 IN-APP NOTIFICATIONS

### Creating Notifications

```python
# notifications/services.py
class NotificationService:
    @classmethod
    def create(
        cls,
        user,
        type: str,
        title: str,
        message: str,
        data: dict = None,
        channels: list = None
    ):
        """Create notification and dispatch to channels."""
        # 1. Save to database
        notification = Notification.objects.create(
            user=user,
            type=type,
            title=title,
            message=message,
            data=data or {}
        )

        # 2. Determine channels
        channels = channels or ['push', 'websocket']

        # 3. Check user preferences
        prefs = NotificationPreference.objects.get_or_create(user=user)[0]

        # 4. Dispatch
        if 'push' in channels and prefs.push_enabled:
            send_push_notification.delay(
                user.id, title, message, data
            )

        if 'websocket' in channels:
            async_to_sync(broadcast_notification)(
                user.id,
                NotificationSerializer(notification).data
            )

        if 'email' in channels and prefs.email_enabled:
            send_email_async.delay(
                user.id,
                f'notification_{type}',
                title,
                {'message': message, **data}
            )

        return notification

# Usage throughout the app
NotificationService.create(
    user=user,
    type='badge_earned',
    title='New Badge Unlocked! 🏆',
    message=f'You earned the "{badge.name}" badge!',
    data={'badge_id': badge.id}
)
```

### API Endpoints

```python
# notifications/views.py
class NotificationListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        unread_count = qs.filter(is_read=False).count()
        notifications = self.get_serializer(qs[:50], many=True).data

        return Response({
            'status': 'success',
            'data': {
                'notifications': notifications,
                'unread_count': unread_count
            }
        })

class MarkReadView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ids = request.data.get('ids', [])

        qs = Notification.objects.filter(
            user=request.user,
            is_read=False
        )
        if ids:
            qs = qs.filter(id__in=ids)

        qs.update(is_read=True, read_at=timezone.now())

        return Response({'status': 'success'})
```

---

## ⚙️ NOTIFICATION PREFERENCES

### Model

```python
class NotificationPreference(BaseModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE)

    # Channel toggles
    push_enabled = models.BooleanField(default=True)
    email_enabled = models.BooleanField(default=True)
    sms_enabled = models.BooleanField(default=False)

    # Type toggles
    marketing_enabled = models.BooleanField(default=True)
    course_updates = models.BooleanField(default=True)
    social_notifications = models.BooleanField(default=True)

    # Quiet hours
    quiet_hours_enabled = models.BooleanField(default=False)
    quiet_start = models.TimeField(null=True)  # e.g., 22:00
    quiet_end = models.TimeField(null=True)    # e.g., 08:00
```

### Checking Preferences

```python
def should_send(user, channel: str, type: str) -> bool:
    prefs = NotificationPreference.objects.get_or_create(user=user)[0]

    # Check channel
    channel_enabled = getattr(prefs, f'{channel}_enabled', True)
    if not channel_enabled:
        return False

    # Check type
    type_mapping = {
        'badge_earned': 'social_notifications',
        'course_enrolled': 'course_updates',
        'promo': 'marketing_enabled'
    }
    pref_field = type_mapping.get(type)
    if pref_field and not getattr(prefs, pref_field, True):
        return False

    # Check quiet hours
    if prefs.quiet_hours_enabled:
        now = timezone.localtime().time()
        if prefs.quiet_start <= now or now <= prefs.quiet_end:
            return False

    return True
```

---

## 📈 SCALING STRATEGIES

### Message Queue Architecture

```
┌──────────────┐
│  Django App  │
└──────┬───────┘
       │ publish
       ▼
┌──────────────────────────────────────────┐
│              Redis / RabbitMQ            │
│         (Notification Queue)             │
└────────┬─────────────┬───────────────────┘
         │             │
    ┌────▼────┐   ┌────▼────┐
    │ Worker 1│   │ Worker 2│
    │  (FCM)  │   │ (Email) │
    └─────────┘   └─────────┘
```

### Batch Processing

```python
@shared_task
def send_bulk_notifications(user_ids: list, notification_data: dict):
    """Efficient bulk notification sending."""
    # Batch database inserts
    notifications = [
        Notification(user_id=uid, **notification_data)
        for uid in user_ids
    ]
    Notification.objects.bulk_create(notifications)

    # Batch FCM (up to 500 per call)
    tokens = list(DeviceToken.objects.filter(
        user_id__in=user_ids,
        is_active=True
    ).values_list('token', flat=True))

    for batch in chunked(tokens, 500):
        send_fcm_multicast.delay(batch, notification_data)
```

---

## 💎 BEST PRACTICES

### Do's

- ✅ **Respect user preferences** - Always check before sending
- ✅ **Rate limit** - Don't spam users
- ✅ **Batch operations** - Efficient for bulk sends
- ✅ **Retry with backoff** - Handle transient failures
- ✅ **Clean up stale tokens** - Remove invalid FCM tokens
- ✅ **Use rich notifications** - Images, actions, deep links

### Don'ts

- ❌ **Don't over-notify** - Leads to opt-outs
- ❌ **Don't send at bad times** - Respect quiet hours
- ❌ **Don't block on notifications** - Always async
- ❌ **Don't ignore errors** - Monitor delivery rates
- ❌ **Don't hardcode content** - Use templates

### Metrics to Track

| Metric        | Description          | Target |
| ------------- | -------------------- | ------ |
| Delivery Rate | Successful / Sent    | >95%   |
| Open Rate     | Opened / Delivered   | >20%   |
| Click Rate    | Clicked / Opened     | >10%   |
| Opt-out Rate  | Unsubscribes / Month | <5%    |
| Latency       | Time to deliver      | <5s    |

---

**SINGULARITY ENGINE v16.0**  
_"The right notification, at the right time, to the right person."_
