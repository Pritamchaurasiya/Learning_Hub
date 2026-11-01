import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/course_model.dart';
import '../services/recommendation_service.dart';
import '../services/course_service.dart';

/// Recommendation State
class RecommendationState {
  final List<Course> recommendations;
  final bool isLoading;
  final String? error;

  const RecommendationState({
    this.recommendations = const [],
    this.isLoading = false,
    this.error,
  });

  RecommendationState copyWith({
    List<Course>? recommendations,
    bool? isLoading,
    String? error,
  }) {
    return RecommendationState(
      recommendations: recommendations ?? this.recommendations,
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
    );
  }
}

/// Recommendation Notifier
class RecommendationNotifier extends StateNotifier<RecommendationState> {
  final RecommendationService _recommendationService;
  final CourseService _courseService;

  RecommendationNotifier(this._recommendationService, this._courseService)
      : super(const RecommendationState()) {
    loadRecommendations();
  }

  Future<void> loadRecommendations() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      // 1. Get all available courses to choose from
      final allCourses = await _courseService.getCourses();

      // 2. Convert to JSON for the service algorithm
      final coursesJson = allCourses.map((c) => c.toJson()).toList();

      // 3. Get recommendations (returns List<RecommendationObject>)
      final recommendationObjects =
          await _recommendationService.getRecommendations(
        availableCourses: coursesJson,
        limit: 10,
      );

      // 4. Map back to full Course objects
      final recommendedCourses = recommendationObjects.map((rec) {
        return allCourses.firstWhere(
          (c) => c.id == rec.courseId,
          orElse: () => allCourses.first, // Fallback safely
        );
      }).toList();

      state = state.copyWith(
        recommendations: recommendedCourses,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to load recommendations: $e',
      );
    }
  }

  Future<void> refresh() async {
    await loadRecommendations();
  }
}

/// Provider definition
final recommendationProvider =
    StateNotifierProvider<RecommendationNotifier, RecommendationState>((ref) {
  return RecommendationNotifier(
    RecommendationService.instance,
    CourseService.instance,
  );
});
