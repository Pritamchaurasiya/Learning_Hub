import 'package:dartz/dartz.dart';
import 'package:learning_hub/core/error/failures.dart';
import '../entities/achievement.dart';
import '../entities/leaderboard_entry.dart';

abstract class GamificationRepository {
  Future<Either<Failure, int>> getUserXP();
  Future<Either<Failure, List<Achievement>>> getAchievements();
  Future<Either<Failure, List<LeaderboardEntry>>> getLeaderboard(
      {String period = 'all_time'});
  Future<Either<Failure, void>> unlockAchievement(String achievementId);
  Future<Either<Failure, void>> addXP(int amount);
  Future<Either<Failure, Stream<int>>> watchUserXP();
}
