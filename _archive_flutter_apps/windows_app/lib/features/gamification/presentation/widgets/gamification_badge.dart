import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:learning_hub/core/providers/gamification_provider.dart';
import 'package:learning_hub/core/theme/app_colors.dart';

class GamificationBadge extends ConsumerWidget {
  const GamificationBadge({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final gamificationState = ref.watch(gamificationProvider);
    final theme = Theme.of(context);

    return Container(
      margin: const EdgeInsets.only(right: 12),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: AppColors.primary.withValues(alpha: 0.2),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.bolt,
            color: Colors.amber[700],
            size: 16,
          ),
          const SizedBox(width: 4),
          Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Lvl ${gamificationState.level}',
                style: theme.textTheme.labelSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                  height: 1,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                '${gamificationState.totalXP} XP',
                style: theme.textTheme.labelSmall?.copyWith(
                  fontSize: 8,
                  color: theme.colorScheme.onSurfaceVariant,
                  height: 1,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
