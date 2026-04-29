class UserStats {
  final int totalCourses;
  final int completedCourses;
  final double completionRate;
  final double averageProgress;
  final Map<DateTime, int> activityHeatmap;

  const UserStats({
    required this.totalCourses,
    required this.completedCourses,
    required this.completionRate,
    required this.averageProgress,
    this.activityHeatmap = const {},
  });

  factory UserStats.fromJson(Map<String, dynamic> json) {
    return UserStats(
      totalCourses: json['total_courses'] as int? ?? 0,
      completedCourses: json['completed_courses'] as int? ?? 0,
      completionRate: (json['completion_rate'] as num?)?.toDouble() ?? 0.0,
      averageProgress: (json['average_progress'] as num?)?.toDouble() ?? 0.0,
      activityHeatmap: {}, // Populated separately or from advanced JSON
    );
  }

  factory UserStats.mock() {
    return const UserStats(
      totalCourses: 12,
      completedCourses: 4,
      completionRate: 33.3,
      averageProgress: 45.0,
      activityHeatmap: {},
    );
  }

  UserStats copyWith({
    int? totalCourses,
    int? completedCourses,
    double? completionRate,
    double? averageProgress,
    Map<DateTime, int>? activityHeatmap,
  }) {
    return UserStats(
      totalCourses: totalCourses ?? this.totalCourses,
      completedCourses: completedCourses ?? this.completedCourses,
      completionRate: completionRate ?? this.completionRate,
      averageProgress: averageProgress ?? this.averageProgress,
      activityHeatmap: activityHeatmap ?? this.activityHeatmap,
    );
  }
}
