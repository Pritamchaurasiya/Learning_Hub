import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:learning_hub/core/theme/app_colors.dart';

/// Expandable Quick Actions Floating Action Button
///
/// Provides fast access to common actions:
/// - Start Learning (last course)
/// - AI Tutor
/// - Study Planner
/// - Take Quiz
class QuickActionsFAB extends StatefulWidget {
  const QuickActionsFAB({super.key});

  @override
  State<QuickActionsFAB> createState() => _QuickActionsFABState();
}

class _QuickActionsFABState extends State<QuickActionsFAB>
    with SingleTickerProviderStateMixin {
  bool _isExpanded = false;
  late AnimationController _controller;
  late Animation<double> _rotateAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _rotateAnimation = Tween<double>(begin: 0, end: 0.125).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _toggle() {
    setState(() {
      _isExpanded = !_isExpanded;
      if (_isExpanded) {
        _controller.forward();
      } else {
        _controller.reverse();
      }
    });
  }

  void _onActionTap(VoidCallback action) {
    _toggle();
    action();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        // Expandable action items
        if (_isExpanded) ...[
          _QuickActionItem(
            icon: Icons.smart_toy,
            label: 'AI Tutor',
            color: AppColors.tertiary,
            onTap: () => _onActionTap(() => context.push('/ai-tutor')),
          ).animate().fadeIn(duration: 150.ms).slideY(begin: 0.3, end: 0),
          const SizedBox(height: 12),
          _QuickActionItem(
            icon: Icons.calendar_today,
            label: 'Study Planner',
            color: AppColors.accent,
            onTap: () => _onActionTap(() => context.push('/study-planner')),
          ).animate().fadeIn(delay: 50.ms, duration: 150.ms).slideY(begin: 0.3),
          const SizedBox(height: 12),
          _QuickActionItem(
            icon: Icons.quiz,
            label: 'Take Quiz',
            color: AppColors.success,
            onTap: () => _onActionTap(() {
              // Navigate to search with quiz filter
              context.push('/search?type=quiz');
            }),
          )
              .animate()
              .fadeIn(delay: 100.ms, duration: 150.ms)
              .slideY(begin: 0.3),
          const SizedBox(height: 12),
          _QuickActionItem(
            icon: Icons.analytics,
            label: 'Analytics',
            color: AppColors.warning,
            onTap: () => _onActionTap(() => context.push('/analytics')),
          )
              .animate()
              .fadeIn(delay: 150.ms, duration: 150.ms)
              .slideY(begin: 0.3),
          const SizedBox(height: 16),
        ],

        // Main FAB
        RotationTransition(
          turns: _rotateAnimation,
          child: FloatingActionButton(
            heroTag: 'quick_actions_fab',
            onPressed: _toggle,
            backgroundColor: AppColors.primary,
            elevation: _isExpanded ? 8 : 4,
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              child: Icon(
                _isExpanded ? Icons.close : Icons.add,
                key: ValueKey(_isExpanded),
                color: Colors.white,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// Individual action item in the expandable menu
class _QuickActionItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _QuickActionItem({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Label chip
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: theme.colorScheme.surface,
            borderRadius: BorderRadius.circular(8),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.1),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Text(
            label,
            style: theme.textTheme.labelMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        const SizedBox(width: 12),
        // Icon button
        Material(
          color: color,
          elevation: 4,
          borderRadius: BorderRadius.circular(16),
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(16),
            child: Container(
              width: 48,
              height: 48,
              alignment: Alignment.center,
              child: Icon(
                icon,
                color: Colors.white,
                size: 24,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
