import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../core/theme/app_colors.dart';

/// Reusable error view widget with icon, message, and retry button
class ErrorView extends StatelessWidget {
  final String title;
  final String? subtitle;
  final IconData icon;
  final VoidCallback? onRetry;
  final String retryLabel;

  const ErrorView({
    super.key,
    this.title = 'Something went wrong',
    this.subtitle,
    this.icon = Icons.error_outline_rounded,
    this.onRetry,
    this.retryLabel = 'Try Again',
  });

  /// Factory for network-specific errors
  factory ErrorView.network({VoidCallback? onRetry}) {
    return ErrorView(
      title: 'Connection Error',
      subtitle: 'Please check your internet connection and try again.',
      icon: Icons.wifi_off_rounded,
      onRetry: onRetry,
    );
  }

  /// Factory for server errors
  factory ErrorView.server({VoidCallback? onRetry}) {
    return ErrorView(
      title: 'Server Error',
      subtitle: 'Our servers are having issues. Please try again later.',
      icon: Icons.cloud_off_rounded,
      onRetry: onRetry,
    );
  }

  /// Factory for permission errors
  factory ErrorView.permission({VoidCallback? onRetry}) {
    return ErrorView(
      title: 'Access Denied',
      subtitle: 'You don\'t have permission to view this content.',
      icon: Icons.lock_outline_rounded,
      onRetry: onRetry,
      retryLabel: 'Go Back',
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Error icon with animated background
            Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(
                color: (isDark ? AppColors.error : AppColors.error)
                    .withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                size: 44,
                color: AppColors.error.withValues(alpha: 0.8),
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

            if (onRetry != null) ...[
              const SizedBox(height: 32),
              FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh_rounded, size: 20),
                label: Text(retryLabel),
                style: FilledButton.styleFrom(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ).animate().fadeIn(delay: 300.ms, duration: 300.ms).slideY(
                    begin: 0.2,
                    end: 0,
                  ),
            ],
          ],
        ),
      ),
    );
  }
}
