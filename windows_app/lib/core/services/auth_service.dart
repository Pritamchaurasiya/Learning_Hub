import 'api_client.dart';

class AuthService {

  final ApiClient _client = ApiClient.instance;

  Future<AuthResult> signIn(String email, String password) async {
    try {
      final response = await _client.post<Map<String, dynamic>>(
        '/auth/login/',
        data: {'email': email, 'password': password},
      );

      if (response.success && response.data != null) {
        final payload = response.data!;
        final data = payload.containsKey('data')
            ? payload['data'] as Map<String, dynamic>
            : payload;

        await _client.setTokens(
          accessToken: (data['accessToken'] ?? data['access_token']) as String,
          refreshToken: (data['refreshToken'] ?? data['refresh_token']) as String,
        );

        return AuthResult.success(AuthData(
          token: (data['accessToken'] ?? data['access_token']) as String,
          userId: ((data['user'] as Map<String, dynamic>?)?['id'] ?? data['user_id']) as String,
          email: email,
        ));
      }

      return AuthResult.failure(
          response.message ?? 'Authentication failed');
    } catch (e) {
      return AuthResult.failure('Authentication failed: $e');
    }
  }

  Future<AuthResult> signUp(String email, String password, String name) async {
    try {
      final response = await _client.post<Map<String, dynamic>>(
        '/auth/register/',
        data: {
          'email': email,
          'password': password,
          'name': name,
          'username': email.split('@')[0],
        },
      );

      if (response.success) {
        return signIn(email, password);
      }

      return AuthResult.failure(
          response.message ?? 'Registration failed');
    } catch (e) {
      return AuthResult.failure('Sign up failed: $e');
    }
  }

  Future<AuthResult> signOut() async {
    try {
      final refreshToken = await _client.getRefreshToken();
      if (refreshToken != null) {
        await _client.post<dynamic>(
          '/auth/logout/',
          data: {'refresh_token': refreshToken},
        );
      }
    } catch (_) {
      // Best-effort logout
    }

    await _client.clearTokens();
    return AuthResult.success(AuthData(token: '', userId: '', email: ''));
  }

  Future<bool> isAuthenticated() async {
    return await _client.hasToken;
  }

  Future<String?> getCurrentUserEmail() async {
    // Email is not stored separately; we'd need to decode the JWT or fetch profile
    return null;
  }

  Future<String?> getCurrentUserId() async {
    return null;
  }

  Future<String?> getCurrentToken() async {
    return await _client.getAccessToken();
  }
}

class AuthResult {
  final bool isSuccess;
  final AuthData? data;
  final String? error;

  AuthResult._(this.isSuccess, this.data, this.error);

  factory AuthResult.success(AuthData data) {
    return AuthResult._(true, data, null);
  }

  factory AuthResult.failure(String error) {
    return AuthResult._(false, null, error);
  }
}

class AuthData {
  final String token;
  final String userId;
  final String email;

  AuthData({required this.token, required this.userId, required this.email});

  Map<String, dynamic> toJson() {
    return {
      'token': token,
      'userId': userId,
      'email': email,
    };
  }

  factory AuthData.fromJson(Map<String, dynamic> json) {
    return AuthData(
      token: (json['token'] ?? '') as String,
      userId: (json['userId'] ?? '') as String,
      email: (json['email'] ?? '') as String,
    );
  }
}
