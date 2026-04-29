import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

/// Reusable empty state widget with icon, title, subtitle, and optional action
class EmptyStateView extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;

  const EmptyStateView({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    this.actionLabel,
    this.onAction,
  });

  /// No bookmarks saved
  factory EmptyStateView.noBookmarks({VoidCallback? onAction}) {
    return EmptyStateView(
      icon: Icons.bookmark_outline_rounded,
      title: 'No Bookmarks Yet',
      subtitle: 'Save courses and lessons for quick access later.',
      actionLabel: 'Browse Courses',
      onAction: onAction,
    );
  }

  /// No courses found
  factory EmptyStateView.noCourses({VoidCallback? onAction}) {
    return EmptyStateView(
      icon: Icons.school_outlined,
      title: 'No Courses Found',
      subtitle: 'Explore our catalog and start your learning journey.',
      actionLabel: 'Explore',
      onAction: onAction,
    );
  }

  /// No notifications
  factory EmptyStateView.noNotifications() {
    return const EmptyStateView(
      icon: Icons.notifications_none_rounded,
      title: 'All Caught Up!',
      subtitle: 'You have no new notifications.',
    );
  }

  /// No search results
  factory EmptyStateView.noSearchResults() {
    return const EmptyStateView(
      icon: Icons.search_off_rounded,
      title: 'No Results Found',
      subtitle: 'Try adjusting your search or filters.',
    );
  }

  /// No downloads
  factory EmptyStateView.noDownloads({VoidCallback? onAction}) {
    return EmptyStateView(
      icon: Icons.download_for_offline_outlined,
      title: 'No Downloads',
      subtitle: 'Download courses to learn offline.',
      actionLabel: 'Browse Courses',
      onAction: onAction,
    );
  }

  /// No achievements yet
  factory EmptyStateView.noAchievements() {
    return const EmptyStateView(
      icon: Icons.emoji_events_outlined,
      title: 'No Achievements Yet',
      subtitle: 'Complete courses and challenges to earn badges!',
    );
  }

  /// No certificates earned
  factory EmptyStateView.noCertificates({VoidCallback? onAction}) {
    return EmptyStateView(
      icon: Icons.workspace_premium_outlined,
      title: 'No Certificates Yet',
      subtitle: 'Complete courses to earn your first certificate!',
      actionLabel: 'Browse Courses',
      onAction: onAction,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Icon with soft background
            Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(
                color:
                    theme.colorScheme.primaryContainer.withValues(alpha: 0.3),
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                size: 44,
                color: theme.colorScheme.primary.withValues(alpha: 0.7),
              ),
            ).animate().scale(
                  begin: const Offset(0.8, 0.8),
                  end: const Offset(1, 1),
                  duration: 400.ms,
                  curve: Curves.easeOutBack,
                ),

            const SizedBox(height: 24),

            // Title
            Text(
              title,
              textAlign: TextAlign.center,
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ).animate().fadeIn(delay: 100.ms, duration: 300.ms),

            if (subtitle != null) ...[
              const SizedBox(height: 8),
              Text(
                subtitle!,
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                  height: 1.4,
                ),
              ).animate().fadeIn(delay: 200.ms, duration: 300.ms),
            ],

            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 28),
              OutlinedButton.icon(
                onPressed: onAction,
                icon: const Icon(Icons.arrow_forward_rounded, size: 18),
                label: Text(actionLabel!),
                style: OutlinedButton.styleFrom(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ).animate().fadeIn(delay: 300.ms, duration: 300.ms),
            ],
          ],
        ),
      ),
    );
  }
}
