import 'package:dartz/dartz.dart';
import 'package:learning_hub/core/error/failures.dart';
import 'package:learning_hub/core/network/network_info.dart';
import 'package:learning_hub/core/services/sync_service.dart';
import '../../domain/entities/achievement.dart';
import '../../domain/entities/leaderboard_entry.dart';
import '../../domain/repositories/gamification_repository.dart';
import '../datasources/gamification_data_sources.dart';

class GamificationRepositoryImpl implements GamificationRepository {
  final GamificationRemoteDataSource remoteDataSource;
  final GamificationLocalDataSource localDataSource;
  final NetworkInfo networkInfo;
  final SyncService syncService;

  GamificationRepositoryImpl({
    required this.remoteDataSource,
    required this.localDataSource,
    required this.networkInfo,
    required this.syncService,
  });

  @override
  Future<Either<Failure, int>> getUserXP() async {
    if (await networkInfo.isConnected) {
      try {
        final xp = await remoteDataSource.getUserXP();
        await localDataSource.cacheXP(xp);
        return Right(xp);
      } catch (e) {
        return Left(ServerFailure(message: e.toString()));
      }
    } else {
      try {
        final xp = await localDataSource.getLastKnownXP();
        return Right(xp);
      } catch (e) {
        return Left(CacheFailure(message: e.toString()));
      }
    }
  }

  @override
  Future<Either<Failure, List<Achievement>>> getAchievements() async {
    if (await networkInfo.isConnected) {
      try {
        final remoteAchievements = await remoteDataSource.getAchievements();
        await localDataSource.cacheAchievements(remoteAchievements);
        return Right(remoteAchievements);
      } catch (e) {
        return Left(ServerFailure(message: e.toString()));
      }
    } else {
      try {
        final localAchievements = await localDataSource.getCachedAchievements();
        return Right(localAchievements);
      } catch (e) {
        return Left(CacheFailure(message: e.toString()));
      }
    }
  }

  @override
  Future<Either<Failure, List<LeaderboardEntry>>> getLeaderboard(
      {String period = 'all_time'}) async {
    if (await networkInfo.isConnected) {
      try {
        final remoteLeaderboard = await remoteDataSource.getLeaderboard(period);
        await localDataSource.cacheLeaderboard(remoteLeaderboard,
            period: period);
        return Right(remoteLeaderboard);
      } catch (e) {
        return Left(ServerFailure(message: e.toString()));
      }
    } else {
      try {
        final localLeaderboard =
            await localDataSource.getCachedLeaderboard(period: period);
        return Right(localLeaderboard);
      } catch (e) {
        return Left(CacheFailure(message: e.toString()));
      }
    }
  }

  @override
  Future<Either<Failure, void>> unlockAchievement(String achievementId) async {
    // 1. Queue sync event
    await syncService.queue(
      type: SyncTypes.achievementUnlock,
      action: 'create',
      data: {
        'achievementId': achievementId,
        'timestamp': DateTime.now().toIso8601String(),
      },
    );

    // 2. Try online
    if (await networkInfo.isConnected) {
      try {
        await remoteDataSource.unlockAchievement(achievementId);
        return const Right(null);
      } catch (e) {
        // Suppress error since we queued it
        return const Right(null);
      }
    }

    return const Right(null);
  }

  @override
  Future<Either<Failure, void>> addXP(int amount) async {
    // 1. Update local cache (best effort)
    try {
      final current = await localDataSource.getLastKnownXP();
      await localDataSource.cacheXP(current + amount);
    } catch (_) {}

    // 2. Queue sync event
    await syncService.queue(
      type: SyncTypes.xpUpdate,
      action: 'update',
      data: {
        'amount': amount,
        'timestamp': DateTime.now().toIso8601String(),
      },
    );

    // 3. Try online
    if (await networkInfo.isConnected) {
      try {
        await remoteDataSource.addXP(amount);
        return const Right(null);
      } catch (e) {
        // Suppress error since we queued it
        return const Right(null);
      }
    }

    return const Right(null);
  }

  @override
  Future<Either<Failure, Stream<int>>> watchUserXP() async {
    try {
      return Right(localDataSource.watchXP());
    } catch (e) {
      return Left(CacheFailure(message: e.toString()));
    }
  }
}
