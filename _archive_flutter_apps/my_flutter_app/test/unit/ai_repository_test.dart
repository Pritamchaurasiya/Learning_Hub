import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:my_flutter_app/src/core/network/api_client.dart';
import 'package:my_flutter_app/src/features/ai/data/ai_repository.dart';
import 'package:my_flutter_app/src/features/courses/domain/course_model.dart';

class MockApiClient extends Mock implements ApiClient {}

void main() {
  late AIRepository repository;
  late MockApiClient mockApiClient;

  setUp(() {
    mockApiClient = MockApiClient();
    repository = AIRepository(mockApiClient);
  });

  group('AIRepository', () {
    test(
        'getRecommendations returns list of courses when API call is successful',
        () async {
      // Arrange
      final mockCourses = [
        {
          'id': '1',
          'title': 'Course 1',
          'description': 'Desc 1',
          'thumbnail': 'thumb1.jpg',
          'instructor': {'id': '1', 'name': 'Instr 1'},
          'price': 10.0,
          'rating': 4.5,
          'students': 100,
          'category': {'id': '1', 'name': 'Cat 1', 'slug': 'cat-1'}
        },
        {
          'id': '2',
          'title': 'Course 2',
          'description': 'Desc 2',
          'thumbnail': 'thumb2.jpg',
          'instructor': {'id': '2', 'name': 'Instr 2'},
          'price': 20.0,
          'rating': 4.0,
          'students': 200,
          'category': {'id': '2', 'name': 'Cat 2', 'slug': 'cat-2'}
        }
      ];
      final response = Response(
        requestOptions: RequestOptions(path: '/recommendations'),
        data: {'data': mockCourses},
        statusCode: 200,
      );
      when(() => mockApiClient.get(any())).thenAnswer((_) async => response);

      // Act
      final result = await repository.getRecommendations();

      // Assert
      expect(result, isA<List<Course>>());
      expect(result.length, 2);
      expect(result[0].title, 'Course 1');
    });

    test('getRecommendations returns empty list when data is null', () async {
      // Arrange
      final response = Response<Map<String, dynamic>>(
        requestOptions: RequestOptions(path: '/recommendations'),
        statusCode: 200,
      );
      when(() => mockApiClient.get(any())).thenAnswer((_) async => response);

      // Act
      final result = await repository.getRecommendations();

      // Assert
      expect(result, isEmpty);
    });

    test('getRecommendations handles malformed data gracefully', () async {
      // Arrange
      final response = Response<Map<String, dynamic>>(
        requestOptions: RequestOptions(path: '/recommendations'),
        data: {'data': null}, // Data exists but is null
        statusCode: 200,
      );
      when(() => mockApiClient.get(any())).thenAnswer((_) async => response);

      // Act
      final result = await repository.getRecommendations();

      // Assert
      expect(result, isEmpty);
    });
  });
}
