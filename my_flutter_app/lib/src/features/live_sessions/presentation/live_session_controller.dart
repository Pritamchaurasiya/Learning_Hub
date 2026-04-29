import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/features/live_sessions/data/live_session_repository.dart';

// State for the Game
enum GamePhase { lobby, question, leaderboard, ended }

class GameState {
  GameState({
    this.phase = GamePhase.lobby,
    this.currentQuestion,
    this.leaderboard = const [],
    this.score = 0,
  });
  final GamePhase phase;
  final Map<String, dynamic>? currentQuestion;
  final List<dynamic> leaderboard;
  final int score;

  GameState copyWith({
    GamePhase? phase,
    Map<String, dynamic>? currentQuestion,
    List<dynamic>? leaderboard,
    int? score,
  }) {
    return GameState(
      phase: phase ?? this.phase,
      currentQuestion: currentQuestion ?? this.currentQuestion,
      leaderboard: leaderboard ?? this.leaderboard,
      score: score ?? this.score,
    );
  }
}

// Controller
class LiveSessionController extends StateNotifier<GameState> {
  LiveSessionController(this._repo, String sessionId) : super(GameState()) {
    _repo.connect(sessionId);
    _subscription = _repo.events.listen(_handleEvent);
  }

  final LiveSessionRepository _repo;
  late final StreamSubscription<Map<String, dynamic>> _subscription;

  void _handleEvent(Map<String, dynamic> event) {
    debugPrint('Game Event: $event');
    final type = event['event'];
    final payload = event['payload'];

    if (type == 'new_question') {
      final questionData = payload is Map<String, dynamic> ? payload : null;
      state = state.copyWith(
        phase: GamePhase.question,
        currentQuestion: questionData,
      );
    } else if (type == 'show_leaderboard') {
      final payloadMap =
          payload is Map<String, dynamic> ? payload : <String, dynamic>{};
      final scores = (payloadMap['scores'] as List<dynamic>?) ?? <dynamic>[];
      state = state.copyWith(
        phase: GamePhase.leaderboard,
        leaderboard: scores,
      );
    }
  }

  void submitAnswer(String answer) {
    _repo.submitAnswer(answer);
  }

  @override
  void dispose() {
    _repo.disconnect();
    _subscription.cancel();
    super.dispose();
  }
}

final liveSessionControllerProvider = StateNotifierProvider.family
    .autoDispose<LiveSessionController, GameState, String>((ref, sessionId) {
  final repo = ref.watch(liveSessionRepositoryProvider);
  return LiveSessionController(repo, sessionId);
});
