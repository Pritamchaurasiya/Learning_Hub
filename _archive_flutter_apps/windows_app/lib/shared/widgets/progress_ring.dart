import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:learning_hub/core/theme/app_colors.dart';

class ProgressRing extends StatelessWidget {
  final double progress; // 0.0 to 1.0
  final double size;
  final double strokeWidth;
  final Color? color;
  final Color? backgroundColor;
  final Widget? child;
  final bool showPercentage;

  const ProgressRing({
    super.key,
    required this.progress,
    this.size = 60,
    this.strokeWidth = 6,
    this.color,
    this.backgroundColor,
    this.child,
    this.showPercentage = true,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final effectiveColor = color ?? AppColors.primary;
    final effectiveBgColor =
        backgroundColor ?? theme.colorScheme.surfaceContainerHighest;

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Background Ring
          SizedBox(
            width: size,
            height: size,
            child: CircularProgressIndicator(
              value: 1.0,
              strokeWidth: strokeWidth,
              color: effectiveBgColor,
              strokeCap: StrokeCap.round,
            ),
          ),
          // Progress Ring (Animated)
          SizedBox(
            width: size,
            height: size,
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: progress),
              duration: 800.ms,
              curve: Curves.easeOutCubic,
              builder: (context, value, _) {
                return CircularProgressIndicator(
                  value: value,
                  strokeWidth: strokeWidth,
                  color: effectiveColor,
                  strokeCap: StrokeCap.round,
                );
              },
            ),
          ),
          // Center Content
          if (child != null)
            child!
          else if (showPercentage)
            TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: progress),
              duration: 800.ms,
              builder: (context, value, _) {
                return Text(
                  '${(value * 100).toInt()}%',
                  style: theme.textTheme.labelSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    fontSize: size * 0.25,
                  ),
                );
              },
            ),
        ],
      ),
    );
  }
}
