import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../data/models/course_model.dart';
import '../../../core/providers/cart_provider.dart';
import '../../notes/presentation/notes_tab.dart';
import '../../../shared/widgets/app_feedback.dart';

/// Mobile layout for course detail
class MobileLayout extends StatelessWidget {
  final Course course;
  final TabController tabController;
  final bool isEnrolled;
  final VoidCallback onEnroll;

  const MobileLayout({
    super.key,
    required this.course,
    required this.tabController,
    required this.isEnrolled,
    required this.onEnroll,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return CustomScrollView(
      slivers: [
        // App Bar with thumbnail
        SliverAppBar(
          expandedHeight: 220,
          pinned: true,
          flexibleSpace: FlexibleSpaceBar(
            background: Stack(
              fit: StackFit.expand,
              children: [
                Hero(
                  tag: course.id,
                  child: Image.network(
                    course.thumbnailUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      color: theme.colorScheme.surfaceContainerHighest,
                    ),
                  ),
                ),
                Container(
                  decoration: const BoxDecoration(
                    gradient: AppColors.imageOverlayGradient,
                  ),
                ),
                // Play preview button
                Center(
                  child: Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.9),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.play_arrow,
                      color: AppColors.primary,
                      size: 36,
                    ),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.share),
              onPressed: () {},
            ),
            IconButton(
              icon: Icon(isEnrolled ? Icons.bookmark : Icons.bookmark_border),
              onPressed: () {},
            ),
            Consumer(
              builder: (context, ref, child) {
                final cartItemCount = ref.watch(cartProvider).items.length;
                return IconButton(
                  icon: Badge(
                    isLabelVisible: cartItemCount > 0,
                    label: Text('$cartItemCount'),
                    child: const Icon(Icons.shopping_cart_outlined),
                  ),
                  onPressed: () => context.push('/cart'),
                );
              },
            ),
          ],
        ),

        // Course Info
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Category & Level
                Row(
                  children: [
                    CategoryChip(category: course.category),
                    const SizedBox(width: 8),
                    LevelChip(level: course.level),
                  ],
                ),
                const SizedBox(height: 12),

                // Title
                Text(
                  course.title,
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ).animate().fadeIn(duration: 400.ms),

                const SizedBox(height: 12),

                // Gamification Badge (Mobile)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                        color: AppColors.primary.withValues(alpha: 0.2)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.bolt, color: Colors.amber, size: 20)
                          .animate(onPlay: (c) => c.repeat())
                          .shimmer(duration: 2.seconds, color: Colors.amber),
                      const SizedBox(width: 8),
                      Text(
                        'Earn 500 XP + Rare Badge',
                        style: theme.textTheme.labelLarge?.copyWith(
                          color: AppColors.primary,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ).animate().fadeIn(delay: 200.ms).slideX(),

                const SizedBox(height: 8),

                // Stats Row
                Row(
                  children: [
                    const Icon(Icons.star, size: 18, color: AppColors.warning),
                    const SizedBox(width: 4),
                    Text(
                      '${course.rating}',
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '(${_formatCount(course.reviewCount)} reviews)',
                      style: theme.textTheme.bodySmall,
                    ),
                    const SizedBox(width: 16),
                    Icon(Icons.people_outline,
                        size: 18, color: theme.colorScheme.onSurfaceVariant),
                    const SizedBox(width: 4),
                    Text(
                      '${_formatCount(course.enrollmentCount)} students',
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                ),

                const SizedBox(height: 12),

                // Instructor
                InstructorRow(course: course),

                const SizedBox(height: 16),

                // Course Meta
                Wrap(
                  spacing: 16,
                  runSpacing: 8,
                  children: [
                    MetaItem(
                        icon: Icons.access_time,
                        text: course.formattedDuration),
                    MetaItem(
                        icon: Icons.play_circle_outline,
                        text: '${course.totalLessons} lessons'),
                    MetaItem(icon: Icons.language, text: course.language),
                    if (course.hasCertificate)
                      const MetaItem(
                          icon: Icons.workspace_premium, text: 'Certificate'),
                  ],
                ),
              ],
            ),
          ),
        ),

        // Tab Bar
        SliverPersistentHeader(
          pinned: true,
          delegate: TabBarDelegate(
            TabBar(
              controller: tabController,
              tabs: const [
                Tab(text: 'Overview'),
                Tab(text: 'Curriculum'),
                Tab(text: 'Reviews'),
                Tab(text: 'Notes'),
              ],
            ),
          ),
        ),

        // Tab Content
        SliverFillRemaining(
          child: TabBarView(
            controller: tabController,
            children: [
              OverviewTab(course: course),
              CurriculumTab(course: course, isEnrolled: isEnrolled),
              ReviewsTab(course: course),
              NotesTab(courseId: course.id),
            ],
          ),
        ),
      ],
    );
  }
}

