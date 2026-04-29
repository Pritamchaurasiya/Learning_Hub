# 📱 MOBILE APP DEVELOPMENT BEST PRACTICES

## Building Production-Ready Mobile Applications

---

## 📋 TABLE OF CONTENTS

1. [Architecture Patterns](#-architecture-patterns)
2. [Offline-First Design](#-offline-first-design)
3. [Push Notifications](#-push-notifications)
4. [Deep Linking](#-deep-linking)
5. [App Security](#-app-security)
6. [App Store Optimization](#-app-store-optimization)
7. [Release Management](#-release-management)

---

## 🏛️ ARCHITECTURE PATTERNS

### Clean Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│              (Widgets, Pages, Controllers)                   │
├─────────────────────────────────────────────────────────────┤
│                      Domain Layer                            │
│              (Entities, Use Cases, Repos)                    │
├─────────────────────────────────────────────────────────────┤
│                       Data Layer                             │
│              (APIs, Storage, Data Sources)                   │
└─────────────────────────────────────────────────────────────┘

Dependencies flow INWARD only
Domain never depends on Data or Presentation
```

### Feature-First Structure

```
lib/
├── core/
│   ├── network/
│   ├── storage/
│   └── theme/
├── features/
│   ├── auth/
│   │   ├── data/
│   │   │   ├── auth_api.dart
│   │   │   └── auth_repository.dart
│   │   ├── domain/
│   │   │   ├── user.dart
│   │   │   └── auth_service.dart
│   │   └── presentation/
│   │       ├── login_screen.dart
│   │       └── auth_provider.dart
│   ├── courses/
│   └── profile/
└── main.dart
```

---

## 📴 OFFLINE-FIRST DESIGN

### Local Database (Hive)

```dart
@HiveType(typeId: 0)
class Course extends HiveObject {
  @HiveField(0)
  String id;

  @HiveField(1)
  String title;

  @HiveField(2)
  DateTime syncedAt;
}

class CourseRepository {
  final Box<Course> _box;
  final ApiClient _api;

  Future<List<Course>> getCourses() async {
    // Return cached immediately
    final cached = _box.values.toList();

    // Sync in background
    _syncFromServer();

    return cached;
  }

  Future<void> _syncFromServer() async {
    try {
      final remote = await _api.getCourses();
      await _box.clear();
      await _box.addAll(remote);
    } catch (e) {
      // Offline - use cached
    }
  }
}
```

### Sync Queue Pattern

```dart
class SyncQueue {
  final Box<SyncOperation> _queue;

  Future<void> enqueue(SyncOperation op) async {
    await _queue.add(op);
    await _processQueue();
  }

  Future<void> _processQueue() async {
    if (!await _hasConnection()) return;

    for (var op in _queue.values) {
      try {
        await _execute(op);
        await op.delete();
      } catch (e) {
        // Will retry later
        break;
      }
    }
  }
}
```

---

## 🔔 PUSH NOTIFICATIONS

### Firebase Cloud Messaging

```dart
class NotificationService {
  final FirebaseMessaging _fcm = FirebaseMessaging.instance;

  Future<void> init() async {
    // Request permission
    await _fcm.requestPermission();

    // Get token
    final token = await _fcm.getToken();
    await _sendTokenToServer(token);

    // Token refresh
    _fcm.onTokenRefresh.listen(_sendTokenToServer);

    // Foreground messages
    FirebaseMessaging.onMessage.listen(_handleForeground);

    // Background/terminated
    FirebaseMessaging.onBackgroundMessage(_handleBackground);

    // Opened from notification
    FirebaseMessaging.onMessageOpenedApp.listen(_handleOpen);
  }

  void _handleForeground(RemoteMessage message) {
    // Show local notification or update UI
  }

  void _handleOpen(RemoteMessage message) {
    // Navigate to relevant screen
    final screen = message.data['screen'];
    Navigator.pushNamed(context, screen);
  }
}
```

---

## 🔗 DEEP LINKING

### Flutter Deep Links

```dart
// Route configuration
class AppRouter {
  static final routes = {
    '/course/:id': (params) => CourseScreen(id: params['id']!),
    '/lesson/:courseId/:lessonId': (params) => LessonScreen(
      courseId: params['courseId']!,
      lessonId: params['lessonId']!,
    ),
  };
}

// Handle deep links
class DeepLinkHandler {
  void init() {
    // Initial link (app launched from link)
    getInitialLink().then(_handleLink);

    // Links while app is running
    linkStream.listen(_handleLink);
  }

  void _handleLink(String? link) {
    if (link == null) return;

    final uri = Uri.parse(link);
    // https://app.example.com/course/123

    if (uri.pathSegments.first == 'course') {
      final courseId = uri.pathSegments[1];
      Navigator.pushNamed(context, '/course/$courseId');
    }
  }
}
```

---

## 🔐 APP SECURITY

### Secure Storage

```dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorage {
  final _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  Future<void> saveToken(String token) async {
    await _storage.write(key: 'auth_token', value: token);
  }

  Future<String?> getToken() async {
    return await _storage.read(key: 'auth_token');
  }
}
```

### Certificate Pinning

```dart
class SecureHttpClient {
  HttpClient createClient() {
    final client = HttpClient();

    client.badCertificateCallback = (cert, host, port) {
      // Compare with known certificate
      final expected = 'SHA256:abc123...';
      final actual = sha256.convert(cert.der).toString();
      return actual == expected;
    };

    return client;
  }
}
```

### Code Obfuscation

```bash
# Build with obfuscation
flutter build apk --obfuscate --split-debug-info=./debug-info/

# Keep debug symbols separate for crash reporting
```

---

## 📈 APP STORE OPTIMIZATION

### Key Factors

| Factor          | iOS         | Android               |
| --------------- | ----------- | --------------------- |
| **Title**       | 30 chars    | 30 chars              |
| **Subtitle**    | 30 chars    | 80 chars (short desc) |
| **Keywords**    | 100 chars   | In description        |
| **Screenshots** | 6.5" + 5.5" | Phone + Tablet        |
| **Description** | 4000 chars  | 4000 chars            |

### Best Practices

```yaml
# metadata/en-US/
├── title.txt           # "Learning Hub - Online Courses"
├── short_description.txt  # "Learn coding, AI & more"
├── full_description.txt   # Detailed with keywords
├── keywords.txt        # iOS only
└── screenshots/
    ├── 1_home.png
    ├── 2_courses.png
    └── 3_learning.png
```

---

## 🚀 RELEASE MANAGEMENT

### Versioning

```yaml
# pubspec.yaml
version: 1.2.3+45
# 1.2.3 = user-visible version
# 45 = internal build number (always increment)
```

### CI/CD with Fastlane

```ruby
# fastlane/Fastfile
lane :beta do
  # Build
  flutter_build(type: "apk")

  # Upload to Play Store internal
  upload_to_play_store(
    track: "internal",
    aab: "../build/app/outputs/bundle/release/app-release.aab"
  )
end

lane :release do
  # Promote from internal to production
  upload_to_play_store(
    track: "production",
    track_promote_to: "production"
  )
end
```

### Feature Flags

```dart
class FeatureFlags {
  static Future<bool> isEnabled(String flag) async {
    final remoteConfig = FirebaseRemoteConfig.instance;
    await remoteConfig.fetchAndActivate();
    return remoteConfig.getBool(flag);
  }
}

// Usage
if (await FeatureFlags.isEnabled('new_checkout')) {
  // Show new checkout
} else {
  // Show old checkout
}
```

---

## 💎 MOBILE DEV GOLDEN RULES

1. **Offline first** - Assume no network
2. **Battery conscious** - Minimize background work
3. **Responsive UI** - Never block main thread
4. **Graceful degradation** - Handle errors elegantly
5. **Test on real devices** - Emulators lie

---

**SINGULARITY ENGINE v16.0**  
_"Mobile users expect instant, reliable experiences."_
