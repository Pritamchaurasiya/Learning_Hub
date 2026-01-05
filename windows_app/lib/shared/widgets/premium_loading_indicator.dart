import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:learning_hub/core/theme/app_colors.dart';

class PremiumLoadingIndicator extends StatefulWidget {
  final String? message;

  const PremiumLoadingIndicator({super.key, this.message});

  @override
  State<PremiumLoadingIndicator> createState() =>
      _PremiumLoadingIndicatorState();
}

class _PremiumLoadingIndicatorState extends State<PremiumLoadingIndicator> {
  int _currentTipIndex = 0;

  static const List<String> _smartTips = [
    '💡 Tip: Use keyboard shortcuts to navigate faster',
    '🎯 Did you know? Completing quizzes boosts retention by 40%',
    '🔥 Pro Tip: Set daily learning goals for consistency',
    '📚 Fun Fact: Active learners retain 90% more content',
    '⚡ Quick Tip: Take notes while watching for better recall',
    '🏆 Motivation: You\'re building skills that compound!',
  ];

  Timer? _tipTimer;

  @override
  void initState() {
    super.initState();
    _startTipRotation();
  }

  void _startTipRotation() {
    _tipTimer = Timer.periodic(const Duration(seconds: 4), (timer) {
      if (mounted) {
        setState(() {
          _currentTipIndex = (_currentTipIndex + 1) % _smartTips.length;
        });
      }
    });
  }

  @override
  void dispose() {
    _tipTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Stack(
            alignment: Alignment.center,
            children: [
              // Outer glow with gradient
              Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      AppColors.primary.withValues(alpha: 0.25),
                      AppColors.accent.withValues(alpha: 0.1),
                      Colors.transparent,
                    ],
                    stops: const [0.0, 0.5, 1.0],
                  ),
                ),
              )
                  .animate(onPlay: (c) => c.repeat())
                  .scale(
                      duration: 2.5.seconds,
                      begin: const Offset(0.7, 0.7),
                      end: const Offset(1.6, 1.6))
                  .fadeOut(duration: 2.5.seconds),

              // Spinning gradient ring
              SizedBox(
                width: 56,
                height: 56,
                child: CircularProgressIndicator(
                  strokeWidth: 3.5,
                  valueColor:
                      const AlwaysStoppedAnimation<Color>(AppColors.primary),
                  backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                ),
              ),

              // Inner pulsing dot with glow
              Container(
                width: 14,
                height: 14,
                decoration: BoxDecoration(
                  gradient: const RadialGradient(
                    colors: [AppColors.accent, AppColors.primary],
                  ),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.accent.withValues(alpha: 0.6),
                      blurRadius: 12,
                      spreadRadius: 4,
                    )
                  ],
                ),
              ).animate(onPlay: (c) => c.repeat(reverse: true)).scale(
                    duration: 700.ms,
                    begin: const Offset(0.7, 0.7),
                    end: const Offset(1.3, 1.3),
                  ),
            ],
          ),
          if (widget.message != null) ...[
            const SizedBox(height: 28),
            Text(
              widget.message!,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
                letterSpacing: 1.1,
                fontWeight: FontWeight.w500,
              ),
            ).animate(onPlay: (c) => c.repeat()).shimmer(
                duration: 2.seconds,
                color: AppColors.primary.withValues(alpha: 0.5)),
          ],
          // Smart Tips Section
          const SizedBox(height: 32),
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 500),
            transitionBuilder: (child, animation) {
              return FadeTransition(
                opacity: animation,
                child: SlideTransition(
                  position: Tween<Offset>(
                    begin: const Offset(0, 0.3),
                    end: Offset.zero,
                  ).animate(animation),
                  child: child,
                ),
              );
            },
            child: Text(
              _smartTips[_currentTipIndex],
              key: ValueKey<int>(_currentTipIndex),
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall?.copyWith(
                color:
                    theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.8),
                fontStyle: FontStyle.italic,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