/// Desktop layout for course detail
class DesktopLayout extends StatelessWidget {
  final Course course;
  final TabController tabController;
  final bool isEnrolled;
  final VoidCallback onEnroll;

  const DesktopLayout({
    super.key,
    required this.course,
    required this.tabController,
    required this.isEnrolled,
    required this.onEnroll,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        // Main Content
        Expanded(
          flex: 2,
          child: CustomScrollView(
            slivers: [
              SliverAppBar(
                title: Text(course.title),
                pinned: true,
                actions: [
                  Consumer(
                    builder: (context, ref, child) {
                      final cartItemCount =
                          ref.watch(cartProvider).items.length;
                      return IconButton(
                        icon: Badge(
                          isLabelVisible: cartItemCount > 0,
                          label: Text('$cartItemCount'),
                          child: const Icon(Icons.shopping_cart_outlined),
                        ),
                        onPressed: () => context.push('/cart'),
                      );
                    },
                  ),
                  const SizedBox(width: 16),
                ],
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Video Preview
                      AspectRatio(
                        aspectRatio: 16 / 9,
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Stack(
                            fit: StackFit.expand,
                            children: [
                              Hero(
                                tag: course.id,
                                child: Image.network(
                                  course.thumbnailUrl,
                                  fit: BoxFit.cover,
                                ),
                              ),
                              Container(color: Colors.black26),
                              Center(
                                child: Container(
                                  width: 72,
                                  height: 72,
                                  decoration: const BoxDecoration(
                                    color: Colors.white,
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(
                                    Icons.play_arrow,
                                    color: AppColors.primary,
                                    size: 40,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      const SizedBox(height: 24),

                      // Title
                      Text(
                        course.title,
                        style: theme.textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),

                      const SizedBox(height: 16),

                      // Tabs
                      TabBar(
                        controller: tabController,
                        tabs: const [
                          Tab(text: 'Overview'),
                          Tab(text: 'Curriculum'),
                          Tab(text: 'Reviews'),
                          Tab(text: 'Notes'),
                        ],
                      ),

                      SizedBox(
                        height: 800,
                        child: TabBarView(
                          controller: tabController,
                          children: [
                            OverviewTab(course: course),
                            CurriculumTab(
                                course: course, isEnrolled: isEnrolled),
                            ReviewsTab(course: course),
                            NotesTab(courseId: course.id),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),

        // Sidebar with pricing
        Container(
          width: 380,
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: theme.colorScheme.surface,
            border: Border(
              left: BorderSide(color: theme.dividerColor),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              PriceCard(course: course, onEnroll: onEnroll),
              const SizedBox(height: 24),

              // Gamification Reward Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      AppColors.primary.withValues(alpha: 0.1),
                      Colors.purple.withValues(alpha: 0.1),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: AppColors.primary.withValues(alpha: 0.3),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black12,
                            blurRadius: 8,
                            offset: Offset(0, 4),
                          ),
                        ],
                      ),
                      child:
                          const Icon(Icons.bolt, color: Colors.amber, size: 28),
                    )
                        .animate(onPlay: (c) => c.repeat())
                        .shimmer(duration: 2.seconds, color: Colors.amber),
                    const SizedBox(width: 16),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Course Rewards',
                          style: theme.textTheme.labelMedium?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Text(
                              '+500 XP',
                              style: theme.textTheme.titleLarge?.copyWith(
                                color: AppColors.primary,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.amber.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                'Rare Badge',
                                style: theme.textTheme.labelSmall?.copyWith(
                                  color: Colors.amber[800],
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ).animate().fadeIn(delay: 600.ms).slideY(begin: 0.2, end: 0),
            ],
          ),
        ),
      ],
    );
  }
}

// Overview Tab
class OverviewTab extends StatelessWidget {
  final Course course;

  const OverviewTab({super.key, required this.course});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // What you'll learn
          Text(
            'What you\'ll learn',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              border: Border.all(color: theme.colorScheme.outlineVariant),
              borderRadius: BorderRadius.circular(12),
            ),
            child: LayoutBuilder(
              builder: (context, constraints) {
                final isWide = constraints.maxWidth > 600;
                return Wrap(
                  spacing: 16,
                  runSpacing: 12,
                  children:
                      course.whatYouWillLearn.asMap().entries.map((entry) {
                    final index = entry.key;
                    final item = entry.value;
                    return SizedBox(
                      width: isWide
                          ? (constraints.maxWidth - 16) / 2
                          : constraints.maxWidth,
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.check,
                              size: 20, color: AppColors.success),
                          const SizedBox(width: 12),
                          Expanded(
                            child:
                                Text(item, style: theme.textTheme.bodyMedium),
                          ),
                        ],
                      )
                          .animate()
                          .fadeIn(delay: (100 * index).ms, duration: 400.ms)
                          .slideX(begin: -0.2, end: 0),
                    );
                  }).toList(),
                );
              },
            ),
          ),

          const SizedBox(height: 24),

          // Description
          Text(
            'Description',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            course.description,
            style: theme.textTheme.bodyMedium?.copyWith(
              height: 1.6,
            ),
          ),

          const SizedBox(height: 24),

          // Requirements
          Text(
            'Requirements',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          ...course.requirements.map((req) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('• ', style: TextStyle(fontSize: 16)),
                    Expanded(child: Text(req)),
                  ],
                ),
              )),
        ],
      ),
    );
  }
}

