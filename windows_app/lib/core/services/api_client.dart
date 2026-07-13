import 'dart:async';
import 'dart:math';
import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:crypto/crypto.dart';

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
class ApiClient {
  static final ApiClient _instance = ApiClient._();
  static ApiClient get instance => _instance;

  late final Dio _dio;
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();
  Future<bool>? _refreshFuture;

  static const String _baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api.learninghub.app/api/v1',
  );
  static const String _tokenKey = 'auth_token';
  static const String _refreshTokenKey = 'refresh_token';
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
      // Auth interceptor
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _secureStorage.read(key: _tokenKey);
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }

          // Add Request Signing for non-GET requests
          if (options.method != 'GET') {
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
            // Try to refresh token
            final refreshed = await _refreshToken();
            if (refreshed) {
              // Retry original request
              try {
                final response = await _retryRequest(error.requestOptions);
                handler.resolve(response);
                return;
              } catch (e) {
                handler.next(error);
                return;
              }
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

  /// Refresh auth token with thundering herd protection
  Future<bool> _refreshToken() async {
    if (_refreshFuture != null) {
      return _refreshFuture!;
    }

    _refreshFuture = _performTokenRefresh();
    try {
      return await _refreshFuture!;
    } finally {
      _refreshFuture = null;
    }
  }

  Future<bool> _performTokenRefresh() async {
    try {
      final refreshToken = await _secureStorage.read(key: _refreshTokenKey);
      if (refreshToken == null) {
        return false;
      }

      final response = await Dio().post<Map<String, dynamic>>(
        '$_baseUrl/auth/refresh',
        data: {'refresh_token': refreshToken},
        options: Options(
          headers: {'Accept': 'application/json'},
          sendTimeout: _timeout,
          receiveTimeout: _timeout,
        ),
      );

      if (response.statusCode == 200 && response.data != null) {
        final responseData = response.data as Map<String, dynamic>;
        final data =
            (responseData['data'] ?? responseData) as Map<String, dynamic>;
        await _secureStorage.write(
          key: _tokenKey,
          value: (data['accessToken'] ?? data['access_token']) as String?,
        );
        await _secureStorage.write(
          key: _refreshTokenKey,
          value: (data['refreshToken'] ?? data['refresh_token']) as String?,
        );
        return true;
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[Security] Token refresh failed: $e');
      }
    }
    return false;
  }

  /// Retry a failed request
  Future<Response<dynamic>> _retryRequest(RequestOptions options) async {
    final token = await _secureStorage.read(key: _tokenKey);
    options.headers['Authorization'] = 'Bearer $token';
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

  /// Store auth tokens
  Future<void> setTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _secureStorage.write(key: _tokenKey, value: accessToken);
    await _secureStorage.write(key: _refreshTokenKey, value: refreshToken);
  }

  /// Clear auth tokens
  Future<void> clearTokens() async {
    await _secureStorage.delete(key: _tokenKey);
    await _secureStorage.delete(key: _refreshTokenKey);
  }

  /// Get refresh token
  Future<String?> getRefreshToken() async {
    return await _secureStorage.read(key: _refreshTokenKey);
  }

  /// Get access token
  Future<String?> getAccessToken() async {
    return await _secureStorage.read(key: _tokenKey);
  }

  /// Check if user has valid token
  Future<bool> get hasToken async {
    final token = await _secureStorage.read(key: _tokenKey);
    return token != null && token.isNotEmpty;
  }

  /// STREAM request (Server-Sent Events)
  Stream<String> stream(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    CancelToken? cancelToken,
  }) async* {
    try {
      // Ensure we have a token if needed (interceptors usually handle this, but for stream we might need manual header)
      // Actually, since we use the same _dio instance, interceptors SHOULD work if we use _dio.request
      // with ResponseType.stream.

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
