import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

class PerformanceInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    options.extra['startTime'] = DateTime.now().millisecondsSinceEpoch;
    super.onRequest(options, handler);
  }

  @override
  void onResponse(Response<dynamic> response, ResponseInterceptorHandler handler) {
    _logDuration(response.requestOptions, response.statusCode);
    super.onResponse(response, handler);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    _logDuration(err.requestOptions, err.response?.statusCode);
    super.onError(err, handler);
  }

  void _logDuration(RequestOptions options, int? statusCode) {
    final startTime = options.extra['startTime'] as int?;
    if (startTime != null) {
      final duration = DateTime.now().millisecondsSinceEpoch - startTime;
      final method = options.method.toUpperCase();
      final path = options.path;
      debugPrint('PERF: [$method] $path - Status: $statusCode - ${duration}ms');
    }
  }
}