// Curriculum Tab
class CurriculumTab extends StatelessWidget {
  final Course course;
  final bool isEnrolled;

  const CurriculumTab(
      {super.key, required this.course, required this.isEnrolled});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: course.sections.length,
      itemBuilder: (context, index) {
        final section = course.sections[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ExpansionTile(
            title: Text(
              section.title,
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            subtitle: Text(
              '${section.lessons.length} lessons • ${_formatDuration(section.totalDuration)}',
              style: theme.textTheme.bodySmall,
            ),
            children: section.lessons.map((lesson) {
              return ListTile(
                leading: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    lesson.type == LessonType.video
                        ? Icons.play_circle_outline
                        : Icons.quiz_outlined,
                    size: 20,
                  ),
                ),
                title: Text(lesson.title),
                subtitle: Text(lesson.formattedDuration),
                trailing: lesson.isFree || isEnrolled
                    ? const Icon(Icons.play_arrow, color: AppColors.primary)
                    : const Icon(Icons.lock_outline),
                onTap: (lesson.isFree || isEnrolled)
                    ? () =>
                        context.push('/course/${course.id}/lesson/${lesson.id}')
                    : null,
              );
            }).toList(),
          ),
        );
      },
    );
  }
}

// Reviews Tab
class ReviewsTab extends StatelessWidget {
  final Course course;

