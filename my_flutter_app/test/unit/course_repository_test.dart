import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:my_flutter_app/src/core/error/failures.dart';
import 'package:my_flutter_app/src/core/network/api_client.dart';
import 'package:my_flutter_app/src/core/network/network_info.dart';
import 'package:my_flutter_app/src/features/courses/data/course_repository.dart';
import 'package:my_flutter_app/src/features/courses/domain/course_model.dart';

class MockApiClient extends Mock implements ApiClient {}

class MockNetworkInfo extends Mock implements NetworkInfo {}

void main() {
  late CourseRepository repository;
  late MockApiClient mockApiClient;
  late MockNetworkInfo mockNetworkInfo;

  setUp(() {
    mockApiClient = MockApiClient();
    mockNetworkInfo = MockNetworkInfo();
    repository = CourseRepository(mockApiClient, mockNetworkInfo);

    // Default to connected
    when(() => mockNetworkInfo.isConnected).thenAnswer((_) async => true);
  });

  group('CourseRepository', () {
    const tCourseData = {
      'id': '1',
      'title': 'Test Course',
      'description': 'Test Description',
      'instructor_name': 'Test Instructor',
      'rating': 4.5,
      'price_usd': 99.99,
      'duration_seconds': 3600,
      'level': 'Beginner',
      'thumbnail_url': 'http://test.com/img.jpg',
      'slug': 'test-course'
    };

    test('getCourses returns Right(List<Course>) on success', () async {
      // Arrange
      when(() => mockApiClient.get(any())).thenAnswer(
        (_) async => Response(
          requestOptions: RequestOptions(),
          data: {
            'data': [tCourseData]
          },
          statusCode: 200,
        ),
      );

      // Act
      final result = await repository.getCourses(forceRefresh: true);

      // Assert
      expect(result.isRight(), true);
      result.fold(
        (l) => fail('Should not return Left'),
        (r) {
          expect(r, isA<List<Course>>());
          expect(r.length, 1);
          expect(r.first.title, 'Test Course');
        },
      );
    });

    test('getCourses returns Left(ServerFailure) on API error', () async {
      // Arrange
      when(() => mockApiClient.get(any())).thenThrow(
        DioException(
          requestOptions: RequestOptions(),
          error: 'Server Error',
        ),
      );

      // Act
      final result = await repository.getCourses(forceRefresh: true);

      // Assert
      expect(result.isLeft(), true);
      result.fold(
        (l) => expect(l, isA<ServerFailure>()),
        (r) => fail('Should not return Right'),
      );
    });

    test('getCourses returns Left(NetworkFailure) when offline and no cache',
        () async {
      // Arrange
      when(() => mockNetworkInfo.isConnected).thenAnswer((_) async => false);

      // Act
      final result = await repository.getCourses(forceRefresh: true);

      // Assert
      expect(result.isLeft(), true);
      result.fold(
        (l) => expect(l, isA<NetworkFailure>()),
        (r) => fail('Should not return Right'),
      );
    });
  });
}
