import '../models/gamification_models.dart';

abstract class GamificationRemoteDataSource {
  Future<int> getUserXP();
  Future<List<AchievementModel>> getAchievements();
  Future<List<LeaderboardEntryModel>> getLeaderboard(String period);
  Future<void> unlockAchievement(String achievementId);
  Future<void> addXP(int amount);
}

abstract class GamificationLocalDataSource {
  Future<int> getLastKnownXP();
  Future<void> cacheXP(int xp);
  Future<List<AchievementModel>> getCachedAchievements();
  Future<void> cacheAchievements(List<AchievementModel> achievements);
  Future<void> cacheLeaderboard(List<LeaderboardEntryModel> leaderboard,
      {String period = 'all_time'});
  Future<List<LeaderboardEntryModel>> getCachedLeaderboard(
      {String period = 'all_time'});
  Future<int> getStreak();
  Future<void> cacheStreak(int streak);
  Stream<int> watchXP();
}
