import 'dart:async';
import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Focus session type
enum FocusSessionType {
  pomodoro, // 25 min work, 5 min break
  extended, // 45 min work, 10 min break
  marathon, // 90 min work, 15 min break
  custom,
}

/// Focus session model
class FocusSession {
  final String id;
  final DateTime startTime;
  final DateTime? endTime;
  final int targetMinutes;
  final int completedMinutes;
  final FocusSessionType type;
  final String? courseId;
  final bool wasCompleted;

  const FocusSession({
    required this.id,
    required this.startTime,
    this.endTime,
    required this.targetMinutes,
    this.completedMinutes = 0,
    required this.type,
    this.courseId,
    this.wasCompleted = false,
  });

  bool get isActive => endTime == null;

  double get progress {
    if (targetMinutes <= 0) {
      return 0;
    }
    return (completedMinutes / targetMinutes).clamp(0.0, 1.0);
  }

  FocusSession copyWith({
    DateTime? endTime,
    int? completedMinutes,
    bool? wasCompleted,
  }) {
    return FocusSession(
      id: id,
      startTime: startTime,
      endTime: endTime ?? this.endTime,
      targetMinutes: targetMinutes,
      completedMinutes: completedMinutes ?? this.completedMinutes,
      type: type,
      courseId: courseId,
      wasCompleted: wasCompleted ?? this.wasCompleted,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'startTime': startTime.toIso8601String(),
        'endTime': endTime?.toIso8601String(),
        'targetMinutes': targetMinutes,
        'completedMinutes': completedMinutes,
        'type': type.index,
        'courseId': courseId,
        'wasCompleted': wasCompleted,
      };

  factory FocusSession.fromJson(Map<String, dynamic> json) {
    return FocusSession(
      id: json['id'] as String,
      startTime: DateTime.parse(json['startTime'] as String),
      endTime: json['endTime'] != null
          ? DateTime.parse(json['endTime'] as String)
          : null,
      targetMinutes: json['targetMinutes'] as int,
      completedMinutes: json['completedMinutes'] as int? ?? 0,
      type: FocusSessionType.values[json['type'] as int? ?? 0],
      courseId: json['courseId'] as String?,
      wasCompleted: json['wasCompleted'] as bool? ?? false,
    );
  }
}

/// Focus mode state
class FocusModeState {
  final bool isActive;
  final FocusSession? currentSession;
  final int remainingSeconds;
  final bool isOnBreak;
  final int breakRemainingSeconds;
  final List<FocusSession> sessionHistory;
  final int totalFocusMinutesToday;
  final int dailyGoalMinutes;
  final int sessionsCompletedToday;

  const FocusModeState({
    this.isActive = false,
    this.currentSession,
    this.remainingSeconds = 0,
    this.isOnBreak = false,
    this.breakRemainingSeconds = 0,
    this.sessionHistory = const [],
    this.totalFocusMinutesToday = 0,
    this.dailyGoalMinutes = 120,
    this.sessionsCompletedToday = 0,
  });

  double get dailyProgress {
    if (dailyGoalMinutes <= 0) {
      return 0;
    }
    return (totalFocusMinutesToday / dailyGoalMinutes).clamp(0.0, 1.0);
  }

  String get formattedRemaining {
    final mins = remainingSeconds ~/ 60;
    final secs = remainingSeconds % 60;
    return '${mins.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
  }

  FocusModeState copyWith({
    bool? isActive,
    FocusSession? currentSession,
    int? remainingSeconds,
    bool? isOnBreak,
    int? breakRemainingSeconds,
    List<FocusSession>? sessionHistory,
    int? totalFocusMinutesToday,
    int? dailyGoalMinutes,
    int? sessionsCompletedToday,
    bool clearSession = false,
  }) {
    return FocusModeState(
      isActive: isActive ?? this.isActive,
      currentSession:
          clearSession ? null : (currentSession ?? this.currentSession),
      remainingSeconds: remainingSeconds ?? this.remainingSeconds,
      isOnBreak: isOnBreak ?? this.isOnBreak,
      breakRemainingSeconds:
          breakRemainingSeconds ?? this.breakRemainingSeconds,
      sessionHistory: sessionHistory ?? this.sessionHistory,
      totalFocusMinutesToday:
          totalFocusMinutesToday ?? this.totalFocusMinutesToday,
      dailyGoalMinutes: dailyGoalMinutes ?? this.dailyGoalMinutes,
      sessionsCompletedToday:
          sessionsCompletedToday ?? this.sessionsCompletedToday,
    );
  }

  Map<String, dynamic> toJson() => {
        'sessionHistory': sessionHistory.map((s) => s.toJson()).toList(),
        'totalFocusMinutesToday': totalFocusMinutesToday,
        'dailyGoalMinutes': dailyGoalMinutes,
        'sessionsCompletedToday': sessionsCompletedToday,
        'lastUpdatedDate': DateTime.now().toIso8601String(),
      };

  factory FocusModeState.fromJson(Map<String, dynamic> json) {
    // Reset daily stats if it's a new day
    final lastUpdated = json['lastUpdatedDate'] != null
        ? DateTime.parse(json['lastUpdatedDate'] as String)
        : null;
    final now = DateTime.now();
    final isNewDay = lastUpdated == null ||
        lastUpdated.day != now.day ||
        lastUpdated.month != now.month ||
        lastUpdated.year != now.year;

    return FocusModeState(
      sessionHistory: (json['sessionHistory'] as List?)
              ?.map((s) => FocusSession.fromJson(s as Map<String, dynamic>))
              .toList() ??
          [],
      totalFocusMinutesToday:
          isNewDay ? 0 : (json['totalFocusMinutesToday'] as int? ?? 0),
      dailyGoalMinutes: json['dailyGoalMinutes'] as int? ?? 120,
      sessionsCompletedToday:
          isNewDay ? 0 : (json['sessionsCompletedToday'] as int? ?? 0),
    );
  }
}

/// Focus mode notifier
class FocusModeNotifier extends StateNotifier<FocusModeState> {
  FocusModeNotifier() : super(const FocusModeState()) {
    _loadState();
  }

