import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/gamification/domain/repositories/gamification_repository.dart';
import '../../features/gamification/domain/entities/achievement.dart';
import '../../features/gamification/domain/entities/leaderboard_entry.dart';
import '../constants/app_constants.dart';
import '../di/injection_container.dart';

/// Gamification User State
class GamificationState {
  final int totalXP;
  final int level;
  final double levelProgress;
  final int streak;
  final List<String> unlockedAchievementIds;
  final List<Achievement> allAchievements;
  final List<LeaderboardEntry> leaderboard; // Added
  final bool showLevelUpCelebration;
  final bool isLoading; // Added

  const GamificationState({
    this.totalXP = 0,
    this.level = 1,
    this.levelProgress = 0.0,
    this.streak = 0,
    this.unlockedAchievementIds = const [],
    this.allAchievements = const [],
    this.leaderboard = const [],
    this.showLevelUpCelebration = false,
    this.isLoading = false,
  });

  GamificationState copyWith({
    int? totalXP,
    int? level,
    double? levelProgress,
    int? streak,
    List<String>? unlockedAchievementIds,
    List<Achievement>? allAchievements,
    List<LeaderboardEntry>? leaderboard,
    bool? showLevelUpCelebration,
    bool? isLoading,
  }) {
    return GamificationState(
      totalXP: totalXP ?? this.totalXP,
      level: level ?? this.level,
      levelProgress: levelProgress ?? this.levelProgress,
      streak: streak ?? this.streak,
      unlockedAchievementIds:
          unlockedAchievementIds ?? this.unlockedAchievementIds,
      allAchievements: allAchievements ?? this.allAchievements,
      leaderboard: leaderboard ?? this.leaderboard,
      showLevelUpCelebration:
          showLevelUpCelebration ?? this.showLevelUpCelebration,
      isLoading: isLoading ?? this.isLoading,
    );
  }

  // --- Getters ---

  List<Achievement> get unlockedAchievements {
    return allAchievements
        .where((a) => unlockedAchievementIds.contains(a.id))
        .toList();
  }

  // Helper to get next level XP
  int get xpToNextLevel => LevelThresholds.getXPForNextLevel(totalXP);

  String get levelName {
    if (level <= LevelThresholds.levelNames.length && level > 0) {
      return LevelThresholds.levelNames[level - 1];
    }
    return 'Legend';
  }
}

class GamificationNotifier extends Notifier<GamificationState> {
  late final GamificationRepository _repository;

  @override
  GamificationState build() {
    _repository = sl<GamificationRepository>();
    Future.microtask(() => _init());
    return const GamificationState(isLoading: true);
  }

  Future<void> _init() async {
    // state is already isLoading: true from build
    final xpFuture = _repository.getUserXP();
    final achievementsFuture = _repository.getAchievements();
    final leaderboardFuture = _repository.getLeaderboard();

    final results =
        await Future.wait([xpFuture, achievementsFuture, leaderboardFuture]);

    // Process results...
    int currentXP = 0;
    List<Achievement> achievements = [];
    List<LeaderboardEntry> leaderboard = [];

    results[0].fold((l) => null, (r) => currentXP = r as int);
    results[1].fold((l) => null, (r) => achievements = r as List<Achievement>);
    results[2]
        .fold((l) => null, (r) => leaderboard = r as List<LeaderboardEntry>);

    final level = LevelThresholds.getLevelForXP(currentXP);
    final progress = LevelThresholds.getProgressToNextLevel(currentXP);

    state = state.copyWith(
      totalXP: currentXP,
      level: level,
      levelProgress: progress,
      allAchievements: achievements,
      leaderboard: leaderboard,
      unlockedAchievementIds:
          achievements.where((a) => a.isUnlocked).map((a) => a.id).toList(),
      isLoading: false,
    );
  }

  Future<void> refreshLeaderboard() async {
    state = state.copyWith(isLoading: true);
    final result = await _repository.getLeaderboard();
    result.fold(
      (failure) => state = state.copyWith(isLoading: false),
      (leaderboard) => state = state.copyWith(
        leaderboard: leaderboard,
        isLoading: false,
      ),
    );
  }

  /// Add XP for an action
  Future<void> awardXP(int amount) async {
    final oldLevel = state.level;

    // Optimistic update
    final newXP = state.totalXP + amount;
    state = state.copyWith(
      totalXP: newXP,
      level: LevelThresholds.getLevelForXP(newXP),
      levelProgress: LevelThresholds.getProgressToNextLevel(newXP),
    );

    final result = await _repository.addXP(amount);

    result.fold(
      (failure) {
        _init(); // Re-sync to be safe
      },
      (success) {
        if (state.level > oldLevel) {
          state = state.copyWith(showLevelUpCelebration: true);
        }
        // Refresh leaderboard as my score changed
        refreshLeaderboard();
      },
    );
  }

  void dismissCelebration() {
    state = state.copyWith(showLevelUpCelebration: false);
  }

  /// Unlock an achievement
  Future<void> unlockAchievement(String id) async {
    if (state.unlockedAchievementIds.contains(id)) return;

    final result = await _repository.unlockAchievement(id);
    result.fold(
      (failure) {},
      (_) {
        final newUnlocked = List<String>.from(state.unlockedAchievementIds)
          ..add(id);
        final newAll = state.allAchievements.map((a) {
          if (a.id == id) {
            // Assuming immutable entity, but if we had copyWith we'd use it.
            // For now we assume the backend handles state and we might wanna refresh or just assume it updates.
            return a;
          }
          return a;
        }).toList();

        state = state.copyWith(
            unlockedAchievementIds: newUnlocked, allAchievements: newAll);

        // Award XP for achievement? Usually handled by backend action, but here we might trigger celebration separately
      },
    );
  }
}

final gamificationProvider =
    NotifierProvider<GamificationNotifier, GamificationState>(() {
  return GamificationNotifier();
});
