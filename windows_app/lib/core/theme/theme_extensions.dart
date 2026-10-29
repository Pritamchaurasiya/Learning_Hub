import 'package:flutter/material.dart';
import 'app_colors.dart';

/// Theme extensions for easier access to theme-aware colors
/// Use these instead of hardcoded Colors.white or other colors
extension ThemeExtensions on BuildContext {
  /// Is dark mode active
  bool get isDarkMode => Theme.of(this).brightness == Brightness.dark;

  /// Theme-aware card background
  Color get cardBackground => isDarkMode 
      ? AppColors.surfaceDark 
      : AppColors.surfaceLight;

  /// Theme-aware surface color
  Color get surfaceColor => isDarkMode 
      ? AppColors.surfaceDark 
      : AppColors.surfaceLight;

  /// Theme-aware surface variant
  Color get surfaceVariant => isDarkMode 
      ? AppColors.surfaceVariantDark 
      : AppColors.surfaceVariantLight;

  /// Theme-aware scaffold background
  Color get scaffoldBackground => isDarkMode 
      ? AppColors.backgroundDark 
      : AppColors.backgroundLight;

  /// Theme-aware primary text color
  Color get textPrimary => isDarkMode 
      ? AppColors.textPrimaryDark 
      : AppColors.textPrimaryLight;

  /// Theme-aware secondary text color
  Color get textSecondary => isDarkMode 
      ? AppColors.textSecondaryDark 
      : AppColors.textSecondaryLight;

  /// Theme-aware tertiary text color
  Color get textTertiary => isDarkMode 
      ? AppColors.textTertiaryDark 
      : AppColors.textTertiaryLight;

  /// Theme-aware border color
  Color get borderColor => isDarkMode 
      ? AppColors.borderDark 
      : AppColors.borderLight;

  /// Theme-aware divider color
  Color get dividerColor => isDarkMode 
      ? AppColors.dividerDark 
      : AppColors.dividerLight;

  /// Theme-aware inverse surface (opposite of current theme)
  /// Useful for elevated buttons, chips on colored backgrounds
  Color get inverseSurface => isDarkMode 
      ? AppColors.surfaceLight 
      : AppColors.surfaceDark;

  /// Theme-aware inverse text (opposite of current theme)
  Color get inverseText => isDarkMode 
      ? AppColors.textPrimaryLight 
      : AppColors.textPrimaryDark;

  /// Theme-aware primary color
  Color get primaryColor => isDarkMode 
      ? AppColors.primaryLight 
      : AppColors.primary;

  /// Theme-aware accent color
  Color get accentColor => isDarkMode 
      ? AppColors.accentLight 
      : AppColors.accent;

  /// Get theme-aware overlay color (for modals, dialogs)
  Color get overlayColor => isDarkMode 
      ? Colors.black.withValues(alpha: 0.7)
      : Colors.black.withValues(alpha: 0.5);

  /// Get theme-aware shimmer base color
  Color get shimmerBase => isDarkMode 
      ? const Color(0xFF22262C)
      : const Color(0xFFE0E0E0);

  /// Get theme-aware shimmer highlight color
  Color get shimmerHighlight => isDarkMode 
      ? const Color(0xFF2F343A)
      : const Color(0xFFF5F5F5);

  /// Theme-aware icon color
  Color get iconColor => Theme.of(this).iconTheme.color ?? textSecondary;

  /// Theme-aware disabled color
  Color get disabledColor => isDarkMode 
      ? AppColors.textTertiaryDark 
      : AppColors.textTertiaryLight;
}

/// Color extensions for theme-aware opacity
extension ColorExtensions on Color {
  /// Get lighter variant of color for dark mode backgrounds
  Color lighten([double amount = 0.1]) {
    assert(amount >= 0 && amount <= 1);
    final hsl = HSLColor.fromColor(this);
    final lightness = (hsl.lightness + amount).clamp(0.0, 1.0);
    return hsl.withLightness(lightness).toColor();
  }

  /// Get darker variant of color for light mode backgrounds
  Color darken([double amount = 0.1]) {
    assert(amount >= 0 && amount <= 1);
    final hsl = HSLColor.fromColor(this);
    final lightness = (hsl.lightness - amount).clamp(0.0, 1.0);
    return hsl.withLightness(lightness).toColor();
  }
}

/// Widget to create theme-aware containers
class ThemedContainer extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final BorderRadiusGeometry? borderRadius;
  final bool withBorder;
  final bool useSurfaceVariant;
  final List<BoxShadow>? shadows;

  const ThemedContainer({
    required this.child,
    this.padding,
    this.margin,
    this.borderRadius,
    this.withBorder = true,
    this.useSurfaceVariant = false,
    this.shadows,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    final backgroundColor = useSurfaceVariant 
        ? context.surfaceVariant 
        : context.surfaceColor;

    return Container(
      padding: padding,
      margin: margin,
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: borderRadius ?? BorderRadius.circular(16),
        border: withBorder 
            ? Border.all(color: context.borderColor) 
            : null,
        boxShadow: shadows,
      ),
      child: child,
    );
  }
}
