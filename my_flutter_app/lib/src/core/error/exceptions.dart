class ServerException implements Exception {
  ServerException(
      {required this.message, this.statusCode, this.isAuthError = false});
  final String message;
  final int? statusCode;
  final bool isAuthError;
}

class CacheException implements Exception {}

class AuthException implements Exception {
  AuthException(this.message);
  final String message;
}
