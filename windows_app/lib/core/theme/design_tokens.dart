import 'package:flutter/material.dart';

/// LearningHub Design System - Design Tokens
///
/// Centralized design tokens for consistent spacing, sizing, animation,
/// and responsive breakpoints across the entire application.
class DesignTokens {
  DesignTokens._();

  // ============================================================
  // SPACING SYSTEM (4px grid)
  // ============================================================

  static const double spaceXxs = 2;
  static const double spaceXs = 4;
  static const double spaceSm = 8;
  static const double spaceMd = 12;
  static const double spaceLg = 16;
  static const double spaceXl = 20;
  static const double spaceXxl = 24;
  static const double space3xl = 32;
  static const double space4xl = 40;
  static const double space5xl = 48;
  static const double space6xl = 64;
  static const double space7xl = 80;
  static const double space8xl = 96;

  // ============================================================
  // BORDER RADIUS SCALE
  // ============================================================

  static const double radiusXs = 4;
  static const double radiusSm = 8;
  static const double radiusMd = 12;
  static const double radiusLg = 16;
  static const double radiusXl = 20;
  static const double radiusXxl = 28;
  static const double radiusFull = 999;

  static const BorderRadius borderRadiusXs =
      BorderRadius.all(Radius.circular(radiusXs));
  static const BorderRadius borderRadiusSm =
      BorderRadius.all(Radius.circular(radiusSm));
  static const BorderRadius borderRadiusMd =
      BorderRadius.all(Radius.circular(radiusMd));
  static const BorderRadius borderRadiusLg =
      BorderRadius.all(Radius.circular(radiusLg));
  static const BorderRadius borderRadiusXl =
      BorderRadius.all(Radius.circular(radiusXl));
  static const BorderRadius borderRadiusXxl =
      BorderRadius.all(Radius.circular(radiusXxl));
  static const BorderRadius borderRadiusFull =
      BorderRadius.all(Radius.circular(radiusFull));

  // ============================================================
  // ANIMATION DURATIONS
  // ============================================================

  static const Duration durationFast = Duration(milliseconds: 150);
  static const Duration durationNormal = Duration(milliseconds: 300);
  static const Duration durationSlow = Duration(milliseconds: 500);
  static const Duration durationSluggish = Duration(milliseconds: 800);
  static const Duration durationPageTransition = Duration(milliseconds: 400);

  // ============================================================
  // ANIMATION CURVES
  // ============================================================

  static const Curve curveDefault = Curves.easeInOutCubicEmphasized;
  static const Curve curveSnappy = Curves.easeOutCubic;
  static const Curve curveBounce = Curves.elasticOut;
  static const Curve curveSmooth = Curves.easeInOut;

  // ============================================================
  // RESPONSIVE BREAKPOINTS
  // ============================================================

  static const double breakpointMobile = 600;
  static const double breakpointTablet = 840;
  static const double breakpointDesktop = 1024;
  static const double breakpointWide = 1440;

  /// Max content width for large screens
  static const double maxContentWidth = 1200;

  // ============================================================
  // ELEVATION / SHADOW SYSTEM
  // ============================================================

  static List<BoxShadow> shadowSm(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return [
      BoxShadow(
        color: isDark
            ? Colors.black.withValues(alpha: 0.3)
            : Colors.black.withValues(alpha: 0.06),
        blurRadius: 6,
        offset: const Offset(0, 2),
      ),
    ];
  }

  static List<BoxShadow> shadowMd(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return [
      BoxShadow(
        color: isDark
            ? Colors.black.withValues(alpha: 0.4)
            : Colors.black.withValues(alpha: 0.08),
        blurRadius: 12,
        offset: const Offset(0, 4),
      ),
    ];
  }

  static List<BoxShadow> shadowLg(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return [
      BoxShadow(
        color: isDark
            ? Colors.black.withValues(alpha: 0.5)
            : Colors.black.withValues(alpha: 0.1),
        blurRadius: 24,
        offset: const Offset(0, 8),
      ),
    ];
  }

  static List<BoxShadow> shadowXl(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return [
      BoxShadow(
        color: isDark
            ? Colors.black.withValues(alpha: 0.6)
            : Colors.black.withValues(alpha: 0.12),
        blurRadius: 40,
        offset: const Offset(0, 16),
      ),
    ];
  }

  // ============================================================
  // GLASSMORPHISM HELPERS
  // ============================================================

  /// Glassmorphism decoration for light mode
  static BoxDecoration glassDecorationLight({
    double opacity = 0.7,
    double blurRadius = 20,
    double borderRadius = 16,
  }) {
    return BoxDecoration(
      color: Colors.white.withValues(alpha: opacity),
      borderRadius: BorderRadius.circular(borderRadius),
      border: Border.all(
        color: Colors.white.withValues(alpha: 0.3),
        width: 1.5,
      ),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.05),
          blurRadius: blurRadius,
          offset: const Offset(0, 4),
        ),
      ],
    );
  }

  /// Glassmorphism decoration for dark mode
  static BoxDecoration glassDecorationDark({
    double opacity = 0.15,
    double blurRadius = 20,
    double borderRadius = 16,
  }) {
    return BoxDecoration(
      color: Colors.white.withValues(alpha: opacity),
      borderRadius: BorderRadius.circular(borderRadius),
      border: Border.all(
        color: Colors.white.withValues(alpha: 0.1),
        width: 1,
      ),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.2),
          blurRadius: blurRadius,
          offset: const Offset(0, 4),
        ),
      ],
    );
  }

  /// Get appropriate glass decoration based on theme brightness
  static BoxDecoration glassDecoration(BuildContext context, {
    double borderRadius = 16,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return isDark
        ? glassDecorationDark(borderRadius: borderRadius)
        : glassDecorationLight(borderRadius: borderRadius);
  }

  // ============================================================
  // CONTENT SIZING
  // ============================================================

  /// Standard card aspect ratio
  static const double cardAspectRatio = 16 / 9;

  /// Course card aspect ratio
  static const double courseCardAspectRatio = 3 / 2;

  /// Icon sizes
  static const double iconSm = 16;
  static const double iconMd = 20;
  static const double iconLg = 24;
  static const double iconXl = 32;
  static const double iconXxl = 48;

  /// Avatar sizes
  static const double avatarSm = 32;
  static const double avatarMd = 40;
  static const double avatarLg = 56;
  static const double avatarXl = 80;

  /// Touch target minimum (WCAG)
  static const double minTouchTarget = 48;
}
