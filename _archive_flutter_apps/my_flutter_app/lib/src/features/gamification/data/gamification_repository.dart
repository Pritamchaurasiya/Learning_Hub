import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/core/constants/api_constants.dart';
import 'package:my_flutter_app/src/core/network/api_client.dart';
import 'package:shared_preferences/shared_preferences.dart';

class GamificationRepository {
  GamificationRepository(this._apiClient);
  final ApiClient _apiClient;

  Future<Response<Map<String, dynamic>>> getStats() async {
    try {
      final response = await _apiClient.get(ApiConstants.gamificationStats);
      // Cache the successful response
      try {
        final prefs = await SharedPreferences.getInstance();
        if (response.data != null) {
          await prefs.setString(
              'cache_gamification_stats', jsonEncode(response.data));
        }
      } on Exception catch (e) {
        // Ignore cache write errors
        debugPrint('Cache write failed: $e');
      }
      return response;
    } on Exception catch (_) {
      // Network failed, try cache
      debugPrint('Network failed, checking cache...');
      final prefs = await SharedPreferences.getInstance();
      final cachedString = prefs.getString('cache_gamification_stats');

      if (cachedString != null) {
        debugPrint('Returning cached gamification stats');
        final cachedData = jsonDecode(cachedString) as Map<String, dynamic>;
        return Response(
          requestOptions: RequestOptions(path: ApiConstants.gamificationStats),
          data: cachedData,
          statusCode: 200,
        );
      }
      rethrow; // No cache, propagate error
    }
  }

  Future<Response<Map<String, dynamic>>> getLeaderboard() async {
    return _apiClient.get('/gamification/leaderboard/');
  }
}

final gamificationRepositoryProvider = Provider<GamificationRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return GamificationRepository(apiClient);
});

final gamificationStatsProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final repo = ref.watch(gamificationRepositoryProvider);
  final response = await repo.getStats();
  return response.data!['data'] as Map<String, dynamic>;
});
