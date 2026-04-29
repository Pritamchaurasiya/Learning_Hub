# 🚀 FLUTTER + DJANGO: FULL-STACK INTEGRATION PATTERNS

## Enterprise-Grade Architecture for Modern Apps

---

## 📋 TABLE OF CONTENTS

1. [Architecture Overview](#-architecture-overview)
2. [API Communication](#-api-communication)
3. [Authentication Flow](#-authentication-flow)
4. [Real-Time with WebSockets](#-real-time-with-websockets)
5. [State Management](#-state-management-riverpod)
6. [Error Handling](#-error-handling)
7. [Performance Optimization](#-performance-optimization)
8. [Testing Strategies](#-testing-strategies)

---

## 🏗️ ARCHITECTURE OVERVIEW

### The Full Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                         FLUTTER APP                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Presentation │  │    Domain    │  │     Data     │          │
│  │   (Widgets)   │→│   (Entities) │←│ (Repositories)│          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         ↓                                    ↓                   │
│  ┌──────────────┐                    ┌──────────────┐          │
│  │  Controllers  │                    │  API Client  │          │
│  │  (Riverpod)   │                    │    (Dio)     │          │
│  └──────────────┘                    └──────────────┘          │
└─────────────────────────────────────────┬───────────┬───────────┘
                                          │  HTTP/WS  │
                                          ↓           ↓
┌─────────────────────────────────────────────────────────────────┐
│                         DJANGO BACKEND                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │    Views     │  │  Serializers │  │    Models    │          │
│  │  (REST API)  │→│  (Validation)│→│  (Database)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         ↓                                    ↓                   │
│  ┌──────────────┐                    ┌──────────────┐          │
│  │   Channels   │                    │    Celery    │          │
│  │ (WebSockets) │                    │   (Tasks)    │          │
│  └──────────────┘                    └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                                          ↓
                              ┌─────────────────────┐
                              │  PostgreSQL + Redis  │
                              └─────────────────────┘
```

### Layer Responsibilities

| Layer              | Flutter                   | Django               |
| ------------------ | ------------------------- | -------------------- |
| **Presentation**   | Widgets, Screens          | Templates, Static    |
| **Controller**     | Riverpod Providers        | Views/APIViews       |
| **Domain**         | Entities, UseCases        | Services             |
| **Data**           | Repositories, DataSources | Repositories, Models |
| **Infrastructure** | Dio, WebSocket            | DRF, Channels        |

---

## 🔌 API COMMUNICATION

### Flutter API Client (Dio)

```dart
class ApiClient {
  final Dio _dio;

  ApiClient() : _dio = Dio() {
    _dio.options = BaseOptions(
      baseUrl: 'http://127.0.0.1:8000/api/v1',
      connectTimeout: Duration(seconds: 30),
      receiveTimeout: Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    );

    // Add interceptors
    _dio.interceptors.addAll([
      AuthInterceptor(),
      LoggingInterceptor(),
      RetryInterceptor(),
    ]);
  }

  Future<Response<T>> get<T>(String path, {Map<String, dynamic>? params}) {
    return _dio.get(path, queryParameters: params);
  }

  Future<Response<T>> post<T>(String path, {dynamic data}) {
    return _dio.post(path, data: data);
  }
}
```

### Auth Interceptor

```dart
class AuthInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await SecureStorage.getAccessToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      // Try to refresh token
      final refreshed = await TokenManager.refreshToken();
      if (refreshed) {
        // Retry original request
        return handler.resolve(await _retry(err.requestOptions));
      }
    }
    handler.next(err);
  }
}
```

### Django REST Framework View

```python
from rest_framework import viewsets, permissions
from rest_framework.response import Response

class CourseViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    serializer_class = CourseSerializer

    def get_queryset(self):
        # Optimize queries
        return Course.objects.select_related(
            'instructor', 'category'
        ).prefetch_related(
            'lessons', 'enrollments'
        ).filter(is_published=True)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'status': 'success',
            'data': serializer.data
        })
```

---

## 🔐 AUTHENTICATION FLOW

### JWT Token Flow

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Flutter │         │  Django  │         │   Redis  │
└────┬─────┘         └────┬─────┘         └────┬─────┘
     │                     │                    │
     │  POST /auth/login   │                    │
     │  {email, password}  │                    │
     │────────────────────>│                    │
     │                     │                    │
     │                     │  Verify password   │
     │                     │                    │
     │  {access, refresh}  │                    │
     │<────────────────────│                    │
     │                     │                    │
     │  Store securely     │                    │
     │  (FlutterSecure     │                    │
     │   Storage)          │                    │
     │                     │                    │
     │  GET /courses       │                    │
     │  Authorization:     │                    │
     │  Bearer <access>    │                    │
     │────────────────────>│                    │
     │                     │                    │
     │                     │  Validate JWT      │
     │                     │────────────────────>
     │                     │                    │
     │  {courses: [...]}   │                    │
     │<────────────────────│                    │
     │                     │                    │
```

### Flutter Auth Repository

```dart
class AuthRepository {
  final ApiClient _client;
  final SecureStorage _storage;

  Future<User> login(String email, String password) async {
    final response = await _client.post('/auth/login/', data: {
      'email': email,
      'password': password,
    });

    final data = response.data['data'];

    // Save tokens securely
    await _storage.write(key: 'access_token', value: data['accessToken']);
    await _storage.write(key: 'refresh_token', value: data['refreshToken']);

    return User.fromJson(data['user']);
  }

  Future<void> logout() async {
    await _storage.deleteAll();
  }
}
```

### Django JWT Settings

```python
# settings/base.py
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
}
```

---

## ⚡ REAL-TIME WITH WEBSOCKETS

### Django Channels Consumer

```python
# consumers.py
from channels.generic.websocket import AsyncJsonWebsocketConsumer

class SubmissionConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.submission_id = self.scope['url_route']['kwargs']['submission_id']
        self.room_group = f'submission_{self.submission_id}'

        await self.channel_layer.group_add(
            self.room_group,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(
            self.room_group,
            self.channel_name
        )

    async def submission_update(self, event):
        """Send status update to WebSocket"""
        await self.send_json({
            'type': 'status_update',
            'status': event['status'],
            'result': event.get('result')
        })
```

### Flutter WebSocket Client

```dart
class WebSocketService {
  WebSocketChannel? _channel;

  void connect(String submissionId) {
    final uri = Uri.parse('ws://127.0.0.1:8000/ws/submission/$submissionId/');
    _channel = WebSocketChannel.connect(uri);

    _channel!.stream.listen((message) {
      final data = jsonDecode(message);
      _handleMessage(data);
    }, onError: (error) {
      debugPrint('WebSocket error: $error');
      _reconnect(submissionId);
    });
  }

  void _handleMessage(Map<String, dynamic> data) {
    if (data['type'] == 'status_update') {
      // Update UI via provider
      ref.read(submissionProvider.notifier).updateStatus(
        data['status'],
        data['result'],
      );
    }
  }

  void disconnect() {
    _channel?.sink.close();
    _channel = null;
  }
}
```

---

## 🎛️ STATE MANAGEMENT (RIVERPOD)

### Provider Architecture

```dart
// 1. Simple Provider (static data)
final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());

// 2. StateNotifier (mutable state)
final authNotifierProvider = StateNotifierProvider<AuthNotifier, AuthState>(
  (ref) => AuthNotifier(ref.watch(authRepositoryProvider)),
);

// 3. FutureProvider (async data)
final coursesProvider = FutureProvider<List<Course>>((ref) async {
  final repo = ref.watch(courseRepositoryProvider);
  return repo.getCourses();
});

// 4. StreamProvider (real-time data)
final submissionStatusProvider = StreamProvider<SubmissionStatus>((ref) {
  final wsService = ref.watch(webSocketServiceProvider);
  return wsService.statusStream;
});
```

### Usage in Widgets

```dart
class CoursesScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final coursesAsync = ref.watch(coursesProvider);

    return coursesAsync.when(
      data: (courses) => ListView.builder(
        itemCount: courses.length,
        itemBuilder: (_, i) => CourseCard(course: courses[i]),
      ),
      loading: () => Center(child: CircularProgressIndicator()),
      error: (err, stack) => ErrorWidget(error: err),
    );
  }
}
```

---

## 🚨 ERROR HANDLING

### Flutter Error Types

```dart
sealed class AppException implements Exception {
  final String message;
  AppException(this.message);
}

class NetworkException extends AppException {
  NetworkException() : super('No internet connection');
}

class ServerException extends AppException {
  final int statusCode;
  ServerException({required this.statusCode, required String message})
    : super(message);
}

class AuthException extends AppException {
  AuthException() : super('Authentication required');
}
```

### Global Error Handler

```dart
class ErrorInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    AppException exception;

    switch (err.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.receiveTimeout:
        exception = NetworkException();
        break;
      case DioExceptionType.badResponse:
        final statusCode = err.response?.statusCode ?? 500;
        final message = err.response?.data['message'] ?? 'Server error';
        exception = ServerException(statusCode: statusCode, message: message);
        break;
      default:
        exception = AppException('Unknown error');
    }

    handler.reject(DioException(
      requestOptions: err.requestOptions,
      error: exception,
    ));
  }
}
```

---

## ⚡ PERFORMANCE OPTIMIZATION

### Backend Optimization

```python
# 1. Select Related (avoid N+1)
courses = Course.objects.select_related('instructor').all()

# 2. Prefetch Related (many-to-many, reverse FK)
courses = Course.objects.prefetch_related('lessons', 'tags').all()

# 3. Only/Defer (limit fields)
courses = Course.objects.only('id', 'title', 'slug').all()

# 4. Pagination
class StandardPagination(PageNumberPagination):
    page_size = 20
    max_page_size = 100

# 5. Caching
from django.core.cache import cache

def get_popular_courses():
    key = 'popular_courses'
    courses = cache.get(key)
    if not courses:
        courses = list(Course.objects.order_by('-enrollment_count')[:10])
        cache.set(key, courses, timeout=300)
    return courses
```

### Frontend Optimization

```dart
// 1. Image Caching
CachedNetworkImage(
  imageUrl: course.thumbnailUrl,
  placeholder: (_, __) => Shimmer(),
  errorWidget: (_, __, ___) => Icon(Icons.error),
);

// 2. Lazy Loading
ListView.builder(
  itemCount: courses.length,
  itemBuilder: (_, i) => CourseCard(course: courses[i]),
);

// 3. Selective Rebuilds
Consumer(
  builder: (context, ref, child) {
    final count = ref.watch(cartProvider.select((cart) => cart.itemCount));
    return Badge(count: count, child: child!);
  },
  child: Icon(Icons.shopping_cart),  // Never rebuilds
);

// 4. Debouncing Search
final searchProvider = StateProvider<String>((ref) => '');

ref.listen(searchProvider, (_, query) {
  _debouncer.run(() => ref.read(searchResultsProvider.notifier).search(query));
});
```

---

## 🧪 TESTING STRATEGIES

### Backend Testing

```python
# tests/test_courses.py
import pytest
from rest_framework.test import APIClient

@pytest.mark.django_db
class TestCourseAPI:
    def setup_method(self):
        self.client = APIClient()

    def test_list_courses(self, user, course):
        self.client.force_authenticate(user=user)
        response = self.client.get('/api/v1/courses/')

        assert response.status_code == 200
        assert response.data['status'] == 'success'
        assert len(response.data['data']) == 1

    def test_unauthorized_access(self):
        response = self.client.get('/api/v1/courses/')
        assert response.status_code == 401
```

### Frontend Testing

```dart
// test/widget_test.dart
void main() {
  testWidgets('Login screen shows form', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(home: LoginScreen()),
      ),
    );

    expect(find.byType(TextField), findsNWidgets(2));
    expect(find.byType(ElevatedButton), findsOneWidget);
  });

  testWidgets('Login button triggers auth', (tester) async {
    final mockAuthRepo = MockAuthRepository();
    when(mockAuthRepo.login(any, any)).thenAnswer(
      (_) async => User.test(),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [authRepositoryProvider.overrideWithValue(mockAuthRepo)],
        child: MaterialApp(home: LoginScreen()),
      ),
    );

    await tester.enterText(find.byKey(Key('email')), 'test@example.com');
    await tester.enterText(find.byKey(Key('password')), 'password');
    await tester.tap(find.byType(ElevatedButton));
    await tester.pumpAndSettle();

    verify(mockAuthRepo.login('test@example.com', 'password')).called(1);
  });
}
```

---

## 💎 INTEGRATION CHECKLIST

- [ ] API Client with auth interceptor
- [ ] JWT token refresh mechanism
- [ ] Secure token storage (FlutterSecureStorage)
- [ ] WebSocket connection with auto-reconnect
- [ ] Riverpod providers for all features
- [ ] Error handling with user-friendly messages
- [ ] Loading states for all async operations
- [ ] Offline-first with local caching
- [ ] Pagination for list endpoints
- [ ] Comprehensive tests (unit + widget + integration)

---

**SINGULARITY ENGINE v15.0**  
_"A seamless full-stack is invisible to the user."_
