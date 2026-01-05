import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/features/gamification/data/gamification_repository.dart';
import 'package:my_flutter_app/src/features/gamification/domain/gamification_models.dart';

class GamificationState {
  const GamificationState({
    this.xp,
    this.streak,
    this.badges = const [],
  });
  final UserXP? xp;
  final Streak? streak;
  final List<UserBadge> badges;
}

class GamificationController extends AsyncNotifier<GamificationState> {
  @override
  FutureOr<GamificationState> build() async {
    return _fetchStats();
  }

  Future<GamificationState> _fetchStats() async {
    final repository = ref.watch(gamificationRepositoryProvider);
    final response = await repository.getStats();
    final data = response.data?['data'] as Map<String, dynamic>;

    return GamificationState(
      xp: UserXP.fromJson(data['xp'] as Map<String, dynamic>),
      streak: Streak.fromJson(data['streak'] as Map<String, dynamic>),
      badges: (data['badges'] as List)
          .map((e) => UserBadge.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetchStats);
  }
}

final gamificationControllerProvider =
    AsyncNotifierProvider<GamificationController, GamificationState>(() {
  return GamificationController();
});

final leaderboardProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final repository = ref.watch(gamificationRepositoryProvider);
  final response = await repository.getLeaderboard();
  return List<Map<String, dynamic>>.from(response.data?['data'] as List);
});
