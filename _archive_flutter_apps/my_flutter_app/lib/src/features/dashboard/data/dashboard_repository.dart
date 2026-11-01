import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/core/constants/api_constants.dart';
import 'package:my_flutter_app/src/core/network/api_client.dart';

// We need endpoints in ApiConstants first.
// Assuming we'll add:
// static const String instructorStats = 'dashboard/instructor/stats/';
// static const String instructorCourses = 'dashboard/instructor/courses/';
// static const String instructorRevenue = 'dashboard/instructor/revenue/';

class DashboardRepository {
  DashboardRepository(this._apiClient);
  final ApiClient _apiClient;

  Future<Map<String, dynamic>> getStats() async {
    final response = await _apiClient.get(ApiConstants.instructorStats);
    // Directly return the map, data layer handles parsing or use a Model
    return response.data ?? <String, dynamic>{};
  }

  Future<List<dynamic>> getCoursePerformance() async {
    final response = await _apiClient.get(ApiConstants.instructorCourses);
    final data = response.data;
    return (data?['results'] as List<dynamic>?) ?? <dynamic>[];
  }

  Future<List<dynamic>> getRevenueChartData() async {
    final response = await _apiClient.get(ApiConstants.instructorRevenue);
    final data = response.data;
    return (data?['results'] as List<dynamic>?) ?? <dynamic>[];
  }
}

final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return DashboardRepository(apiClient);
});
