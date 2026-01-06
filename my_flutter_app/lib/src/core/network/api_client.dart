import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:my_flutter_app/src/core/constants/api_constants.dart';
import 'package:my_flutter_app/src/core/error/exceptions.dart';
import 'package:my_flutter_app/src/core/storage/storage_provider.dart';

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(Dio(), ref.watch(flutterSecureStorageProvider));
});

class ApiClient {
  ApiClient(this._dio, this._secureStorage) {
    _dio.options = BaseOptions(
      baseUrl: ApiConstants.baseUrl,
      connectTimeout: ApiConstants.connectTimeout,
      receiveTimeout: ApiConstants.receiveTimeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Add auth token if available
          final token = await _secureStorage.read(key: 'access_token');
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (e, handler) {
          // Handle generic errors here or pass them down
          if (e.response?.statusCode == 401) {
            // Token expired handling logic could go here
          }
          return handler.next(e);
        },
      ),
    );
  }
  final Dio _dio;
  final FlutterSecureStorage _secureStorage;

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
        return ServerException(message: 'Connection timed out');
      case DioExceptionType.badResponse:
        final data = error.response?.data as Map<String, dynamic>?;
        final message =
            (data?['detail'] ?? data?['message'] ?? 'Unknown server error')
                .toString();
        return ServerException(
          message: message,
          statusCode: error.response?.statusCode,
        );
      default:
        return ServerException(message: 'Something went wrong');
    }
  }
}
