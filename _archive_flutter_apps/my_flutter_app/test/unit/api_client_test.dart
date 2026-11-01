import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:my_flutter_app/src/core/network/api_client.dart';
import 'package:my_flutter_app/src/core/network/token_manager.dart';

class MockTokenManager extends Mock implements TokenManager {}

class MockDio extends Mock implements Dio {}

void main() {
  late MockTokenManager mockTokenManager;
  late MockDio mockDio;

  setUp(() {
    registerFallbackValue(BaseOptions());
    registerFallbackValue(
        RequestOptions()); // Register RequestOptions too just in case
    mockTokenManager = MockTokenManager();
    mockDio = MockDio();
  });

  group('ApiClient', () {
    test('onRequest adds Authorization header when token exists', () async {
      // Arrange
      when(() => mockTokenManager.getAccessToken())
          .thenAnswer((_) async => 'test_token');
      final interceptors = Interceptors();
      when(() => mockDio.interceptors).thenReturn(interceptors);
      when(() => mockDio.options)
          .thenReturn(BaseOptions()); // Mock options getter
      // Setter mock not needed - mocktail handles it

      // Re-instantiate to trigger constructor logic
      final apiClient = ApiClient(mockDio, mockTokenManager);
      expect(apiClient, isNotNull); // Use variable to trigger interceptor setup

      // Act
      // Retrieve the added interceptor (it's the first one, assuming no others)
      // Actually ApiClient adds 2 interceptors: Wrapper and PerformanceInterceptor.
      // We need to find the Wrapper.
      final wrapper = interceptors.firstWhere((i) => i is InterceptorsWrapper)
          as InterceptorsWrapper;

      final options = RequestOptions(path: '/test');
      final handler = RequestInterceptorHandler();

      // Call the interceptor
      await (wrapper.onRequest as Function)(options, handler);

      // Assert
      expect(options.headers['Authorization'], 'Bearer test_token');
    });

    test('onRequest does not add header when token is null', () async {
      // Arrange
      when(() => mockTokenManager.getAccessToken())
          .thenAnswer((_) async => null);
      final interceptors = Interceptors();
      when(() => mockDio.interceptors).thenReturn(interceptors);
      when(() => mockDio.options).thenReturn(BaseOptions());
      // Setter mock not needed - mocktail handles it

      final apiClient = ApiClient(mockDio, mockTokenManager);
      expect(apiClient, isNotNull);
      final wrapper = interceptors.firstWhere((i) => i is InterceptorsWrapper)
          as InterceptorsWrapper;

      final options = RequestOptions(path: '/test');
      final handler = RequestInterceptorHandler();

      // Act
      await (wrapper.onRequest as Function)(options, handler);

      // Assert
      expect(options.headers['Authorization'], isNull);
    });
  });
}
