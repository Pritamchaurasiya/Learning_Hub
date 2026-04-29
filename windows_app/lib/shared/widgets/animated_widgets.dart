import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

/// Animated gradient text widget for premium headers and hero text
///
/// Creates an animated gradient that flows across text, creating
/// a stunning visual effect for key headings.
class GradientText extends StatefulWidget {
  final String text;
  final TextStyle? style;
  final List<Color>? colors;
  final bool animate;
  final Duration duration;

  const GradientText(
    this.text, {
    super.key,
    this.style,
    this.colors,
    this.animate = true,
    this.duration = const Duration(seconds: 3),
  });

  @override
  State<GradientText> createState() => _GradientTextState();
}

class _GradientTextState extends State<GradientText>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: widget.duration,
    );
    if (widget.animate) {
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final defaultColors = [
      Theme.of(context).colorScheme.primary,
      Theme.of(context).colorScheme.tertiary,
      Theme.of(context).colorScheme.secondary,
      Theme.of(context).colorScheme.primary,
    ];

    final colors = widget.colors ?? defaultColors;

    if (!widget.animate) {
      return ShaderMask(
        shaderCallback: (bounds) {
          return LinearGradient(colors: colors).createShader(bounds);
        },
        blendMode: BlendMode.srcIn,
        child: Text(widget.text, style: widget.style),
      );
    }

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return ShaderMask(
          shaderCallback: (bounds) {
            return LinearGradient(
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
              colors: colors,
              stops: List.generate(
                colors.length,
                (i) => (i / (colors.length - 1) + _controller.value) % 1.0,
              ),
            ).createShader(bounds);
          },
          blendMode: BlendMode.srcIn,
          child: child,
        );
      },
      child: Text(widget.text, style: widget.style),
    );
  }
}

/// Animated counter widget that smoothly transitions between numbers
class AnimatedCounter extends StatelessWidget {
  final int value;
  final TextStyle? style;
  final String prefix;
  final String suffix;
  final Duration duration;

  const AnimatedCounter({
    super.key,
    required this.value,
    this.style,
    this.prefix = '',
    this.suffix = '',
    this.duration = const Duration(milliseconds: 600),
  });

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<int>(
      tween: IntTween(begin: 0, end: value),
      duration: duration,
      builder: (context, val, child) {
        return Text(
          '$prefix$val$suffix',
          style: style,
        );
      },
    );
  }
}

/// Animated progress bar with gradient fill
class AnimatedProgressBar extends StatelessWidget {
  final double value;
  final double height;
  final Color? backgroundColor;
  final List<Color>? gradientColors;
  final Duration duration;
  final BorderRadius? borderRadius;

  const AnimatedProgressBar({
    super.key,
    required this.value,
    this.height = 8,
    this.backgroundColor,
    this.gradientColors,
    this.duration = const Duration(milliseconds: 800),
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final radius = borderRadius ?? BorderRadius.circular(height / 2);
    final colors = gradientColors ??
        [
          theme.colorScheme.primary,
          theme.colorScheme.tertiary,
        ];

    return Container(
      height: height,
      decoration: BoxDecoration(
        color: backgroundColor ?? theme.colorScheme.surfaceContainerHighest,
        borderRadius: radius,
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          return TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: value.clamp(0.0, 1.0)),
            duration: duration,
            curve: Curves.easeOutCubic,
            builder: (context, animValue, child) {
              return Align(
                alignment: Alignment.centerLeft,
                child: Container(
                  width: constraints.maxWidth * animValue,
                  height: height,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: colors),
                    borderRadius: radius,
                    boxShadow: [
                      BoxShadow(
                        color: colors.first.withValues(alpha: 0.3),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    )
        .animate()
        .fadeIn(duration: 400.ms)
        .slideX(begin: -0.1, end: 0, duration: 400.ms);
  }
}
