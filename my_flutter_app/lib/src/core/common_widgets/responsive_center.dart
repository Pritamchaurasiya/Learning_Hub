import 'package:flutter/material.dart';

/// A widget that centers its child and constrains its maximum width.
/// Useful for web layouts to prevent content from stretching too wide.
class ResponsiveCenter extends StatelessWidget {
  const ResponsiveCenter({
    super.key,
    required this.child,
    this.maxContentWidth = 1200,
    this.padding = EdgeInsets.zero,
  });

  final Widget child;
  final double maxContentWidth;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxContentWidth),
        child: Padding(
          padding: padding,
          child: child,
        ),
      ),
    );
  }
}
