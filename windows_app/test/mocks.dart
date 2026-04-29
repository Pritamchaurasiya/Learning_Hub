import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:learning_hub/core/services/api_client.dart';
import 'package:mocktail/mocktail.dart';
import 'package:learning_hub/core/services/sync_service.dart';
import 'package:learning_hub/features/gamification/domain/repositories/gamification_repository.dart';

class MockDio extends Mock implements Dio {}

class MockSyncService extends Mock implements SyncService {}

class MockGamificationRepository extends Mock
    implements GamificationRepository {}

class MockApiClient extends Mock implements ApiClient {
  @override
  Future<ApiResponse<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    T Function(dynamic)? fromJson,
  }) async {
    // ignore: avoid_print
    debugPrint('DEBUG: MockApiClient GET path: $path');
    if (path == '/test') {
      return ApiResponse.success(<String, dynamic>{} as T);
    }
    if (path == '/error') {
      return ApiResponse.error('Simulated Error');
    }
    return ApiResponse.success(null as T); // Default successful response
  }

  @override
  Future<ApiResponse<T>> post<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? fromJson,
  }) async {
    // Return mock data for auth/login endpoint to fix type cast error
    if (path.contains('/auth/login')) {
      // ignore: avoid_print
      debugPrint('DEBUG: MockApiClient matched login path: $path');
      final mockData = <String, dynamic>{
        'data': {
          'accessToken': 'mock_token_123',
          'refreshToken': 'mock_refresh_123',
          'user': {
            'id': 'user_001',
            'email': 'test@example.com',
            'role': 'student',
            'display_name': 'Test User',
            'first_name': 'Test',
            'last_name': 'User',
            'avatar': null,
            'bio': null,
            'phone': null,
            'is_verified': true,
            'is_active': true,
            'preferences': <String, dynamic>{
              'interests': <String>[],
              'goals': <String>[],
              'preferredLanguage': 'en',
              'emailNotifications': true,
              'pushNotifications': true,
              'autoPlayVideos': true,
              'playbackSpeed': 1.0,
              'downloadOnWifi': true,
              'videoQuality': 'auto',
              'darkMode': false,
            },
            'subscription': null,
            'stats': <String, dynamic>{
              'totalCoursesEnrolled': 0,
              'totalCoursesCompleted': 0,
              'totalLessonsCompleted': 0,
              'totalQuizzesPassed': 0,
              'totalCertificates': 0,
              'totalLearningTimeMinutes': 0,
              'currentStreak': 0,
              'longestStreak': 0,
              'totalPoints': 0,
              'lastLearningDate': null,
            },
            'enrolled_courses': <String>[],
            'completed_courses': <String>[],
            'wishlist_courses': <String>[],
            'created_at': DateTime.now().toIso8601String(),
            'last_login_at': DateTime.now().toIso8601String(),
          }
        }
      };
      return ApiResponse<T>.success(mockData as T);
    }
    // ignore: avoid_print
    debugPrint('DEBUG: MockApiClient POST path ignored: $path');
    return ApiResponse<T>.success(<String, dynamic>{} as T);
  }

  @override
  Future<ApiResponse<T>> put<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? fromJson,
  }) async {
    return ApiResponse.success(null as T);
  }

  @override
  Future<ApiResponse<T>> delete<T>(
    String path, {
    T Function(dynamic)? fromJson,
  }) async {
    return ApiResponse.success(null as T);
  }

  @override
  Future<ApiResponse<T>> uploadFile<T>(
    String path,
    String filePath,
    String fieldName, {
    Map<String, dynamic>? additionalData,
    void Function(int, int)? onProgress,
    T Function(dynamic)? fromJson,
  }) async {
    return ApiResponse.success(null as T);
  }

  @override
  Future<bool> downloadFile(
    String url,
    String savePath, {
    void Function(int, int)? onProgress,
    CancelToken? cancelToken,
  }) async {
    return true;
  }

  @override
  Future<void> setTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    // Mock implementation for setTokens
  }

  @override
  Future<void> clearTokens() async {
    // Mock implementation for clearTokens
  }

  @override
  Future<bool> get hasToken async => true;

  @override
  Future<String?> getRefreshToken() async => 'mock_refresh_token';

  @override
  Future<String?> getAccessToken() async => 'mock_access_token';
}
