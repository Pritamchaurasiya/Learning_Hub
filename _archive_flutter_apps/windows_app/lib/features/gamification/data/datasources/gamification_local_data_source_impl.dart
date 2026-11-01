import 'package:hive_flutter/hive_flutter.dart';
import '../models/gamification_models.dart';
import 'gamification_data_sources.dart';

class GamificationLocalDataSourceImpl implements GamificationLocalDataSource {
  final Box<dynamic> gamificationBox;

  GamificationLocalDataSourceImpl({required this.gamificationBox});

  @override
  Future<int> getLastKnownXP() async {
    return (gamificationBox.get('total_xp', defaultValue: 0) as int);
  }

  @override
  Future<void> cacheXP(int xp) async {
    await gamificationBox.put('total_xp', xp);
  }

  @override
  Future<List<AchievementModel>> getCachedAchievements() async {
    final data = gamificationBox.get('achievements_cache');
    if (data != null) {
      return (data as List)
          .map((e) => AchievementModel.fromJson(
              Map<String, dynamic>.from(e as Map<dynamic, dynamic>)))
          .toList();
    }
    return [];
  }

  @override
  Future<void> cacheAchievements(List<AchievementModel> achievements) async {
    final data = achievements.map((e) => e.toJson()).toList();
    await gamificationBox.put('achievements_cache', data);
  }

  @override
  Future<List<LeaderboardEntryModel>> getCachedLeaderboard(
      {String period = 'all_time'}) async {
    final data = gamificationBox.get('leaderboard_${period}_cache');
    if (data != null) {
      return (data as List)
          .map((e) => LeaderboardEntryModel.fromJson(
              Map<String, dynamic>.from(e as Map<dynamic, dynamic>)))
          .toList();
    }
    return [];
  }

  @override
  Future<void> cacheLeaderboard(List<LeaderboardEntryModel> leaderboard,
      {String period = 'all_time'}) async {
    final data = leaderboard.map((e) => e.toJson()).toList();
    await gamificationBox.put('leaderboard_${period}_cache', data);
  }

  @override
  Future<int> getStreak() async {
    return (gamificationBox.get('current_streak', defaultValue: 0) as int);
  }

  @override
  Future<void> cacheStreak(int streak) async {
    await gamificationBox.put('current_streak', streak);
  }

  @override
  Stream<int> watchXP() async* {
    yield (gamificationBox.get('total_xp', defaultValue: 0) as int);
    yield* gamificationBox
        .watch(key: 'total_xp')
        .map((event) => (event.value ?? 0) as int);
  }
}
