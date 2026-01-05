import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/analytics_service.dart';

class AnalyticsState {
  final List<int> weeklyStudyMinutes; // 7 days
  final double totalStudyHours;
  final double averageQuizScore;
  final int completedLessons;
  final int completedCourses;
  final int totalQuizzesPassed;
  final List<double> weeklyScores; // New field
  final bool isLoading;

  final Map<String, dynamic> studyStats;

  AnalyticsState({
    this.weeklyStudyMinutes = const [0, 0, 0, 0, 0, 0, 0],
    this.totalStudyHours = 0.0,
    this.averageQuizScore = 0.0,
    this.completedLessons = 0,
    this.completedCourses = 0,
    this.totalQuizzesPassed = 0,
    this.weeklyScores = const [],
    this.studyStats = const {},
    this.isLoading = true,
  });

  List<int> get dailyStudyHours => weeklyStudyMinutes;

  AnalyticsState copyWith({
    List<int>? weeklyStudyMinutes,
    double? totalStudyHours,
    double? averageQuizScore,
    int? completedLessons,
    int? completedCourses,
    int? totalQuizzesPassed,
    List<double>? weeklyScores,
    Map<String, dynamic>? studyStats,
    bool? isLoading,
  }) {
    return AnalyticsState(
      weeklyStudyMinutes: weeklyStudyMinutes ?? this.weeklyStudyMinutes,
      totalStudyHours: totalStudyHours ?? this.totalStudyHours,
      averageQuizScore: averageQuizScore ?? this.averageQuizScore,
      completedLessons: completedLessons ?? this.completedLessons,
      completedCourses: completedCourses ?? this.completedCourses,
      totalQuizzesPassed: totalQuizzesPassed ?? this.totalQuizzesPassed,
      weeklyScores: weeklyScores ?? this.weeklyScores,
      studyStats: studyStats ?? this.studyStats,
      isLoading: isLoading ?? this.isLoading,
    );
  }

  // --- UI Helpers ---

  String get formattedTotalTime {
    final hours = totalStudyHours.floor();
    final minutes = ((totalStudyHours - hours) * 60).round();
    if (hours > 0) {
      return '${hours}h ${minutes}m';
    }
    return '${minutes}m';
  }

  int get currentWeekMinutes => weeklyStudyMinutes.reduce((a, b) => a + b);

  double get totalLearningMinutes => totalStudyHours * 60;

  int get weeklyGoalMinutes => 300; // 5 hours default goal

  double get weeklyGoalProgress =>
      (currentWeekMinutes / weeklyGoalMinutes).clamp(0.0, 1.0);

  int get totalLessonsCompleted => completedLessons;
  int get totalCoursesCompleted => completedCourses;
}

class AnalyticsNotifier extends Notifier<AnalyticsState> {
  final AnalyticsService _service = AnalyticsService.instance;

  @override
  AnalyticsState build() {
    _init();
    return AnalyticsState();
  }

  Future<void> _init() async {
    await _service.initialize();
    refresh();
  }

  void refresh() {
    state = AnalyticsState(
      weeklyStudyMinutes: _service.getWeeklyStudyData(),
      totalStudyHours: _service.getTotalStudyHours(),
      averageQuizScore: _service.averageQuizScore,
      completedLessons: _service.completedLessons,
      completedCourses: _service.completedCourses,
      totalQuizzesPassed: _service.totalQuizzesTaken,
      weeklyScores: [78, 82, 85, 79, 88, 92, 87], // Mock data moved from UI
      studyStats: _service.getStudyStats(),
      isLoading: false,
    );
  }

  /// Get learning minutes for the last N days
  List<int> getLearningMinutesForDays(int days) {
    // We currently only track 7 days in service
    final data = state.weeklyStudyMinutes;
    if (days < data.length) {
      return data.sublist(data.length - days);
    }
    return data;
  }

  // Called via lifecycle hooks in app or home
  void startSession() => _service.startSession();

  Future<void> endSession() async {
    await _service.endSession();
    refresh();
  }
}

final analyticsProvider =
    NotifierProvider<AnalyticsNotifier, AnalyticsState>(() {
  return AnalyticsNotifier();
});
