class ApiConstants {
  static const String baseUrl =
      'http://127.0.0.1:8000/api/v1'; // Localhost backend
  static const Duration connectTimeout = Duration(milliseconds: 10000);
  static const Duration receiveTimeout = Duration(milliseconds: 10000);

  // Endpoints
  static const String login = '/auth/login/';
  static const String refresh = '/auth/refresh/';
  static const String register = '/auth/register/';
  static const String userProfile = '/auth/user/';
}
