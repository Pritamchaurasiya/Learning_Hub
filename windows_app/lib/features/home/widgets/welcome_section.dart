import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:learning_hub/core/theme/app_colors.dart';
import 'package:learning_hub/core/providers/gamification_provider.dart';
import 'package:learning_hub/core/providers/analytics_provider.dart';
import 'package:learning_hub/core/services/certificate_service.dart';

class WelcomeSection extends ConsumerWidget {
  final String userName;

  const WelcomeSection({super.key, required this.userName});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final hour = DateTime.now().hour;
    final greeting = hour < 12
        ? 'Good Morning'
        : hour < 17
            ? 'Good Afternoon'
            : 'Good Evening';

    // Get real data from providers
    final gamification = ref.watch(gamificationProvider);
    final analytics = ref.watch(analyticsProvider);
    final certificateCount = ref.watch(certificateCountProvider);

    // Calculate this week's study time
    final weeklyMinutes =
        analytics.dailyStudyHours.fold<int>(0, (sum, h) => sum + h);
    final weeklyHours = (weeklyMinutes / 60).toStringAsFixed(1);

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$greeting, $userName! 👋',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ).animate().fadeIn(duration: 500.ms).slideX(begin: -0.1, end: 0),

          const SizedBox(height: 4),

          Text(
            "Let's continue your learning journey",
            style: theme.textTheme.bodyLarge?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ).animate().fadeIn(delay: 100.ms, duration: 400.ms),

          const SizedBox(height: 16),

          // Quick Stats Row with REAL data
          Row(
            children: [
              QuickStatChip(
                icon: Icons.local_fire_department,
                value: '${gamification.streak}',
                label: 'Day Streak',
                color: AppColors.accent,
              ),
              const SizedBox(width: 12),
              QuickStatChip(
                icon: Icons.timer_outlined,
                value: '${weeklyHours}h',
                label: 'This Week',
                color: AppColors.primary,
              ),
              const SizedBox(width: 12),
              QuickStatChip(
                icon: Icons.emoji_events_outlined,
                value: '$certificateCount',
                label: 'Certificates',
                color: AppColors.gold,
              ),
            ],
          ).animate().fadeIn(delay: 200.ms, duration: 400.ms),
        ],
      ),
    );
  }
}

class QuickStatChip extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;
  final Color color;

  const QuickStatChip({
    super.key,
    required this.icon,
    required this.value,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(width: 6),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: theme.textTheme.labelLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
              Text(
                label,
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
