import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/core/network/api_client.dart';

class GamificationRepository {
  GamificationRepository(this._apiClient);
  final ApiClient _apiClient;

  Future<Response<Map<String, dynamic>>> getStats() async {
    return _apiClient.get('/gamification/stats/');
  }

  Future<Response<Map<String, dynamic>>> getLeaderboard() async {
    return _apiClient.get('/gamification/leaderboard/');
  }
}

final gamificationRepositoryProvider = Provider<GamificationRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return GamificationRepository(apiClient);
});
