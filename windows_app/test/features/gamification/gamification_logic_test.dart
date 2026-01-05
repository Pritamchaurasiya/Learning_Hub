import 'package:dartz/dartz.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:learning_hub/core/network/network_info.dart';
import 'package:learning_hub/core/services/sync_service.dart';
import 'package:learning_hub/features/gamification/data/datasources/gamification_data_sources.dart';
import 'package:learning_hub/features/gamification/data/repositories/gamification_repository_impl.dart';
import 'package:learning_hub/features/gamification/domain/entities/achievement.dart';
import 'package:learning_hub/features/gamification/data/models/gamification_models.dart';
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';

import 'gamification_logic_test.mocks.dart';

@GenerateMocks([
  NetworkInfo,
  GamificationRemoteDataSource,
  GamificationLocalDataSource,
  SyncService,
])
void main() {
  late GamificationRepositoryImpl repository;
  late MockNetworkInfo mockNetworkInfo;
  late MockGamificationRemoteDataSource mockRemoteDataSource;
  late MockGamificationLocalDataSource mockLocalDataSource;
  late MockSyncService mockSyncService;

  setUp(() {
    mockNetworkInfo = MockNetworkInfo();
    mockRemoteDataSource = MockGamificationRemoteDataSource();
    mockLocalDataSource = MockGamificationLocalDataSource();
    mockSyncService = MockSyncService();
    repository = GamificationRepositoryImpl(
      remoteDataSource: mockRemoteDataSource,
      localDataSource: mockLocalDataSource,
      networkInfo: mockNetworkInfo,
      syncService: mockSyncService,
    );
  });

  group('getUserXP', () {
    const tXP = 100;

    test('should return remote data when network is connected', () async {
      // Arrange
      when(mockNetworkInfo.isConnected).thenAnswer((_) async => true);
      when(mockRemoteDataSource.getUserXP()).thenAnswer((_) async => tXP);
      when(mockLocalDataSource.cacheXP(tXP)).thenAnswer((_) async => {});

      // Act
      final result = await repository.getUserXP();

      // Assert
      expect(result, const Right(tXP));
      verify(mockRemoteDataSource.getUserXP());
      verify(mockLocalDataSource.cacheXP(tXP));
    });

    test('should return local data when network is disconnected', () async {
      // Arrange
      when(mockNetworkInfo.isConnected).thenAnswer((_) async => false);
      when(mockLocalDataSource.getLastKnownXP()).thenAnswer((_) async => tXP);

      // Act
      final result = await repository.getUserXP();

      // Assert
      expect(result, const Right(tXP));
      verifyZeroInteractions(mockRemoteDataSource);
      verify(mockLocalDataSource.getLastKnownXP());
    });
  });

  group('getAchievements', () {
    const tAchievementModel = AchievementModel(
      id: '1',
      title: 'Test',
      description: 'Test Desc',
      iconPath: 'icon',
      type: AchievementType.special,
      rarity: AchievementRarity.common,
      requirement: 10,
      xpReward: 10,
    );
    final tAchievementList = [tAchievementModel];

    test('should return remote achievements when connected', () async {
      // Arrange
      when(mockNetworkInfo.isConnected).thenAnswer((_) async => true);
      when(mockRemoteDataSource.getAchievements())
          .thenAnswer((_) async => tAchievementList);
      when(mockLocalDataSource.cacheAchievements(tAchievementList))
          .thenAnswer((_) async => {});

      // Act
      final result = await repository.getAchievements();

      // Assert
      verify(mockRemoteDataSource.getAchievements());
      expect(result.isRight(), true);
    });
  });
}
