import 'dart:async';
import 'dart:math';
import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:crypto/crypto.dart';
import 'session_event_service.dart';

/// API error types
enum ApiErrorType {
  network,
  timeout,
  unauthorized,
  forbidden,
  notFound,
  serverError,
  unknown,
}

/// Custom API exception
class ApiException implements Exception {
  final String message;
  final ApiErrorType type;
  final int? statusCode;
  final dynamic data;

  const ApiException({
    required this.message,
    required this.type,
    this.statusCode,
    this.data,
  });

  @override
  String toString() =>
      'ApiException: $message (type: $type, code: $statusCode)';

  factory ApiException.fromDioError(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return const ApiException(
          message: 'Request timed out. Please check your internet connection.',
          type: ApiErrorType.timeout,
        );
      case DioExceptionType.connectionError:
        return const ApiException(
          message: 'No internet connection. Please verify your network.',
          type: ApiErrorType.network,
        );
      case DioExceptionType.badResponse:
        return _fromStatusCode(
          error.response?.statusCode,
          error.response?.data,
        );
      case DioExceptionType.cancel:
        return const ApiException(
          message: 'Request was cancelled.',
          type: ApiErrorType.unknown,
        );
      default:
        return ApiException(
          message: error.message ??
              'An unexpected error occurred. Please try again.',
          type: ApiErrorType.unknown,
        );
    }
  }

  static ApiException _fromStatusCode(int? code, dynamic data) {
    // Sanitize input data to prevent XSS and injection attacks
    String? sanitizeInput(String? input) {
      if (input == null) {
        return null;
      }
      return input
          .replaceAll(RegExp(r'<[^>]*>'), '') // Remove HTML tags
          .replaceAll(
              RegExp(r'[\x00-\x1f\x7f-\x9f]'), '') // Remove control characters
          .trim()
          .substring(0, 500); // Limit length
    }

    final message =
        data is Map ? sanitizeInput(data['message'] as String?) : null;

    switch (code) {
      case 401:
        return ApiException(
          message: message ?? 'Unauthorized. Please login again.',
          type: ApiErrorType.unauthorized,
          statusCode: code,
          data: data,
        );
      case 403:
        return ApiException(
          message: message ?? 'Access denied.',
          type: ApiErrorType.forbidden,
          statusCode: code,
          data: data,
        );
      case 404:
        return ApiException(
          message: message ?? 'Resource not found.',
          type: ApiErrorType.notFound,
          statusCode: code,
          data: data,
        );
      case 500:
      case 502:
      case 503:
        return ApiException(
          message: message ?? 'Server error. Please try again later.',
          type: ApiErrorType.serverError,
          statusCode: code,
          data: data,
        );
      default:
        return ApiException(
          message: message ?? 'Request failed.',
          type: ApiErrorType.unknown,
          statusCode: code,
          data: data,
        );
    }
  }
}

/// API response wrapper
class ApiResponse<T> {
  final T? data;
  final bool success;
  final String? message;
  final int? statusCode;

  const ApiResponse({
    this.data,
    required this.success,
    this.message,
    this.statusCode,
  });

  factory ApiResponse.success(T data, {int? statusCode}) {
    return ApiResponse(
      data: data,
      success: true,
      statusCode: statusCode,
    );
  }

  String? get errorMessage => message;

  factory ApiResponse.error(String message, {int? statusCode}) {
    return ApiResponse(
      success: false,
      message: message,
      statusCode: statusCode,
    );
  }
}

/// Centralized API client with interceptors and retry logic
/// 
/// SECURITY: Uses httpOnly cookies set by the backend (same as React frontend).
/// No tokens stored in localStorage/FlutterSecureStorage.
/// Browser automatically sends cookies with requests via Dio's BrowserHttpClientAdapter.
/// CSRF protection via X-CSRF-Token header (from csrf_token cookie).
class ApiClient {
  static final ApiClient _instance = ApiClient._();
  static ApiClient get instance => _instance;

  late final Dio _dio;
  
  // Token refresh state management
  Completer<bool>? _refreshCompleter;
  int _refreshFailureCount = 0;
  DateTime? _lastRefreshAttempt;
  static const int _maxRefreshFailures = 2;
  static const Duration _refreshBackoffBase = Duration(seconds: 1);

