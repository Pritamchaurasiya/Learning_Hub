import '../../../../core/services/api_client.dart';
import '../../../../core/error/exceptions.dart';
import '../models/gamification_models.dart';
import 'gamification_data_sources.dart';

class GamificationRemoteDataSourceImpl implements GamificationRemoteDataSource {
  final ApiClient apiClient;

  GamificationRemoteDataSourceImpl({required this.apiClient});

  @override
  Future<int> getUserXP() async {
    final response =
        await apiClient.get<Map<String, dynamic>>('/gamification/xp');
    if (response.success && response.data != null) {
      final payload = response.data!;
      final data = payload.containsKey('data')
          ? payload['data'] as Map<String, dynamic>
          : payload;
      return (data['totalXP'] as int);
    } else {
      throw ServerException(
          message: response.message ?? 'Failed to fetch user XP',
          statusCode: response.statusCode);
    }
  }

  @override
  Future<List<AchievementModel>> getAchievements() async {
    final response = await apiClient.get<Map<String, dynamic>>(
      '/gamification/achievements',
    );

    if (response.success && response.data != null) {
      final payload = response.data!;
      final data = payload.containsKey('data') ? payload['data'] : payload;

      return (data as List)
          .map((e) => AchievementModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } else {
      throw ServerException(
          message: response.message ?? 'Failed to fetch achievements',
          statusCode: response.statusCode);
    }
  }

  @override
  Future<List<LeaderboardEntryModel>> getLeaderboard(String period) async {
    final response = await apiClient.get<Map<String, dynamic>>(
      '/gamification/leaderboard',
      queryParameters: {'period': period},
    );

    if (response.success && response.data != null) {
      final payload = response.data!;
      final data = payload.containsKey('data') ? payload['data'] : payload;

      return (data as List)
          .map((e) => LeaderboardEntryModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } else {
      throw ServerException(
          message: response.message ?? 'Failed to fetch leaderboard',
          statusCode: response.statusCode);
    }
  }

  @override
  Future<void> unlockAchievement(String achievementId) async {
    final response = await apiClient.post<Map<String, dynamic>>(
      '/gamification/achievements/unlock',
      data: {'achievementId': achievementId},
    );

    if (!response.success && response.statusCode != 200) {
      // Allow 200 as success even if success field is missing in some legacy endpoints
      throw ServerException(
          message: response.message ?? 'Failed to unlock achievement',
          statusCode: response.statusCode);
    }
  }

  @override
  Future<void> addXP(int amount) async {
    final response = await apiClient.post<Map<String, dynamic>>(
      '/gamification/xp/add',
      data: {'amount': amount},
    );

    if (!response.success && response.statusCode != 200) {
      throw ServerException(
          message: response.message ?? 'Failed to add XP',
          statusCode: response.statusCode);
    }
  }
}
