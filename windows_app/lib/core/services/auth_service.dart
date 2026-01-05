import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:uuid/uuid.dart';
import 'package:flutter/foundation.dart'; // For kIsWeb and debugPrint
import 'package:shared_preferences/shared_preferences.dart';

class AuthService {
  static const String _tokenKey = 'auth_token';
  static const String _userIdKey = 'user_id';
  static const String _emailKey = 'user_email';

  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  // Helper method for secure web compatibility
  Future<void> _safeWrite(String key, String value) async {
    try {
      if (kIsWeb) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(key, value);
      } else {
        await _secureStorage.write(key: key, value: value);
      }
    } catch (e) {
      debugPrint('Storage write error: $e');
      // Fallback: Continue without persistence if storage fails (prevents Auth Block)
    }
  }

  Future<String?> _safeRead(String key) async {
    try {
      if (kIsWeb) {
        final prefs = await SharedPreferences.getInstance();
        return prefs.getString(key);
      } else {
        return await _secureStorage.read(key: key);
      }
    } catch (e) {
      debugPrint('Storage read error: $e');
      return null;
    }
  }

  Future<void> _safeDelete(String key) async {
    try {
      if (kIsWeb) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.remove(key);
      } else {
        await _secureStorage.delete(key: key);
      }
    } catch (e) {
      debugPrint('Storage delete error: $e');
    }
  }

  Future<AuthResult> signIn(String email, String password) async {
    try {
      // Simulate API call delay
      await Future<void>.delayed(const Duration(milliseconds: 500));

      // Mock validation
      if (email.isEmpty || password.isEmpty) {
        return AuthResult.failure('Email and password are required');
      }

      if (!email.contains('@')) {
        return AuthResult.failure('Invalid email format');
      }

      if (password.length < 8) {
        return AuthResult.failure('Password must be at least 8 characters');
      }

      // Mock successful authentication
      final token = const Uuid().v4();
      final userId = 'user_${email.hashCode}';

      await _safeWrite(_tokenKey, token);
      await _safeWrite(_userIdKey, userId);
      await _safeWrite(_emailKey, email);

      return AuthResult.success(
          AuthData(token: token, userId: userId, email: email));
    } catch (e) {
      return AuthResult.failure('Authentication failed: $e');
    }
  }

  Future<AuthResult> signUp(String email, String password, String name) async {
    try {
      await Future<void>.delayed(const Duration(milliseconds: 500));

      if (email.isEmpty || password.isEmpty || name.isEmpty) {
        return AuthResult.failure('All fields are required');
      }

      if (!email.contains('@')) {
        return AuthResult.failure('Invalid email format');
      }

      if (password.length < 8) {
        return AuthResult.failure('Password must be at least 8 characters');
      }

      final token = const Uuid().v4();
      final userId = 'user_${email.hashCode}';

      await _safeWrite(_tokenKey, token);
      await _safeWrite(_userIdKey, userId);
      await _safeWrite(_emailKey, email);

      return AuthResult.success(
          AuthData(token: token, userId: userId, email: email));
    } catch (e) {
      return AuthResult.failure('Sign up failed: $e');
    }
  }

  Future<AuthResult> signOut() async {
    try {
      await _safeDelete(_tokenKey);
      await _safeDelete(_userIdKey);
      await _safeDelete(_emailKey);

      return AuthResult.success(AuthData(token: '', userId: '', email: ''));
    } catch (e) {
      return AuthResult.failure('Sign out failed: $e');
    }
  }

  Future<bool> isAuthenticated() async {
    final token = await _safeRead(_tokenKey);
    return token != null && token.isNotEmpty;
  }

  Future<String?> getCurrentUserEmail() async {
    return _safeRead(_emailKey);
  }

  Future<String?> getCurrentUserId() async {
    return _safeRead(_userIdKey);
  }

  Future<String?> getCurrentToken() async {
    return _safeRead(_tokenKey);
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
