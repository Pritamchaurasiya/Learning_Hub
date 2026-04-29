import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/features/ai/data/ai_repository.dart';
import 'package:my_flutter_app/src/features/ai/providers/ai_providers.dart';

/// Widget to display user's learning statistics.
class LearningStatsCard extends ConsumerWidget {
  const LearningStatsCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statsAsync = ref.watch(learningStatsProvider);

    return Container(
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.indigo.shade600,
            Colors.purple.shade600,
          ],
        ),
        boxShadow: [
          const BoxShadow(
            color: Color.fromRGBO(63, 81, 181, 0.4),
            blurRadius: 15,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Stack(
          children: [
            // Background pattern
            Positioned(
              right: -50,
              top: -50,
              child: Container(
                width: 150,
                height: 150,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: Color.fromRGBO(255, 255, 255, 0.1),
                ),
              ),
            ),
            // Content
            Padding(
              padding: const EdgeInsets.all(20),
              child: statsAsync.when(
                data: (stats) => _buildStatsContent(context, stats),
                loading: () => const Center(
                  child: CircularProgressIndicator(color: Colors.white),
                ),
                error: (error, stack) => Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.error_outline, color: Colors.white),
                      const SizedBox(height: 8),
                      const Text(
                        'Could not load stats',
                        style: TextStyle(
                            color: Color.fromRGBO(255, 255, 255, 0.8)),
                      ),
                      TextButton(
                        onPressed: () => ref.invalidate(learningStatsProvider),
                        child: const Text(
                          'Retry',
                          style: TextStyle(color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsContent(BuildContext context, LearningStats stats) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        Row(
          children: [
            const Icon(Icons.insights, color: Colors.white, size: 28),
            const SizedBox(width: 12),
            Text(
              'Your Learning Journey',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
            ),
          ],
        ),
        const SizedBox(height: 20),
        // Stats grid
        Row(
          children: [
            Expanded(
              child: _StatItem(
                icon: Icons.school,
                value: '${stats.totalCourses}',
                label: 'Enrolled',
              ),
            ),
            Expanded(
              child: _StatItem(
                icon: Icons.check_circle,
                value: '${stats.completedCourses}',
                label: 'Completed',
              ),
            ),
            Expanded(
              child: _StatItem(
                icon: Icons.trending_up,
                value: '${stats.averageProgress.toStringAsFixed(0)}%',
                label: 'Progress',
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        // Completion rate progress bar
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Completion Rate: ${stats.completionRate.toStringAsFixed(1)}%',
              style: const TextStyle(
                color: Color.fromRGBO(255, 255, 255, 0.9),
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 8),
            LinearProgressIndicator(
              value: stats.completionRate / 100,
              backgroundColor: const Color.fromRGBO(255, 255, 255, 0.2),
              valueColor:
                  const AlwaysStoppedAnimation<Color>(Colors.greenAccent),
              minHeight: 8,
              borderRadius: BorderRadius.circular(4),
            ),
          ],
        ),
      ],
    );
  }
}

class _StatItem extends StatelessWidget {
  const _StatItem({
    required this.icon,
    required this.value,
    required this.label,
  });
  final IconData icon;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: const Color.fromRGBO(255, 255, 255, 0.8), size: 24),
        const SizedBox(height: 8),
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: const TextStyle(
            color: Color.fromRGBO(255, 255, 255, 0.7),
            fontSize: 12,
          ),
        ),
      ],
    );
  }
}
