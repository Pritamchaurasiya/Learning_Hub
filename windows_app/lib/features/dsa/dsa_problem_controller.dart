import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:learning_hub/core/services/api_client.dart';
import 'package:learning_hub/data/models/dsa_problem.dart';

class DsaProblemDetailState {
  final bool isLoading;
  final DsaProblem? problem;
  final String? error;
  final String? executionResult;
  final bool isSubmitting;
  final String? submissionStatus;

  const DsaProblemDetailState({
    this.isLoading = false,
    this.problem,
    this.error,
    this.executionResult,
    this.isSubmitting = false,
    this.submissionStatus,
  });

  DsaProblemDetailState copyWith({
    bool? isLoading,
    DsaProblem? problem,
    String? error,
    String? executionResult,
    bool? isSubmitting,
    String? submissionStatus,
  }) {
    return DsaProblemDetailState(
      isLoading: isLoading ?? this.isLoading,
      problem: problem ?? this.problem,
      error: error,
      executionResult: executionResult ?? this.executionResult,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      submissionStatus: submissionStatus ?? this.submissionStatus,
    );
  }
}

class DsaProblemController extends StateNotifier<DsaProblemDetailState> {
  // Use ApiClient instead of raw Dio
  final ApiClient _apiClient = ApiClient.instance;
  final String slug;

  DsaProblemController(this.slug) : super(const DsaProblemDetailState()) {
    fetchProblemDetails();
  }

  Future<void> fetchProblemDetails() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await _apiClient
          .get<Map<String, dynamic>>('/api/v1/dsa/problems/$slug/');
      if (response.success && response.data != null) {
        final data = response.data as Map<String, dynamic>;
        state = state.copyWith(
          isLoading: false,
          problem: DsaProblem.fromJson(data),
        );
      } else {
        state = state.copyWith(
            isLoading: false,
            error: response.message ?? 'Failed to fetch details');
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> submitSolution(String code, String language) async {
    if (state.problem == null) return;
    state =
        state.copyWith(isSubmitting: true, error: null, submissionStatus: null);

    try {
      final response = await _apiClient.post<Map<String, dynamic>>(
        '/api/v1/dsa/submissions/',
        data: {
          'problem': state.problem!.slug,
          'code': code,
          'language': language,
        },
      );

      if (response.success && response.data != null) {
        final result = response.data as Map<String, dynamic>;
        state = state.copyWith(
          isSubmitting: false,
          submissionStatus: result['status'] as String?,
          executionResult:
              'Status: ${result['status']}\nRuntime: ${result['runtime_ms'] ?? 0}ms',
        );
      } else {
        state = state.copyWith(
            isSubmitting: false,
            error: response.message ?? 'Submission failed');
      }
    } catch (e) {
      state =
          state.copyWith(isSubmitting: false, error: 'Submission failed: $e');
    }
  }
}

final dsaProblemDetailProvider = StateNotifierProvider.family<
    DsaProblemController, DsaProblemDetailState, String>((ref, slug) {
  return DsaProblemController(slug);
});
