import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';

/// Accessibility utilities for Learning Hub
///
/// Provides helpers for semantic labels, focus traversal,
/// and high contrast detection.
class AppAccessibility {
  AppAccessibility._();

  /// Check if the user has enabled high contrast mode
  static bool isHighContrast(BuildContext context) {
    return MediaQuery.of(context).highContrast;
  }

  /// Check if the user prefers reduced motion
  static bool prefersReducedMotion(BuildContext context) {
    return MediaQuery.of(context).disableAnimations;
  }

  /// Get the animation duration respecting user preferences
  /// Returns Duration.zero if user prefers reduced motion
  static Duration animationDuration(
    BuildContext context, {
    Duration normal = const Duration(milliseconds: 300),
  }) {
    return prefersReducedMotion(context) ? Duration.zero : normal;
  }

  /// Get appropriate text scale factor clamped to reasonable bounds
  static double textScaleFactor(BuildContext context) {
    final factor = MediaQuery.textScalerOf(context).scale(1.0);
    return factor.clamp(0.8, 2.0);
  }

  /// Check if screen reader is active
  static bool isScreenReaderActive(BuildContext context) {
    return MediaQuery.of(context).accessibleNavigation;
  }
}

/// A wrapper widget that adds semantic labels for screen readers
class SemanticLabel extends StatelessWidget {
  final String label;
  final Widget child;
  final bool isButton;
  final bool isHeader;
  final bool isImage;
  final String? hint;
  final VoidCallback? onTap;

  const SemanticLabel({
    super.key,
    required this.label,
    required this.child,
    this.isButton = false,
    this.isHeader = false,
    this.isImage = false,
    this.hint,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: label,
      hint: hint,
      button: isButton,
      header: isHeader,
      image: isImage,
      onTap: onTap,
      child: child,
    );
  }
}

/// Focus traversal group for keyboard navigation
class FocusGroup extends StatelessWidget {
  final Widget child;
  final FocusTraversalPolicy? policy;

  const FocusGroup({
    super.key,
    required this.child,
    this.policy,
  });

  @override
  Widget build(BuildContext context) {
    return FocusTraversalGroup(
      policy: policy ?? OrderedTraversalPolicy(),
      child: child,
    );
  }
}

/// Announce a message to screen readers
void announceToScreenReader(String message) {
  // ignore: deprecated_member_use
  SemanticsService.announce(message, TextDirection.ltr);
}
