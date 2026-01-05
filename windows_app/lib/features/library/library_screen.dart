import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:learning_hub/core/theme/app_colors.dart';
import 'package:learning_hub/data/models/course_model.dart';
import 'package:learning_hub/shared/widgets/course_card.dart';

/// Library screen showing enrolled courses and learning progress
class LibraryScreen extends ConsumerStatefulWidget {
  const LibraryScreen({super.key});

  @override
  ConsumerState<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends ConsumerState<LibraryScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Learning'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'In Progress'),
            Tab(text: 'Completed'),
            Tab(text: 'Wishlist'),
            Tab(text: 'Downloads'),
          ],
          isScrollable: true,
          tabAlignment: TabAlignment.start,
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _InProgressTab(),
          _CompletedTab(),
          _WishlistTab(),
          _DownloadsTab(),
        ],
      ),
    );
  }
}

/// In Progress courses tab
class _InProgressTab extends StatelessWidget {
  final List<_EnrolledCourse> _courses = [
    _EnrolledCourse(
      course: _mockCourse(0, 'Complete Flutter Development'),
      progress: 0.45,
      lastAccessedLesson: 'Lesson 12: State Management',
    ),
    _EnrolledCourse(
      course: _mockCourse(1, 'Python Machine Learning'),
      progress: 0.32,
      lastAccessedLesson: 'Chapter 5: Pandas Basics',
    ),
    _EnrolledCourse(
      course: _mockCourse(2, 'React Native Masterclass'),
      progress: 0.78,
      lastAccessedLesson: 'Module 8: Navigation',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    if (_courses.isEmpty) {
      return _EmptyState(
        icon: Icons.play_circle_outline,
        title: 'No courses in progress',
        subtitle: 'Start learning by enrolling in a course',
        actionLabel: 'Browse Courses',
        onAction: () => context.go('/search'),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _courses.length + 1,
      itemBuilder: (context, index) {
        if (index == 0) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: _LearningStatsCard(),
          );
        }

        final enrolled = _courses[index - 1];
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: _EnrolledCourseCard(enrolled: enrolled),
        );
      },
    );
  }
}

