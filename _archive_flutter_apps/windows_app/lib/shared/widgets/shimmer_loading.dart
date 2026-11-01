import 'package:flutter/material.dart';
import 'package:learning_hub/core/theme/theme_extensions.dart';

/// Shimmer loading effect widget for skeleton screens
///
/// Creates a shimmering gradient animation over content to indicate loading.
/// Automatically adapts to light/dark theme.
class ShimmerLoading extends StatefulWidget {
  /// The child widget to apply shimmer effect on
  final Widget child;

  /// Whether shimmer animation is active
  final bool isLoading;

  const ShimmerLoading({
    super.key,
    required this.child,
    this.isLoading = true,
  });

  @override
  State<ShimmerLoading> createState() => _ShimmerLoadingState();
}

class _ShimmerLoadingState extends State<ShimmerLoading>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.isLoading) return widget.child;

    final baseColor = context.shimmerBase;
    final highlightColor = context.shimmerHighlight;
    final midColor = Color.lerp(baseColor, highlightColor, 0.5)!;

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return ShaderMask(
          shaderCallback: (bounds) {
            return LinearGradient(
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
              colors: [
                baseColor,
                midColor,
                highlightColor,
                midColor,
                baseColor,
              ],
              stops: [
                (_controller.value - 0.3).clamp(0.0, 1.0),
                (_controller.value - 0.15).clamp(0.0, 1.0),
                _controller.value.clamp(0.0, 1.0),
                (_controller.value + 0.15).clamp(0.0, 1.0),
                (_controller.value + 0.3).clamp(0.0, 1.0),
              ],
            ).createShader(bounds);
          },
          blendMode: BlendMode.srcATop,
          child: child,
        );
      },
      child: widget.child,
    );
  }
}

/// A simple shimmer placeholder box
class ShimmerBox extends StatelessWidget {
  final double width;
  final double height;
  final double borderRadius;

  const ShimmerBox({
    super.key,
    this.width = double.infinity,
    required this.height,
    this.borderRadius = 8,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: context.surfaceVariant,
        borderRadius: BorderRadius.circular(borderRadius),
      ),
    );
  }
}

/// A card-shaped shimmer placeholder
class ShimmerCard extends StatelessWidget {
  final double height;

  const ShimmerCard({super.key, this.height = 120});

  @override
  Widget build(BuildContext context) {
    return ShimmerLoading(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ShimmerBox(height: height),
            const SizedBox(height: 12),
            const ShimmerBox(height: 16, width: 200),
            const SizedBox(height: 8),
            const ShimmerBox(height: 12, width: 140),
          ],
        ),
      ),
    );
  }
}

/// A list shimmer placeholder
class ShimmerList extends StatelessWidget {
  final int itemCount;
  final double itemHeight;

  const ShimmerList({
    super.key,
    this.itemCount = 5,
    this.itemHeight = 80,
  });

  @override
  Widget build(BuildContext context) {
    return ShimmerLoading(
      child: ListView.builder(
        physics: const NeverScrollableScrollPhysics(),
        itemCount: itemCount,
        itemBuilder: (context, index) {
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: Row(
              children: [
                ShimmerBox(
                  width: itemHeight * 0.8,
                  height: itemHeight * 0.8,
                  borderRadius: 12,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ShimmerBox(
                          height: 14, width: 180 + (index * 10).toDouble()),
                      const SizedBox(height: 8),
                      const ShimmerBox(height: 10, width: 120),
                      const SizedBox(height: 6),
                      const ShimmerBox(height: 10, width: 80),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
