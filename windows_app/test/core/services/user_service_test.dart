import 'package:flutter_test/flutter_test.dart';
import 'package:learning_hub/core/services/user_service.dart';
import 'package:learning_hub/core/services/api_client.dart';
import 'package:learning_hub/core/services/cache_manager.dart';
import 'package:learning_hub/core/services/biometric_service.dart';
import 'package:mocktail/mocktail.dart';

// Define mocks locally to ensure correctness and isolation
class MockApiClient extends Mock implements ApiClient {}

class MockCacheManager extends Mock implements CacheManager {}

class MockBiometricService extends Mock implements BiometricService {}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late UserService userService;
  late MockApiClient mockApi;
  late MockCacheManager mockCache;
  late MockBiometricService mockBiometric;

  setUp(() {
    mockApi = MockApiClient();
    mockCache = MockCacheManager();
    mockBiometric = MockBiometricService();

    // Stub cache methods with explicit types
    registerFallbackValue(Duration.zero);

    when(() => mockCache.set<dynamic>(
          any(),
          any<String>(),
          ttl: any(named: 'ttl'),
          encoder: any(named: 'encoder'),
        )).thenAnswer((_) async => true);

    when(() => mockCache.remove(any())).thenAnswer((_) async => true);

    // Stub API token methods
    when(() => mockApi.hasToken).thenAnswer((_) async => true);
    when(() => mockApi.getRefreshToken())
        .thenAnswer((_) async => 'mock_refresh_token');
    when(() => mockApi.clearTokens()).thenAnswer((_) async {});
    when(() => mockApi.setTokens(
          accessToken: any(named: 'accessToken'),
          refreshToken: any(named: 'refreshToken'),
        )).thenAnswer((_) async {});

    userService = UserService(
      api: mockApi,
      cache: mockCache,
      biometric: mockBiometric,
    );
  });

  group('UserService Tests', () {
    test('login success should parse user correctly', () async {
      // Mock API response data
      final mockUserJson = {
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
      };

      final apiResponse = ApiResponse<Map<String, dynamic>>.success({
        'data': {
          'accessToken': 'access_token',
          'refreshToken': 'refresh_token',
          'user': mockUserJson,
        }
      });

      // Stub post login with explicit types
      when(() => mockApi.post<Map<String, dynamic>>(
            '/auth/login/',
            data: any<Map<String, dynamic>>(named: 'data'),
          )).thenAnswer((_) async => apiResponse);

      final result = await userService.login(
          email: 'test@example.com', password: 'password');

      expect(result.success, true);
      expect(result.user, isNotNull);
      expect(result.user!.email, 'test@example.com');
      expect(result.user!.displayName, 'Test User');

      verify(() => mockApi.setTokens(
            accessToken: 'access_token',
            refreshToken: 'refresh_token',
          )).called(1);
    });

    test('logout should call backend logout and clear local data', () async {
      // Stub logout call
      when(() => mockApi.post<dynamic>(
            '/auth/logout/',
            data: any<Map<String, dynamic>>(named: 'data'),
          )).thenAnswer((_) async => ApiResponse.success(null));

      await userService.logout();

      expect(userService.currentUser, isNull);
      verify(() => mockApi.post<dynamic>(
            '/auth/logout/',
            data: any<Map<String, dynamic>>(named: 'data'),
          )).called(1);
      verify(() => mockApi.clearTokens()).called(1);
    });
  });
}
