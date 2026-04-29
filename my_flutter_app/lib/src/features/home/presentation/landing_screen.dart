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
import 'package:my_flutter_app/src/features/courses/data/course_repository.dart';
import 'package:my_flutter_app/src/features/courses/domain/course_model.dart';

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

class _MobileHome extends ConsumerWidget {
  const _MobileHome();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authControllerProvider).value;

    // Background Gradient (Global)
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
            child: const Icon(Icons.auto_awesome),
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
            colors: [Color(0xFF0F172A), Color(0xFF334155)], // Deep Slate
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            // 1. Header & Search
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
                            'Good morning,',
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
                      CircleAvatar(
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
                    ],
                  ),
                  const SizedBox(height: 24),
                  // Search Bar
                  GlassContainer(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    child: TextField(
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        border: InputBorder.none,
                        hintText: 'Search courses, skills, mentors...',
                        hintStyle: TextStyle(
                            color: Colors.white.withValues(alpha: 0.5)),
                        prefixIcon: Icon(Icons.search,
                            color: Colors.white.withValues(alpha: 0.5)),
                        suffixIcon: Icon(Icons.tune,
                            color: Colors.white.withValues(alpha: 0.5)),
                      ),
                    ),
                  ).animate().fadeIn(delay: 100.ms),
                  const SizedBox(height: 24),
                  // Filters Horizontal List
                  const SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _FilterChip(
                            label: 'For You',
                            isSelected: true,
                            icon: Icons.auto_awesome),
                        SizedBox(width: 12),
                        _FilterChip(label: 'Trending', isSelected: false),
                        SizedBox(width: 12),
                        _FilterChip(
                            label: 'Live',
                            isSelected: false,
                            icon: Icons.live_tv,
                            color: Colors.redAccent),
                        SizedBox(width: 12),
                        _FilterChip(label: 'Mentors', isSelected: false),
                      ],
                    ),
                  ).animate().slideX(delay: 200.ms),

                  const SizedBox(height: 32),
                  // GOD MODE: AI Research Lab Card
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
                                    children: [
                                      Text(
                                        'NEURO-SYMBOLIC CORE',
                                        style: GoogleFonts.spaceMono(
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          color: Colors.purpleAccent,
                                        ),
                                      ),
                                      const Spacer(),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: Colors.purpleAccent
                                              .withValues(alpha: 0.2),
                                          borderRadius:
                                              BorderRadius.circular(4),
                                        ),
                                        child: const Text('BETA',
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
                                    "Explore the AI's internal dream state and reasoning.",
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

            // 2. Alert & Streak Cards
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  const SizedBox(height: 24),
                  // Alert Card
                  GlassContainer(
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
                                'UX Design Quiz Due',
                                style: GoogleFonts.outfit(
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                              Text(
                                '• Expires in 3 hours',
                                style: GoogleFonts.outfit(
                                  fontSize: 12,
                                  color: const Color(0xFFEF4444),
                                ),
                              ),
                            ],
                          ),
                        ),
                        FilledButton(
                          onPressed: () {},
                          style: FilledButton.styleFrom(
                            backgroundColor: const Color(0xFF3B82F6),
                            visualDensity: VisualDensity.compact,
                          ),
                          child: const Text('Start'),
                        ),
                      ],
                    ),
                  ).animate().slideY(delay: 300.ms),
                  const SizedBox(height: 16),
                  // Streak Card
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFFFFF7ED), Color(0xFFFFEDD5)],
                      ),
                      borderRadius: BorderRadius.circular(24),
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
                                '12-Day Streak!',
                                style: GoogleFonts.outfit(
                                  fontWeight: FontWeight.bold,
                                  color: Colors.black87,
                                  fontSize: 16,
                                ),
                              ),
                              Text(
                                "Don't lose it! Learn for 15 min today.",
                                style: GoogleFonts.outfit(
                                  fontSize: 12,
                                  color: Colors.black54,
                                ),
                              ),
                            ],
                          ),
                        ),
                        FilledButton(
                          onPressed: () {},
                          style: FilledButton.styleFrom(
                            backgroundColor: Colors.orange,
                            foregroundColor: Colors.white,
                          ),
                          child: const Text('Keep it 🔥'),
                        ),
                      ],
                    ),
                  ).animate().slideY(delay: 400.ms),
                ]),
              ),
            ),

            // 3. Weekly Activity Chart
            SliverPadding(
              padding: const EdgeInsets.all(20),
              sliver: SliverToBoxAdapter(
                child: GlassContainer(
                  height: 280, // Fixed height for chart
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
                          Text(
                            'View Stats ->',
                            style: GoogleFonts.outfit(
                              fontSize: 12,
                              color: const Color(0xFF3B82F6),
                              fontWeight: FontWeight.bold,
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

            // 4. Explore Topics
            SliverToBoxAdapter(
              child: const Padding(
                padding: EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  children: [
                    _SectionHeader(
                        title: 'Explore Topics', action: 'Browse Categories'),
                    SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: _TopicCard(
                            title: 'Coding',
                            count: '120+ Courses',
                            icon: Icons.code,
                            color: Color(0xFF3B82F6),
                          ),
                        ),
                        SizedBox(width: 16),
                        Expanded(
                          child: _TopicCard(
                            title: 'Design',
                            count: '80+ Courses',
                            icon: Icons.brush,
                            color: Color(0xFFEC4899),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ).animate().fadeIn(delay: 600.ms),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 32)),

            // 5. Recommended For You (Using FutureBuilder/Riverpod)
            SliverToBoxAdapter(
              child: Column(
                children: [
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 20),
                    child: _SectionHeader(
                        title: 'Recommended for You', action: 'See All'),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 280, // Height for course cards
                    child: Consumer(
                      builder: (context, ref, _) {
                        final coursesAsync = ref.watch(courseListProvider);
                        return coursesAsync.when(
                          data: (courses) {
                            if (courses.isEmpty) {
                              return const Center(
                                  child: Text('No courses found',
                                      style: TextStyle(color: Colors.white)));
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
                                  style: const TextStyle(color: Colors.red))),
                        );
                      },
                    ),
                  ).animate().slideX(delay: 700.ms, begin: 0.2),
                ],
              ),
            ),

            const SliverToBoxAdapter(
                child: SizedBox(height: 100)), // Bottom Padding
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

class _DesktopHome extends ConsumerWidget {
  const _DesktopHome();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Reusing Mobile Layout logic but with max constraints for desktop centered view
    // In a real app, this would be a row-based dashboard.
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 1200),
        child:
            const _MobileHome(), // For now, reuse the polished mobile view as it scales decently
      ),
    );
  }
}

