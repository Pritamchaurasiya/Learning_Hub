import 'package:cached_network_image/cached_network_image.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:my_flutter_app/src/core/widgets/glass_container.dart';
import 'package:my_flutter_app/src/core/widgets/responsive_layout.dart';
import 'package:my_flutter_app/src/features/ai/presentation/voice_tutor_widget.dart';
import 'package:my_flutter_app/src/features/auth/presentation/auth_controller.dart';
import 'package:my_flutter_app/src/features/courses/domain/course_model.dart';
import 'package:my_flutter_app/src/features/courses/presentation/course_controller.dart';

class LandingScreen extends StatelessWidget {
  const LandingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const ResponsiveLayout(
      mobileBody: _MobileHome(),
      desktopBody: _DesktopHome(),
    );
  }
}

class _MobileHome extends ConsumerStatefulWidget {
  const _MobileHome();

  @override
  ConsumerState<_MobileHome> createState() => _MobileHomeState();
}

class _MobileHomeState extends ConsumerState<_MobileHome> {
  int _selectedFilterIndex = 0;
  final TextEditingController _searchController = TextEditingController();

  final List<({String label, IconData? icon, Color? color, String route})>
      _filterItems = const [
    (
      label: 'For You',
      icon: Icons.auto_awesome,
      color: null,
      route: '/courses',
    ),
    (
      label: 'Trending',
      icon: Icons.local_fire_department,
      color: Colors.orange,
      route: '/courses',
    ),
    (
      label: 'DSA Arena',
      icon: Icons.code,
      color: Color(0xFF3B82F6),
      route: '/dsa',
    ),
    (
      label: 'Tests A+',
      icon: Icons.quiz,
      color: Color(0xFF10B981),
      route: '/hub',
    ),
    (
      label: 'Mentors',
      icon: Icons.person_search,
      color: Colors.purpleAccent,
      route: '/tutors',
    ),
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _handleSearch(String query) {
    final trimmed = query.trim();
    if (trimmed.isNotEmpty) {
      ref.read(courseControllerProvider.notifier).search(trimmed);
      context.push('/courses');
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authControllerProvider).value;
    final myCoursesAsync = ref.watch(myCoursesProvider);

    return Scaffold(
      extendBodyBehindAppBar: true,
      floatingActionButton: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          FloatingActionButton(
            heroTag: 'ai_chat_fab',
            onPressed: () => context.push('/ai-chat'),
            backgroundColor: const Color(0xFF6366F1),
            tooltip: 'AI Chat',
            child: const Icon(Icons.auto_awesome, color: Colors.white),
          ),
          const SizedBox(height: 12),
          FloatingActionButton.extended(
            heroTag: 'voice_tutor_fab',
            onPressed: () {
              showModalBottomSheet<void>(
                context: context,
                isScrollControlled: true,
                backgroundColor: Colors.transparent,
                builder: (_) => const VoiceTutorWidget(),
              );
            },
            label: const Text('AI Tutor'),
            icon: const Icon(Icons.mic),
            backgroundColor: const Color(0xFF3B82F6),
          ),
        ],
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            // Header & Search
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 60, 20, 10),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Welcome back,',
                            style: GoogleFonts.outfit(
                              fontSize: 14,
                              color: Colors.white70,
                            ),
                          ),
                          Text(
                            user?.displayName ?? 'Scholar!',
                            style: GoogleFonts.outfit(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                      GestureDetector(
                        onTap: () => context.push('/profile'),
                        child: CircleAvatar(
                          radius: 24,
                          backgroundColor: const Color(0xFF3B82F6),
                          child: Text(
                            (user?.displayName ?? 'U').isNotEmpty
                                ? (user?.displayName ?? 'U')[0].toUpperCase()
                                : 'U',
                            style: GoogleFonts.outfit(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 18,
                            ),
                          ),
                        ).animate().scale(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  // Search Bar
                  GlassContainer(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    child: TextField(
                      controller: _searchController,
                      style: const TextStyle(color: Colors.white),
                      textInputAction: TextInputAction.search,
                      onSubmitted: _handleSearch,
                      decoration: InputDecoration(
                        border: InputBorder.none,
                        hintText: 'Search courses, skills, mentors...',
                        hintStyle: TextStyle(
                            color: Colors.white.withValues(alpha: 0.5)),
                        prefixIcon: Icon(Icons.search,
                            color: Colors.white.withValues(alpha: 0.5)),
                        suffixIcon: IconButton(
                          icon: Icon(Icons.arrow_forward,
                              color: Colors.white.withValues(alpha: 0.7)),
                          onPressed: () =>
                              _handleSearch(_searchController.text),
                        ),
                      ),
                    ),
                  ).animate().fadeIn(delay: 100.ms),
                  const SizedBox(height: 20),
                  // Filters Horizontal List
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: List.generate(_filterItems.length, (index) {
                        final item = _filterItems[index];
                        final isSelected = _selectedFilterIndex == index;
                        return Padding(
                          padding: const EdgeInsets.only(right: 12),
                          child: GestureDetector(
                            onTap: () {
                              setState(() => _selectedFilterIndex = index);
                              if (index > 1) {
                                context.push(item.route);
                              }
                            },
                            child: _FilterChip(
                              label: item.label,
                              isSelected: isSelected,
                              icon: item.icon,
                              color: item.color,
                            ),
                          ),
                        );
                      }),
                    ),
                  ).animate().slideX(delay: 200.ms),

                  // Continue Learning Section (if enrolled)
                  myCoursesAsync.when(
                    data: (myCourses) {
                      if (myCourses.isEmpty) return const SizedBox.shrink();
                      final activeCourse = myCourses.first;
                      return Padding(
                        padding: const EdgeInsets.only(top: 24),
                        child: _ContinueLearningCard(course: activeCourse),
                      );
                    },
                    loading: () => const SizedBox.shrink(),
                    error: (_, __) => const SizedBox.shrink(),
                  ),

                  const SizedBox(height: 24),
                  // AI Research Lab Card
                  GestureDetector(
                    onTap: () => context.push('/ai/world-models'),
                    child: Container(
                      decoration: BoxDecoration(
                        border: Border.all(
                            color: Colors.purpleAccent.withValues(alpha: 0.3)),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: GlassContainer(
                        padding: const EdgeInsets.all(20),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.purple.withValues(alpha: 0.2),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.psychology,
                                  color: Colors.purpleAccent, size: 28),
                            ).animate(onPlay: (c) => c.repeat()).shimmer(
                                duration: 2000.ms,
                                color:
                                    Colors.purpleAccent.withValues(alpha: 0.5)),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          'NEURO-SYMBOLIC CORE',
                                          overflow: TextOverflow.ellipsis,
                                          style: GoogleFonts.spaceMono(
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                            color: Colors.purpleAccent,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: Colors.purpleAccent
                                              .withValues(alpha: 0.2),
                                          borderRadius:
                                              BorderRadius.circular(4),
                                        ),
                                        child: const Text('ACTIVE',
                                            style: TextStyle(
                                                fontSize: 8,
                                                color: Colors.purpleAccent,
                                                fontWeight: FontWeight.bold)),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'World Model & Causal Graph',
                                    style: GoogleFonts.outfit(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                  Text(
                                    "Explore multi-step cognitive plans and reasoning.",
                                    style: GoogleFonts.outfit(
                                      fontSize: 12,
                                      color: Colors.white60,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const Icon(Icons.arrow_forward_ios,
                                color: Colors.white54, size: 16),
                          ],
                        ),
                      ),
                    ),
                  ).animate().fadeIn(delay: 250.ms).slideY(begin: 0.2),
                ]),
              ),
            ),

            // Alert & Streak Cards
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  const SizedBox(height: 16),
                  // Alert Card -> tests hub
                  GestureDetector(
                    onTap: () => context.push('/hub'),
                    child: GlassContainer(
                      opacity: 0.05,
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color:
                                  const Color(0xFF3B82F6).withValues(alpha: 0.1),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.quiz,
                                color: Color(0xFF3B82F6), size: 20),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'UX & Architecture Quiz Ready',
                                  style: GoogleFonts.outfit(
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                                Text(
                                  '• Earn +100 XP upon completion',
                                  style: GoogleFonts.outfit(
                                    fontSize: 12,
                                    color: const Color(0xFF10B981),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          FilledButton(
                            onPressed: () => context.push('/hub'),
                            style: FilledButton.styleFrom(
                              backgroundColor: const Color(0xFF3B82F6),
                              visualDensity: VisualDensity.compact,
                            ),
                            child: const Text('Start'),
                          ),
                        ],
                      ),
                    ),
                  ).animate().slideY(delay: 300.ms),
                  const SizedBox(height: 16),
                  // Streak Card -> DSA practice
                  GestureDetector(
                    onTap: () => context.push('/dsa'),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFFFFF7ED), Color(0xFFFFEDD5)],
                        ),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: const BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.local_fire_department,
                                color: Colors.orange, size: 24),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '12-Day Learning Streak!',
                                  style: GoogleFonts.outfit(
                                    fontWeight: FontWeight.bold,
                                    color: Colors.black87,
                                    fontSize: 15,
                                  ),
                                ),
                                Text(
                                  "Solve 1 DSA challenge today.",
                                  style: GoogleFonts.outfit(
                                    fontSize: 12,
                                    color: Colors.black54,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          FilledButton(
                            onPressed: () => context.push('/dsa'),
                            style: FilledButton.styleFrom(
                              backgroundColor: Colors.orange,
                              foregroundColor: Colors.white,
                              visualDensity: VisualDensity.compact,
                            ),
                            child: const Text('Practice 🔥'),
                          ),
                        ],
                      ),
                    ),
                  ).animate().slideY(delay: 400.ms),
                ]),
              ),
            ),

            // Weekly Activity Chart
            SliverPadding(
              padding: const EdgeInsets.all(20),
              sliver: SliverToBoxAdapter(
                child: GlassContainer(
                  height: 280,
                  opacity: 0.05,
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Weekly Activity',
                            style: GoogleFonts.outfit(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                              color: Colors.white,
                            ),
                          ),
                          GestureDetector(
                            onTap: () => context.push('/dashboard'),
                            child: Text(
                              'View Stats ->',
                              style: GoogleFonts.outfit(
                                fontSize: 12,
                                color: const Color(0xFF3B82F6),
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      Expanded(
                        child: BarChart(
                          BarChartData(
                            alignment: BarChartAlignment.spaceAround,
                            maxY: 10,
                            barTouchData: const BarTouchData(enabled: false),
                            titlesData: FlTitlesData(
                              bottomTitles: AxisTitles(
                                sideTitles: SideTitles(
                                  showTitles: true,
                                  getTitlesWidget: (value, meta) {
                                    const days = [
                                      'M',
                                      'T',
                                      'W',
                                      'T',
                                      'F',
                                      'S',
                                      'S'
                                    ];
                                    if (value.toInt() >= 0 &&
                                        value.toInt() < days.length) {
                                      return Padding(
                                        padding: const EdgeInsets.only(top: 8),
                                        child: Text(
                                          days[value.toInt()],
                                          style: GoogleFonts.outfit(
                                            color: value.toInt() == 4
                                                ? const Color(0xFF3B82F6)
                                                : Colors.white38,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      );
                                    }
                                    return const SizedBox();
                                  },
                                ),
                              ),
                              leftTitles: const AxisTitles(),
                              rightTitles: const AxisTitles(),
                              topTitles: const AxisTitles(),
                            ),
                            gridData: const FlGridData(show: false),
                            borderData: FlBorderData(show: false),
                            barGroups: [
                              _makeGroup(0, 3),
                              _makeGroup(1, 5),
                              _makeGroup(2, 4),
                              _makeGroup(3, 2),
                              _makeGroup(4, 8, isSelected: true),
                              _makeGroup(5, 6),
                              _makeGroup(6, 4),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      const Row(
                        children: [
                          Expanded(
                            child: _StatBadge(
                              icon: Icons.trending_up,
                              label: 'Skills Mastered',
                              value: '+3 this week',
                              color: Colors.green,
                            ),
                          ),
                          SizedBox(width: 12),
                          Expanded(
                            child: _StatBadge(
                              icon: Icons.emoji_events,
                              label: 'Total XP',
                              value: '1,250 pts',
                              color: Colors.purple,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ).animate().fadeIn(delay: 500.ms),
              ),
            ),

            // Explore Topics
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  children: [
                    _SectionHeader(
                      title: 'Explore Topics',
                      action: 'Browse All',
                      onActionTap: () => context.push('/courses'),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: GestureDetector(
                            onTap: () {
                              ref
                                  .read(courseControllerProvider.notifier)
                                  .filterByCategory('programming');
                              context.push('/courses');
                            },
                            child: const _TopicCard(
                              title: 'Engineering',
                              count: '120+ Courses',
                              icon: Icons.code,
                              color: Color(0xFF3B82F6),
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: GestureDetector(
                            onTap: () {
                              ref
                                  .read(courseControllerProvider.notifier)
                                  .filterByCategory('design');
                              context.push('/courses');
                            },
                            child: const _TopicCard(
                              title: 'UI/UX Design',
                              count: '80+ Courses',
                              icon: Icons.brush,
                              color: Color(0xFFEC4899),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ).animate().fadeIn(delay: 600.ms),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 32)),

            // Recommended For You
            SliverToBoxAdapter(
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: _SectionHeader(
                      title: 'Recommended for You',
                      action: 'See All',
                      onActionTap: () => context.push('/courses'),
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 280,
                    child: Consumer(
                      builder: (context, ref, _) {
                        final courseStateAsync =
                            ref.watch(courseControllerProvider);
                        return courseStateAsync.when(
                          data: (state) {
                            final courses = state.courses;
                            if (courses.isEmpty) {
                              return const Center(
                                child: Text('No courses available',
                                    style: TextStyle(color: Colors.white70)),
                              );
                            }
                            return ListView.separated(
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 20),
                              scrollDirection: Axis.horizontal,
                              itemCount: courses.length,
                              separatorBuilder: (_, __) =>
                                  const SizedBox(width: 16),
                              itemBuilder: (context, index) =>
                                  _CourseCard(course: courses[index]),
                            );
                          },
                          loading: () =>
                              const Center(child: CircularProgressIndicator()),
                          error: (err, _) => Center(
                            child: Text('Error: $err',
                                style: const TextStyle(color: Colors.redAccent)),
                          ),
                        );
                      },
                    ),
                  ).animate().slideX(delay: 700.ms, begin: 0.2),
                ],
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 100)),
          ],
        ),
      ),
      bottomNavigationBar: GlassContainer(
        height: 80,
        borderRadius: 0,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            GestureDetector(
              onTap: () => context.go('/'),
              child: const _NavBarItem(
                  icon: Icons.home_filled, label: 'Home', isSelected: true),
            ),
            GestureDetector(
              onTap: () => context.push('/hub'),
              child: const _NavBarItem(
                  icon: Icons.explore_outlined, label: 'Explore'),
            ),
            GestureDetector(
              onTap: () => context.push('/courses'),
              child: const _NavBarItem(
                  icon: Icons.play_circle_outline, label: 'Courses'),
            ),
            GestureDetector(
              onTap: () => context.push('/profile'),
              child: const _NavBarItem(
                  icon: Icons.person_outline, label: 'Profile'),
            ),
          ],
        ),
      ),
    );
  }

  BarChartGroupData _makeGroup(int x, double y, {bool isSelected = false}) {
    return BarChartGroupData(
      x: x,
      barRods: [
        BarChartRodData(
          toY: y,
          color: isSelected ? const Color(0xFF3B82F6) : Colors.white24,
          width: 12,
          borderRadius: BorderRadius.circular(4),
          backDrawRodData: BackgroundBarChartRodData(
            show: true,
            toY: 10,
            color: Colors.white.withValues(alpha: 0.05),
          ),
        ),
      ],
    );
  }
}

class _ContinueLearningCard extends StatelessWidget {
  const _ContinueLearningCard({required this.course});

  final Course course;

  @override
  Widget build(BuildContext context) {
    final progress = course.userProgress;

    return GlassContainer(
      opacity: 0.08,
      padding: const EdgeInsets.all(16),
      borderRadius: 16,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'CONTINUE LEARNING',
                  style: GoogleFonts.outfit(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF10B981),
                  ),
                ),
              ),
              const Spacer(),
              Text(
                '${(progress ?? 0.0).toInt()}% completed',
                style: GoogleFonts.outfit(
                  fontSize: 12,
                  color: Colors.white70,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            course.title,
            style: GoogleFonts.outfit(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: ((progress ?? 0.0) / 100.0).clamp(0.0, 1.0),
              backgroundColor: Colors.white12,
              valueColor:
                  const AlwaysStoppedAnimation<Color>(Color(0xFF3B82F6)),
              minHeight: 6,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${course.totalLessons} lessons total',
                style: GoogleFonts.outfit(
                  fontSize: 12,
                  color: Colors.white38,
                ),
              ),
              FilledButton.tonalIcon(
                onPressed: () {
                  context.push('/courses/${course.slug}');
                },
                icon: const Icon(Icons.play_arrow, size: 16),
                label: const Text('Resume'),
                style: FilledButton.styleFrom(
                  visualDensity: VisualDensity.compact,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _DesktopHome extends ConsumerWidget {
  const _DesktopHome();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 1280),
        child: const _MobileHome(),
      ),
    );
  }
}

class _CourseCard extends StatelessWidget {
  const _CourseCard({required this.course});
  final Course course;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/courses/${course.slug}'),
      child: Container(
        width: 240,
        decoration: BoxDecoration(
          color: const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(20)),
              child: SizedBox(
                height: 120,
                width: double.infinity,
                child: course.thumbnailUrl != null
                    ? CachedNetworkImage(
                        imageUrl: course.thumbnailUrl!,
                        fit: BoxFit.cover,
                        placeholder: (context, url) =>
                            const Center(child: CircularProgressIndicator()),
                        errorWidget: (context, url, error) =>
                            const Icon(Icons.error),
                      )
                    : Container(
                        color: Colors.blueGrey,
                        child: const Icon(Icons.image, color: Colors.white24),
                      ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.star, color: Colors.amber, size: 14),
                      const SizedBox(width: 4),
                      Text(
                        course.rating.toStringAsFixed(1),
                        style: GoogleFonts.outfit(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                      const Spacer(),
                      Text(
                        course.formattedPrice,
                        style: GoogleFonts.outfit(
                          color: const Color(0xFF60A5FA),
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    course.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.outfit(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 10,
                        backgroundColor: const Color(0xFF3B82F6),
                        child: Text(
                          course.instructorName != null &&
                                  course.instructorName!.isNotEmpty
                              ? course.instructorName![0].toUpperCase()
                              : 'I',
                          style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: Colors.white),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          course.instructorName ?? 'Lead Instructor',
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.outfit(
                              color: Colors.white70, fontSize: 12),
                        ),
                      ),
                    ],
                  )
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip(
      {required this.label, required this.isSelected, this.icon, this.color});
  final String label;
  final bool isSelected;
  final IconData? icon;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: isSelected
            ? const Color(0xFF3B82F6)
            : Colors.white.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isSelected
              ? const Color(0xFF3B82F6)
              : Colors.white.withValues(alpha: 0.1),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 16, color: color ?? Colors.white),
            const SizedBox(width: 8),
          ],
          Text(
            label,
            style: GoogleFonts.outfit(
              color: Colors.white,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.title,
    required this.action,
    this.onActionTap,
  });

  final String title;
  final String action;
  final VoidCallback? onActionTap;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title,
          style: GoogleFonts.outfit(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        GestureDetector(
          onTap: onActionTap,
          child: Text(
            action,
            style: GoogleFonts.outfit(
              fontSize: 12,
              color: const Color(0xFF3B82F6),
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
}

class _StatBadge extends StatelessWidget {
  const _StatBadge(
      {required this.icon,
      required this.label,
      required this.value,
      required this.color});
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 16),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style:
                      GoogleFonts.outfit(color: Colors.white54, fontSize: 10)),
              Text(value,
                  style: GoogleFonts.outfit(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 12)),
            ],
          ),
        ],
      ),
    );
  }
}

class _TopicCard extends StatelessWidget {
  const _TopicCard(
      {required this.title,
      required this.count,
      required this.icon,
      required this.color});
  final String title;
  final String count;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return GlassContainer(
      opacity: 0.05,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(height: 12),
          Text(title,
              style: GoogleFonts.outfit(
                  fontWeight: FontWeight.bold, color: Colors.white)),
          Text(count,
              style: GoogleFonts.outfit(fontSize: 12, color: Colors.white54)),
        ],
      ),
    );
  }
}

class _NavBarItem extends StatelessWidget {
  const _NavBarItem(
      {required this.icon, required this.label, this.isSelected = false});
  final IconData icon;
  final String label;
  final bool isSelected;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon,
            color: isSelected ? const Color(0xFF3B82F6) : Colors.white54),
        const SizedBox(height: 4),
        Text(
          label,
          style: GoogleFonts.outfit(
            fontSize: 10,
            color: isSelected ? const Color(0xFF3B82F6) : Colors.white54,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ],
    );
  }
}
