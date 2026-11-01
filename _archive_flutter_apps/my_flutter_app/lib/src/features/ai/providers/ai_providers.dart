import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/features/ai/data/ai_repository.dart';
import 'package:my_flutter_app/src/features/courses/domain/course_model.dart';

/// Provider for trending courses.
final trendingCoursesProvider = FutureProvider<List<Course>>((ref) async {
  // Mock trending courses for when backend is unavailable
  const mockCourses = [
    Course(
      id: '1',
      title: 'Flutter Masterclass 2024',
      slug: 'flutter-masterclass',
      description: 'Build beautiful cross-platform apps',
      price: 49.99,
      level: 'Beginner',
      instructorName: 'Alex Johnson',
    ),
    Course(
      id: '2',
      title: 'Advanced Dart Patterns',
      slug: 'advanced-dart',
      description: 'Master async, streams and isolates',
      price: 39.99,
      level: 'Advanced',
      instructorName: 'Sarah Smith',
    ),
  ];

  try {
    final aiRepository = ref.watch(aiRepositoryProvider);
    return await aiRepository.getTrendingCourses();
  } on Exception catch (_) {
    return mockCourses;
  }
});

/// Provider for AI-powered recommendations.
final aiRecommendationsProvider = FutureProvider<List<Course>>((ref) async {
  final aiRepository = ref.watch(aiRepositoryProvider);
  return aiRepository.getRecommendations();
});

/// Provider for learning statistics.
final learningStatsProvider = FutureProvider<LearningStats>((ref) async {
  final aiRepository = ref.watch(aiRepositoryProvider);
  return aiRepository.getLearningStats();
});

/// Provider for popular categories.
final popularCategoriesProvider =
    FutureProvider<List<PopularCategory>>((ref) async {
  final aiRepository = ref.watch(aiRepositoryProvider);
  return aiRepository.getPopularCategories();
});

/// Provider for trending courses with custom parameters.
final trendingCoursesWithParamsProvider =
    FutureProvider.family<List<Course>, TrendingParams>((ref, params) async {
  final aiRepository = ref.watch(aiRepositoryProvider);
  return aiRepository.getTrendingCourses(
    days: params.days,
    limit: params.limit,
  );
});

/// Parameters for trending courses.
class TrendingParams {
  TrendingParams({this.days = 7, this.limit = 10});
  final int days;
  final int limit;
}
