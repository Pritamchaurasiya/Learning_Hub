import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:my_flutter_app/src/core/widgets/glass_container.dart';
import 'package:my_flutter_app/src/core/widgets/stats_badge.dart';
import 'package:my_flutter_app/src/core/widgets/testimonial_card.dart';
import 'package:my_flutter_app/src/features/courses/domain/course_model.dart';
import 'package:my_flutter_app/src/features/courses/presentation/course_controller.dart';
import 'package:my_flutter_app/src/features/profile/domain/instructor_model.dart';
import 'package:my_flutter_app/src/features/profile/presentation/instructor_controller.dart';
import 'package:my_flutter_app/src/features/profile/presentation/instructor_dashboard_view.dart';
import 'package:my_flutter_app/src/features/tutors/presentation/booking_screen.dart';

// The avatarUrl parameter is intentionally optional for future API integration
// ignore_for_file: unused_element_parameter

/// Instructor Profile Screen inspired by Google Stitch design.
/// Features circular avatar, stats row, course carousel, and testimonials.
class InstructorProfileScreen extends ConsumerWidget {
  const InstructorProfileScreen({
    super.key,
    required this.instructorId,
  });

  final String instructorId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final instructorAsync =
        ref.watch(instructorControllerProvider(instructorId));
    final size = MediaQuery.sizeOf(context);
    final isMobile = size.width < 600;

    return Scaffold(
      extendBodyBehindAppBar: true,
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF0F172A), Color(0xFF334155)], // Deep Slate
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: instructorAsync.when(
          data: (instructor) => DefaultTabController(
            length: 2,
            child: NestedScrollView(
              headerSliverBuilder: (context, innerBoxIsScrolled) {
                return [
                  SliverAppBar(
                    expandedHeight: isMobile ? 380 : 340,
                    pinned: true,
                    backgroundColor: Colors.transparent,
                    foregroundColor: Colors.white,
                    flexibleSpace: FlexibleSpaceBar(
                      background: _InstructorHeader(instructor: instructor),
                    ),
                    bottom: PreferredSize(
                      preferredSize: const Size.fromHeight(48),
                      child: GlassContainer(
                        borderRadius: 0,
                        child: TabBar(
                          indicatorColor: const Color(0xFF3B82F6),
                          indicatorWeight: 3,
                          labelStyle:
                              GoogleFonts.outfit(fontWeight: FontWeight.bold),
                          unselectedLabelStyle: GoogleFonts.outfit(),
                          labelColor: Colors.white,
                          unselectedLabelColor: Colors.white70,
                          tabs: const [
                            Tab(text: 'Overview'),
                            Tab(text: 'Dashboard'),
                          ],
                        ),
                      ),
                    ),
                  ),
                ];
              },
              body: TabBarView(
                children: [
                  _ProfileOverviewTab(ref: ref, instructor: instructor),
                  const InstructorDashboardView(),
                ],
              ),
            ),
          ),
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, stack) => Center(child: Text('Error: $err')),
        ),
      ),
      // Floating Book Session Button - Only shown on Overview
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (context) => const BookingScreen(),
            ),
          );
        },
        icon: const Icon(Icons.calendar_today),
        label: const Text('Book Session'),
        backgroundColor: const Color(0xFF3B82F6),
        foregroundColor: Colors.white,
      ).animate().scale(delay: 1.seconds),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
    );
  }
}

class _InstructorHeader extends StatelessWidget {
  const _InstructorHeader({required this.instructor});

  final Instructor instructor;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.2),
      ),
      child: SafeArea(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const SizedBox(height: 20),
            // Avatar with glass border
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                    color: Colors.white.withValues(alpha: 0.2), width: 2),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF3B82F6).withValues(alpha: 0.3),
                    blurRadius: 30,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: CircleAvatar(
                radius: 50,
                backgroundColor: const Color(0xFF1E293B),
                child: instructor.avatarUrl != null
                    ? CachedNetworkImage(
                        imageUrl: instructor.avatarUrl!,
                        imageBuilder: (context, imageProvider) => Container(
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            image: DecorationImage(
                              image: imageProvider,
                              fit: BoxFit.cover,
                            ),
                          ),
                        ),
                        placeholder: (context, url) =>
                            const CircularProgressIndicator(),
                        errorWidget: (context, url, error) => Text(
                          instructor.name[0],
                          style: GoogleFonts.outfit(
                            fontSize: 40,
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFF3B82F6),
                          ),
                        ),
                      )
                    : Text(
                        instructor.name[0],
                        style: GoogleFonts.outfit(
                          fontSize: 40,
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF3B82F6),
                        ),
                      ),
              ),
            ).animate().scale(delay: 200.ms),
            const SizedBox(height: 16),
            // Name
            Text(
              instructor.name,
              style: GoogleFonts.outfit(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ).animate().fadeIn(delay: 300.ms),
            const SizedBox(height: 4),
            // Title
            Text(
              instructor.title,
              style: GoogleFonts.outfit(
                fontSize: 14,
                color: Colors.white.withValues(alpha: 0.7),
              ),
              textAlign: TextAlign.center,
            ).animate().fadeIn(delay: 400.ms),
            const SizedBox(height: 12),
            // Top Rated Badge
            if (instructor.isTopRated)
              GlassContainer(
                borderRadius: 20,
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.verified,
                      size: 16,
                      color: Color(0xFFF59E0B), // Amber
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'Top Rated Instructor',
                      style: GoogleFonts.outfit(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ).animate().scale(delay: 500.ms),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }
}

class _ProfileOverviewTab extends StatelessWidget {
  const _ProfileOverviewTab({
    required this.ref,
    required this.instructor,
  });

