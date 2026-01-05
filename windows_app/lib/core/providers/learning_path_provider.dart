import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/learning_path_service.dart';
import '../services/course_service.dart';

/// Learning Path State
class LearningPathState {
  final LearningPath? activePath;
  final List<LearningPath> availablePaths;
  final bool isLoading;
  final String? error;

  const LearningPathState({
    this.activePath,
    this.availablePaths = const [],
    this.isLoading = false,
    this.error,
  });

  LearningPathState copyWith({
    LearningPath? activePath,
    List<LearningPath>? availablePaths,
    bool? isLoading,
    String? error,
  }) {
    return LearningPathState(
      activePath: activePath ?? this.activePath,
      availablePaths: availablePaths ?? this.availablePaths,
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
    );
  }
}

/// Learning Path Notifier
class LearningPathNotifier extends StateNotifier<LearningPathState> {
  final LearningPathService _pathService;
  final CourseService _courseService;

  LearningPathNotifier(this._pathService, this._courseService)
      : super(const LearningPathState()) {
    loadPaths();
  }

  Future<void> loadPaths() async {
    state = state.copyWith(isLoading: true);
    try {
      // Force init if needed (though usually done at app start)
      await _pathService.initialize();

      final paths = _pathService.activePaths;

      state = state.copyWith(
        availablePaths: paths,
        activePath: paths.where((p) => p.isActive).firstOrNull,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  /// Generate a personalized learning path
  Future<void> generatePath({
    required String goal,
    required List<String> targetSkills,
    required String
        timeCommitment, // Service doesn't rely on this yet, but we accept it
    required List<String> preferredStyles, // Service doesn't rely on this yet
  }) async {
    state = state.copyWith(isLoading: true);
    try {
      // 1. Fetch available courses
      final courses = await _courseService.getCourses();

      // 2. Convert to Map for service (Service expects List<Map<String, dynamic>>)
      final courseMaps = courses.map((c) => c.toJson()).toList();

      // 3. Generate path
      final path = await _pathService.generatePersonalizedPath(
        goalTitle: goal,
        targetSkillNames: targetSkills,
        availableCourses: courseMaps,
      );

      state = state.copyWith(
        activePath: path,
        availablePaths: [...state.availablePaths, path],
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  /// Start a path
  Future<void> startPath(String pathId) async {
    try {
      await _pathService.startPath(pathId);
      await loadPaths(); // Refresh state
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  /// Delete a path
  Future<void> deletePath(String pathId) async {
    try {
      await _pathService.deletePath(pathId);
      await loadPaths(); // Refresh state
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }
}

final learningPathProvider =
    StateNotifierProvider<LearningPathNotifier, LearningPathState>((ref) {
  return LearningPathNotifier(
    LearningPathService.instance,
    CourseService.instance,
  );
});
