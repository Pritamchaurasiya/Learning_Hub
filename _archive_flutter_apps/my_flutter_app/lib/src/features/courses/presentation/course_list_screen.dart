import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:my_flutter_app/src/core/common_widgets/error_view.dart';
import 'package:my_flutter_app/src/core/common_widgets/responsive_center.dart';
import 'package:my_flutter_app/src/core/theme/app_theme.dart';
import 'package:my_flutter_app/src/core/widgets/responsive_layout.dart';
import 'package:my_flutter_app/src/features/ai/presentation/widgets/trending_courses_section.dart';
import 'package:my_flutter_app/src/features/courses/domain/course_model.dart';
import 'package:my_flutter_app/src/features/courses/presentation/course_controller.dart';

class CourseListScreen extends ConsumerWidget {
  const CourseListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stateAsync = ref.watch(courseControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('Explore Courses',
            style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        centerTitle: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.person_outline),
            onPressed: () => context.push('/profile'),
          ),
        ],
      ),
      body: stateAsync.when(
        data: (state) => RefreshIndicator(
          onRefresh: () => ref.refresh(courseControllerProvider.future),
          child: ResponsiveCenter(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Search & Filter Bar
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          decoration: InputDecoration(
                            prefixIcon: const Icon(Icons.search),
                            hintText: 'Search topics, skills...',
                            filled: true,
                            fillColor: Theme.of(context).cardTheme.color,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(16),
                              borderSide: BorderSide.none,
                            ),
                          ),
                          onChanged: (value) => ref
                              .read(courseControllerProvider.notifier)
                              .search(value),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        decoration: BoxDecoration(
                          color: Theme.of(context).cardTheme.color,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: state.selectedLevel,
                            hint: const Text('Level'),
                            icon: const Icon(Icons.filter_list),
                            borderRadius: BorderRadius.circular(16),
                            onChanged: (value) => ref
                                .read(courseControllerProvider.notifier)
                                .filterByLevel(value),
                            items: const [
                              DropdownMenuItem(child: Text('All Levels')),
                              DropdownMenuItem(
                                  value: 'Beginner', child: Text('Beginner')),
                              DropdownMenuItem(
                                  value: 'Intermediate',
                                  child: Text('Intermediate')),
                              DropdownMenuItem(
                                  value: 'Advanced', child: Text('Advanced')),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Trending Courses Section (AI-Powered)
                const TrendingCoursesSection(),

                const SizedBox(height: 24),

                // All Courses Header
                Text(
                  'All Courses',
                  style: GoogleFonts.outfit(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),

                const SizedBox(height: 16),

                // Course Grid/List
                Expanded(
                  child: state.filteredCourses.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.search_off,
                                  size: 80,
                                  color: Theme.of(context).disabledColor),
                              const SizedBox(height: 16),
                              Text(
                                'No courses found matching your criteria.',
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                            ],
                          ),
                        )
                      : ResponsiveLayout(
                          mobileBody: ListView.separated(
                            padding: const EdgeInsets.only(bottom: 24),
                            itemCount: state.filteredCourses.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 16),
                            itemBuilder: (context, index) {
                              final course = state.filteredCourses[index];
                              return _CourseCard(course: course);
                            },
                          ),
                          desktopBody: GridView.builder(
                            padding: const EdgeInsets.only(bottom: 24),
                            gridDelegate:
                                const SliverGridDelegateWithMaxCrossAxisExtent(
                              maxCrossAxisExtent: 320,
                              childAspectRatio: 0.85,
                              crossAxisSpacing: 24,
                              mainAxisSpacing: 24,
                            ),
                            itemCount: state.filteredCourses.length,
                            itemBuilder: (context, index) {
                              final course = state.filteredCourses[index];
                              return _CourseCard(course: course, isGrid: true);
                            },
                          ),
                        ),
                ),
              ],
            ),
          ),
        ),
        loading: () => const _ShimmerLoading(),
        error: (err, stack) => ErrorView(
          message: 'Failed to load courses: $err',
          onRetry: () => ref.refresh(courseControllerProvider),
        ),
      ),
    );
  }
}

/// Shimmer loading placeholder for courses
class _ShimmerLoading extends StatelessWidget {
  const _ShimmerLoading();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Shimmer search bar
          Container(
            height: 56,
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(16),
            ),
          ),
          const SizedBox(height: 24),
          // Shimmer title
          Container(
            height: 28,
            width: 200,
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          const SizedBox(height: 16),
          // Shimmer cards
          Expanded(
            child: ListView.separated(
              itemCount: 4,
              separatorBuilder: (_, __) => const SizedBox(height: 16),
              itemBuilder: (context, index) => const _ShimmerCard(),
            ),
          ),
        ],
      ),
    );
  }
}

/// Individual shimmer card placeholder
class _ShimmerCard extends StatelessWidget {
  const _ShimmerCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 100,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Theme.of(context).dividerColor.withValues(alpha: 0.1),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 120,
            height: 80,
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  height: 16,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color:
                        Theme.of(context).colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  height: 12,
                  width: 200,
                  decoration: BoxDecoration(
                    color:
                        Theme.of(context).colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  height: 12,
                  width: 100,
                  decoration: BoxDecoration(
                    color:
                        Theme.of(context).colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CourseCard extends StatelessWidget {
  const _CourseCard({required this.course, this.isGrid = false});

  final Course course;
  final bool isGrid;

  @override
  Widget build(BuildContext context) {
    return _HoverScaleCard(
      child: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).cardTheme.color,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: Theme.of(context).dividerColor.withValues(alpha: 0.1),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => context.go('/courses/${course.slug}'),
          child:
              isGrid ? _buildGridContent(context) : _buildListContent(context),
        ),
      ),
    );
  }

