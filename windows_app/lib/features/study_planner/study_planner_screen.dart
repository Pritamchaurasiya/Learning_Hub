import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:learning_hub/core/theme/app_colors.dart';
import 'package:learning_hub/core/providers/study_planner_provider.dart';

/// Study Planner screen for scheduling and goal management
class StudyPlannerScreen extends ConsumerStatefulWidget {
  const StudyPlannerScreen({super.key});

  @override
  ConsumerState<StudyPlannerScreen> createState() => _StudyPlannerScreenState();
}

class _StudyPlannerScreenState extends ConsumerState<StudyPlannerScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  int _selectedDay = DateTime.now().weekday;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final plannerState = ref.watch(studyPlannerProvider);

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: const Text('Study Planner'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => _showPlannerSettings(context),
            tooltip: 'Planner Settings',
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Schedule'),
            Tab(text: 'Goals'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _ScheduleTab(
            selectedDay: _selectedDay,
            onDaySelected: (day) => setState(() => _selectedDay = day),
            schedule: plannerState.getScheduleForDay(_selectedDay),
          ),
          _GoalsTab(
            goals: plannerState.goals,
            activeGoals: plannerState.activeGoals,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          if (_tabController.index == 0) {
            _showAddBlockDialog(context);
          } else {
            _showAddGoalDialog(context);
          }
        },
        icon: const Icon(Icons.add),
        label: Text(_tabController.index == 0 ? 'Add Session' : 'Add Goal'),
      ).animate().fadeIn(delay: 300.ms).scale(begin: const Offset(0.8, 0.8)),
    );
  }

  void _showPlannerSettings(BuildContext context) {
    final plannerState = ref.read(studyPlannerProvider);
    final notifier = ref.read(studyPlannerProvider.notifier);

    showModalBottomSheet<void>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setSheetState) => Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Planner Settings',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 24),
              SwitchListTile(
                title: const Text('Study Reminders'),
                subtitle: const Text('Get notified before study sessions'),
                value: plannerState.reminderEnabled,
                onChanged: (value) {
                  notifier.toggleReminders(value);
                  setSheetState(() {});
                },
              ),
              const SizedBox(height: 16),
              ListTile(
                title: const Text('Daily Target'),
                subtitle: Text('${plannerState.dailyTargetMinutes} minutes'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => _showTargetPicker(context, true),
              ),
              ListTile(
                title: const Text('Weekly Target'),
                subtitle: Text('${plannerState.weeklyTargetMinutes} minutes'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => _showTargetPicker(context, false),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showTargetPicker(BuildContext context, bool isDaily) {
    final notifier = ref.read(studyPlannerProvider.notifier);
    final state = ref.read(studyPlannerProvider);
    int currentValue =
        isDaily ? state.dailyTargetMinutes : state.weeklyTargetMinutes;

    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(isDaily ? 'Daily Target' : 'Weekly Target'),
        content: StatefulBuilder(
          builder: (context, setDialogState) => Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '$currentValue minutes',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 16),
              Slider(
                value: currentValue.toDouble(),
                min: isDaily ? 15 : 60,
                max: isDaily ? 180 : 840,
                divisions: isDaily ? 11 : 26,
                onChanged: (value) {
                  setDialogState(() => currentValue = value.round());
                },
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              if (isDaily) {
                notifier.setDailyTarget(currentValue);
              } else {
                notifier.setWeeklyTarget(currentValue);
              }
              Navigator.pop(context);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _showAddBlockDialog(BuildContext context) {
    final notifier = ref.read(studyPlannerProvider.notifier);
    TimeOfDay selectedTime = const TimeOfDay(hour: 9, minute: 0);
    int duration = 30;
    String courseName = 'Flutter Bootcamp';

    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Study Session'),
        content: StatefulBuilder(
          builder: (context, setDialogState) => Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                decoration: const InputDecoration(
                  labelText: 'Course Name',
                  hintText: 'Enter course name',
                ),
                onChanged: (value) => courseName = value,
                controller: TextEditingController(text: courseName),
              ),
              const SizedBox(height: 16),
              ListTile(
                title: const Text('Start Time'),
                trailing: Text(selectedTime.format(context)),
                onTap: () async {
                  final time = await showTimePicker(
                    context: context,
                    initialTime: selectedTime,
                  );
                  if (time != null) {
                    setDialogState(() => selectedTime = time);
                  }
                },
              ),
              ListTile(
                title: const Text('Duration'),
                trailing: Text('$duration min'),
                onTap: () {
                  setDialogState(() {
                    duration = duration == 30 ? 45 : (duration == 45 ? 60 : 30);
                  });
                },
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              notifier.addStudyBlock(StudyBlock(
                id: notifier.generateBlockId(),
                courseId: 'course_1',
                courseName: courseName,
                dayOfWeek: _selectedDay,
                startTime: selectedTime,
                durationMinutes: duration,
              ));
              Navigator.pop(context);
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  void _showAddGoalDialog(BuildContext context) {
    final notifier = ref.read(studyPlannerProvider.notifier);
    String title = '';
    int targetMinutes = 120;

    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Study Goal'),
        content: StatefulBuilder(
          builder: (context, setDialogState) => Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                decoration: const InputDecoration(
                  labelText: 'Goal Title',
                  hintText: 'e.g., Complete Chapter 5',
                ),
                onChanged: (value) => title = value,
              ),
              const SizedBox(height: 16),
              Text('Target: $targetMinutes minutes'),
              Slider(
                value: targetMinutes.toDouble(),
                min: 30,
                max: 480,
                divisions: 15,
                onChanged: (value) {
                  setDialogState(() => targetMinutes = value.round());
                },
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              if (title.isNotEmpty) {
                notifier.addGoal(StudyGoal(
                  id: notifier.generateGoalId(),
                  title: title,
                  type: GoalType.custom,
                  targetMinutes: targetMinutes,
                  createdAt: DateTime.now(),
                ));
              }
              Navigator.pop(context);
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }
}

/// Schedule tab with weekly view
class _ScheduleTab extends StatelessWidget {
  final int selectedDay;
  final ValueChanged<int> onDaySelected;
  final List<StudyBlock> schedule;

  const _ScheduleTab({
    required this.selectedDay,
    required this.onDaySelected,
    required this.schedule,
  });

  static const _dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final today = DateTime.now().weekday;

    return Column(
      children: [
        // Day selector
        Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: List.generate(7, (index) {
              final dayIndex = index + 1;
              final isSelected = dayIndex == selectedDay;
              final isToday = dayIndex == today;

              return GestureDetector(
                onTap: () => onDaySelected(dayIndex),
                child: Container(
                  width: 44,
                  height: 56,
                  decoration: BoxDecoration(
                    color: isSelected
                        ? AppColors.primary
                        : (isToday
                            ? AppColors.primary.withValues(alpha: 0.1)
                            : Colors.transparent),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        _dayNames[index],
                        style: TextStyle(
                          color: isSelected
                              ? Colors.white
                              : theme.colorScheme.onSurfaceVariant,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 4),
                      if (isToday && !isSelected)
                        Container(
                          width: 6,
                          height: 6,
                          decoration: const BoxDecoration(
                            color: AppColors.primary,
                            shape: BoxShape.circle,
                          ),
                        ),
                    ],
                  ),
                ),
              );
            }),
          ),
        ),

        const Divider(height: 1),

        // Schedule list
        Expanded(
          child: schedule.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.calendar_today_outlined,
                        size: 64,
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'No sessions scheduled',
                        style: theme.textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Tap + to add a study session',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: schedule.length,
                  itemBuilder: (context, index) {
                    final block = schedule[index];
                    return _StudyBlockCard(block: block)
                        .animate()
                        .fadeIn(duration: 400.ms, delay: (index * 50).ms)
                        .slideX(begin: 0.1, end: 0, curve: Curves.easeOut);
                  },
                ),
        ),
      ],
    );
  }
}

/// Study block card widget
class _StudyBlockCard extends ConsumerWidget {
  final StudyBlock block;

  const _StudyBlockCard({required this.block});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Icon(Icons.schedule, color: AppColors.primary),
        ),
        title: Text(
          block.courseName,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        subtitle: Text(
          '${block.startTime.format(context)} • ${block.durationMinutes} min',
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        trailing: Switch(
          value: block.isEnabled,
          onChanged: (_) {
            ref.read(studyPlannerProvider.notifier).toggleStudyBlock(block.id);
          },
        ),
      ),
    );
  }
}

