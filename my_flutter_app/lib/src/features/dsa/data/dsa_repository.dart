import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/core/network/api_client.dart';
import '../domain/dsa_models.dart';

final dsaRepositoryProvider = Provider<DsaRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return DsaRepository(apiClient);
});

class DsaRepository {
  DsaRepository(this._apiClient);
  final ApiClient _apiClient;

  Future<List<DsaProblem>> getProblems(
      {String? difficulty, String? tag, String? search}) async {
    final queryParams = <String, String>{};
    if (difficulty != null && difficulty.isNotEmpty) {
      queryParams['difficulty'] = difficulty;
    }
    if (tag != null && tag.isNotEmpty) {
      queryParams['tag'] = tag;
    }
    if (search != null && search.isNotEmpty) {
      queryParams['search'] = search;
    }

    final response = await _apiClient.get(
      '/dsa/problems/',
      queryParameters: queryParams,
    );
    final results = (response.data?['results'] as List?) ?? [];
    return results
        .map((e) => DsaProblem.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<DsaTag>> getTags() async {
    final response = await _apiClient.get('/dsa/tags/');
    final results = (response.data?['results'] as List?) ?? [];
    return results
        .map((e) => DsaTag.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<DsaProblem> getProblemDetail(String slug) async {
    final response = await _apiClient.get('/dsa/problems/$slug/');
    return DsaProblem.fromJson(response.data!);
  }

  Future<DsaValidationResult> validateSolution(int problemId, String code,
      {String language = 'python'}) async {
    final response = await _apiClient.post(
      '/dsa/validate/',
      data: {
        'problem_id': problemId,
        'code': code,
        'language': language,
      },
    );
    final data = (response.data?['data'] as Map<String, dynamic>?) ?? response.data ?? {};
    return DsaValidationResult.fromJson(data);
  }

  Future<DsaSubmission> submitSolution(int problemId, String code,
      {String language = 'python'}) async {
    final response = await _apiClient.post(
      '/dsa/submissions/',
      data: {
        'problem': problemId,
        'code': code,
        'language': language,
      },
    );
    return DsaSubmission.fromJson(response.data!);
  }

  Future<List<DsaSubmission>> getSubmissions({int? problemId}) async {
    final queryParams = <String, String>{};
    if (problemId != null) {
      queryParams['problem'] = problemId.toString();
    }
    final response = await _apiClient.get(
      '/dsa/submissions/',
      queryParameters: queryParams,
    );
    final results = (response.data?['results'] as List?) ?? [];
    return results
        .map((e) => DsaSubmission.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<DsaExplanation> getProblemExplanation(String slug) async {
    final response = await _apiClient.get('/dsa/problems/$slug/explain/');
    final data = (response.data?['data'] as Map<String, dynamic>?) ?? response.data ?? {};
    return DsaExplanation.fromJson(data);
  }

  Future<String> getAiHint(String slug) async {
    final response = await _apiClient.get('/dsa/problems/$slug/hint/');
    return response.data?['hint'] as String? ?? 'Think about simplifying the search space.';
  }

  Future<String> getDraft(String slug, {String language = 'python'}) async {
    try {
      final response = await _apiClient.get(
        '/dsa/problems/$slug/draft/',
        queryParameters: {'language': language},
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      return data?['code'] as String? ?? '';
    } catch (_) {
      return '';
    }
  }

  Future<void> saveDraft(String slug, String code, {String language = 'python'}) async {
    try {
      await _apiClient.post(
        '/dsa/problems/$slug/draft/',
        data: {'code': code, 'language': language},
      );
    } catch (_) {
      // Best effort draft saving
    }
  }

  Future<DsaPOTD?> getProblemOfTheDay() async {
    try {
      final response = await _apiClient.get('/dsa/problems/potd/');
      final data = response.data?['data'] as Map<String, dynamic>?;
      if (data != null) {
        return DsaPOTD.fromJson(data);
      }
      return null;
    } catch (_) {
      return null;
    }
  }
}

// Providers
final dsaDifficultyFilterProvider = StateProvider<String?>((ref) => null);
final dsaTagFilterProvider = StateProvider<String?>((ref) => null);
final dsaSearchQueryProvider = StateProvider<String>((ref) => '');

final dsaProblemsProvider = FutureProvider<List<DsaProblem>>((ref) async {
  final difficulty = ref.watch(dsaDifficultyFilterProvider);
  final tag = ref.watch(dsaTagFilterProvider);
  final search = ref.watch(dsaSearchQueryProvider);

  try {
    return await ref.watch(dsaRepositoryProvider).getProblems(
          difficulty: difficulty,
          tag: tag,
          search: search,
        );
  } on Exception catch (_) {
    return [
      DsaProblem(
        id: 1,
        title: 'Two Sum',
        slug: 'two-sum',
        difficulty: 'Easy',
        points: 100,
        description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
        constraints: '2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9',
        inputFormat: 'nums = [2,7,11,15], target = 9',
        outputFormat: '[0,1]',
        examples: [
          DsaTestCase(id: 1, inputData: '[2,7,11,15], target = 9', expectedOutput: '[0,1]', explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'),
        ],
      ),
      DsaProblem(
        id: 2,
        title: 'Valid Parentheses',
        slug: 'valid-parentheses',
        difficulty: 'Easy',
        points: 100,
        description: 'Given a string s containing just the characters "(", ")", "{", "}", "[" and "]", determine if the input string is valid.',
        constraints: '1 <= s.length <= 10^4',
        inputFormat: 's = "()[]{}"',
        outputFormat: 'true',
        examples: [
          DsaTestCase(id: 2, inputData: '()[]{}', expectedOutput: 'true', explanation: 'All brackets are matched correctly.'),
        ],
      ),
    ];
  }
});

final dsaTagsProvider = FutureProvider<List<DsaTag>>((ref) {
  return ref.watch(dsaRepositoryProvider).getTags();
});

final dsaProblemDetailProvider =
    FutureProvider.family<DsaProblem, String>((ref, slug) {
  return ref.watch(dsaRepositoryProvider).getProblemDetail(slug);
});

final dsaProblemExplanationProvider =
    FutureProvider.family<DsaExplanation, String>((ref, slug) {
  return ref.watch(dsaRepositoryProvider).getProblemExplanation(slug);
});

final dsaPotdProvider = FutureProvider<DsaPOTD?>((ref) {
  return ref.watch(dsaRepositoryProvider).getProblemOfTheDay();
});