  final WidgetRef ref;
  final Instructor instructor;

  @override
  Widget build(BuildContext context) {
    final coursesAsync = ref.watch(courseControllerProvider);

    // Mock testimonials
    final testimonials = [
      TestimonialData(
        userName: 'Alex Johnson',
        userRole: 'Software Developer',
        rating: 5,
        reviewText:
            "Sarah's teaching style is incredible. Her courses are well-structured and easy to follow. Highly recommend!",
        date: DateTime(2026, 1, 10),
      ),
      TestimonialData(
        userName: 'Emily Davis',
        userRole: 'Mobile Developer',
        rating: 4.5,
        reviewText:
            "The best Flutter course I've taken. Real-world examples and hands-on projects made learning enjoyable.",
        date: DateTime(2026, 1, 5),
      ),
      TestimonialData(
        userName: 'Michael Chen',
        userRole: 'Student',
        rating: 5,
        reviewText:
            'Clear explanations and great support. Sarah responds quickly to questions and provides valuable feedback.',
        date: DateTime(2025, 12, 28),
      ),
    ];

    return CustomScrollView(
      key: const PageStorageKey('ProfileOverview'),
      slivers: [
        SliverOverlapInjector(
          handle: NestedScrollView.sliverOverlapAbsorberHandleFor(context),
        ),
        // Stats Row
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: StatsRow(
              courses: instructor.coursesCount,
              students: instructor.studentsCount,
              rating: instructor.rating,
            ).animate().fadeIn(delay: 600.ms).slideY(begin: 0.2),
          ),
        ),

        // Action Buttons
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Following ${instructor.name}!'),
                          backgroundColor: const Color(0xFF10B981),
                        ),
                      );
                    },
                    icon: const Icon(Icons.add),
                    label: const Text('Follow'),
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF3B82F6),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Messaging feature coming soon!'),
                        ),
                      );
                    },
                    icon: const Icon(Icons.message_outlined),
                    label: const Text('Message'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: BorderSide(
                          color: Colors.white.withValues(alpha: 0.2)),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                  ),
                ),
              ],
            ).animate().fadeIn(delay: 700.ms),
          ),
        ),

        // About Section
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: GlassContainer(
              opacity: 0.05,
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'About',
                    style: GoogleFonts.outfit(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    instructor.bio,
                    style: GoogleFonts.outfit(
                      fontSize: 14,
                      height: 1.6,
                      color: Colors.white.withValues(alpha: 0.8),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),

        // Courses Section
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              'Courses by ${instructor.name.split(' ').first}',
              style: GoogleFonts.outfit(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
          ),
        ),

        SliverToBoxAdapter(
          child: SizedBox(
            height: 280,
            child: coursesAsync.when(
              data: (state) => ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.all(16),
                itemCount: state.filteredCourses.take(5).length,
                separatorBuilder: (_, __) => const SizedBox(width: 16),
                itemBuilder: (_, index) {
                  final course = state.filteredCourses[index];
                  return _CourseCarouselCard(
                    course: course,
                    isBestseller: index == 0,
                  );
                },
              ),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (_, __) => const Center(
                child: Text('Failed to load courses'),
              ),
            ),
          ),
        ),

        // Testimonials Section
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.only(top: 16),
            child: TestimonialsSection(testimonials: testimonials),
          ),
        ),

        // Bottom spacing for FAB
        const SliverToBoxAdapter(
          child: SizedBox(height: 100),
        ),
      ],
    );
  }
}

class _CourseCarouselCard extends StatelessWidget {
  const _CourseCarouselCard({
    required this.course,
    this.isBestseller = false,
  });

  final Course course;
  final bool isBestseller;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/courses/${course.slug}'),
      child: GlassContainer(
        width: 220,
        opacity: 0.05,
        padding: EdgeInsets.zero,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Thumbnail
            Stack(
              children: [
                Container(
                  height: 120,
                  width: double.infinity,
                  decoration: const BoxDecoration(
                    color: Color(0xFF1E293B),
                    borderRadius: BorderRadius.vertical(
                      top: Radius.circular(16),
                    ),
                  ),
                  child: course.thumbnailUrl != null
                      ? CachedNetworkImage(
                          imageUrl: course.thumbnailUrl!,
                          imageBuilder: (context, imageProvider) => Container(
                            decoration: BoxDecoration(
                              borderRadius: const BorderRadius.vertical(
                                top: Radius.circular(16),
                              ),
                              image: DecorationImage(
                                image: imageProvider,
                                fit: BoxFit.cover,
                              ),
                            ),
                          ),
                          placeholder: (context, url) => Center(
                            child: CircularProgressIndicator(
                              color: Colors.white.withValues(alpha: 0.5),
                            ),
                          ),
                          errorWidget: (context, url, error) => Center(
                            child: Icon(
                              Icons.school,
                              size: 40,
                              color: Colors.white.withValues(alpha: 0.5),
                            ),
                          ),
                        )
                      : Center(
                          child: Icon(
                            Icons.school,
                            size: 40,
                            color: Colors.white.withValues(alpha: 0.5),
                          ),
                        ),
                ),
                if (isBestseller)
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF59E0B),
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
            // Content
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    course.title,
                    style: GoogleFonts.outfit(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(
                        Icons.star,
                        size: 14,
                        color: Color(0xFFF59E0B),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '4.8',
                        style: GoogleFonts.outfit(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: Colors.white70,
                        ),
                      ),
                      const Spacer(),
                      Text(
                        '\$${course.price}',
                        style: GoogleFonts.outfit(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF3B82F6),
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
    );
  }
}
