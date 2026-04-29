import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/core/constants/api_constants.dart';
import 'package:my_flutter_app/src/core/error/exceptions.dart';
import 'package:my_flutter_app/src/core/network/api_client.dart';
import 'package:my_flutter_app/src/core/network/token_manager.dart';
import 'package:my_flutter_app/src/core/utils/logger.dart';
import 'package:my_flutter_app/src/features/auth/domain/user_model.dart';
import 'package:shared_preferences/shared_preferences.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
      ref.watch(apiClientProvider), ref.watch(tokenManagerProvider));
});

class AuthRepository {
  AuthRepository(this._apiClient, this._tokenManager);
  final ApiClient _apiClient;
  final TokenManager _tokenManager;

  Future<User> login(String email, String password) async {
    try {
      AppLogger.d('AuthRepository: Attempting login for user: $email');
      final stopwatch = Stopwatch()..start();

      final response = await _apiClient.post(
        ApiConstants.login,
        data: {
          'email': email,
          'password': password,
        },
      );

      final data = response.data;
      if (data == null) {
        AppLogger.w('AuthRepository: Login failed - no data received');
        throw ServerException(message: 'No data received');
      }
      // Backend wraps user/token data in 'data' key
      final responseData = data['data'] as Map<String, dynamic>?;
      if (responseData == null) {
        AppLogger.w(
            'AuthRepository: Login failed - invalid response structure: $data');
        throw ServerException(message: 'Invalid response structure');
      }
      final user = User.fromJson(responseData['user'] as Map<String, dynamic>);
      final access = responseData['accessToken'] as String;
      final refresh = responseData['refreshToken'] as String;

      await _tokenManager.saveTokens(access, refresh);
      await _saveUser(user);

      stopwatch.stop();
      AppLogger.i(
          'AuthRepository: Login successful for user ${user.id} in ${stopwatch.elapsedMilliseconds}ms');

      return user;
    } on Exception catch (e) {
      AppLogger.e('AuthRepository: Login exception', e);
      rethrow;
    }
  }

  Future<User> register(String email, String username, String password) async {
    try {
      final response = await _apiClient.post(
        ApiConstants.register,
        data: {
          'email': email,
          'username': username,
          'password': password,
          'confirm_password': password,
        },
      );

      final data = response.data;
      if (data == null) {
        throw ServerException(message: 'No data received');
      }
      // Backend wraps user/token data in 'data' key
      final responseData = data['data'] as Map<String, dynamic>?;
      if (responseData == null) {
        throw ServerException(message: 'Invalid response structure');
      }
      final user = User.fromJson(responseData['user'] as Map<String, dynamic>);
      final access = responseData['accessToken'] as String;
      final refresh = responseData['refreshToken'] as String;

      await _tokenManager.saveTokens(access, refresh);
      await _saveUser(user);

      return user;
    } on Exception {
      rethrow;
    }
  }

  Future<User> updateProfile(Map<String, dynamic> data) async {
    try {
      final response = await _apiClient.put(
        ApiConstants.userProfile,
        data: data,
      );

      final respData = response.data;
      if (respData == null || respData['data'] == null) {
        throw ServerException(message: 'Invalid response structure');
      }
      final responseData = respData['data'] as Map<String, dynamic>;
      final user = User.fromJson(responseData);
      await _saveUser(user);
      return user;
    } on Exception catch (e) {
      debugPrint('AuthRepository: Update profile failed - $e');
      rethrow;
    }
  }

  Future<void> logout() async {
    await _tokenManager.clearTokens();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('user_data');
  }

  Future<void> _saveUser(User user) async {
    // final prefs = await SharedPreferences.getInstance();
    // Simple for now, ideally serialize user to JSON string
  }

  Future<String?> getAccessToken() async {
    return _tokenManager.getAccessToken();
  }
}
