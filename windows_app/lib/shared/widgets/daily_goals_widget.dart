import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:percent_indicator/circular_percent_indicator.dart';
import 'package:learning_hub/core/theme/app_colors.dart';
import 'package:learning_hub/core/providers/gamification_provider.dart';
import 'package:learning_hub/core/providers/analytics_provider.dart';

/// Daily Learning Goals Widget
///
/// Displays configurable daily study goals with:
/// - Circular progress indicator
/// - Time remaining / completed
/// - Streak encouragement
/// - Celebration animation when complete
class DailyGoalsWidget extends ConsumerWidget {
  /// Target daily study time in minutes
  final int targetMinutes;

  const DailyGoalsWidget({
    super.key,
    this.targetMinutes = 30,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final gamification = ref.watch(gamificationProvider);
    final analytics = ref.watch(analyticsProvider);

    // Calculate today's study time
    final todayHours = analytics.dailyStudyHours.isNotEmpty
        ? analytics.dailyStudyHours.last
        : 0;
    final todayMinutes = todayHours * 60;
    final progress = (todayMinutes / targetMinutes).clamp(0.0, 1.0);
    final isComplete = progress >= 1.0;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            // Circular Progress
            CircularPercentIndicator(
              radius: 50,
              lineWidth: 8,
              percent: progress,
              center: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (isComplete)
                    const Icon(
                      Icons.check_circle,
                      color: AppColors.success,
                      size: 28,
                    ).animate().scale(
                          duration: 300.ms,
                          curve: Curves.elasticOut,
                        )
                  else
                    Text(
                      '${todayMinutes.toInt()}',
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                  if (!isComplete)
                    Text(
                      'min',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                ],
              ),
              progressColor: isComplete ? AppColors.success : AppColors.primary,
              backgroundColor: theme.colorScheme.surfaceContainerHighest,
              circularStrokeCap: CircularStrokeCap.round,
              animation: true,
              animationDuration: 800,
            ),

            const SizedBox(width: 20),

            // Goal Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isComplete ? '🎉 Goal Complete!' : 'Daily Goal',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: isComplete ? AppColors.success : null,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    isComplete
                        ? 'Great work! You\'ve hit your goal today.'
                        : '${targetMinutes - todayMinutes.toInt()} min left to reach your $targetMinutes min goal',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(
                        Icons.local_fire_department,
                        size: 16,
                        color: AppColors.accent,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${gamification.streak} day streak',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: AppColors.accent,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.1, end: 0);
  }
}

/// Compact version for home screen
class DailyGoalsBadge extends ConsumerWidget {
  final int targetMinutes;

  const DailyGoalsBadge({
    super.key,
    this.targetMinutes = 30,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final analytics = ref.watch(analyticsProvider);

    final todayHours = analytics.dailyStudyHours.isNotEmpty
        ? analytics.dailyStudyHours.last
        : 0;
    final todayMinutes = todayHours * 60;
    final progress = (todayMinutes / targetMinutes).clamp(0.0, 1.0);
    final isComplete = progress >= 1.0;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: (isComplete ? AppColors.success : AppColors.primary)
            .withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: (isComplete ? AppColors.success : AppColors.primary)
              .withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircularPercentIndicator(
            radius: 14,
            lineWidth: 3,
            percent: progress,
            center: isComplete
                ? const Icon(Icons.check, size: 12, color: AppColors.success)
                : null,
            progressColor: isComplete ? AppColors.success : AppColors.primary,
            backgroundColor: theme.colorScheme.surfaceContainerHighest,
            circularStrokeCap: CircularStrokeCap.round,
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                isComplete
                    ? 'Goal Met!'
                    : '${todayMinutes.toInt()}/$targetMinutes min',
                style: theme.textTheme.labelMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: isComplete ? AppColors.success : AppColors.primary,
                ),
              ),
              Text(
                'Daily Goal',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                  fontSize: 9,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