  const ReviewsTab({super.key, required this.course});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Rating Summary
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Column(
                  children: [
                    Text(
                      course.rating.toString(),
                      style: theme.textTheme.displaySmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Row(
                      children: List.generate(
                          5,
                          (i) => Icon(
                                i < course.rating.floor()
                                    ? Icons.star
                                    : Icons.star_border,
                                color: AppColors.warning,
                                size: 20,
                              )),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '(${_formatCount(course.reviewCount)} reviews)',
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                ),
                const SizedBox(width: 24),
                const Expanded(
                  child: Column(
                    children: [
                      RatingBar(label: '5', value: 0.7),
                      RatingBar(label: '4', value: 0.2),
                      RatingBar(label: '3', value: 0.05),
                      RatingBar(label: '2', value: 0.03),
                      RatingBar(label: '1', value: 0.02),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: 16),

        // Sample Reviews
        ...List.generate(
            5,
            (i) => Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            CircleAvatar(
                              backgroundImage: NetworkImage(
                                  'https://i.pravatar.cc/150?u=${i + 100}'),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    [
                                      'John D.',
                                      'Sarah M.',
                                      'Alex K.',
                                      'Maria L.',
                                      'David R.'
                                    ][i],
                                    style: theme.textTheme.titleSmall,
                                  ),
                                  Row(
                                    children: List.generate(
                                        5,
                                        (j) => Icon(
                                              Icons.star,
                                              size: 14,
                                              color: j < 4 + (i % 2)
                                                  ? AppColors.warning
                                                  : Colors.grey,
                                            )),
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              '${i + 1}d ago',
                              style: theme.textTheme.bodySmall,
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'This course is absolutely amazing! The instructor explains everything clearly and the projects are very practical. Highly recommended for anyone wanting to learn Flutter.',
                          style: theme.textTheme.bodyMedium,
                        ),
                      ],
                    ),
                  ),
                )),
      ],
    );
  }
}

// Helper Widgets
class CategoryChip extends StatelessWidget {
  final String category;

