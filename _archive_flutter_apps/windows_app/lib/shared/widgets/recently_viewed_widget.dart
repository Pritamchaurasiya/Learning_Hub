import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:learning_hub/core/services/course_service.dart';
import 'package:learning_hub/core/theme/app_colors.dart';
import 'package:learning_hub/data/models/course_model.dart';
import 'progress_ring.dart';
import 'package:learning_hub/shared/widgets/main_scaffold.dart';

// Provider to fetch recently viewed courses with progress
final recentlyViewedProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final courseService = CourseService.instance;

  // 1. Get user progress
  final progressMap = await courseService.getUserProgress();

  if (progressMap.isEmpty) {
    return [];
  }

  // 2. Sort by last accessed
  final sortedProgress = progressMap.values.toList()
    ..sort((a, b) => b.lastAccessed.compareTo(a.lastAccessed));

  // 3. Take top 5
  final recent = sortedProgress.take(5).toList();

  // 4. Fetch course details for these
  final results = <Map<String, dynamic>>[];

  for (final prog in recent) {
    try {
      final course = await courseService.getCourse(prog.courseId);
      if (course != null) {
        results.add({
          'course': course,
          'progress': prog,
        });
      }
    } catch (e) {
      // Skip if course load fails
      continue;
    }
  }

  return results;
});

class RecentlyViewedWidget extends ConsumerWidget {
  const RecentlyViewedWidget({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final recentAsync = ref.watch(recentlyViewedProvider);

    return recentAsync.when(
      data: (items) {
        if (items.isEmpty) {
          return const SizedBox.shrink();
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Jump Back In',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  TextButton(
                    onPressed: () {
                      ref.read(bottomNavIndexProvider.notifier).state =
                          2; // My Learning tab
                    },
                    child: const Text('View All'),
                  ),
                ],
              ),
            ),
            SizedBox(
              height: 140, // Height for horizontal list
              child: ListView.separated(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                scrollDirection: Axis.horizontal,
                itemCount: items.length,
                separatorBuilder: (_, __) => const SizedBox(width: 16),
                itemBuilder: (context, index) {
                  final item = items[index];
                  final course = item['course'] as Course;
                  final progress = item['progress'] as CourseProgress;

                  return _RecentCourseCard(
                    course: course,
                    progress: progress,
                  )
                      .animate()
                      .fadeIn(delay: (index * 100).ms)
                      .slideX(begin: 0.2, end: 0);
                },
              ),
            ),
          ],
        );
      },
      loading: () => const _LoadingSkeleton(),
      error: (_, __) => const SizedBox.shrink(),
    );
  }
}

class _RecentCourseCard extends StatelessWidget {
  final Course course;
  final CourseProgress progress;

  const _RecentCourseCard({
    required this.course,
    required this.progress,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/course/${course.id}'),
      child: Container(
        width: 280,
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            // Thumbnail
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.network(
                course.thumbnailUrl,
                width: 80,
                height: 80,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  width: 80,
                  height: 80,
                  color: Colors.grey[300],
                  child: const Icon(Icons.image_not_supported, size: 20),
                ),
              ),
            ),
            const SizedBox(width: 12),
            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    course.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Text(
                        '${(progress.progress * 100).toInt()}% Done',
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                              color: AppColors.primary,
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                      const Spacer(),
                      ProgressRing(
                        progress: progress.progress,
                        size: 24,
                        strokeWidth: 3,
                        showPercentage: false,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LoadingSkeleton extends StatelessWidget {
  const _LoadingSkeleton();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 140,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        scrollDirection: Axis.horizontal,
        itemCount: 3,
        itemBuilder: (context, index) {
          return Container(
            width: 280,
            margin: const EdgeInsets.only(right: 16),
            decoration: BoxDecoration(
              color: Colors.grey[200],
              borderRadius: BorderRadius.circular(12),
            ),
          ).animate(onPlay: (c) => c.repeat()).shimmer(duration: 1200.ms);
        },
      ),
    );
  }
}
