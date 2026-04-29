import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:my_flutter_app/src/features/ai/providers/ai_providers.dart';
import 'package:my_flutter_app/src/features/courses/domain/course_model.dart';
import 'package:my_flutter_app/src/features/courses/presentation/course_controller.dart';

/// Widget to display trending courses.
class TrendingCoursesSection extends ConsumerWidget {
  const TrendingCoursesSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final trendingAsync = ref.watch(trendingCoursesProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '🔥 Trending This Week',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              TextButton(
                onPressed: () {
                  // Navigate to see all trending
                },
                child: const Text('See All'),
              ),
            ],
          ),
        ),
        SizedBox(
          height: 220,
          child: trendingAsync.when(
            data: (courses) => courses.isEmpty
                ? const Center(child: Text('No trending courses yet'))
                : ListView.builder(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    itemCount: courses.length,
                    itemBuilder: (context, index) {
                      return TrendingCourseCard(course: courses[index]);
                    },
                  ),
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, stack) {
              final errorStr = error.toString().toLowerCase();
              // Handle authentication errors gracefully for guests
              if (errorStr.contains('401') || errorStr.contains('403')) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.lock_outline,
                          color: Colors.orange, size: 32),
                      const SizedBox(height: 8),
                      const Text('Join to see trending!',
                          style: TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      TextButton(
                        onPressed: () => context.go('/login'),
                        child: const Text('Login'),
                      ),
                    ],
                  ),
                );
              }
              // Handle network/connection errors
              if (errorStr.contains('connection') ||
                  errorStr.contains('refused') ||
                  errorStr.contains('socket') ||
                  errorStr.contains('network')) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.cloud_off,
                          color: Colors.grey.shade400, size: 32),
                      const SizedBox(height: 8),
                      Text('Trending courses coming soon!',
                          style: TextStyle(
                              fontWeight: FontWeight.w500,
                              color: Colors.grey.shade600)),
                      const SizedBox(height: 4),
                      TextButton(
                        onPressed: () =>
                            ref.invalidate(trendingCoursesProvider),
                        child: const Text('Refresh'),
                      ),
                    ],
                  ),
                );
              }
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline, color: Colors.red),
                    const SizedBox(height: 8),
                    Text('Error: ${error.toString()}'),
                    TextButton(
                      onPressed: () => ref.invalidate(trendingCoursesProvider),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

/// Card widget for a trending course.
class TrendingCourseCard extends ConsumerWidget {
  const TrendingCourseCard({super.key, required this.course});
  final Course course;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MouseRegion(
      onEnter: (_) {
        // Predictive Prefetching: Start fetching details when user hovers
        ref.read(courseDetailProvider(course.slug).future);
      },
      child: GestureDetector(
        onTap: () => context.go('/courses/${course.slug}'),
        child: Container(
          width: 180,
          margin: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Colors.purple.shade400,
                Colors.blue.shade400,
              ],
            ),
            boxShadow: [
              const BoxShadow(
                color: Color.fromRGBO(156, 39, 176, 0.3),
                blurRadius: 10,
                offset: Offset(0, 4),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Stack(
              children: [
                // Background Image
                if (course.thumbnailUrl != null)
                  Positioned.fill(
                    child: CachedNetworkImage(
                      imageUrl: course.thumbnailUrl!,
                      fit: BoxFit.cover,
                      placeholder: (context, url) => Container(
                        color: Colors.purple.shade400,
                      ),
                      errorWidget: (context, url, error) => Container(
                        color: Colors.purple.shade400,
                      ),
                    ),
                  ),
                // Glassmorphism overlay
                Positioned.fill(
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          (course.thumbnailUrl != null
                                  ? Colors.black
                                  : Colors.white)
                              .withValues(alpha: 0.1),
                          Colors.black.withValues(alpha: 0.6),
                        ],
                      ),
                    ),
                  ),
                ),
                // Content
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Trending badge
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.orange,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.trending_up,
                                size: 14, color: Colors.white),
                            SizedBox(width: 4),
                            Text(
                              'Trending',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Spacer(),
                      // Course title
                      Text(
                        course.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      // Rating
                      Row(
                        children: [
                          const Icon(Icons.star, size: 14, color: Colors.amber),
                          const SizedBox(width: 4),
                          Text(
                            course.avgRating?.toStringAsFixed(1) ?? 'N/A',
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Icon(Icons.people,
                              size: 14, color: Colors.white70),
                          const SizedBox(width: 4),
                          Text(
                            '${course.enrollmentCount ?? 0}',
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
