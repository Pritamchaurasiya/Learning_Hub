import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/core/constants/api_constants.dart';
import 'package:my_flutter_app/src/core/error/exceptions.dart';
import 'package:my_flutter_app/src/core/network/api_client.dart';
import 'package:my_flutter_app/src/features/auth/domain/user_model.dart';
import 'package:shared_preferences/shared_preferences.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.watch(apiClientProvider));
});

class AuthRepository {
  AuthRepository(this._apiClient);
  final ApiClient _apiClient;

  Future<User> login(String email, String password) async {
    try {
      final response = await _apiClient.post(
        ApiConstants.login,
        data: {
          'email': email,
          'password': password,
        },
      );

      final data = response.data;
      if (data == null) {
        throw ServerException(message: 'No data received');
      }
      final user = User.fromJson(data['user'] as Map<String, dynamic>);
      final access = data['access'] as String;
      final refresh = data['refresh'] as String;

      await _saveTokens(access, refresh);
      await _saveUser(user);

      return user;
    } catch (e) {
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
      final user = User.fromJson(data['user'] as Map<String, dynamic>);
      final access = data['access'] as String;
      final refresh = data['refresh'] as String;

      await _saveTokens(access, refresh);
      await _saveUser(user);

      return user;
    } catch (e) {
      rethrow;
    }
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('access_token');
    await prefs.remove('refresh_token');
    await prefs.remove('user_data');
  }

  Future<void> _saveTokens(String access, String refresh) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('access_token', access);
    await prefs.setString('refresh_token', refresh);
  }

  Future<void> _saveUser(User user) async {
    // final prefs = await SharedPreferences.getInstance();
    // Simple for now, ideally serialize user to JSON string
  }
}