  const CategoryChip({super.key, required this.category});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        category,
        style: const TextStyle(
          color: AppColors.primary,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class LevelChip extends StatelessWidget {
  final CourseLevel level;

  const LevelChip({super.key, required this.level});

  @override
  Widget build(BuildContext context) {
    final color = switch (level) {
      CourseLevel.beginner => AppColors.difficultyBeginner,
      CourseLevel.intermediate => AppColors.difficultyIntermediate,
      CourseLevel.advanced ||
      CourseLevel.expert =>
        AppColors.difficultyAdvanced,
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        level.displayName,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class InstructorRow extends StatelessWidget {
  final Course course;

  const InstructorRow({super.key, required this.course});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        CircleAvatar(
          radius: 20,
          backgroundImage: NetworkImage(course.instructorAvatar),
        ),
        const SizedBox(width: 12),
        Text(
          course.instructorName,
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

class MetaItem extends StatelessWidget {
  final IconData icon;
  final String text;

  const MetaItem({super.key, required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: theme.colorScheme.onSurfaceVariant),
        const SizedBox(width: 4),
        Text(text, style: theme.textTheme.bodySmall),
      ],
    );
  }
}

class PriceCard extends ConsumerStatefulWidget {
  final Course course;
  final VoidCallback onEnroll;

  const PriceCard({super.key, required this.course, required this.onEnroll});

  @override
  ConsumerState<PriceCard> createState() => _PriceCardState();
}

class _PriceCardState extends ConsumerState<PriceCard> {
  bool _isHovering = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return MouseRegion(
      onEnter: (_) => setState(() => _isHovering = true),
      onExit: (_) => setState(() => _isHovering = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        transform: _isHovering
            ? Matrix4.diagonal3Values(1.02, 1.02, 1.0)
            : Matrix4.identity(),
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary
                  .withValues(alpha: _isHovering ? 0.15 : 0.05),
              blurRadius: _isHovering ? 20 : 10,
              offset: const Offset(0, 4),
            ),
          ],
          border: _isHovering
              ? Border.all(
                  color: AppColors.primary.withValues(alpha: 0.5), width: 2)
              : Border.all(color: theme.dividerColor),
        ),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (widget.course.isFree)
                Text(
                  'Free',
                  style: theme.textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppColors.success,
                  ),
                )
              else
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '\$${widget.course.price.toStringAsFixed(2)}',
                      style: theme.textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (widget.course.originalPrice != null) ...[
                      const SizedBox(width: 8),
                      Text(
                        '\$${widget.course.originalPrice!.toStringAsFixed(2)}',
                        style: theme.textTheme.titleMedium?.copyWith(
                          decoration: TextDecoration.lineThrough,
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ],
                ),
              if (widget.course.discountPercentage != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.error.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.timer_outlined,
                          size: 16, color: AppColors.error),
                      const SizedBox(width: 4),
                      Text(
                        '${widget.course.discountPercentage}% off - Limited time!',
                        style: const TextStyle(
                          color: AppColors.error,
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: widget.onEnroll,
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 20),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Text(
                    widget.course.isFree ? 'Enroll Now' : 'Buy Now',
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () {
                    ref.read(cartProvider.notifier).addToCart(widget.course);
                    AppFeedback.showSuccess(
                      context,
                      '${widget.course.title} added to cart',
                      action: 'View Cart',
                      onAction: () => context.push('/cart'),
                    );
                  },
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 20),
                    side: BorderSide(color: theme.colorScheme.primary),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text('Add to Cart'),
                ),
              ),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.verified_user_outlined,
                      size: 16, color: theme.colorScheme.onSurfaceVariant),
                  const SizedBox(width: 8),
                  Text(
                    '30-Day Money-Back Guarantee',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class RatingBar extends StatelessWidget {
  final String label;
  final double value;

  const RatingBar({super.key, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          SizedBox(width: 20, child: Text(label)),
          const SizedBox(width: 8),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: value,
                backgroundColor: theme.colorScheme.surfaceContainerHighest,
                minHeight: 8,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class TabBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar tabBar;

  TabBarDelegate(this.tabBar);

  @override
  Widget build(context, shrinkOffset, overlapsContent) {
    return Container(
      color: Theme.of(context).colorScheme.surface,
      child: tabBar,
    );
  }

  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  double get minExtent => tabBar.preferredSize.height;

  @override
  bool shouldRebuild(covariant SliverPersistentHeaderDelegate oldDelegate) =>
      false;
}

String _formatCount(int count) {
  if (count >= 1000000) {
    return '${(count / 1000000).toStringAsFixed(1)}M';
  }
  if (count >= 1000) {
    return '${(count / 1000).toStringAsFixed(1)}K';
  }
  return count.toString();
}

String _formatDuration(Duration duration) {
  final hours = duration.inHours;
  final minutes = duration.inMinutes % 60;
  if (hours > 0) {
    return '${hours}h ${minutes}m';
  }
  return '${minutes}m';
}

class MobilePurchaseBar extends StatelessWidget {
  final Course course;
  final bool isEnrolled;
  final VoidCallback onEnroll;

  const MobilePurchaseBar({
    super.key,
    required this.course,
    required this.isEnrolled,
    required this.onEnroll,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, -5),
          ),
        ],
        border: Border(
          top: BorderSide(
            color: theme.dividerColor,
          ),
        ),
      ),
      child: SafeArea(
        child: Row(
          children: [
            if (!isEnrolled && !course.isFree) ...[
              Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '\$${course.price.toStringAsFixed(2)}',
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  if (course.originalPrice != null)
                    Text(
                      '\$${course.originalPrice!.toStringAsFixed(2)}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        decoration: TextDecoration.lineThrough,
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                ],
              ),
              const SizedBox(width: 16),
            ],
            Expanded(
              child: FilledButton(
                onPressed: onEnroll,
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Text(
                  isEnrolled
                      ? 'Go to Course'
                      : course.isFree
                          ? 'Enroll for Free'
                          : 'Buy Now',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
