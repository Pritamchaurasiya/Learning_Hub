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
      {String? difficulty, String? tag}) async {
    final queryParams = <String, String>{};
    if (difficulty != null) {
      queryParams['difficulty'] = difficulty;
    }
    if (tag != null) {
      queryParams['tag'] = tag;
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

  Future<List<DsaSubmission>> getSubmissions() async {
    final response = await _apiClient.get('/dsa/submissions/');
    final results = (response.data?['results'] as List?) ?? [];
    return results
        .map((e) => DsaSubmission.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}

// Providers
final dsaDifficultyFilterProvider = StateProvider<String?>((ref) => null);
final dsaTagFilterProvider = StateProvider<String?>((ref) => null);

final dsaProblemsProvider = FutureProvider<List<DsaProblem>>((ref) async {
  // Mock problems for when backend is unavailable
  final mockProblems = [
    DsaProblem(
        id: 1,
        title: 'Two Sum',
        slug: 'two-sum',
        difficulty: 'Easy',
        points: 100,
        description: 'Find two numbers that add up to target',
        constraints: '2 <= nums.length <= 10^4',
        inputFormat: 'Array of integers and target',
        outputFormat: 'Indices of two numbers',
        examples: []),
    DsaProblem(
        id: 2,
        title: 'Valid Parentheses',
        slug: 'valid-parentheses',
        difficulty: 'Easy',
        points: 100,
        description: 'Check if brackets are balanced',
        constraints: '1 <= s.length <= 10^4',
        inputFormat: 'String of brackets',
        outputFormat: 'Boolean',
        examples: []),
    DsaProblem(
        id: 3,
        title: 'Merge Two Sorted Lists',
        slug: 'merge-two-lists',
        difficulty: 'Easy',
        points: 100,
        description: 'Merge two sorted linked lists',
        constraints: '0 <= nodes <= 50',
        inputFormat: 'Two linked lists',
        outputFormat: 'Single merged list',
        examples: []),
    DsaProblem(
        id: 4,
        title: 'Binary Search',
        slug: 'binary-search',
        difficulty: 'Medium',
        points: 200,
        description: 'Find target in sorted array',
        constraints: '1 <= n <= 10^4',
        inputFormat: 'Sorted array and target',
        outputFormat: 'Index or -1',
        examples: []),
    DsaProblem(
        id: 5,
        title: 'LRU Cache',
        slug: 'lru-cache',
        difficulty: 'Hard',
        points: 300,
        description: 'Implement LRU cache with get and put',
        constraints: '1 <= capacity <= 3000',
        inputFormat: 'Operations array',
        outputFormat: 'Results array',
        examples: []),
  ];

  try {
    final difficulty = ref.watch(dsaDifficultyFilterProvider);
    final tag = ref.watch(dsaTagFilterProvider);
    return await ref.watch(dsaRepositoryProvider).getProblems(
          difficulty: difficulty,
          tag: tag,
        );
  } on Exception catch (_) {
    return mockProblems;
  }
});

final dsaTagsProvider = FutureProvider<List<DsaTag>>((ref) {
  return ref.watch(dsaRepositoryProvider).getTags();
});

final dsaProblemDetailProvider =
    FutureProvider.family<DsaProblem, String>((ref, slug) {
  return ref.watch(dsaRepositoryProvider).getProblemDetail(slug);
});
