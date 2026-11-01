import 'package:flutter/material.dart';

class ResponsiveLayout extends StatelessWidget {
  const ResponsiveLayout({
    super.key,
    required this.mobileBody,
    this.tabletBody,
    this.desktopBody,
  });

  final Widget mobileBody;
  final Widget? tabletBody;
  final Widget? desktopBody;

  static const int mobileBreakpoint = 600;
  static const int tabletBreakpoint = 1100;

  static bool isMobile(BuildContext context) =>
      MediaQuery.sizeOf(context).width < mobileBreakpoint;

  static bool isTablet(BuildContext context) =>
      MediaQuery.sizeOf(context).width >= mobileBreakpoint &&
      MediaQuery.sizeOf(context).width < tabletBreakpoint;

  static bool isDesktop(BuildContext context) =>
      MediaQuery.sizeOf(context).width >= tabletBreakpoint;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth >= tabletBreakpoint) {
          return desktopBody ?? tabletBody ?? mobileBody;
        } else if (constraints.maxWidth >= mobileBreakpoint) {
          return tabletBody ?? mobileBody;
        } else {
          return mobileBody;
        }
      },
    );
  }
}
