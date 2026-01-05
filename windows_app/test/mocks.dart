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
      debugPrint('DEBUG: MockApiClient matched login path: $path');
      final mockData = <String, dynamic>{
        'data': {
          'accessToken': 'mock_token_123',
          'refreshToken': 'mock_refresh_123',
          'user': {
            'id': 'user_001',
            'displayName': 'Test User',
            'email': 'test@example.com',
            'phone': null,
            'firstName': 'Test',
            'lastName': 'User',
            'avatarUrl': null,
            'bio': null,
            'role': 'student',
            'enrolledCourseIds': <String>[],
            'completedCourseIds': <String>[],
            'wishlistCourseIds': <String>[],
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
            'createdAt': DateTime.now().toIso8601String(),
            'lastLoginAt': DateTime.now().toIso8601String(),
            'isVerified': true,
            'isActive': true,
          }
        }
      };
      return ApiResponse<T>.success(mockData as T);
    }
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
}
