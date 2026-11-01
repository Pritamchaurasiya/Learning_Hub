import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Study goal types
enum GoalType {
  daily,
  weekly,
  custom,
}

/// Study session block
class StudyBlock {
  final String id;
  final String courseId;
  final String courseName;
  final int dayOfWeek; // 1 = Monday, 7 = Sunday
  final TimeOfDay startTime;
  final int durationMinutes;
  final bool isEnabled;
  final bool hasReminder;

  const StudyBlock({
    required this.id,
    required this.courseId,
    required this.courseName,
    required this.dayOfWeek,
    required this.startTime,
    required this.durationMinutes,
    this.isEnabled = true,
    this.hasReminder = true,
  });

  StudyBlock copyWith({
    String? courseId,
    String? courseName,
    int? dayOfWeek,
    TimeOfDay? startTime,
    int? durationMinutes,
    bool? isEnabled,
    bool? hasReminder,
  }) {
    return StudyBlock(
      id: id,
      courseId: courseId ?? this.courseId,
      courseName: courseName ?? this.courseName,
      dayOfWeek: dayOfWeek ?? this.dayOfWeek,
      startTime: startTime ?? this.startTime,
      durationMinutes: durationMinutes ?? this.durationMinutes,
      isEnabled: isEnabled ?? this.isEnabled,
      hasReminder: hasReminder ?? this.hasReminder,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'courseId': courseId,
        'courseName': courseName,
        'dayOfWeek': dayOfWeek,
        'startTimeHour': startTime.hour,
        'startTimeMinute': startTime.minute,
        'durationMinutes': durationMinutes,
        'isEnabled': isEnabled,
        'hasReminder': hasReminder,
      };

  factory StudyBlock.fromJson(Map<String, dynamic> json) {
    return StudyBlock(
      id: json['id'] as String,
      courseId: json['courseId'] as String,
      courseName: json['courseName'] as String,
      dayOfWeek: json['dayOfWeek'] as int,
      startTime: TimeOfDay(
        hour: json['startTimeHour'] as int,
        minute: json['startTimeMinute'] as int,
      ),
      durationMinutes: json['durationMinutes'] as int,
      isEnabled: json['isEnabled'] as bool? ?? true,
      hasReminder: json['hasReminder'] as bool? ?? true,
    );
  }
}

/// Study goal with target and progress
class StudyGoal {
  final String id;
  final String title;
  final GoalType type;
  final int targetMinutes;
  final int completedMinutes;
  final DateTime createdAt;
  final DateTime? targetDate;
  final List<String> linkedCourseIds;

  const StudyGoal({
    required this.id,
    required this.title,
    required this.type,
    required this.targetMinutes,
    this.completedMinutes = 0,
    required this.createdAt,
    this.targetDate,
    this.linkedCourseIds = const [],
  });

  double get progress {
    if (targetMinutes <= 0) {
      return 0;
    }
    return (completedMinutes / targetMinutes).clamp(0.0, 1.0);
  }

  bool get isCompleted => completedMinutes >= targetMinutes;

  int get remainingMinutes =>
      (targetMinutes - completedMinutes).clamp(0, targetMinutes);

  StudyGoal copyWith({
    String? title,
    int? targetMinutes,
    int? completedMinutes,
    DateTime? targetDate,
    List<String>? linkedCourseIds,
  }) {
    return StudyGoal(
      id: id,
      title: title ?? this.title,
      type: type,
      targetMinutes: targetMinutes ?? this.targetMinutes,
      completedMinutes: completedMinutes ?? this.completedMinutes,
      createdAt: createdAt,
      targetDate: targetDate ?? this.targetDate,
      linkedCourseIds: linkedCourseIds ?? this.linkedCourseIds,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'type': type.index,
        'targetMinutes': targetMinutes,
        'completedMinutes': completedMinutes,
        'createdAt': createdAt.toIso8601String(),
        'targetDate': targetDate?.toIso8601String(),
        'linkedCourseIds': linkedCourseIds,
      };

  factory StudyGoal.fromJson(Map<String, dynamic> json) {
    return StudyGoal(
      id: json['id'] as String,
      title: json['title'] as String,
      type: GoalType.values[json['type'] as int],
      targetMinutes: json['targetMinutes'] as int,
      completedMinutes: json['completedMinutes'] as int? ?? 0,
      createdAt: DateTime.parse(json['createdAt'] as String),
      targetDate: json['targetDate'] != null
          ? DateTime.parse(json['targetDate'] as String)
          : null,
      linkedCourseIds: List<String>.from(
          (json['linkedCourseIds'] ?? <String>[]) as Iterable<dynamic>),
    );
  }
}

/// Study planner state
class StudyPlannerState {
  final List<StudyBlock> schedule;
  final List<StudyGoal> goals;
  final int dailyTargetMinutes;
  final int weeklyTargetMinutes;
  final bool reminderEnabled;
  final TimeOfDay defaultReminderTime;

