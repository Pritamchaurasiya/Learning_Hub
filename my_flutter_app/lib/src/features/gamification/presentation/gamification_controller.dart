import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/features/auth/presentation/auth_controller.dart';
import 'package:my_flutter_app/src/features/gamification/data/gamification_repository.dart';
import 'package:my_flutter_app/src/features/gamification/data/social_websocket_service.dart';
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

  /// Creates an empty state for guests
  static const empty = GamificationState();
}

class GamificationController extends AsyncNotifier<GamificationState> {
  @override
  FutureOr<GamificationState> build() async {
    // Check if user is authenticated before fetching stats
    final authState = ref.watch(authControllerProvider);
    final user = authState.asData?.value;

    // Listen to real-time events
    _listenToSocialEvents();

    // Return empty state for guests - they don't have gamification data
    if (user == null || user.role == 'guest') {
      return GamificationState.empty;
    }

    return _fetchStats();
  }

  void _listenToSocialEvents() {
    // We watch the stream provider. If an event comes, we check type.
    ref.listen(socialEventsProvider, (prev, next) {
      next.whenData((data) {
        if (data['type'] == 'level_up') {
          debugPrint('Level Up Event Received! Refreshing stats...');
          ref.invalidateSelf(); // Triggers reload of stats
        }
      });
    });
  }

  Future<GamificationState> _fetchStats() async {
    final repository = ref.watch(gamificationRepositoryProvider);

    try {
      final response = await repository.getStats();
      final responseData = response.data;

      // Safely extract the nested data object
      Map<String, dynamic> data;
      if (responseData is Map<String, dynamic>) {
        final innerData = responseData['data'];
        data =
            innerData is Map<String, dynamic> ? innerData : <String, dynamic>{};
      } else {
        data = <String, dynamic>{};
      }

      // Safely parse each section with null fallbacks
      final xpData = data['xp'];
      final streakData = data['streak'];
      final badgesData = data['badges'];

      return GamificationState(
        xp: xpData is Map<String, dynamic>
            ? UserXP.fromJson(xpData)
            : UserXP.empty,
        streak: streakData is Map<String, dynamic>
            ? Streak.fromJson(streakData)
            : Streak.empty,
        badges: badgesData is List
            ? badgesData
                .whereType<Map<String, dynamic>>()
                .map(UserBadge.fromJson)
                .toList()
            : <UserBadge>[],
      );
    } on Exception catch (e) {
      debugPrint('Error fetching gamification stats: $e');
      // Return empty state on error instead of crashing
      return GamificationState.empty;
    }
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

/// Real-time Leaderboard Controller
class LeaderboardController extends AsyncNotifier<List<Map<String, dynamic>>> {
  @override
  FutureOr<List<Map<String, dynamic>>> build() {
    _listenToUpdates();
    return _fetchLeaderboard();
  }

  void _listenToUpdates() {
    ref.listen(socialEventsProvider, (prev, next) {
      next.whenData((message) {
        if (message['type'] == 'leaderboard_update') {
          final data = message['data'];
          if (data is Map<String, dynamic>) {
            _handleUpdate(data);
          }
        }
      });
    });
  }

  void _handleUpdate(Map<String, dynamic> updateData) {
    final currentList = state.valueOrNull;
    if (currentList == null) {
      return;
    }

    final newList = List<Map<String, dynamic>>.from(currentList);
    final updatedUser =
        updateData['user'] as Map<String, dynamic>? ?? <String, dynamic>{};
    final newScore = (updateData['score'] as num?)?.toInt() ?? 0;

    // Check if user is already in leaderboard
    final index =
        newList.indexWhere((u) => u['username'] == updatedUser['username']);

    if (index != -1) {
      // Update existing
      newList[index] = {
        ...newList[index],
        'total_xp': newScore,
        'level': updateData['level']
      };
    } else {
      // New contender?
      // Only add if score is high enough to be in list or list is small
      final lastXp = (newList.isNotEmpty
              ? (newList.last['total_xp'] as num?)?.toInt()
              : 0) ??
          0;
      if (newList.length < 20 || newScore > lastXp) {
        newList.add({
          'rank': 0, // calc later
          'username': updatedUser['username'],
          'display_name': updatedUser['display_name'],
          'level': updateData['level'],
          'total_xp': newScore,
        });
      }
    }

    // Sort descending by XP
    newList
        .sort((a, b) => (b['total_xp'] as int).compareTo(a['total_xp'] as int));

    // Re-rank
    for (var i = 0; i < newList.length; i++) {
      newList[i]['rank'] = i + 1;
    }

    // Limit to top 20
    if (newList.length > 20) {
      newList.length = 20;
    }

    // Update State
    state = AsyncData(newList);
    debugPrint(
        'Leaderboard updated in real-time for ${updatedUser['username']}');
  }

  Future<List<Map<String, dynamic>>> _fetchLeaderboard() async {
    // Mock data fallback
    final mockData = <Map<String, dynamic>>[
      {
        'rank': 1,
        'username': 'FlutterMaster',
        'display_name': 'Flutter Master',
        'level': 15,
        'total_xp': 2500,
      },
      {
        'rank': 2,
        'username': 'DartNinja',
        'display_name': 'Dart Ninja',
        'level': 12,
        'total_xp': 2100,
      },
      {
        'rank': 3,
        'username': 'CodeWizard',
        'display_name': 'Code Wizard',
        'level': 10,
        'total_xp': 1850,
      },
      {
        'rank': 4,
        'username': 'AlgoExpert',
        'display_name': 'Algo Expert',
        'level': 9,
        'total_xp': 1600,
      },
      {
        'rank': 5,
        'username': 'PyPro',
        'display_name': 'Python Pro',
        'level': 8,
        'total_xp': 1400,
      },
    ];

    try {
      final repository = ref.read(gamificationRepositoryProvider);
      final response = await repository.getLeaderboard();
      final responseData = response.data;

      if (responseData is Map<String, dynamic>) {
        final data = responseData['data'];
        if (data is List) {
          return data.whereType<Map<String, dynamic>>().toList();
        }
      }
      return mockData;
    } on Exception catch (e, st) {
      debugPrint('Leaderboard fetch failed: $e\n$st');
      return mockData;
    }
  }
}

final leaderboardProvider =
    AsyncNotifierProvider<LeaderboardController, List<Map<String, dynamic>>>(
        LeaderboardController.new);
