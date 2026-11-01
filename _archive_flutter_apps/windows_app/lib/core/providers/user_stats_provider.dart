import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:learning_hub/core/services/api_client.dart';
import 'package:learning_hub/data/models/user_stats_model.dart';

/// Provider for user statistics
final userStatsProvider =
    StateNotifierProvider<UserStatsNotifier, AsyncValue<UserStats>>((ref) {
  return UserStatsNotifier();
});

class UserStatsNotifier extends StateNotifier<AsyncValue<UserStats>> {
  final ApiClient _api = ApiClient.instance;

  UserStatsNotifier() : super(const AsyncValue.loading()) {
    fetchStats();
  }

  Future<void> fetchStats() async {
    try {
      state = const AsyncValue.loading();

      // 1. Fetch real stats from AI Engine service
      // Note: This endpoint corresponds to UserBehaviorService.get_user_learning_stats
      final response =
          await _api.get<Map<String, dynamic>>('/ai-engine/stats/learning/');

      if (response.success && response.data != null) {
        final realStats = UserStats.fromJson(response.data!);

        // 2. Generate activity heatmap data (Mock for now, pending backend implementation)
        final heatmap = _generateMockHeatmap();

        state = AsyncValue.data(realStats.copyWith(activityHeatmap: heatmap));
      } else {
        // Fallback to mock if API fails
        state = AsyncValue.data(UserStats.mock());
      }
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Map<DateTime, int> _generateMockHeatmap() {
    final now = DateTime.now();
    final Map<DateTime, int> data = {};
    for (int i = 0; i < 60; i++) {
      final date = now.subtract(Duration(days: i));
      // Random activity between 0 and 120 minutes, with some gaps
      if (i % 7 != 0) {
        // Rest on some days
        data[date] = (15 + (i * 3) % 90);
      }
    }
    return data;
  }
}
