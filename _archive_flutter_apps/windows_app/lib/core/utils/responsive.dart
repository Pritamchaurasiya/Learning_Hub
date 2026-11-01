import 'package:flutter/material.dart';

/// Responsive breakpoints for adaptive layouts
class Responsive {
  Responsive._();

  // Breakpoints
  static const double mobileBreakpoint = 600;
  static const double tabletBreakpoint = 1024;
  static const double desktopBreakpoint = 1440;

  /// Check if the screen is mobile-sized
  static bool isMobile(BuildContext context) =>
      MediaQuery.sizeOf(context).width < mobileBreakpoint;

  /// Check if the screen is tablet-sized
  static bool isTablet(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    return width >= mobileBreakpoint && width < tabletBreakpoint;
  }

  /// Check if the screen is desktop-sized
  static bool isDesktop(BuildContext context) =>
      MediaQuery.sizeOf(context).width >= tabletBreakpoint;

  /// Get the number of grid columns based on screen width
  static int gridColumns(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    if (width >= desktopBreakpoint) return 4;
    if (width >= tabletBreakpoint) return 3;
    if (width >= mobileBreakpoint) return 2;
    return 1;
  }

  /// Get adaptive horizontal padding
  static double horizontalPadding(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    if (width >= desktopBreakpoint) return 48;
    if (width >= tabletBreakpoint) return 32;
    if (width >= mobileBreakpoint) return 24;
    return 16;
  }

  /// Get adaptive content max width (useful for centering content)
  static double? maxContentWidth(BuildContext context) {
    if (isDesktop(context)) return 1200;
    if (isTablet(context)) return 900;
    return null; // Full width on mobile
  }

  /// Resolve a value based on current breakpoint
  static T value<T>(
    BuildContext context, {
    required T mobile,
    T? tablet,
    T? desktop,
  }) {
    if (isDesktop(context)) return desktop ?? tablet ?? mobile;
    if (isTablet(context)) return tablet ?? mobile;
    return mobile;
  }
}

/// Widget that builds different layouts based on screen size
class ResponsiveBuilder extends StatelessWidget {
  final Widget Function(BuildContext context) mobile;
  final Widget Function(BuildContext context)? tablet;
  final Widget Function(BuildContext context)? desktop;

  const ResponsiveBuilder({
    super.key,
    required this.mobile,
    this.tablet,
    this.desktop,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth >= Responsive.tabletBreakpoint) {
          return (desktop ?? tablet ?? mobile)(context);
        }
        if (constraints.maxWidth >= Responsive.mobileBreakpoint) {
          return (tablet ?? mobile)(context);
        }
        return mobile(context);
      },
    );
  }
}

/// Wrapper that constrains content width and centers it on large screens
class ResponsiveContainer extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;

  const ResponsiveContainer({
    super.key,
    required this.child,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    final maxWidth = Responsive.maxContentWidth(context);
    final hPadding = Responsive.horizontalPadding(context);

    return Center(
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: maxWidth ?? double.infinity,
        ),
        child: Padding(
          padding: padding ??
              EdgeInsets.symmetric(horizontal: hPadding, vertical: 16),
          child: child,
        ),
      ),
    );
  }
}