  Widget _buildGridContent(BuildContext context) {
    // Mock logic for bestseller tag
    final isBestseller = course.rating > 4.5 && course.totalStudents > 1000;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Stack(
          children: [
            AspectRatio(
              aspectRatio: 16 / 9,
              child: course.thumbnailUrl != null
                  ? CachedNetworkImage(
                      imageUrl: course.thumbnailUrl!,
                      fit: BoxFit.cover,
                      placeholder: (context, url) => Container(
                        color: Theme.of(context)
                            .colorScheme
                            .surfaceContainerHighest,
                        child: const Center(
                          child: CircularProgressIndicator(),
                        ),
                      ),
                      errorWidget: (context, url, error) => Container(
                        color: Theme.of(context)
                            .colorScheme
                            .surfaceContainerHighest,
                        child: const Center(
                          child:
                              Icon(Icons.school, size: 48, color: Colors.grey),
                        ),
                      ),
                    )
                  : Container(
                      color:
                          Theme.of(context).colorScheme.surfaceContainerHighest,
                      child: const Center(
                        child: Icon(Icons.school, size: 48, color: Colors.grey),
                      ),
                    ),
            ),
            if (isBestseller)
              Positioned(
                top: 8,
                left: 8,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.warningColor,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    'BESTSELLER',
                    style: GoogleFonts.outfit(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                ),
              ),
          ],
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      course.title,
                      style: GoogleFonts.outfit(
                        fontWeight: FontWeight.w600,
                        fontSize: 16,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        // Instructor Avatar (Mock)
                        CircleAvatar(
                          radius: 10,
                          backgroundColor:
                              Theme.of(context).colorScheme.primaryContainer,
                          child: Text(
                            (course.instructorName ?? 'I')[0],
                            style: GoogleFonts.outfit(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: Theme.of(context).colorScheme.primary,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            course.instructorName ?? 'Expert Instructor',
                            style: GoogleFonts.outfit(
                              fontSize: 12,
                              color: Theme.of(context).hintColor,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Text(
                          course.rating.toStringAsFixed(1),
                          style: GoogleFonts.outfit(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            color: Colors.amber[800],
                          ),
                        ),
                        const SizedBox(width: 2),
                        Icon(Icons.star, size: 14, color: Colors.amber[800]),
                        const SizedBox(width: 4),
                        Text(
                          '(${course.totalStudents})',
                          style: GoogleFonts.outfit(
                            fontSize: 12,
                            color: Theme.of(context).hintColor,
                          ),
                        ),
                      ],
                    ),
                    Text(
                      '\$${course.price}',
                      style: GoogleFonts.outfit(
                        fontWeight: FontWeight.bold,
                        fontSize: 18,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildListContent(BuildContext context) {
    final isBestseller =
        (course.avgRating ?? 0) > 4.5 && (course.enrollmentCount ?? 0) > 1000;

    return Padding(
      padding: const EdgeInsets.all(12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Stack(
            children: [
              Container(
                width: 120,
                height: 80,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(8),
                  image: course.thumbnailUrl != null
                      ? DecorationImage(
                          image:
                              CachedNetworkImageProvider(course.thumbnailUrl!),
                          fit: BoxFit.cover,
                        )
                      : null,
                ),
                child: course.thumbnailUrl == null
                    ? const Center(
                        child: Icon(Icons.school, size: 32, color: Colors.grey),
                      )
                    : null,
              ),
              if (isBestseller)
                Positioned(
                  top: 4,
                  left: 4,
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppTheme.warningColor,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      'BESTSELLER',
                      style: GoogleFonts.outfit(
                        fontSize: 8,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      course.title,
                      style: GoogleFonts.outfit(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      course.description,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Theme.of(context).hintColor,
                            fontSize: 12,
                          ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    CircleAvatar(
                      radius: 8,
                      backgroundColor:
                          Theme.of(context).colorScheme.primaryContainer,
                      child: Text(
                        (course.instructorName ?? 'I')[0],
                        style: GoogleFonts.outfit(
                          fontSize: 8,
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      course.instructorName ?? 'Instructor',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      (course.avgRating ?? 0.0).toStringAsFixed(1),
                      style: GoogleFonts.outfit(
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                        color: Colors.amber[800],
                      ),
                    ),
                    const Icon(Icons.star, size: 12, color: Colors.amber),
                    const Spacer(),
                    Text(
                      '\$${course.price}',
                      style: GoogleFonts.outfit(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _HoverScaleCard extends StatefulWidget {
  const _HoverScaleCard({required this.child});
  final Widget child;

  @override
  State<_HoverScaleCard> createState() => _HoverScaleCardState();
}

class _HoverScaleCardState extends State<_HoverScaleCard> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: AnimatedScale(
        scale: _isHovered ? 1.03 : 1.0,
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
        child: widget.child,
      ),
    );
  }
}
