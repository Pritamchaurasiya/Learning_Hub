import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../core/theme/app_colors.dart';

/// A GitHub-style activity heatmap to visualize learning streaks.
/// Displays the last 14 days of activity.
class ActivityHeatmap extends StatelessWidget {
  final Map<DateTime, int> activityData;
  final int maxIntensity;

  const ActivityHeatmap({
    super.key,
    required this.activityData,
    this.maxIntensity = 60, // Minutes to reach full color
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final now = DateTime.now();

    // Generate last 14 days
    final days = List.generate(14, (index) {
      return now.subtract(Duration(days: 13 - index));
    });

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Learning Streak',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            Row(
              children: [
                const Icon(Icons.local_fire_department,
                    color: AppColors.accent, size: 16),
                const SizedBox(width: 4),
                Text(
                  '${_calculateStreak(days)} Day Streak',
                  style: theme.textTheme.labelSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppColors.accent,
                  ),
                ),
              ],
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: days.map((date) {
            final minutes = _getMinutesForDate(date);
            final intensity = (minutes / maxIntensity).clamp(0.0, 1.0);

            return Tooltip(
              message: '${_formatDate(date)}: $minutes min',
              child: Container(
                width: 18,
                height: 18,
                decoration: BoxDecoration(
                  color: _getColorForIntensity(intensity, theme),
                  borderRadius: BorderRadius.circular(4),
                ),
              ).animate().scale(
                    delay: Duration(milliseconds: days.indexOf(date) * 50),
                    duration: 400.ms,
                    curve: Curves.easeOutBack,
                  ),
            );
          }).toList(),
        ),
      ],
    );
  }

  int _getMinutesForDate(DateTime date) {
    // Find matching entry in map by comparing date parts
    int total = 0;
    activityData.forEach((key, value) {
      if (key.year == date.year &&
          key.month == date.month &&
          key.day == date.day) {
        total += value;
      }
    });
    return total;
  }

  int _calculateStreak(List<DateTime> days) {
    int streak = 0;
    // Check backwards from today
    for (int i = days.length - 1; i >= 0; i--) {
      if (_getMinutesForDate(days[i]) > 0) {
        streak++;
      } else {
        // Allow missing today if it's early? No, strict streak for now.
        // Actually, if today is 0, check yesterday.
        if (i == days.length - 1 && _getMinutesForDate(days[i]) == 0) {
          continue;
        }
        break;
      }
    }
    return streak;
  }

  Color _getColorForIntensity(double intensity, ThemeData theme) {
    if (intensity == 0) return theme.colorScheme.surfaceContainerHighest;
    // Lerp from light green to deep green/primary
    return Color.lerp(
      AppColors.success.withValues(alpha: 0.3),
      AppColors.success,
      intensity,
    )!;
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}';
  }
}