  static const String _stateKey = 'focus_mode_state';
  Timer? _timer;

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _loadState() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final stateJson = prefs.getString(_stateKey);

      if (stateJson != null) {
        final json = jsonDecode(stateJson) as Map<String, dynamic>;
        state = FocusModeState.fromJson(json);
      }
    } catch (e) {
      // Keep initial state
    }
  }

  Future<void> _saveState() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_stateKey, jsonEncode(state.toJson()));
    } catch (e) {
      // Handle silently
    }
  }

  /// Get duration for session type
  int _getDurationForType(FocusSessionType type) {
    switch (type) {
      case FocusSessionType.pomodoro:
        return 25;
      case FocusSessionType.extended:
        return 45;
      case FocusSessionType.marathon:
        return 90;
      case FocusSessionType.custom:
        return 30;
    }
  }

  /// Get break duration for session type
  int _getBreakDurationForType(FocusSessionType type) {
    switch (type) {
      case FocusSessionType.pomodoro:
        return 5;
      case FocusSessionType.extended:
        return 10;
      case FocusSessionType.marathon:
        return 15;
      case FocusSessionType.custom:
        return 5;
    }
  }

  /// Start a focus session
  void startSession({
    required FocusSessionType type,
    String? courseId,
    int? customMinutes,
  }) {
    _timer?.cancel();

    final targetMinutes =
        type == FocusSessionType.custom && customMinutes != null
            ? customMinutes
            : _getDurationForType(type);

    final session = FocusSession(
      id: 'focus_${DateTime.now().millisecondsSinceEpoch}',
      startTime: DateTime.now(),
      targetMinutes: targetMinutes,
      type: type,
      courseId: courseId,
    );

    state = state.copyWith(
      isActive: true,
      currentSession: session,
      remainingSeconds: targetMinutes * 60,
      isOnBreak: false,
    );

    _startTimer();
  }

  /// Start the countdown timer
  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (state.isOnBreak) {
        if (state.breakRemainingSeconds > 0) {
          state = state.copyWith(
            breakRemainingSeconds: state.breakRemainingSeconds - 1,
          );
        } else {
          _endBreak();
        }
      } else {
        if (state.remainingSeconds > 0) {
          state = state.copyWith(
            remainingSeconds: state.remainingSeconds - 1,
          );
        } else {
          _completeSession();
        }
      }
    });
  }

  /// Complete the current session
  Future<void> _completeSession() async {
    _timer?.cancel();

    if (state.currentSession == null) {
      return;
    }

    final completedSession = state.currentSession!.copyWith(
      endTime: DateTime.now(),
      completedMinutes: state.currentSession!.targetMinutes,
      wasCompleted: true,
    );

    // Start break
    final breakDuration = _getBreakDurationForType(state.currentSession!.type);

    state = state.copyWith(
      isOnBreak: true,
      breakRemainingSeconds: breakDuration * 60,
      sessionHistory: [completedSession, ...state.sessionHistory],
      totalFocusMinutesToday:
          state.totalFocusMinutesToday + completedSession.targetMinutes,
      sessionsCompletedToday: state.sessionsCompletedToday + 1,
    );

    await _saveState();
    _startTimer();
  }

  /// End break and return to idle
  void _endBreak() {
    _timer?.cancel();

    state = state.copyWith(
      isActive: false,
      isOnBreak: false,
      clearSession: true,
    );
  }

  /// Pause the session
  void pauseSession() {
    _timer?.cancel();
    state = state.copyWith(isActive: false);
  }

  /// Resume the session
  void resumeSession() {
    if (state.currentSession != null) {
      state = state.copyWith(isActive: true);
      _startTimer();
    }
  }

  /// Stop/cancel the session
  Future<void> stopSession() async {
    _timer?.cancel();

    if (state.currentSession != null) {
      final elapsedMinutes =
          (state.currentSession!.targetMinutes * 60 - state.remainingSeconds) ~/
              60;

      if (elapsedMinutes > 0) {
        final stoppedSession = state.currentSession!.copyWith(
          endTime: DateTime.now(),
          completedMinutes: elapsedMinutes,
          wasCompleted: false,
        );

        state = state.copyWith(
          sessionHistory: [stoppedSession, ...state.sessionHistory],
          totalFocusMinutesToday: state.totalFocusMinutesToday + elapsedMinutes,
        );
      }
    }

    state = state.copyWith(
      isActive: false,
      isOnBreak: false,
      clearSession: true,
      remainingSeconds: 0,
    );

    await _saveState();
  }

  /// Skip the break
  void skipBreak() {
    _timer?.cancel();
    _endBreak();
  }

  /// Set daily goal
  Future<void> setDailyGoal(int minutes) async {
    state = state.copyWith(dailyGoalMinutes: minutes);
    await _saveState();
  }

  /// Reset
  Future<void> reset() async {
    _timer?.cancel();
    state = const FocusModeState();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_stateKey);
  }
}

/// Focus mode provider
final focusModeProvider =
    StateNotifierProvider<FocusModeNotifier, FocusModeState>((ref) {
  return FocusModeNotifier();
});

/// Is focus mode active provider
final isFocusModeActiveProvider = Provider<bool>((ref) {
  return ref.watch(focusModeProvider).isActive;
});

/// Focus timer display provider
final focusTimerDisplayProvider = Provider<String>((ref) {
  return ref.watch(focusModeProvider).formattedRemaining;
});