/// Learning stats card
class _LearningStatsCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'This Week',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.success.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.trending_up,
                          size: 14, color: AppColors.success),
                      const SizedBox(width: 4),
                      Text(
                        '+23%',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: AppColors.success,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Row(
              children: [
                Expanded(
                  child: _StatItem(
                    icon: Icons.timer_outlined,
                    value: '5h 30m',
                    label: 'Time Spent',
                  ),
                ),
                Expanded(
                  child: _StatItem(
                    icon: Icons.play_circle_outline,
                    value: '12',
                    label: 'Lessons',
                  ),
                ),
                Expanded(
                  child: _StatItem(
                    icon: Icons.local_fire_department,
                    value: '7 days',
                    label: 'Streak',
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;

  const _StatItem({
    required this.icon,
    required this.value,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      children: [
        Icon(icon, color: AppColors.primary, size: 24),
        const SizedBox(height: 8),
        Text(
          value,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: theme.textTheme.labelSmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}

/// Enrolled course card with progress
class _EnrolledCourseCard extends StatelessWidget {
  final _EnrolledCourse enrolled;

  const _EnrolledCourseCard({required this.enrolled});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final course = enrolled.course;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/course/${course.id}'),
        child: Column(
          children: [
            Row(
              children: [
                // Thumbnail
                Container(
                  width: 120,
                  height: 80,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surfaceContainerHighest,
                    image: DecorationImage(
                      image: NetworkImage(course.thumbnailUrl),
                      fit: BoxFit.cover,
                    ),
                  ),
                ),

                // Content
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          course.title,
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          enrolled.lastAccessedLesson,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ),

                // Continue button
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: IconButton.filled(
                    onPressed: () =>
                        context.push('/course/${course.id}/lesson/1'),
                    icon: const Icon(Icons.play_arrow),
                  ),
                ),
              ],
            ),

            // Progress bar
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: Row(
                children: [
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: enrolled.progress,
                        backgroundColor:
                            theme.colorScheme.surfaceContainerHighest,
                        minHeight: 6,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    '${(enrolled.progress * 100).toInt()}%',
                    style: theme.textTheme.labelMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
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

/// Completed courses tab
class _CompletedTab extends StatelessWidget {
  final List<Course> _courses = [
    _mockCourse(10, 'JavaScript Fundamentals'),
    _mockCourse(11, 'HTML & CSS Basics'),
  ];

  @override
  Widget build(BuildContext context) {
    if (_courses.isEmpty) {
      return const _EmptyState(
        icon: Icons.emoji_events_outlined,
        title: 'No completed courses yet',
        subtitle: 'Keep learning to earn certificates',
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _courses.length,
      itemBuilder: (context, index) {
        final course = _courses[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: _CompletedCourseCard(course: course),
        );
      },
    );
  }
}

class _CompletedCourseCard extends StatelessWidget {
  final Course course;

  const _CompletedCourseCard({required this.course});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: InkWell(
        onTap: () => context.push('/course/${course.id}'),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              // Certificate icon
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.workspace_premium,
                  color: AppColors.success,
                  size: 28,
                ),
              ),
              const SizedBox(width: 12),

              // Content
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      course.title,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(Icons.check_circle,
                            size: 14, color: AppColors.success),
                        const SizedBox(width: 4),
                        Text(
                          'Completed',
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: AppColors.success,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // View Certificate
              TextButton(
                onPressed: () {},
                child: const Text('Certificate'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Wishlist tab
class _WishlistTab extends StatelessWidget {
  final List<Course> _courses = [
    _mockCourse(20, 'Advanced Data Structures'),
    _mockCourse(21, 'System Design Interview'),
    _mockCourse(22, 'Cloud Architecture'),
  ];

  @override
  Widget build(BuildContext context) {
    if (_courses.isEmpty) {
      return _EmptyState(
        icon: Icons.bookmark_outline,
        title: 'Your wishlist is empty',
        subtitle: 'Save courses for later',
        actionLabel: 'Browse Courses',
        onAction: () => context.go('/search'),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(8),
      itemCount: _courses.length,
      itemBuilder: (context, index) {
        final course = _courses[index];
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: CourseCard(
            course: course,
            style: CourseCardStyle.horizontal,
            onTap: () => context.push('/course/${course.id}'),
          ),
        );
      },
    );
  }
}

/// Downloads tab
class _DownloadsTab extends StatelessWidget {
  final List<_Download> _downloads = [
    _Download(
      courseTitle: 'Complete Flutter Development',
      lessonTitle: 'Lesson 12: State Management',
      size: '120 MB',
      isComplete: true,
    ),
    _Download(
      courseTitle: 'Complete Flutter Development',
      lessonTitle: 'Lesson 13: Riverpod',
      size: '85 MB',
      isComplete: false,
      progress: 0.6,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (_downloads.isEmpty) {
      return const _EmptyState(
        icon: Icons.download_outlined,
        title: 'No downloads',
        subtitle: 'Download lessons to watch offline',
      );
    }

    return Column(
      children: [
        // Storage info
        Padding(
          padding: const EdgeInsets.all(16),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(Icons.storage, color: theme.colorScheme.primary),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '205 MB used',
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: 0.2,
                            backgroundColor:
                                theme.colorScheme.surfaceContainerHighest,
                            minHeight: 6,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  TextButton(
                    onPressed: () {},
                    child: const Text('Manage'),
                  ),
                ],
              ),
            ),
          ),
        ),

        // Downloads list
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: _downloads.length,
            itemBuilder: (context, index) {
              final download = _downloads[index];
              return Card(
                child: ListTile(
                  leading: Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: theme.colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      download.isComplete
                          ? Icons.download_done
                          : Icons.downloading,
                      color: download.isComplete
                          ? AppColors.success
                          : AppColors.primary,
                    ),
                  ),
                  title: Text(download.lessonTitle),
                  subtitle: Text('${download.courseTitle} • ${download.size}'),
                  trailing: download.isComplete
                      ? IconButton(
                          icon: const Icon(Icons.delete_outline),
                          onPressed: () {},
                        )
                      : SizedBox(
                          width: 40,
                          height: 40,
                          child: CircularProgressIndicator(
                            value: download.progress,
                            strokeWidth: 3,
                          ),
                        ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

/// Empty state widget
class _EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;

  const _EmptyState({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 64,
              color: theme.colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: 16),
            Text(
              title,
              style: theme.textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: onAction,
                child: Text(actionLabel!),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// Mock data classes
class _EnrolledCourse {
  final Course course;
  final double progress;
  final String lastAccessedLesson;

  _EnrolledCourse({
    required this.course,
    required this.progress,
    required this.lastAccessedLesson,
  });
}

class _Download {
  final String courseTitle;
  final String lessonTitle;
  final String size;
  final bool isComplete;
  final double? progress;

  _Download({
    required this.courseTitle,
    required this.lessonTitle,
    required this.size,
    required this.isComplete,
    this.progress,
  });
}

Course _mockCourse(int id, String title) {
  return Course(
    id: 'course_$id',
    title: title,
    slug: 'course-$id',
    description: 'Learn $title',
    shortDescription: 'Master $title',
    thumbnailUrl: 'https://picsum.photos/400/225?random=$id',
    instructorId: 'instructor_1',
    instructorName: 'John Doe',
    instructorAvatar: 'https://i.pravatar.cc/150?u=$id',
    category: 'Development',
    tags: [],
    rating: 4.5,
    reviewCount: 500,
    enrollmentCount: 5000,
    totalLessons: 50,
    totalDuration: const Duration(hours: 15),
    level: CourseLevel.intermediate,
    language: 'English',
    price: 49.99,
    isFree: false,
    isPublished: true,
    hasCertificate: true,
    createdAt: DateTime.now(),
    updatedAt: DateTime.now(),
    sections: [],
    requirements: [],
    whatYouWillLearn: [],
  );
}
