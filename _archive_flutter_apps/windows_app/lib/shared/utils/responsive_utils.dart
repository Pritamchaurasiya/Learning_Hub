import 'package:flutter/material.dart';

/// Responsive design utilities for adaptive layouts
///
/// Supports:
/// - Mobile (< 600px)
/// - Tablet (600px - 1024px)
/// - Desktop (> 1024px)
/// - Large Desktop (> 1440px)
class ResponsiveUtils {
  // Breakpoints
  static const double mobileBreakpoint = 600;
  static const double tabletBreakpoint = 1024;
  static const double desktopBreakpoint = 1440;

  /// Check if current device is mobile
  static bool isMobile(BuildContext context) {
    return MediaQuery.of(context).size.width < mobileBreakpoint;
  }

  /// Check if current device is tablet
  static bool isTablet(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    return width >= mobileBreakpoint && width < tabletBreakpoint;
  }

  /// Check if current device is desktop
  static bool isDesktop(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    return width >= tabletBreakpoint && width < desktopBreakpoint;
  }

  /// Check if current device is large desktop
  static bool isLargeDesktop(BuildContext context) {
    return MediaQuery.of(context).size.width >= desktopBreakpoint;
  }

  /// Get responsive value based on screen size
  static T responsiveValue<T>({
    required BuildContext context,
    required T mobile,
    T? tablet,
    T? desktop,
    T? largeDesktop,
  }) {
    final width = MediaQuery.of(context).size.width;

    if (width >= desktopBreakpoint && largeDesktop != null) {
      return largeDesktop;
    } else if (width >= tabletBreakpoint && desktop != null) {
      return desktop;
    } else if (width >= mobileBreakpoint && tablet != null) {
      return tablet;
    }
    return mobile;
  }

  /// Get responsive padding
  static EdgeInsets responsivePadding(BuildContext context) {
    return responsiveValue<EdgeInsets>(
      context: context,
      mobile: const EdgeInsets.all(16),
      tablet: const EdgeInsets.all(24),
      desktop: const EdgeInsets.symmetric(horizontal: 32, vertical: 24),
      largeDesktop: const EdgeInsets.symmetric(horizontal: 48, vertical: 32),
    );
  }

  /// Get responsive grid column count
  static int responsiveGridColumns(BuildContext context) {
    return responsiveValue<int>(
      context: context,
      mobile: 1,
      tablet: 2,
      desktop: 3,
      largeDesktop: 4,
    );
  }

  /// Get responsive font scale
  static double responsiveFontScale(BuildContext context) {
    return responsiveValue<double>(
      context: context,
      mobile: 1.0,
      tablet: 1.1,
      desktop: 1.2,
      largeDesktop: 1.3,
    );
  }

  /// Get responsive max content width
  static double maxContentWidth(BuildContext context) {
    return responsiveValue<double>(
      context: context,
      mobile: double.infinity,
      tablet: 800,
      desktop: 1200,
      largeDesktop: 1400,
    );
  }

  /// Get responsive sidebar width (for desktop layouts)
  static double sidebarWidth(BuildContext context) {
    return responsiveValue<double>(
      context: context,
      mobile: 0, // No sidebar on mobile
      tablet: 200,
      desktop: 250,
      largeDesktop: 280,
    );
  }

  /// Get responsive card width for grids
  static double cardWidth(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final padding = responsivePadding(context);
    final horizontalPadding = padding.horizontal;
    final columns = responsiveGridColumns(context);
    final spacing = 16.0 * (columns - 1);

    return (screenWidth - horizontalPadding - spacing) / columns;
  }
}

/// Responsive layout builder widget
class ResponsiveLayout extends StatelessWidget {
  final Widget mobile;
  final Widget? tablet;
  final Widget? desktop;
  final Widget? largeDesktop;

  const ResponsiveLayout({
    super.key,
    required this.mobile,
    this.tablet,
    this.desktop,
    this.largeDesktop,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth >= ResponsiveUtils.desktopBreakpoint &&
            largeDesktop != null) {
          return largeDesktop!;
        } else if (constraints.maxWidth >= ResponsiveUtils.tabletBreakpoint &&
            desktop != null) {
          return desktop!;
        } else if (constraints.maxWidth >= ResponsiveUtils.mobileBreakpoint &&
            tablet != null) {
          return tablet!;
        }
        return mobile;
      },
    );
  }
}

/// Responsive container with max width
class ResponsiveContainer extends StatelessWidget {
  final Widget child;
  final AlignmentGeometry alignment;
  final EdgeInsetsGeometry? padding;

  const ResponsiveContainer({
    super.key,
    required this.child,
    this.alignment = Alignment.topCenter,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: alignment,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: ResponsiveUtils.maxContentWidth(context),
        ),
        child: Padding(
          padding: padding ?? ResponsiveUtils.responsivePadding(context),
          child: child,
        ),
      ),
    );
  }
}

/// Responsive grid widget
class ResponsiveGrid extends StatelessWidget {
  final List<Widget> children;
  final double spacing;
  final double runSpacing;

  const ResponsiveGrid({
    super.key,
    required this.children,
    this.spacing = 16,
    this.runSpacing = 16,
  });

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: spacing,
      runSpacing: runSpacing,
      children: children.map((child) {
        final width = ResponsiveUtils.cardWidth(context);
        return SizedBox(
          width: width,
          child: child,
        );
      }).toList(),
    );
  }
}

/// Responsive text that scales with screen size
class ResponsiveText extends StatelessWidget {
  final String data;
  final TextStyle? style;
  final TextAlign? textAlign;
  final int? maxLines;
  final TextOverflow? overflow;

  const ResponsiveText(
    this.data, {
    super.key,
    this.style,
    this.textAlign,
    this.maxLines,
    this.overflow,
  });

  @override
  Widget build(BuildContext context) {
    final scale = ResponsiveUtils.responsiveFontScale(context);
    final baseStyle = style ?? Theme.of(context).textTheme.bodyMedium;

    return Text(
      data,
      style: baseStyle?.copyWith(
        fontSize: (baseStyle.fontSize ?? 14) * scale,
      ),
      textAlign: textAlign,
      maxLines: maxLines,
      overflow: overflow,
    );
  }
}

/// Visibility widget that shows/hides based on screen size
class ResponsiveVisibility extends StatelessWidget {
  final Widget child;
  final bool visibleOnMobile;
  final bool visibleOnTablet;
  final bool visibleOnDesktop;
  final bool visibleOnLargeDesktop;

  const ResponsiveVisibility({
    super.key,
    required this.child,
    this.visibleOnMobile = true,
    this.visibleOnTablet = true,
    this.visibleOnDesktop = true,
    this.visibleOnLargeDesktop = true,
  });

  @override
  Widget build(BuildContext context) {
    final isMobile = ResponsiveUtils.isMobile(context);
    final isTablet = ResponsiveUtils.isTablet(context);
    final isDesktop = ResponsiveUtils.isDesktop(context);
    final isLargeDesktop = ResponsiveUtils.isLargeDesktop(context);

    bool isVisible = false;
    if (isMobile && visibleOnMobile) isVisible = true;
    if (isTablet && visibleOnTablet) isVisible = true;
    if (isDesktop && visibleOnDesktop) isVisible = true;
    if (isLargeDesktop && visibleOnLargeDesktop) isVisible = true;

    return Visibility(
      visible: isVisible,
      child: child,
    );
  }
}