// --- Specific Widgets ---

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
            // Thumbnail
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
                      Text(course.rating.toString(),
                          style: GoogleFonts.outfit(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 12)),
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
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      CircleAvatar(
                          radius: 8,
                          backgroundColor: Colors.white24,
                          child: Text(
                              course.instructorName != null
                                  ? course.instructorName![0]
                                  : '?',
                              style: const TextStyle(fontSize: 8))),
                      const SizedBox(width: 8),
                      Expanded(
                          child: Text(course.instructorName ?? 'Unknown',
                              style: GoogleFonts.outfit(
                                  color: Colors.white70, fontSize: 12))),
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
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
      ),
      child: Row(
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
  const _SectionHeader({required this.title, required this.action});
  final String title;
  final String action;

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
        Text(
          action,
          style: GoogleFonts.outfit(
            fontSize: 12,
            color: const Color(0xFF3B82F6),
            fontWeight: FontWeight.w600,
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

final courseListProvider = FutureProvider<List<Course>>((ref) async {
  // Assuming the repository has a method to get trending or recommended courses
  // Connecting to the backend via the repository we checked earlier
  final repo = ref.read(courseRepositoryProvider);
  // We use getCourses for now, but ideally getRecommendations()
  final result = await repo.getCourses();
  return result.fold(
    (failure) => throw failure,
    (courses) => courses,
  );
});
