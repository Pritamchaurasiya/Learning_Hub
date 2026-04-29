import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:my_flutter_app/src/core/network/api_client.dart';
import 'package:my_flutter_app/src/features/profile/domain/instructor_model.dart';

class InstructorRepository {
  InstructorRepository(this._apiClient);
  final ApiClient _apiClient;

  /// Fetch Instructor Details by ID.
  Future<Instructor> getInstructor(String instructorId) async {
    try {
      final response =
          await _apiClient.get('/users/instructors/$instructorId/');
      final data = response.data!;
      return Instructor(
        id: (data['id'] ?? instructorId).toString(),
        name:
            (data['full_name'] ?? data['username'] ?? 'Instructor').toString(),
        title: (data['title'] ?? 'Instructor').toString(),
        isTopRated: data['is_top_rated'] == true,
        coursesCount: (data['courses_count'] as num?)?.toInt() ?? 0,
        studentsCount: (data['students_count'] ?? '0').toString(),
        rating: (data['avg_rating'] as num?)?.toDouble() ?? 0.0,
        bio: (data['bio'] ?? '').toString(),
        avatarUrl: data['avatar_url']?.toString(),
      );
    } on Exception catch (e) {
      debugPrint('InstructorRepo.getInstructor fallback: $e');
      // Graceful fallback for dev/offline environments
      return const Instructor(
        id: '1',
        name: 'Instructor',
        title: 'Educator',
        isTopRated: false,
        coursesCount: 0,
        studentsCount: '0',
        rating: 0,
        bio: 'Profile data unavailable.',
      );
    }
  }

  /// Fetch the logged-in instructor's real dashboard stats from the
  /// Django `/api/v1/dashboard/instructor/stats/` endpoint.
  Future<Map<String, dynamic>> getDashboardStats() async {
    try {
      final response = await _apiClient.get('/dashboard/instructor/stats/');
      final body = response.data!;
      return (body['data'] as Map<String, dynamic>?) ?? body;
    } on Exception catch (e) {
      debugPrint('InstructorRepo.getDashboardStats error: $e');
      return {
        'total_courses': 0,
        'total_students': 0,
        'total_revenue': 0.0,
        'avg_rating': 0.0,
      };
    }
  }

  /// Fetch the advanced v2 instructor dashboard analytics from
  /// `/api/v1/dashboard/instructor-v2/` with engagement charts, review summaries.
  Future<Map<String, dynamic>> getDashboardV2() async {
    try {
      final response = await _apiClient.get('/dashboard/instructor-v2/');
      final body = response.data!;
      return (body['data'] as Map<String, dynamic>?) ?? body;
    } on Exception catch (e) {
      debugPrint('InstructorRepo.getDashboardV2 error: $e');
      return {};
    }
  }

  /// Fetch 6-month revenue trend chart data from
  /// `/api/v1/dashboard/instructor/revenue/`.
  Future<List<Map<String, dynamic>>> getRevenueChart() async {
    try {
      final response = await _apiClient.get('/dashboard/instructor/revenue/');
      final body = response.data!;
      final results = body['results'];
      if (results is List) {
        return results.cast<Map<String, dynamic>>();
      }
      return [];
    } on Exception catch (e) {
      debugPrint('InstructorRepo.getRevenueChart error: $e');
      return [];
    }
  }
}

final instructorRepositoryProvider = Provider<InstructorRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return InstructorRepository(apiClient);
});

/// Provider for the basic instructor dashboard stats.
final instructorDashboardProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final repo = ref.watch(instructorRepositoryProvider);
  return repo.getDashboardStats();
});

/// Provider for the advanced v2 instructor dashboard.
final instructorDashboardV2Provider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final repo = ref.watch(instructorRepositoryProvider);
  return repo.getDashboardV2();
});

/// Provider for the 6-month revenue chart data.
final instructorRevenueChartProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final repo = ref.watch(instructorRepositoryProvider);
  return repo.getRevenueChart();
});
