import 'package:dio/dio.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:my_flutter_app/src/core/constants/api_constants.dart';
import 'package:my_flutter_app/src/core/utils/logger.dart';

final tokenManagerProvider = Provider<TokenManager>((ref) {
  return TokenManager();
});

class TokenManager {
  TokenManager();

  final _secureStorage = const FlutterSecureStorage();

  Future<void> saveTokens(String accessToken, String refreshToken) async {
    await _secureStorage.write(key: 'access_token', value: accessToken);
    await _secureStorage.write(key: 'refresh_token', value: refreshToken);
  }

  Future<bool> refreshToken() async {
    try {
      AppLogger.d('TokenManager: Attempting token refresh');
      final refreshToken = await _secureStorage.read(key: 'refresh_token');

      if (refreshToken == null || refreshToken.isEmpty) {
        AppLogger.w('TokenManager: No refresh token available');
        return false;
      }

      // Create a new Dio instance for token refresh to avoid circular dependency
      final retryDio = Dio()
        ..options = BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: ApiConstants.connectTimeout,
          receiveTimeout: ApiConstants.receiveTimeout,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        );

      final response = await retryDio.post<Map<String, dynamic>>(
        ApiConstants.refresh,
        data: {
          'refresh': refreshToken,
        },
      );

      final data = response.data;
      if (data == null) {
        AppLogger.w('TokenManager: Token refresh failed - no data received');
        return false;
      }

      final responseData = data['data'] as Map<String, dynamic>?;
      if (responseData == null) {
        AppLogger.w(
            'TokenManager: Token refresh failed - invalid response structure: $data');
        return false;
      }

      final newAccessToken = responseData['accessToken'] as String?;
      final newRefreshToken = responseData['refreshToken'] as String?;

      if (newAccessToken == null || newRefreshToken == null) {
        AppLogger.w(
            'TokenManager: Token refresh failed - missing tokens in response');
        return false;
      }

      // Save the new tokens using secure storage
      await _secureStorage.write(key: 'access_token', value: newAccessToken);
      await _secureStorage.write(key: 'refresh_token', value: newRefreshToken);

      AppLogger.i('TokenManager: Token refresh successful');
      return true;
    } on DioException catch (e) {
      AppLogger.e('TokenManager: Token refresh failed - ${e.message}');
      // Clear tokens if refresh fails (likely invalid refresh token)
      await _secureStorage.delete(key: 'access_token');
      await _secureStorage.delete(key: 'refresh_token');
      return false;
    } on Exception catch (e) {
      AppLogger.e('TokenManager: Token refresh exception', e);
      return false;
    }
  }

  Future<String?> getAccessToken() async {
    return _secureStorage.read(key: 'access_token');
  }

  Future<void> clearTokens() async {
    await _secureStorage.delete(key: 'access_token');
    await _secureStorage.delete(key: 'refresh_token');
  }
}
