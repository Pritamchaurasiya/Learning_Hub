import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/core/constants/api_constants.dart';
import 'package:my_flutter_app/src/core/error/exceptions.dart';
import 'package:my_flutter_app/src/core/network/api_client.dart';

final analyticsRepositoryProvider = Provider<AnalyticsRepository>((ref) {
  return AnalyticsRepository(ref.watch(apiClientProvider));
});

final userAnalyticsProvider =
    FutureProvider.autoDispose<UserAnalytics>((ref) async {
  final repo = ref.watch(analyticsRepositoryProvider);
  return repo.getUserAnalytics();
});

/// Phase 6: Analytics & Challenges Integration
class AnalyticsRepository {
  AnalyticsRepository(this._apiClient);
  final ApiClient _apiClient;

  /// Get comprehensive user analytics and learning insights
  Future<UserAnalytics> getUserAnalytics() async {
    final response = await _apiClient.get(ApiConstants.aiAnalytics);
    final data = response.data?['data'] as Map<String, dynamic>?;
    if (data == null) {
      throw ServerException(message: 'Failed to load user analytics');
    }
    return UserAnalytics.fromJson(data);
  }

  /// Get activity data for heatmap visualization.
  /// Returns daily activity counts mapping "YYYY-MM-DD" to integer count.
  Future<Map<String, int>> getActivityHeatmap() async {
    final response = await _apiClient.get(ApiConstants.aiAnalyticsHeatmap);
    final data = response.data?['data'] as Map<String, dynamic>?;
    if (data == null) {
      return {};
    }

    return data.map((key, value) => MapEntry(key, value as int));
  }

  /// Track a user activity.
  Future<void> trackActivity({
    required String action,
    String? contentType,
    int? objectId,
    int? durationSeconds,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      await _apiClient.post(
        ApiConstants.aiAnalyticsTrack,
        data: {
          'action': action,
          if (contentType != null) 'content_type': contentType,
          if (objectId != null) 'object_id': objectId,
          if (durationSeconds != null) 'duration_seconds': durationSeconds,
          if (metadata != null) 'metadata': metadata,
        },
      );
    } on Exception catch (_) {
      // Fire and forget; don't break user flow if telemetry fails
      // Silently ignore telemetry errors
    }
  }

