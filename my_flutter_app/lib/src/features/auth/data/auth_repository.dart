import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/core/constants/api_constants.dart';
import 'package:my_flutter_app/src/core/error/exceptions.dart';
import 'package:my_flutter_app/src/core/network/api_client.dart';
import 'package:my_flutter_app/src/features/auth/domain/user_model.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/core/storage/storage_provider.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    ref.watch(apiClientProvider),
    ref.watch(flutterSecureStorageProvider),
  );
});

class AuthRepository {
  AuthRepository(this._apiClient, this._secureStorage);
  final ApiClient _apiClient;
  final FlutterSecureStorage _secureStorage;

  Future<String?> getAccessToken() async {
    return await _secureStorage.read(key: 'access_token');
  }

  Future<String?> getRefreshToken() async {
    return await _secureStorage.read(key: 'refresh_token');
  }

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
    await _secureStorage.delete(key: 'access_token');
    await _secureStorage.delete(key: 'refresh_token');
    final prefs = await SharedPreferences.getInstance();
    // Clean up legacy insecure tokens
    await prefs.remove('access_token');
    await prefs.remove('refresh_token');
    await prefs.remove('user_data');
  }

  Future<void> _saveTokens(String access, String refresh) async {
    await _secureStorage.write(key: 'access_token', value: access);
    await _secureStorage.write(key: 'refresh_token', value: refresh);
  }

  Future<void> _saveUser(User user) async {
    // final prefs = await SharedPreferences.getInstance();
    // Simple for now, ideally serialize user to JSON string
  }
}
