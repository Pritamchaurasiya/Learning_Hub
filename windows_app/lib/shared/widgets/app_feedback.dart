import 'package:flutter/material.dart';

/// Standardized UI Feedback System
/// Provides consistent toast/snackbar patterns across the entire app.
///
/// Usage:
/// ```dart
/// AppFeedback.showSuccess(context, 'Course enrolled!');
/// AppFeedback.showError(context, 'Network error');
/// AppFeedback.showInfo(context, 'Refreshing...');
/// AppFeedback.showXpGain(context, 50, 'Quiz Completed');
/// ```
class AppFeedback {
  AppFeedback._(); // Private constructor, all methods are static

  /// Success feedback with checkmark icon
  static void showSuccess(BuildContext context, String message,
      {Duration? duration, String? action, VoidCallback? onAction}) {
    _show(
      context,
      message: message,
      icon: Icons.check_circle_rounded,
      backgroundColor: const Color(0xFF1DB954),
      duration: duration ?? const Duration(seconds: 3),
      actionLabel: action,
      onAction: onAction,
    );
  }

  /// Error feedback with error icon
  static void showError(BuildContext context, String message,
      {Duration? duration, String? action, VoidCallback? onAction}) {
    _show(
      context,
      message: message,
      icon: Icons.error_outline_rounded,
      backgroundColor: const Color(0xFFE53935),
      duration: duration ?? const Duration(seconds: 4),
      actionLabel: action,
      onAction: onAction,
    );
  }

  /// Info feedback with info icon
  static void showInfo(BuildContext context, String message,
      {Duration? duration}) {
    _show(
      context,
      message: message,
      icon: Icons.info_outline_rounded,
      backgroundColor: const Color(0xFF2196F3),
      duration: duration ?? const Duration(seconds: 3),
    );
  }

  /// Warning feedback
  static void showWarning(BuildContext context, String message,
      {Duration? duration}) {
    _show(
      context,
      message: message,
      icon: Icons.warning_amber_rounded,
      backgroundColor: const Color(0xFFFFA726),
      duration: duration ?? const Duration(seconds: 4),
    );
  }

  /// XP Gain celebration toast with animated icon
  static void showXpGain(BuildContext context, int xpAmount, String reason) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFFFD700), Color(0xFFFFA500)],
                ),
                borderRadius: BorderRadius.circular(8),
              ),
              child:
                  const Icon(Icons.star_rounded, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '+$xpAmount XP',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      color: Color(0xFFFFD700),
                    ),
                  ),
                  Text(
                    reason,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.white.withAlpha(179),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        backgroundColor: const Color(0xFF1A1A2E),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: Color(0xFFFFD700), width: 0.5),
        ),
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        duration: const Duration(seconds: 3),
        elevation: 8,
      ),
    );
  }

  /// Achievement unlocked notification
  static void showAchievement(
      BuildContext context, String title, String description) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF7C4DFF), Color(0xFF448AFF)],
                ),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.emoji_events_rounded,
                  color: Colors.white, size: 24),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    '🏆 Achievement Unlocked!',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    title,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                      color: Color(0xFFBB86FC),
                    ),
                  ),
                  Text(
                    description,
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.white.withAlpha(153),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        backgroundColor: const Color(0xFF1A1A2E),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: Color(0xFF7C4DFF), width: 0.5),
        ),
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        duration: const Duration(seconds: 5),
        elevation: 10,
      ),
    );
  }

  /// Loading indicator overlay
  static void showLoading(BuildContext context, String message) {
    _show(
      context,
      message: message,
      icon: null,
      backgroundColor: const Color(0xFF37474F),
      duration: const Duration(seconds: 30),
      showProgress: true,
    );
  }

  /// Dismiss current feedback
  static void dismiss(BuildContext context) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
  }

  /// Internal snackbar builder
  static void _show(
    BuildContext context, {
    required String message,
    required IconData? icon,
    required Color backgroundColor,
    required Duration duration,
    String? actionLabel,
    VoidCallback? onAction,
    bool showProgress = false,
  }) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            if (showProgress)
              const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              )
            else if (icon != null)
              Icon(icon, color: Colors.white, size: 20),
            if (icon != null || showProgress) const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
        backgroundColor: backgroundColor,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        duration: duration,
        elevation: 6,
        action: actionLabel != null
            ? SnackBarAction(
                label: actionLabel,
                textColor: Colors.white,
                onPressed: onAction ?? () {},
              )
            : null,
      ),
    );
  }
}