  const StudyPlannerState({
    this.schedule = const [],
    this.goals = const [],
    this.dailyTargetMinutes = 30,
    this.weeklyTargetMinutes = 180,
    this.reminderEnabled = true,
    this.defaultReminderTime = const TimeOfDay(hour: 9, minute: 0),
  });

  /// Get schedule for a specific day
  List<StudyBlock> getScheduleForDay(int dayOfWeek) {
    return schedule
        .where((b) => b.dayOfWeek == dayOfWeek && b.isEnabled)
        .toList()
      ..sort((a, b) {
        final aMinutes = a.startTime.hour * 60 + a.startTime.minute;
        final bMinutes = b.startTime.hour * 60 + b.startTime.minute;
        return aMinutes.compareTo(bMinutes);
      });
  }

  /// Get active goals
  List<StudyGoal> get activeGoals =>
      goals.where((g) => !g.isCompleted).toList();

  /// Get completed goals
  List<StudyGoal> get completedGoals =>
      goals.where((g) => g.isCompleted).toList();

  /// Calculate today's scheduled minutes
  int get todayScheduledMinutes {
    final today = DateTime.now().weekday;
    return getScheduleForDay(today)
        .fold(0, (sum, block) => sum + block.durationMinutes);
  }

  StudyPlannerState copyWith({
    List<StudyBlock>? schedule,
    List<StudyGoal>? goals,
    int? dailyTargetMinutes,
    int? weeklyTargetMinutes,
    bool? reminderEnabled,
    TimeOfDay? defaultReminderTime,
  }) {
    return StudyPlannerState(
      schedule: schedule ?? this.schedule,
      goals: goals ?? this.goals,
      dailyTargetMinutes: dailyTargetMinutes ?? this.dailyTargetMinutes,
      weeklyTargetMinutes: weeklyTargetMinutes ?? this.weeklyTargetMinutes,
      reminderEnabled: reminderEnabled ?? this.reminderEnabled,
      defaultReminderTime: defaultReminderTime ?? this.defaultReminderTime,
    );
  }

  Map<String, dynamic> toJson() => {
        'schedule': schedule.map((s) => s.toJson()).toList(),
        'goals': goals.map((g) => g.toJson()).toList(),
        'dailyTargetMinutes': dailyTargetMinutes,
        'weeklyTargetMinutes': weeklyTargetMinutes,
        'reminderEnabled': reminderEnabled,
        'defaultReminderTimeHour': defaultReminderTime.hour,
        'defaultReminderTimeMinute': defaultReminderTime.minute,
      };

  factory StudyPlannerState.fromJson(Map<String, dynamic> json) {
    return StudyPlannerState(
      schedule: (json['schedule'] as List?)
              ?.map((s) => StudyBlock.fromJson(s as Map<String, dynamic>))
              .toList() ??
          [],
      goals: (json['goals'] as List?)
              ?.map((g) => StudyGoal.fromJson(g as Map<String, dynamic>))
              .toList() ??
          [],
      dailyTargetMinutes: json['dailyTargetMinutes'] as int? ?? 30,
      weeklyTargetMinutes: json['weeklyTargetMinutes'] as int? ?? 180,
      reminderEnabled: json['reminderEnabled'] as bool? ?? true,
      defaultReminderTime: TimeOfDay(
        hour: json['defaultReminderTimeHour'] as int? ?? 9,
        minute: json['defaultReminderTimeMinute'] as int? ?? 0,
      ),
    );
  }
}

/// Study planner notifier
class StudyPlannerNotifier extends StateNotifier<StudyPlannerState> {
  StudyPlannerNotifier() : super(const StudyPlannerState()) {
    _loadState();
  }

