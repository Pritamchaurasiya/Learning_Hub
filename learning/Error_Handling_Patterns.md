# ⚠️ ERROR HANDLING: COMPLETE PATTERNS GUIDE

## Building Resilient and User-Friendly Applications

---

## 📋 TABLE OF CONTENTS

1. [Error Types](#-error-types)
2. [Backend Error Handling (Django)](#-backend-error-handling-django)
3. [Frontend Error Handling (Flutter)](#-frontend-error-handling-flutter)
4. [API Error Responses](#-api-error-responses)
5. [Circuit Breaker Pattern](#-circuit-breaker-pattern)
6. [Retry Patterns](#-retry-patterns)
7. [Logging & Monitoring](#-logging--monitoring)
8. [User-Friendly Error Messages](#-user-friendly-error-messages)

---

## 🚨 ERROR TYPES

### Classification

```
┌─────────────────────────────────────────────────────────────┐
│                     Error Categories                         │
├──────────────────┬──────────────────┬───────────────────────┤
│    Expected      │    Unexpected    │      External         │
├──────────────────┼──────────────────┼───────────────────────┤
│ - Validation     │ - NullPointer    │ - Network timeout     │
│ - Not found      │ - Division by 0  │ - API unavailable     │
│ - Unauthorized   │ - Out of memory  │ - Database down       │
│ - Business rules │ - Type errors    │ - Third-party failure │
├──────────────────┴──────────────────┴───────────────────────┤
│   Recoverable    │   Log & Alert   │   Retry & Fallback    │
└─────────────────────────────────────────────────────────────┘
```

### Error Severity

| Level        | Description      | Action             |
| ------------ | ---------------- | ------------------ |
| **DEBUG**    | Development info | Log only           |
| **INFO**     | Normal operation | Log                |
| **WARNING**  | Potential issue  | Log + Monitor      |
| **ERROR**    | Failed operation | Log + Alert        |
| **CRITICAL** | System failure   | Log + Alert + Page |

---

## 🐍 BACKEND ERROR HANDLING (DJANGO)

### Custom Exception Hierarchy

```python
# core/exceptions.py
class AppException(Exception):
    """Base exception for application errors."""
    status_code = 500
    error_code = "internal_error"
    message = "An unexpected error occurred"

    def __init__(self, message=None, details=None):
        self.message = message or self.message
        self.details = details or {}
        super().__init__(self.message)

class ValidationError(AppException):
    status_code = 422
    error_code = "validation_error"
    message = "Validation failed"

class NotFoundError(AppException):
    status_code = 404
    error_code = "not_found"
    message = "Resource not found"

class UnauthorizedError(AppException):
    status_code = 401
    error_code = "unauthorized"
    message = "Authentication required"

class ForbiddenError(AppException):
    status_code = 403
    error_code = "forbidden"
    message = "Permission denied"

class ConflictError(AppException):
    status_code = 409
    error_code = "conflict"
    message = "Resource conflict"

class RateLimitError(AppException):
    status_code = 429
    error_code = "rate_limited"
    message = "Too many requests"

class ExternalServiceError(AppException):
    status_code = 502
    error_code = "external_service_error"
    message = "External service unavailable"
```

### Global Exception Handler

```python
# core/exception_handler.py
from rest_framework.views import exception_handler
from rest_framework.response import Response
import logging
import traceback

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    # Handle DRF exceptions first
    response = exception_handler(exc, context)

    # Handle our custom exceptions
    if isinstance(exc, AppException):
        logger.warning(
            f"{exc.error_code}: {exc.message}",
            extra={'details': exc.details}
        )
        return Response({
            'status': 'error',
            'code': exc.error_code,
            'message': exc.message,
            'details': exc.details
        }, status=exc.status_code)

    # Handle unexpected exceptions
    if response is None:
        logger.error(
            f"Unhandled exception: {str(exc)}",
            exc_info=True,
            extra={
                'request_path': context['request'].path,
                'traceback': traceback.format_exc()
            }
        )
        return Response({
            'status': 'error',
            'code': 'internal_error',
            'message': 'An unexpected error occurred'
        }, status=500)

    # Transform DRF response to our format
    return Response({
        'status': 'error',
        'code': 'request_error',
        'message': str(response.data),
        'details': response.data if isinstance(response.data, dict) else {}
    }, status=response.status_code)

# settings.py
REST_FRAMEWORK = {
    'EXCEPTION_HANDLER': 'core.exception_handler.custom_exception_handler',
}
```

### Usage in Views

```python
# views.py
from core.exceptions import NotFoundError, ValidationError, ForbiddenError

class CourseDetailView(APIView):
    def get(self, request, slug):
        try:
            course = Course.objects.get(slug=slug)
        except Course.DoesNotExist:
            raise NotFoundError(
                message=f"Course '{slug}' not found",
                details={'slug': slug}
            )

        if not course.is_published and course.instructor != request.user:
            raise ForbiddenError(
                message="Cannot access unpublished course"
            )

        return Response({
            'status': 'success',
            'data': CourseSerializer(course).data
        })

    def post(self, request):
        serializer = CourseSerializer(data=request.data)

        if not serializer.is_valid():
            raise ValidationError(
                message="Invalid course data",
                details={'errors': serializer.errors}
            )

        course = serializer.save(instructor=request.user)
        return Response({
            'status': 'success',
            'data': CourseSerializer(course).data
        }, status=201)
```

---

## 📱 FRONTEND ERROR HANDLING (FLUTTER)

### Exception Classes

```dart
// lib/core/errors/exceptions.dart
abstract class AppException implements Exception {
  final String message;
  final String code;
  final Map<String, dynamic>? details;

  const AppException({
    required this.message,
    required this.code,
    this.details,
  });

  @override
  String toString() => message;
}

class NetworkException extends AppException {
  const NetworkException({super.message = 'Network error', super.details})
      : super(code: 'network_error');
}

class ServerException extends AppException {
  final int statusCode;

  const ServerException({
    required this.statusCode,
    required super.message,
    super.code = 'server_error',
    super.details,
  });
}

class ValidationException extends AppException {
  final Map<String, List<String>> fieldErrors;

  const ValidationException({
    required this.fieldErrors,
    super.message = 'Validation failed',
  }) : super(code: 'validation_error', details: null);
}

class UnauthorizedException extends AppException {
  const UnauthorizedException({super.message = 'Session expired'})
      : super(code: 'unauthorized');
}
```

### API Client Error Handling

```dart
// lib/core/network/api_client.dart
class ApiClient {
  final Dio _dio;

  ApiClient() : _dio = Dio() {
    _dio.interceptors.add(ErrorInterceptor());
  }

  Future<T> get<T>(String path, {Map<String, dynamic>? params}) async {
    try {
      final response = await _dio.get(path, queryParameters: params);
      return _handleResponse<T>(response);
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  T _handleResponse<T>(Response response) {
    final data = response.data;
    if (data['status'] == 'success') {
      return data['data'] as T;
    }
    throw ServerException(
      statusCode: response.statusCode ?? 500,
      message: data['message'] ?? 'Unknown error',
      code: data['code'] ?? 'error',
      details: data['details'],
    );
  }

  AppException _handleDioError(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return NetworkException(message: 'Connection timeout');

      case DioExceptionType.connectionError:
        return NetworkException(message: 'No internet connection');

      case DioExceptionType.badResponse:
        final statusCode = e.response?.statusCode ?? 500;
        final data = e.response?.data;

        if (statusCode == 401) {
          return UnauthorizedException();
        }
        if (statusCode == 422) {
          return ValidationException(
            fieldErrors: _parseFieldErrors(data['details']),
          );
        }

        return ServerException(
          statusCode: statusCode,
          message: data?['message'] ?? 'Server error',
          code: data?['code'] ?? 'server_error',
        );

      default:
        return NetworkException(message: 'Network error');
    }
  }
}
```

### Error Boundary Widget

```dart
// lib/core/widgets/error_boundary.dart
class ErrorBoundary extends StatefulWidget {
  final Widget child;
  final Widget Function(Object error, StackTrace? stack)? errorBuilder;

  const ErrorBoundary({
    required this.child,
    this.errorBuilder,
  });

  @override
  _ErrorBoundaryState createState() => _ErrorBoundaryState();
}

class _ErrorBoundaryState extends State<ErrorBoundary> {
  Object? _error;
  StackTrace? _stackTrace;

  @override
  void initState() {
    super.initState();
    FlutterError.onError = (details) {
      setState(() {
        _error = details.exception;
        _stackTrace = details.stack;
      });
    };
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return widget.errorBuilder?.call(_error!, _stackTrace) ??
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.error, size: 48, color: Colors.red),
                SizedBox(height: 16),
                Text('Something went wrong'),
                TextButton(
                  onPressed: () => setState(() => _error = null),
                  child: Text('Try Again'),
                ),
              ],
            ),
          );
    }
    return widget.child;
  }
}
```

### AsyncValue Pattern (Riverpod)

```dart
// Using Riverpod's AsyncValue for clean error handling
class CourseListScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final coursesAsync = ref.watch(coursesProvider);

    return coursesAsync.when(
      loading: () => const LoadingIndicator(),
      error: (error, stack) => ErrorView(
        error: error,
        onRetry: () => ref.invalidate(coursesProvider),
      ),
      data: (courses) => ListView.builder(
        itemCount: courses.length,
        itemBuilder: (context, index) => CourseCard(courses[index]),
      ),
    );
  }
}

class ErrorView extends StatelessWidget {
  final Object error;
  final VoidCallback onRetry;

  const ErrorView({required this.error, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    String message = 'Something went wrong';
    IconData icon = Icons.error;

    if (error is NetworkException) {
      message = 'No internet connection';
      icon = Icons.wifi_off;
    } else if (error is ServerException) {
      message = (error as ServerException).message;
    }

    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 64, color: Colors.grey),
          SizedBox(height: 16),
          Text(message, style: Theme.of(context).textTheme.titleMedium),
          SizedBox(height: 24),
          ElevatedButton(
            onPressed: onRetry,
            child: Text('Retry'),
          ),
        ],
      ),
    );
  }
}
```

---

## 🔌 CIRCUIT BREAKER PATTERN

### Purpose

```
Normal:     Request → Service → Response ✅

Failing:    Request → Service → Timeout → Error
            Request → Service → Timeout → Error
            Request → Service → Timeout → Error
            ...wasting resources...

With Circuit Breaker:
            Request → Service → Error (1)
            Request → Service → Error (2)
            Request → Service → Error (3) → CIRCUIT OPEN
            Request → Fail Fast ⚡ (no call made)
            ...wait...
            Request → Service → Success → CIRCUIT CLOSED
```

### Implementation

```python
# core/circuit_breaker.py
import time
from enum import Enum
from functools import wraps

class CircuitState(Enum):
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, reject calls
    HALF_OPEN = "half_open"  # Testing if recovered

class CircuitBreaker:
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 30,
        expected_exception: type = Exception
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception

        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = None

    def __call__(self, func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            return self._call(func, *args, **kwargs)
        return wrapper

    def _call(self, func, *args, **kwargs):
        if self.state == CircuitState.OPEN:
            if self._should_try_reset():
                self.state = CircuitState.HALF_OPEN
            else:
                raise CircuitOpenError("Circuit breaker is open")

        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except self.expected_exception as e:
            self._on_failure()
            raise

    def _should_try_reset(self) -> bool:
        if self.last_failure_time is None:
            return True
        return time.time() - self.last_failure_time > self.recovery_timeout

    def _on_success(self):
        self.failure_count = 0
        self.state = CircuitState.CLOSED

    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()

        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN

# Usage
@CircuitBreaker(failure_threshold=3, recovery_timeout=60)
def call_external_api():
    response = requests.get("https://api.external.com/data", timeout=5)
    response.raise_for_status()
    return response.json()
```

---

## 🔄 RETRY PATTERNS

### Exponential Backoff

```python
# core/retry.py
import time
import random
from functools import wraps

def retry_with_backoff(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0,
    jitter: bool = True,
    retryable_exceptions: tuple = (Exception,)
):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except retryable_exceptions as e:
                    if attempt == max_retries:
                        raise

                    delay = min(
                        base_delay * (exponential_base ** attempt),
                        max_delay
                    )

                    if jitter:
                        delay = delay * (0.5 + random.random())

                    logger.warning(
                        f"Retry {attempt + 1}/{max_retries} after {delay:.2f}s: {e}"
                    )
                    time.sleep(delay)
        return wrapper
    return decorator

# Usage
@retry_with_backoff(
    max_retries=3,
    retryable_exceptions=(requests.RequestException,)
)
def fetch_external_data():
    return requests.get("https://api.example.com/data").json()
```

### Flutter Retry

```dart
Future<T> retryWithBackoff<T>(
  Future<T> Function() operation, {
  int maxRetries = 3,
  Duration initialDelay = const Duration(seconds: 1),
}) async {
  int attempts = 0;

  while (true) {
    try {
      return await operation();
    } catch (e) {
      attempts++;
      if (attempts > maxRetries) rethrow;

      final delay = initialDelay * (1 << (attempts - 1));  // 1, 2, 4, 8...
      debugPrint('Retry $attempts/$maxRetries after ${delay.inSeconds}s');
      await Future.delayed(delay);
    }
  }
}

// Usage
final data = await retryWithBackoff(
  () => apiClient.get('/courses'),
  maxRetries: 3,
);
```

---

## 📊 LOGGING & MONITORING

### Python Logging Setup

```python
# settings.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(asctime)s %(levelname)s %(name)s %(message)s',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': 'logs/app.log',
            'maxBytes': 10485760,  # 10MB
            'backupCount': 5,
            'formatter': 'json',
        },
        'sentry': {
            'class': 'sentry_sdk.integrations.logging.EventHandler',
            'level': 'ERROR',
        },
    },
    'loggers': {
        '': {
            'handlers': ['console', 'file', 'sentry'],
            'level': 'INFO',
        },
        'django.request': {
            'handlers': ['console', 'file', 'sentry'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
}
```

---

## 💬 USER-FRIENDLY ERROR MESSAGES

### Error Message Guidelines

| ❌ Bad               | ✅ Good                                 |
| -------------------- | --------------------------------------- |
| Error 500            | Something went wrong. Please try again. |
| NullPointerException | We couldn't load your data.             |
| Connection refused   | You appear to be offline.               |
| Validation failed    | Please check your email format.         |
| Unauthorized         | Your session expired. Please log in.    |

### Flutter Error Messages

```dart
String getUserFriendlyMessage(AppException error) {
  if (error is NetworkException) {
    return 'Please check your internet connection and try again.';
  }

  if (error is UnauthorizedException) {
    return 'Your session has expired. Please log in again.';
  }

  if (error is ValidationException) {
    return 'Please check your input and try again.';
  }

  if (error is ServerException) {
    if (error.statusCode >= 500) {
      return 'Our servers are having issues. Please try again later.';
    }
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}
```

---

## 💎 ERROR HANDLING GOLDEN RULES

1. **Never swallow errors silently** - Log everything
2. **Fail fast, recover faster** - Circuit breakers save resources
3. **User-friendly messages** - Technical errors confuse users
4. **Structured error responses** - Consistent API format
5. **Retry with backoff** - Don't hammer failing services
6. **Monitor and alert** - Know before users complain
7. **Test error paths** - Happy path isn't enough

---

**SINGULARITY ENGINE v16.0**  
_"Errors are inevitable. How you handle them defines your quality."_
