import '../../data/models/course_model.dart';

/// Progress Prediction Service
/// Uses historical data to predict course completion dates and identify at-risk learners.
class ProgressPredictionService {
  static final ProgressPredictionService _instance =
      ProgressPredictionService._();
  static ProgressPredictionService get instance => _instance;

  ProgressPredictionService._();

  /// Predict completion date for a specific course
  /// Returns null if insufficient data
  DateTime? predictCompletionDate(
      String userId, Course course, double currentProgress) {
    if (currentProgress >= 1.0) return DateTime.now();
    if (currentProgress <= 0.0) return null; // Cannot predict without data

    // Simple velocity-based prediction
    // In a real system, we'd query the analytics service for start date and learning velocity
    // Here we simulate fetching velocity (lessons per week)

    // Assume average user clears 5% per day if active?
    // Let's use a simpler heuristic for now.

    final remainingPercentage = 1.0 - currentProgress;
    const assumedVelocityPerDay = 0.05; // 5% per day

    final daysRemaining = (remainingPercentage / assumedVelocityPerDay).ceil();

    return DateTime.now().add(Duration(days: daysRemaining));
  }

  /// Assess if a learner is "at risk" of dropping out
  /// based on login frequency and progress stall
  Future<RiskAssessment> assessRisk(
      String userId, String courseId, double currentProgress) async {
    // Simulate fetching last activity date
    final lastActivityDate =
        DateTime.now().subtract(const Duration(days: 2)); // Mock: 2 days ago
    final daysSinceActivity =
        DateTime.now().difference(lastActivityDate).inDays;

    if (daysSinceActivity > 14) {
      return const RiskAssessment(
        level: RiskLevel.high,
        reason: 'Inactive for over 2 weeks',
        suggestedAction: 'Send re-engagement email',
      );
    } else if (daysSinceActivity > 7) {
      return const RiskAssessment(
        level: RiskLevel.medium,
        reason: 'Inactive for 1 week',
        suggestedAction: 'Send push notification',
      );
    }

    // Check for progress stall (e.g., stuck on same percentage for long time)
    // Needs historical snapshots.

    return const RiskAssessment(
      level: RiskLevel.low,
      reason: 'Active recently',
      suggestedAction: 'None',
    );
  }

  /// Estimate study hours required to reach a goal
  int estimateRequiredHours(
      double targetProgress, double currentProgress, Course course) {
    if (targetProgress <= currentProgress) return 0;

    final remainingFraction = targetProgress - currentProgress;
    final totalLessons = course.lessonsCount;
    // Assume 30 mins per lesson average if not specified
    const avgLessonDurationMinutes = 30;

    final remainingLessons = (totalLessons * remainingFraction).ceil();
    final totalMinutes = remainingLessons * avgLessonDurationMinutes;

    return (totalMinutes / 60).ceil();
  }
}

enum RiskLevel { low, medium, high }

class RiskAssessment {
  final RiskLevel level;
  final String reason;
  final String suggestedAction;

  const RiskAssessment({
    required this.level,
    required this.reason,
    required this.suggestedAction,
  });
}
