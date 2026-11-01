import 'api_client.dart';
import 'websocket_service.dart';
import 'session_event_service.dart';
import 'package:flutter/foundation.dart';

class AuthService {

  final ApiClient _client = ApiClient.instance;

  Future<AuthResult> signIn(String email, String password) async {
    try {
      final response = await _client.post<Map<String, dynamic>>(
        '/auth/login',
        data: {'email': email, 'password': password},
      );

      if (response.success && response.data != null) {
        final payload = response.data!;
        final data = payload.containsKey('data')
            ? payload['data'] as Map<String, dynamic>
            : payload;

        // SECURITY: No local token storage - backend sets httpOnly cookies
        // Cookies (access_token, refresh_token) are set via Set-Cookie headers
        // Browser/mobile automatically stores and sends them with requests

        // Store token in memory for WebSocket connections only
        final accessToken = (data['accessToken'] ?? data['access_token']) as String?;
        if (accessToken != null) {
          webSocketService.setWsToken(accessToken);
        }

        return AuthResult.success(AuthData(
          token: accessToken ?? '', // Kept for backward compatibility (in-memory only)
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
        '/auth/register',
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
      // Emit logged out event BEFORE clearing state
      // This allows components to react before data is cleared
      sessionEventService.emitLoggedOut();

      // Clear in-memory WebSocket token
      webSocketService.setWsToken(null);

      // Clear all session data (cookies, state, refresh tracking)
      await _client.clearAllSessionData();

      return AuthResult.success(AuthData(token: '', userId: '', email: ''));
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[AuthService] Error during signOut: $e');
      }
      // Even if logout fails, emit the event and clear local state
      sessionEventService.emitLoggedOut();
      webSocketService.setWsToken(null);
      await _client.clearAllSessionData();
      return AuthResult.success(AuthData(token: '', userId: '', email: ''));
    }
  }

  Future<bool> isAuthenticated() async {
    // Check auth status by calling /auth/me - cookies sent automatically
    // Returns true if authenticated, false if 401
    try {
      final response = await _client.get<Map<String, dynamic>>('/auth/me');
      return response.success;
    } catch (_) {
      return false;
    }
  }

  Future<String?> getCurrentUserEmail() async {
    try {
      final response = await _client.get<Map<String, dynamic>>('/auth/me');
      if (response.success && response.data != null) {
        final payload = response.data!;
        final data = payload.containsKey('data')
            ? payload['data'] as Map<String, dynamic>
            : payload;
        return data['email'] as String?;
      }
    } catch (_) {}
    return null;
  }

  Future<String?> getCurrentUserId() async {
    try {
      final response = await _client.get<Map<String, dynamic>>('/auth/me');
      if (response.success && response.data != null) {
        final payload = response.data!;
        final data = payload.containsKey('data')
            ? payload['data'] as Map<String, dynamic>
            : payload;
        return data['id'] as String?;
      }
    } catch (_) {}
    return null;
  }

  Future<String?> getCurrentToken() async {
    // Token not accessible from JS/httpOnly cookies
    // Return in-memory WebSocket token if available
    return webSocketService.getWsToken();
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
