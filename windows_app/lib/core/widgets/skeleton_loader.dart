import 'package:flutter/material.dart';

/// A premium Skeleton Loader (Shimmer Effect) widget.
/// Zero external dependencies.
class SkeletonLoader extends StatefulWidget {
  final double width;
  final double height;
  final double borderRadius;
  final Color baseColor;
  final Color highlightColor;
  final BoxShape shape;

  const SkeletonLoader({
    super.key,
    this.width = double.infinity,
    this.height = 16.0,
    this.borderRadius = 8.0,
    this.baseColor = const Color(0xFF22262C), // Dark theme base
    this.highlightColor = const Color(0xFF2F343A), // Slightly lighter
    this.shape = BoxShape.rectangle,
  });

  const SkeletonLoader.circle({
    super.key,
    required double size,
    this.baseColor = const Color(0xFF22262C),
    this.highlightColor = const Color(0xFF2F343A),
  })  : width = size,
        height = size,
        borderRadius = 0,
        shape = BoxShape.circle;

  @override
  State<SkeletonLoader> createState() => _SkeletonLoaderState();
}

class _SkeletonLoaderState extends State<SkeletonLoader>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 1500))
      ..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            shape: widget.shape,
            borderRadius: widget.shape == BoxShape.rectangle
                ? BorderRadius.circular(widget.borderRadius)
                : null,
            gradient: LinearGradient(
              colors: [
                widget.baseColor,
                widget.highlightColor,
                widget.baseColor,
              ],
              stops: const [0.0, 0.5, 1.0],
              // Animate gradient from left to right
              begin: Alignment(-2.0 + (3.0 * _controller.value), 0.0),
              end: Alignment(-1.0 + (3.0 * _controller.value), 0.0),
              tileMode: TileMode.clamp,
            ),
          ),
        );
      },
    );
  }
}
