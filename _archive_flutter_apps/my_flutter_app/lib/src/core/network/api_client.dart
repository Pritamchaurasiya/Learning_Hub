import 'package:dio/dio.dart';
import 'package:dio_smart_retry/dio_smart_retry.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/core/constants/api_constants.dart';
import 'package:my_flutter_app/src/core/error/exceptions.dart';
import 'package:my_flutter_app/src/core/network/performance_interceptor.dart';
import 'package:my_flutter_app/src/core/network/token_manager.dart';

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(Dio(), ref.watch(tokenManagerProvider));
});

class ApiClient {
  ApiClient(this._dio, this._tokenManager) {
    _dio.options = BaseOptions(
      baseUrl: ApiConstants.baseUrl,
      connectTimeout: ApiConstants.connectTimeout,
      receiveTimeout: ApiConstants.receiveTimeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    );

    // Add Retry Interceptor
    _dio.interceptors.add(
      RetryInterceptor(
        dio: _dio,
        logPrint: debugPrint, // varying logging
        retryDelays: const [
          Duration(seconds: 1),
          Duration(seconds: 2),
          Duration(seconds: 3),
        ],
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Add auth token if available
          // We use TokenManager's storage or direct SecureStorage.
          // Since we have TokenManager, let's use its storage if possible, or just duplicate the read logic safely.
          // Ideally TokenManager exposes getAccessToken. It does!
          final token = await _tokenManager.getAccessToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (e, handler) async {
          // Handle 401 Unauthorized errors by attempting token refresh
          if (e.response?.statusCode == 401) {
            debugPrint(
                'ApiClient: 401 error detected, attempting token refresh');
            final refreshSuccess = await _tokenManager.refreshToken();

            if (refreshSuccess) {
              debugPrint(
                  'ApiClient: Token refresh successful, retrying original request');
              // Retry the original request with new token
              return handler.resolve(await _retryRequest(e.requestOptions));
            } else {
              debugPrint('ApiClient: Token refresh failed');
              // Clear tokens and let the error propagate
              await _tokenManager.clearTokens();
            }
          }
          return handler.next(e);
        },
      ),
    );
    _dio.interceptors.add(PerformanceInterceptor());
  }
  final Dio _dio;
  final TokenManager _tokenManager;

  Future<Response<dynamic>> _retryRequest(RequestOptions requestOptions) async {
    // Create a new Dio instance for the retry to avoid interceptor loops
    final retryDio = Dio()..options = _dio.options;

    // Add the new auth token
    final token = await _tokenManager.getAccessToken();
    if (token != null) {
      retryDio.options.headers['Authorization'] = 'Bearer $token';
    }

    return retryDio.request(
      requestOptions.path,
      data: requestOptions.data,
      queryParameters: requestOptions.queryParameters,
      options: Options(
        method: requestOptions.method,
        headers: retryDio.options.headers,
      ),
    );
  }

  Future<Response<Map<String, dynamic>>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      return await _dio.get<Map<String, dynamic>>(
        path,
        queryParameters: queryParameters,
      );
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  Future<Response<Map<String, dynamic>>> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      return await _dio.post<Map<String, dynamic>>(
        path,
        data: data,
        queryParameters: queryParameters,
      );
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  Future<Response<ResponseBody>> streamPost(
    String path, {
    dynamic data,
  }) async {
    try {
      return await _dio.post<ResponseBody>(
        path,
        data: data,
        options: Options(responseType: ResponseType.stream),
      );
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  Future<Response<Map<String, dynamic>>> put(
    String path, {
    dynamic data,
  }) async {
    try {
      return await _dio.put<Map<String, dynamic>>(path, data: data);
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  Future<Response<Map<String, dynamic>>> delete(String path) async {
    try {
      return await _dio.delete<Map<String, dynamic>>(path);
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  Exception _handleDioError(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        debugPrint('ApiClient: Timeout error - ${error.message}');
        return ServerException(message: 'Connection timed out');
      case DioExceptionType.badResponse:
        final data = error.response?.data as Map<String, dynamic>?;
        final message =
            (data?['detail'] ?? data?['message'] ?? 'Unknown server error')
                .toString();
        final statusCode = error.response?.statusCode;
        debugPrint(
            'ApiClient: Bad response - Status: $statusCode, Message: $message');

        // Special handling for 401 Unauthorized
        if (statusCode == 401) {
          debugPrint('ApiClient: 401 Unauthorized - Token may have expired');
          return ServerException(
            message: 'Session expired. Please login again.',
            statusCode: statusCode,
            isAuthError: true,
          );
        }

        return ServerException(
          message: message,
          statusCode: statusCode,
        );
      case DioExceptionType.cancel:
        debugPrint('ApiClient: Request cancelled');
        return ServerException(message: 'Request cancelled');
      case DioExceptionType.unknown:
        debugPrint('ApiClient: Unknown error - ${error.message}');
        return ServerException(message: 'Network error occurred');
      default:
        debugPrint('ApiClient: Unexpected error - ${error.message}');
        return ServerException(message: 'Something went wrong');
    }
  }
}