  /// Get all active challenges with user's participation status
  Future<List<ChallengeItem>> getChallenges() async {
    final response = await _apiClient.get(ApiConstants.aiChallenges);
    final results = (response.data?['data'] ?? response.data) as List<dynamic>?;
    if (results == null) {
      return [];
    }

    return results
        .map((e) => ChallengeItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Join a specific challenge
  Future<void> joinChallenge(int challengeId) async {
    await _apiClient.post(ApiConstants.aiChallengeJoin(challengeId));
  }

  // ========== Admin Analytics APIs ==========

  /// Get admin dashboard statistics
  Future<DashboardStats> getDashboardStats() async {
    final response = await _apiClient.get(ApiConstants.analyticsDashboard);
    final data = response.data;
    if (data == null) {
      throw ServerException(message: 'Failed to load dashboard stats');
    }
    return DashboardStats.fromJson(data);
  }

  /// Get course analytics with optional date range
  Future<CourseAnalytics> getCourseAnalytics({
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    final queryParams = <String, dynamic>{};
    if (startDate != null) {
      queryParams['start_date'] = startDate.toIso8601String().split('T')[0];
    }
    if (endDate != null) {
      queryParams['end_date'] = endDate.toIso8601String().split('T')[0];
    }

    final response = await _apiClient.get(
      ApiConstants.analyticsCourses,
      queryParameters: queryParams.isNotEmpty ? queryParams : null,
    );
    final data = response.data;
    if (data == null) {
      throw ServerException(message: 'Failed to load course analytics');
    }
    return CourseAnalytics.fromJson(data);
  }

  /// Get admin user analytics
  Future<UserAnalyticsAdmin> getAdminUserAnalytics({
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    final queryParams = <String, dynamic>{};
    if (startDate != null) {
      queryParams['start_date'] = startDate.toIso8601String().split('T')[0];
    }
    if (endDate != null) {
      queryParams['end_date'] = endDate.toIso8601String().split('T')[0];
    }

    final response = await _apiClient.get(
      ApiConstants.analyticsUsers,
      queryParameters: queryParams.isNotEmpty ? queryParams : null,
    );
    final data = response.data;
    if (data == null) {
      throw ServerException(message: 'Failed to load user analytics');
    }
    return UserAnalyticsAdmin.fromJson(data);
  }

  /// Get revenue analytics
  Future<RevenueAnalytics> getRevenueAnalytics({
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    final queryParams = <String, dynamic>{};
    if (startDate != null) {
      queryParams['start_date'] = startDate.toIso8601String().split('T')[0];
    }
    if (endDate != null) {
      queryParams['end_date'] = endDate.toIso8601String().split('T')[0];
    }

    final response = await _apiClient.get(
      ApiConstants.analyticsRevenue,
      queryParameters: queryParams.isNotEmpty ? queryParams : null,
    );
    final data = response.data;
    if (data == null) {
      throw ServerException(message: 'Failed to load revenue analytics');
    }
    return RevenueAnalytics.fromJson(data);
  }

  /// Get engagement analytics
  Future<EngagementAnalytics> getEngagementAnalytics() async {
    final response = await _apiClient.get(ApiConstants.analyticsEngagement);
    final data = response.data;
    if (data == null) {
      throw ServerException(message: 'Failed to load engagement analytics');
    }
    return EngagementAnalytics.fromJson(data);
  }
}

/// Model for user analytics summary
class UserAnalytics {
  UserAnalytics({
    required this.engagementScore,
    required this.consistencyScore,
    required this.completionRate,
    required this.preferredTime,
    required this.totalLearningHours,
    required this.weeklyAverageHours,
    required this.burnoutRisk,
  });

  factory UserAnalytics.fromJson(Map<String, dynamic> json) {
    return UserAnalytics(
      engagementScore: (json['engagement_score'] as num?)?.toDouble() ?? 0.0,
      consistencyScore: (json['consistency_score'] as num?)?.toDouble() ?? 0.0,
      completionRate: (json['completion_rate'] as num?)?.toDouble() ?? 0.0,
      preferredTime: json['preferred_time'] as String? ?? 'Any/Flexible',
      totalLearningHours:
          (json['total_learning_hours'] as num?)?.toDouble() ?? 0.0,
      weeklyAverageHours:
          (json['weekly_average_hours'] as num?)?.toDouble() ?? 0.0,
      burnoutRisk: json['burnout_risk'] as String? ?? 'Low',
    );
  }

  final double engagementScore;
  final double consistencyScore;
  final double completionRate;
  final String preferredTime;
  final double totalLearningHours;
  final double weeklyAverageHours;
  final String burnoutRisk;
}

/// Model for an active AI-generated challenge
class ChallengeItem {
  ChallengeItem({
    required this.id,
    required this.title,
    required this.description,
    required this.xpReward,
    required this.userStatus,
  });

  factory ChallengeItem.fromJson(Map<String, dynamic> json) {
    return ChallengeItem(
      id: json['id'] as int? ?? 0,
      title: json['title'] as String? ?? 'Challenge',
      description: json['description'] as String? ?? '',
      xpReward: json['xp_reward'] as int? ?? 0,
      userStatus: UserChallengeStatus.fromJson(
          json['user_status'] as Map<String, dynamic>? ?? {}),
    );
  }

  final int id;
  final String title;
  final String description;
  final int xpReward;
  final UserChallengeStatus userStatus;
}

/// Model detailing a student's participation in a given challenge
class UserChallengeStatus {
  UserChallengeStatus({
    required this.joined,
    required this.progress,
    required this.target,
    required this.isCompleted,
  });

  factory UserChallengeStatus.fromJson(Map<String, dynamic> json) {
    return UserChallengeStatus(
      joined: json['joined'] as bool? ?? false,
      progress: json['progress'] as int? ?? 0,
      target: json['target'] as int? ?? 1,
      isCompleted: json['is_completed'] as bool? ?? false,
    );
  }

  final bool joined;
  final int progress;
  final int target;
  final bool isCompleted;
}

/// Admin dashboard statistics
class DashboardStats {
  DashboardStats({
    required this.totalUsers,
    required this.totalCourses,
    required this.totalEnrollments,
    required this.totalRevenue,
    required this.activeUsers24h,
    required this.newEnrollments24h,
    required this.avgRating,
    required this.completionRate,
  });

  factory DashboardStats.fromJson(Map<String, dynamic> json) {
    return DashboardStats(
      totalUsers: json['total_users'] as int? ?? 0,
      totalCourses: json['total_courses'] as int? ?? 0,
      totalEnrollments: json['total_enrollments'] as int? ?? 0,
      totalRevenue: (json['total_revenue'] as num?)?.toDouble() ?? 0.0,
      activeUsers24h: json['active_users_24h'] as int? ?? 0,
      newEnrollments24h: json['new_enrollments_24h'] as int? ?? 0,
      avgRating: (json['avg_rating'] as num?)?.toDouble() ?? 0.0,
      completionRate: (json['completion_rate'] as num?)?.toDouble() ?? 0.0,
    );
  }

  final int totalUsers;
  final int totalCourses;
  final int totalEnrollments;
  final double totalRevenue;
  final int activeUsers24h;
  final int newEnrollments24h;
  final double avgRating;
  final double completionRate;
}

/// Course analytics for admin
class CourseAnalytics {
  CourseAnalytics({
    required this.totalCourses,
    required this.publishedCourses,
    required this.topCourses,
    required this.avgEnrollmentPerCourse,
    required this.avgRating,
  });

  factory CourseAnalytics.fromJson(Map<String, dynamic> json) {
    return CourseAnalytics(
      totalCourses: json['total_courses'] as int? ?? 0,
      publishedCourses: json['published_courses'] as int? ?? 0,
      topCourses: (json['top_courses'] as List? ?? [])
          .map((e) => TopCourse.fromJson(e as Map<String, dynamic>))
          .toList(),
      avgEnrollmentPerCourse:
          (json['avg_enrollment_per_course'] as num?)?.toDouble() ?? 0.0,
      avgRating: (json['avg_rating'] as num?)?.toDouble() ?? 0.0,
    );
  }

  final int totalCourses;
  final int publishedCourses;
  final List<TopCourse> topCourses;
  final double avgEnrollmentPerCourse;
  final double avgRating;
}

class TopCourse {
  TopCourse({
    required this.title,
    required this.enrollmentCount,
    required this.avgRating,
    required this.revenue,
  });

  factory TopCourse.fromJson(Map<String, dynamic> json) {
    return TopCourse(
      title: json['title'] as String? ?? '',
      enrollmentCount: json['enrollment_count'] as int? ?? 0,
      avgRating: (json['avg_rating'] as num?)?.toDouble() ?? 0.0,
      revenue: (json['revenue'] as num?)?.toDouble() ?? 0.0,
    );
  }

  final String title;
  final int enrollmentCount;
  final double avgRating;
  final double revenue;
}

/// Admin user analytics
class UserAnalyticsAdmin {
  UserAnalyticsAdmin({
    required this.totalUsers,
    required this.activeUsers,
    required this.newUsersThisMonth,
    required this.studentCount,
    required this.instructorCount,
    required this.avgCompletionRate,
  });

  factory UserAnalyticsAdmin.fromJson(Map<String, dynamic> json) {
    return UserAnalyticsAdmin(
      totalUsers: json['total_users'] as int? ?? 0,
      activeUsers: json['active_users'] as int? ?? 0,
      newUsersThisMonth: json['new_users_this_month'] as int? ?? 0,
      studentCount: json['student_count'] as int? ?? 0,
      instructorCount: json['instructor_count'] as int? ?? 0,
      avgCompletionRate:
          (json['avg_completion_rate'] as num?)?.toDouble() ?? 0.0,
    );
  }

  final int totalUsers;
  final int activeUsers;
  final int newUsersThisMonth;
  final int studentCount;
  final int instructorCount;
  final double avgCompletionRate;
}

/// Revenue analytics for admin
class RevenueAnalytics {
  RevenueAnalytics({
    required this.totalRevenue,
    required this.monthlyRevenue,
    required this.averageOrderValue,
    required this.refundRate,
    required this.revenueByCategory,
  });

  factory RevenueAnalytics.fromJson(Map<String, dynamic> json) {
    return RevenueAnalytics(
      totalRevenue: (json['total_revenue'] as num?)?.toDouble() ?? 0.0,
      monthlyRevenue: (json['monthly_revenue'] as num?)?.toDouble() ?? 0.0,
      averageOrderValue:
          (json['average_order_value'] as num?)?.toDouble() ?? 0.0,
      refundRate: (json['refund_rate'] as num?)?.toDouble() ?? 0.0,
      revenueByCategory:
          (json['revenue_by_category'] as Map<String, dynamic>? ?? {})
              .map((k, v) => MapEntry(k, (v as num).toDouble())),
    );
  }

  final double totalRevenue;
  final double monthlyRevenue;
  final double averageOrderValue;
  final double refundRate;
  final Map<String, double> revenueByCategory;
}

/// Engagement analytics
class EngagementAnalytics {
  EngagementAnalytics({
    required this.avgSessionDuration,
    required this.avgSessionsPerUser,
    required this.mostActiveTime,
    required this.contentEngagementRate,
    required this.featureUsage,
  });

  factory EngagementAnalytics.fromJson(Map<String, dynamic> json) {
    return EngagementAnalytics(
      avgSessionDuration:
          (json['avg_session_duration'] as num?)?.toDouble() ?? 0.0,
      avgSessionsPerUser:
          (json['avg_sessions_per_user'] as num?)?.toDouble() ?? 0.0,
      mostActiveTime: json['most_active_time'] as String? ?? '',
      contentEngagementRate:
          (json['content_engagement_rate'] as num?)?.toDouble() ?? 0.0,
      featureUsage: (json['feature_usage'] as Map<String, dynamic>? ?? {})
          .map((k, v) => MapEntry(k, (v as num).toDouble())),
    );
  }

  final double avgSessionDuration;
  final double avgSessionsPerUser;
  final String mostActiveTime;
  final double contentEngagementRate;
  final Map<String, double> featureUsage;
}
