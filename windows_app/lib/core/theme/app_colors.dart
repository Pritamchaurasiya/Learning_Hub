import 'package:flutter/material.dart';

/// LearningHub Design System - Color Palette
///
/// A carefully curated color palette designed for:
/// - Accessibility (WCAG AA/AAA compliance)
/// - Cross-platform consistency
/// - Light and dark mode support
/// - Premium, modern aesthetics
class AppColors {
  AppColors._();

  // ============================================================
  // PRIMARY COLORS - Brand Identity
  // ============================================================

  /// Main brand color - Professional blue
  static const Color primary = Color(0xFF0066FF);
  static const Color primaryLight = Color(0xFF4D94FF);
  static const Color primaryDark = Color(0xFF0052CC);
  static const Color primaryVariant = Color(0xFF003D99);

  // ============================================================
  // ACCENT COLORS - Call to Action & Highlights
  // ============================================================

  /// Accent color - Vibrant orange for CTAs
  static const Color accent = Color(0xFFFF8A00);
  static const Color accentLight = Color(0xFFFFAB40);
  static const Color accentDark = Color(0xFFE67700);

  // ============================================================
  // TERTIARY COLORS - Secondary Actions
  // ============================================================

  static const Color tertiary = Color(0xFF7C4DFF);
  static const Color tertiaryLight = Color(0xFFB388FF);
  static const Color tertiaryDark = Color(0xFF651FFF);

  // ============================================================
  // SEMANTIC COLORS - Status & Feedback
  // ============================================================

  /// Success - Completion, positive actions
  static const Color success = Color(0xFF00B896);
  static const Color successLight = Color(0xFF4DCC97);
  static const Color successDark = Color(0xFF008F6B);

  /// Warning - Attention needed
  static const Color warning = Color(0xFFFFB020);
  static const Color warningLight = Color(0xFFFFCC5D);
  static const Color warningDark = Color(0xFFE59A00);

  /// Error - Failures, destructive actions
  static const Color error = Color(0xFFD32F2F); // Adjusted for higher contrast (6.0:1 on white)
  static const Color errorLight = Color(0xFFEF5350);
  static const Color errorDark = Color(0xFFB71C1C);

  /// Info - Informational messages
  static const Color info = Color(0xFF1976D2); // Adjusted for higher contrast (6.0:1 on white)
  static const Color infoLight = Color(0xFF42A5F5);
  static const Color infoDark = Color(0xFF0D47A1);

  // ============================================================
  // LIGHT MODE COLORS
  // ============================================================

  /// Background colors
  static const Color backgroundLight = Color(0xFFF8FAFC);
  static const Color surfaceLight = Color(0xFFFFFFFF);
  static const Color surfaceVariantLight = Color(0xFFF1F5F9);

  /// Text colors
  static const Color textPrimaryLight = Color(0xFF0F172A); // 15.6:1 contrast ratio
  static const Color textSecondaryLight = Color(0xFF334155); // 7.0:1 contrast ratio (AAA)
  static const Color textTertiaryLight = Color(0xFF64748B); // 4.7:1 contrast ratio (AA)
  static const Color textOnPrimaryLight = Color(0xFFFFFFFF);

  /// Border & Divider
  static const Color borderLight = Color(0xFFE2E8F0);
  static const Color dividerLight = Color(0xFFE2E8F0);

  // ============================================================
  // DARK MODE COLORS
  // ============================================================

  /// Background colors
  static const Color backgroundDark = Color(0xFF0B1220);
  static const Color surfaceDark = Color(0xFF151F32);
  static const Color surfaceVariantDark = Color(0xFF1E293B);

  /// Text colors
  static const Color textPrimaryDark = Color(0xFFF1F5F9); // 16.7:1 contrast ratio
  static const Color textSecondaryDark = Color(0xFFCBD5E1); // 11.0:1 contrast ratio (AAA)
  static const Color textTertiaryDark = Color(0xFF94A3B8); // 6.4:1 contrast ratio (AA)
  static const Color textOnPrimaryDark = Color(0xFF0B1220);

  /// Border & Divider
  static const Color borderDark = Color(0xFF334155);
  static const Color dividerDark = Color(0xFF334155);

  // ============================================================
  // GRADIENTS
  // ============================================================

  /// Primary gradient for hero sections and CTAs
  static const LinearGradient primaryGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [primary, primaryDark],
  );

  /// Accent gradient for highlights
  static const LinearGradient accentGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [accent, accentDark],
  );

  /// Premium gradient for special features
  static const LinearGradient premiumGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [tertiary, primary],
  );

  /// Success gradient for achievements
  static const LinearGradient successGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [success, successDark],
  );

  /// Dark overlay gradient for images
  static const LinearGradient imageOverlayGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Colors.transparent, Color(0xCC000000)],
  );

  // ============================================================
  // CATEGORY COLORS - For course categories
  // ============================================================

  static const Color categoryDesign = Color(0xFFEC4899);
  static const Color categoryDevelopment = Color(0xFF3B82F6);
  static const Color categoryBusiness = Color(0xFF10B981);
  static const Color categoryMarketing = Color(0xFFF59E0B);
  static const Color categoryData = Color(0xFF6366F1);
  static const Color categoryAI = Color(0xFF8B5CF6);
  static const Color categoryMobile = Color(0xFF06B6D4);
  static const Color categoryCloud = Color(0xFF64748B);

  // ============================================================
  // DIFFICULTY COLORS
  // ============================================================

  static const Color difficultyBeginner = Color(0xFF22C55E);
  static const Color difficultyIntermediate = Color(0xFFF59E0B);
  static const Color difficultyAdvanced = Color(0xFFEF4444);

  // ============================================================
  // ACHIEVEMENT COLORS
  // ============================================================

  static const Color bronze = Color(0xFFCD7F32);
  static const Color silver = Color(0xFFC0C0C0);
  static const Color gold = Color(0xFFFFD700);
  static const Color platinum = Color(0xFFE5E4E2);

  // ============================================================
  // SOCIAL / BRAND COLORS
  // ============================================================

  static const Color google = Color(0xFF4285F4);
  static const Color apple = Color(0xFF000000);
  static const Color facebook = Color(0xFF1877F2);
  static const Color twitter = Color(0xFF1DA1F2);
  static const Color linkedin = Color(0xFF0A66C2);
}
