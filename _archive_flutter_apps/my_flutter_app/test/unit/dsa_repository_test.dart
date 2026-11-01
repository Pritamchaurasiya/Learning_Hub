import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:my_flutter_app/src/core/network/api_client.dart';
import 'package:my_flutter_app/src/features/dsa/data/dsa_repository.dart';
import 'package:my_flutter_app/src/features/dsa/domain/dsa_models.dart';

class MockApiClient extends Mock implements ApiClient {}

void main() {
  late DsaRepository repository;
  late MockApiClient mockApiClient;

  setUp(() {
    mockApiClient = MockApiClient();
    repository = DsaRepository(mockApiClient);
  });

  group('DsaRepository', () {
    const tProblemData = {
      'id': 1,
      'title': 'Two Sum',
      'slug': 'two-sum',
      'description': 'Find two numbers that add up to target',
      'difficulty': 'EASY',
      'points': 100,
      'constraints': '2 <= nums.length <= 10^4',
      'input_format': 'nums = [2,7,11,15], target = 9',
      'output_format': '[0,1]',
      'examples': [
        {
          'id': 1,
          'input_data': '[2,7,11,15], 9',
          'expected_output': '[0,1]',
          'explanation': '2 + 7 = 9',
        }
      ],
      'tags': [
        {'id': 1, 'name': 'Arrays', 'slug': 'arrays'}
      ],
    };

    test('getProblems returns list of DsaProblem on 200 OK', () async {
      when(() => mockApiClient.get(
            '/dsa/problems/',
            queryParameters: any(named: 'queryParameters'),
          )).thenAnswer(
        (_) async => Response(
          requestOptions: RequestOptions(),
          data: {
            'results': [tProblemData]
          },
          statusCode: 200,
        ),
      );

      final result = await repository.getProblems(difficulty: 'EASY');
      expect(result.length, 1);
      expect(result.first.title, 'Two Sum');
      expect(result.first.difficulty, 'EASY');
      expect(result.first.tags.length, 1);
      expect(result.first.tags.first.name, 'Arrays');
    });

    test('getProblemDetail returns single DsaProblem on 200 OK', () async {
      when(() => mockApiClient.get('/dsa/problems/two-sum/')).thenAnswer(
        (_) async => Response(
          requestOptions: RequestOptions(),
          data: tProblemData,
          statusCode: 200,
        ),
      );

      final result = await repository.getProblemDetail('two-sum');
      expect(result.id, 1);
      expect(result.slug, 'two-sum');
      expect(result.examples.length, 1);
      expect(result.examples.first.inputData, '[2,7,11,15], 9');
    });

    test('validateSolution returns DsaValidationResult with test statistics', () async {
      when(() => mockApiClient.post(
            '/dsa/validate/',
            data: any<dynamic>(named: 'data'),
          )).thenAnswer(
        (_) async => Response(
          requestOptions: RequestOptions(),
          data: {
            'status': 'success',
            'data': {
              'submission_id': 42,
              'status': 'AC',
              'passed_tests': 3,
              'total_tests': 3,
              'execution_time_ms': 14.5,
              'memory_kb': 12400,
              'feedback': 'Optimal runtime!',
            }
          },
          statusCode: 200,
        ),
      );

      final result = await repository.validateSolution(1, 'def solve(): pass');
      expect(result.submissionId, 42);
      expect(result.isPassed, true);
      expect(result.passedTests, 3);
      expect(result.totalTests, 3);
      expect(result.executionTimeMs, 14.5);
    });

    test('submitSolution returns DsaSubmission on 201 Created', () async {
      when(() => mockApiClient.post(
            '/dsa/submissions/',
            data: any<dynamic>(named: 'data'),
          )).thenAnswer(
        (_) async => Response(
          requestOptions: RequestOptions(),
          data: {
            'id': 101,
            'problem': 1,
            'code': 'def solve(): pass',
            'language': 'python',
            'status': 'AC',
            'status_display': 'Accepted',
            'runtime_ms': 12,
            'memory_kb': 14000,
            'submitted_at': '2026-08-27T12:00:00Z',
          },
          statusCode: 201,
        ),
      );

      final result = await repository.submitSolution(1, 'def solve(): pass');
      expect(result.id, 101);
      expect(result.status, SubmissionStatus.accepted);
      expect(result.statusDisplay, 'Accepted');
      expect(result.runtimeMs, 12);
    });

    test('getProblemExplanation returns structured DsaExplanation', () async {
      when(() => mockApiClient.get('/dsa/problems/two-sum/explain/')).thenAnswer(
        (_) async => Response(
          requestOptions: RequestOptions(),
          data: {
            'status': 'success',
            'data': {
              'title': 'Two Sum',
              'difficulty': 'EASY',
              'intuition': 'Use a hash map to store complements.',
              'approaches': [
                {
                  'name': 'Hash Map Optimal',
                  'time_complexity': 'O(N)',
                  'space_complexity': 'O(N)',
                  'description': 'One-pass hash table lookup.'
                }
              ],
              'edge_cases': ['Negative numbers', 'No solution found']
            }
          },
          statusCode: 200,
        ),
      );

      final explanation = await repository.getProblemExplanation('two-sum');
      expect(explanation.title, 'Two Sum');
      expect(explanation.approaches.length, 1);
      expect(explanation.approaches.first.name, 'Hash Map Optimal');
      expect(explanation.approaches.first.timeComplexity, 'O(N)');
      expect(explanation.edgeCases.length, 2);
    });

    test('getProblemOfTheDay returns DsaPOTD with bonus XP', () async {
      when(() => mockApiClient.get('/dsa/problems/potd/')).thenAnswer(
        (_) async => Response(
          requestOptions: RequestOptions(),
          data: {
            'status': 'success',
            'data': {
              'date': '2026-08-27',
              'bonus_xp': 50,
              'solved_count': 120,
              'problem': tProblemData,
            }
          },
          statusCode: 200,
        ),
      );

      final potd = await repository.getProblemOfTheDay();
      expect(potd, isNotNull);
      expect(potd!.bonusXp, 50);
      expect(potd.solvedCount, 120);
      expect(potd.problem.slug, 'two-sum');
    });
  });
}