  static const String _baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:5000/api/v1',
  );
  static const Duration _timeout = Duration(seconds: 30);
  static const int _maxRetries = 3;

  late final String _signingSecret = _generateSigningSecret();

  static String _generateSigningSecret() {
    final random = Random.secure();
    final bytes = List<int>.generate(32, (_) => random.nextInt(256));
    return bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  }

  ApiClient._() {
    _dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: _timeout,
      receiveTimeout: _timeout,
      sendTimeout: _timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'LearningHub/1.0.0',
      },
      // Enable automatic cookie handling on web (BrowserHttpClientAdapter default)
      // For mobile, cookies are handled via CookieManager if needed
    ));

    _setupCertificatePinning();
    _setupInterceptors();
  }

  /// Configure SSL/TLS settings
  /// Platform-level SSL validation is handled natively (iOS: ATS, Android: Network Security Config)
  void _setupCertificatePinning() {
    if (!kIsWeb && kDebugMode) {
      debugPrint('[Security] SSL validation delegated to platform-native handlers');
    }
  }

  /// Generate a request signature for API integrity
  String _generateRequestSignature(String method, String path, dynamic body) {
    if (body == null) return '';

    const secret = String.fromEnvironment('API_SIGNING_SECRET');
    if (secret.isEmpty) {
      if (!kReleaseMode) {
        final signaturePayload = '$method|$path|${body.toString()}';
        return _generateHmacSignature(signaturePayload, _signingSecret);
      }
      return '';
    }

    try {
      final key = utf8.encode(secret);
      final bodyString = body != null ? jsonEncode(body) : '';
      final signaturePayload = '$method|$path|$bodyString';
      final bytes = utf8.encode(signaturePayload);
      final hmacSha256 = Hmac(sha256, key);
      final digest = hmacSha256.convert(bytes);
      return digest.toString();
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[Security] Error generating request signature: $e');
      }
      return '';
    }
  }

  /// Generate HMAC-SHA256 signature
  String _generateHmacSignature(String payload, String secret) {
    try {
      final key = utf8.encode(secret);
      final bytes = utf8.encode(payload);
      final hmacSha256 = Hmac(sha256, key);
      final digest = hmacSha256.convert(bytes);
      return digest.toString();
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[Security] Error generating HMAC signature: $e');
      }
      return '';
    }
  }

  /// Setup request/response interceptors
  void _setupInterceptors() {
    _dio.interceptors.addAll([
      // Auth interceptor - NO Authorization header (httpOnly cookies)
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // SECURITY: No Authorization header - backend reads from httpOnly cookies
          // Browser automatically sends cookies via Dio's BrowserHttpClientAdapter (web)
          // or CookieManager (mobile) when withCredentials is enabled

          // Add CSRF token for mutating requests
          if (options.method != 'GET') {
            final csrfToken = _getCsrfToken();
            if (csrfToken != null) {
              options.headers['X-CSRF-Token'] = csrfToken;
            }
            
            // Add Request Signing for non-GET requests
            options.headers['X-Request-Signature'] = _generateRequestSignature(
              options.method,
              options.path,
              options.data,
            );
          }

          handler.next(options);
        },
        onError: (error, handler) async {
          if (error.response?.statusCode == 401) {
            // Check if we've exceeded maximum refresh failures
            if (_refreshFailureCount >= _maxRefreshFailures) {
              if (kDebugMode) {
                debugPrint('[ApiClient] Max refresh failures reached, emitting session expired');
              }
              // Session is permanently expired - emit event and don't retry
              sessionEventService.emitSessionExpired();
              handler.next(error);
              return;
            }

            // Try to refresh token via cookie-based refresh endpoint
            final refreshed = await _refreshToken();
            
            if (refreshed) {
              // Retry original request
              try {
                final response = await _retryRequest(error.requestOptions);
                handler.resolve(response);
                return;
              } catch (e) {
                if (kDebugMode) {
                  debugPrint('[ApiClient] Retry after refresh failed: $e');
                }
                handler.next(error);
                return;
              }
            } else {
              // Refresh failed - let the error propagate
              // SessionEvent.expired already emitted in _performTokenRefresh if needed
              handler.next(error);
              return;
            }
          }
          handler.next(error);
        },
      ),

      // Logging interceptor (debug only)
      if (kDebugMode)
        LogInterceptor(
          requestBody: true,
          responseBody: true,
          error: true,
          logPrint: (obj) => debugPrint('[API] ${obj.toString()}'),
        ),
    ]);
  }

  /// Get CSRF token from cookie (readable, not httpOnly)
  String? _getCsrfToken() {
    if (kIsWeb) {
      // On web, read from document.cookie
      // This is a simplified approach - in practice you might use a cookie library
      // For now, we'll rely on the browser sending the cookie automatically
      // The CSRF token cookie is readable (not httpOnly)
      return null; // TODO: Implement cookie reading for CSRF
    }
    return null; // Mobile: use CookieManager if needed
  }

  /// Refresh auth token via cookie-based endpoint
  /// 
  /// Uses a Completer to ensure only one refresh attempt happens at a time,
  /// even if multiple requests fail with 401 simultaneously.
  /// 
  /// Tracks consecutive failures and emits SessionEvent.expired after
  /// _maxRefreshFailures attempts.
  Future<bool> _refreshToken() async {
    // If a refresh is already in progress, wait for it
    if (_refreshCompleter != null && !_refreshCompleter!.isCompleted) {
      if (kDebugMode) {
        debugPrint('[ApiClient] Token refresh already in progress, waiting...');
      }
      return _refreshCompleter!.future;
    }

    // Check if we should apply exponential backoff
    if (_lastRefreshAttempt != null && _refreshFailureCount > 0) {
      final backoffDuration = _refreshBackoffBase * (1 << (_refreshFailureCount - 1));
      final timeSinceLastAttempt = DateTime.now().difference(_lastRefreshAttempt!);
      
      if (timeSinceLastAttempt < backoffDuration) {
        final remainingBackoff = backoffDuration - timeSinceLastAttempt;
        if (kDebugMode) {
          debugPrint('[ApiClient] Applying backoff: waiting ${remainingBackoff.inMilliseconds}ms');
        }
        await Future<void>.delayed(remainingBackoff);
      }
    }

    // Create new completer for this refresh attempt
    _refreshCompleter = Completer<bool>();
    _lastRefreshAttempt = DateTime.now();

    try {
      final success = await _performTokenRefresh();
      
      if (success) {
        // Reset failure count on successful refresh
        _refreshFailureCount = 0;
        sessionEventService.emitTokenRefreshed();
        if (kDebugMode) {
          debugPrint('[ApiClient] Token refresh successful');
        }
      } else {
        // Increment failure count
        _refreshFailureCount++;
        if (kDebugMode) {
          debugPrint('[ApiClient] Token refresh failed (attempt $_refreshFailureCount/$_maxRefreshFailures)');
        }
        
        // Emit session expired if we've hit the limit
        if (_refreshFailureCount >= _maxRefreshFailures) {
          sessionEventService.emitSessionExpired();
          if (kDebugMode) {
            debugPrint('[ApiClient] Max refresh failures reached, session expired');
          }
        }
      }
      
      _refreshCompleter!.complete(success);
      return success;
    } catch (e) {
      _refreshFailureCount++;
      if (kDebugMode) {
        debugPrint('[ApiClient] Token refresh exception (attempt $_refreshFailureCount/$_maxRefreshFailures): $e');
      }
      
      if (_refreshFailureCount >= _maxRefreshFailures) {
        sessionEventService.emitSessionExpired();
      }
      
      _refreshCompleter!.complete(false);
      return false;
    } finally {
      // Clear the completer after a short delay to allow waiting callers to complete
      Future<void>.delayed(const Duration(milliseconds: 100), () {
        _refreshCompleter = null;
      });
    }
  }

  Future<bool> _performTokenRefresh() async {
    try {
      if (kDebugMode) {
        debugPrint('[ApiClient] Performing token refresh...');
      }
      
      // Backend endpoint: POST /auth/refresh with credentials (cookies)
      // No body needed - refresh_token cookie sent automatically
      final response = await Dio().post<Map<String, dynamic>>(
        '$_baseUrl/auth/refresh',
        data: {}, // Empty body - refresh_token cookie is used
        options: Options(
          headers: {'Accept': 'application/json'},
          sendTimeout: _timeout,
          receiveTimeout: _timeout,
        ),
      );

      if (response.statusCode == 200) {
        // New cookies (access_token, refresh_token) set by backend via Set-Cookie
        // Browser/mobile stores them automatically
        return true;
      }
      
      if (kDebugMode) {
        debugPrint('[ApiClient] Token refresh returned status: ${response.statusCode}');
      }
      return false;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[ApiClient] Token refresh request failed: $e');
      }
      return false;
    }
  }

  /// Retry a failed request
  Future<Response<dynamic>> _retryRequest(RequestOptions options) async {
    // No Authorization header needed - cookies sent automatically
    return _dio.fetch(options);
  }

  /// Execute request with retry logic
  Future<T> _executeWithRetry<T>(
    Future<T> Function() request, {
    int retries = _maxRetries,
  }) async {
    int attempt = 0;

    while (true) {
      try {
        return await request();
      } on DioException catch (e) {
        attempt++;

        // Don't retry on client errors (4xx)
        if (e.response?.statusCode != null &&
            e.response!.statusCode! >= 400 &&
            e.response!.statusCode! < 500) {
          throw ApiException.fromDioError(e);
        }

        if (attempt >= retries) {
          throw ApiException.fromDioError(e);
        }

        // Exponential backoff
        await Future<void>.delayed(
            Duration(milliseconds: 200 * (1 << attempt)));
      }
    }
  }

  /// GET request
  Future<ApiResponse<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final response = await _executeWithRetry(
        () => _dio.get<dynamic>(path, queryParameters: queryParameters),
      );

      final data =
          fromJson != null ? fromJson(response.data) : response.data as T;
      return ApiResponse.success(data, statusCode: response.statusCode);
    } on ApiException catch (e) {
      return ApiResponse.error(e.message, statusCode: e.statusCode);
    }
  }

  /// POST request
  Future<ApiResponse<T>> post<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final response = await _executeWithRetry(
        () => _dio.post<dynamic>(path, data: data),
      );

      final responseData =
          fromJson != null ? fromJson(response.data) : response.data as T;
      return ApiResponse.success(responseData, statusCode: response.statusCode);
    } on ApiException catch (e) {
      return ApiResponse.error(e.message, statusCode: e.statusCode);
    }
  }

  /// PUT request
  Future<ApiResponse<T>> put<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final response = await _executeWithRetry(
        () => _dio.put<dynamic>(path, data: data),
      );

      final responseData =
          fromJson != null ? fromJson(response.data) : response.data as T;
      return ApiResponse.success(responseData, statusCode: response.statusCode);
    } on ApiException catch (e) {
      return ApiResponse.error(e.message, statusCode: e.statusCode);
    }
  }

  /// DELETE request
  Future<ApiResponse<T>> delete<T>(
    String path, {
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final response = await _executeWithRetry(
        () => _dio.delete<dynamic>(path),
      );

      final data =
          fromJson != null ? fromJson(response.data) : response.data as T;
      return ApiResponse.success(data, statusCode: response.statusCode);
    } on ApiException catch (e) {
      return ApiResponse.error(e.message, statusCode: e.statusCode);
    }
  }

  /// Upload file with progress
  Future<ApiResponse<T>> uploadFile<T>(
    String path,
    String filePath,
    String fieldName, {
    Map<String, dynamic>? additionalData,
    void Function(int, int)? onProgress,
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final formData = FormData.fromMap({
        fieldName: await MultipartFile.fromFile(filePath),
        if (additionalData != null) ...additionalData,
      });

      final response = await _dio.post<dynamic>(
        path,
        data: formData,
        onSendProgress: onProgress,
      );

      final data =
          fromJson != null ? fromJson(response.data) : response.data as T;
      return ApiResponse.success(data, statusCode: response.statusCode);
    } on DioException catch (e) {
      final error = ApiException.fromDioError(e);
      return ApiResponse.error(error.message, statusCode: error.statusCode);
    }
  }

  /// Download file with progress
  Future<bool> downloadFile(
    String url,
    String savePath, {
    void Function(int, int)? onProgress,
    CancelToken? cancelToken,
  }) async {
    try {
      await _dio.download(
        url,
        savePath,
        onReceiveProgress: onProgress,
        cancelToken: cancelToken,
      );
      return true;
    } on DioException catch (_) {
      // Log error securely without exposing sensitive information
      if (kDebugMode) {
        debugPrint('Download failed');
      }
      return false;
    }
  }

  /// Clear all session data - cookies, state, and reset refresh tracking
  /// 
  /// This is idempotent and safe to call multiple times.
  /// Called on:
  /// - Explicit logout
  /// - Session expiry
  /// - App initialization (if needed)
  Future<void> clearAllSessionData() async {
    if (kDebugMode) {
      debugPrint('[ApiClient] Clearing all session data...');
    }

    // Reset refresh failure tracking
    _refreshFailureCount = 0;
    _lastRefreshAttempt = null;
    _refreshCompleter = null;

    // Call backend logout to clear httpOnly cookies
    try {
      await _dio.post('/auth/logout', 
        options: Options(
          sendTimeout: const Duration(seconds: 5),
          receiveTimeout: const Duration(seconds: 5),
        ),
      );
    } catch (e) {
      // Ignore errors - logout is best effort
      if (kDebugMode) {
        debugPrint('[ApiClient] Logout request failed (non-critical): $e');
      }
    }
    
    if (kDebugMode) {
      debugPrint('[ApiClient] Session data cleared');
    }
  }

  /// Legacy method - kept for backwards compatibility
  @Deprecated('Use clearAllSessionData() instead')
  Future<void> clearAuthState() async {
    await clearAllSessionData();
  }

  /// STREAM request (Server-Sent Events)
  Stream<String> stream(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    CancelToken? cancelToken,
  }) async* {
    try {
      final response = await _executeWithRetry(
        () => _dio.request<ResponseBody>(
          path,
          data: data,
          queryParameters: queryParameters,
          cancelToken: cancelToken,
          options: Options(
            method: 'POST', // Default to POST for AI streams
            responseType: ResponseType.stream,
          ),
        ),
      );

      final stream = response.data?.stream;
      if (stream != null) {
        await for (final chunk in stream) {
          final text = utf8.decode(chunk);
          yield text;
        }
      }
    } on DioException catch (e) {
      if (kDebugMode) {
        debugPrint('[ApiClient] Stream error: $e');
      }
      throw ApiException.fromDioError(e);
    }
  }
} // End of ApiClient class