  static const String _stateKey = 'study_planner_state';

  Future<void> _loadState() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final stateJson = prefs.getString(_stateKey);

      if (stateJson != null) {
        final json = jsonDecode(stateJson) as Map<String, dynamic>;
        state = StudyPlannerState.fromJson(json);
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

  /// Add a study block to the schedule
  Future<void> addStudyBlock(StudyBlock block) async {
    state = state.copyWith(
      schedule: [...state.schedule, block],
    );
    await _saveState();
  }

  /// Update an existing study block
  Future<void> updateStudyBlock(StudyBlock block) async {
    final schedule = state.schedule.map((b) {
      return b.id == block.id ? block : b;
    }).toList();

    state = state.copyWith(schedule: schedule);
    await _saveState();
  }

  /// Remove a study block
  Future<void> removeStudyBlock(String blockId) async {
    state = state.copyWith(
      schedule: state.schedule.where((b) => b.id != blockId).toList(),
    );
    await _saveState();
  }

  /// Toggle study block enabled status
  Future<void> toggleStudyBlock(String blockId) async {
    final schedule = state.schedule.map((b) {
      if (b.id == blockId) {
        return b.copyWith(isEnabled: !b.isEnabled);
      }
      return b;
    }).toList();

    state = state.copyWith(schedule: schedule);
    await _saveState();
  }

  /// Add a study goal
  Future<void> addGoal(StudyGoal goal) async {
    state = state.copyWith(
      goals: [...state.goals, goal],
    );
    await _saveState();
  }

  /// Update goal progress
  Future<void> updateGoalProgress(String goalId, int addMinutes) async {
    final goals = state.goals.map((g) {
      if (g.id == goalId) {
        return g.copyWith(
          completedMinutes: g.completedMinutes + addMinutes,
        );
      }
      return g;
    }).toList();

    state = state.copyWith(goals: goals);
    await _saveState();
  }

  /// Remove a goal
  Future<void> removeGoal(String goalId) async {
    state = state.copyWith(
      goals: state.goals.where((g) => g.id != goalId).toList(),
    );
    await _saveState();
  }

  /// Set daily target
  Future<void> setDailyTarget(int minutes) async {
    state = state.copyWith(dailyTargetMinutes: minutes);
    await _saveState();
  }

  /// Set weekly target
  Future<void> setWeeklyTarget(int minutes) async {
    state = state.copyWith(weeklyTargetMinutes: minutes);
    await _saveState();
  }

  /// Toggle reminders
  Future<void> toggleReminders(bool enabled) async {
    state = state.copyWith(reminderEnabled: enabled);
    await _saveState();
  }

  /// Generate study block ID
  String generateBlockId() {
    return 'block_${DateTime.now().millisecondsSinceEpoch}';
  }

  /// Generate goal ID
  String generateGoalId() {
    return 'goal_${DateTime.now().millisecondsSinceEpoch}';
  }

  /// Reset planner
  Future<void> reset() async {
    state = const StudyPlannerState();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_stateKey);
  }
}

/// Study planner provider
final studyPlannerProvider =
    StateNotifierProvider<StudyPlannerNotifier, StudyPlannerState>((ref) {
  return StudyPlannerNotifier();
});

/// Today's schedule provider
final todayScheduleProvider = Provider<List<StudyBlock>>((ref) {
  final state = ref.watch(studyPlannerProvider);
  return state.getScheduleForDay(DateTime.now().weekday);
});

/// Active goals provider
final activeGoalsProvider = Provider<List<StudyGoal>>((ref) {
  return ref.watch(studyPlannerProvider).activeGoals;
});
