class ServerException implements Exception {
  ServerException({required this.message, this.statusCode});
  final String message;
  final int? statusCode;
}

class CacheException implements Exception {}

class AuthException implements Exception {
  AuthException(this.message);
  final String message;
}