/// Goals tab with progress tracking
class _GoalsTab extends StatelessWidget {
  final List<StudyGoal> goals;
  final List<StudyGoal> activeGoals;

  const _GoalsTab({
    required this.goals,
    required this.activeGoals,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (goals.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.flag_outlined,
              size: 64,
              color: theme.colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: 16),
            Text(
              'No goals yet',
              style: theme.textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              'Set study goals to stay motivated',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: goals.length,
      itemBuilder: (context, index) {
        final goal = goals[index];
        return _GoalCard(goal: goal)
            .animate()
            .fadeIn(duration: 400.ms, delay: (index * 50).ms)
            .slideX(begin: 0.1, end: 0, curve: Curves.easeOut);
      },
    );
  }
}

/// Goal card widget
class _GoalCard extends ConsumerWidget {
  final StudyGoal goal;

  const _GoalCard({required this.goal});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  goal.isCompleted ? Icons.check_circle : Icons.flag,
                  color:
                      goal.isCompleted ? AppColors.success : AppColors.primary,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    goal.title,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                      decoration:
                          goal.isCompleted ? TextDecoration.lineThrough : null,
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline, size: 20),
                  onPressed: () {
                    ref.read(studyPlannerProvider.notifier).removeGoal(goal.id);
                  },
                ),
              ],
            ),
            const SizedBox(height: 12),
            LinearProgressIndicator(
              value: goal.progress,
              backgroundColor: theme.colorScheme.surfaceContainerHighest,
              color: goal.isCompleted ? AppColors.success : AppColors.primary,
            ),
            const SizedBox(height: 8),
            Text(
              '${goal.completedMinutes}/${goal.targetMinutes} minutes',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
