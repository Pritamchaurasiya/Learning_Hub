import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:my_flutter_app/src/core/common_widgets/error_view.dart';
import 'package:my_flutter_app/src/core/widgets/glass_container.dart';
import 'package:my_flutter_app/src/features/auth/domain/user_model.dart';
import 'package:my_flutter_app/src/features/auth/presentation/auth_controller.dart';
import 'package:my_flutter_app/src/features/cart/data/cart_repository.dart';
import 'package:my_flutter_app/src/features/courses/data/certificate_repository.dart';
import 'package:my_flutter_app/src/features/courses/data/course_repository.dart';
import 'package:my_flutter_app/src/features/courses/domain/course_model.dart';
import 'package:my_flutter_app/src/features/courses/presentation/course_controller.dart';
import 'package:my_flutter_app/src/features/courses/presentation/lesson_player_screen.dart';
import 'package:my_flutter_app/src/features/payments/services/payment_service.dart';

class CourseDetailScreen extends ConsumerWidget {
  const CourseDetailScreen({super.key, required this.slug});

  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final courseAsync = ref.watch(courseDetailProvider(slug));

    return Scaffold(
      extendBodyBehindAppBar: true,
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: Padding(
          padding: const EdgeInsets.all(8),
          child: GlassContainer(
            borderRadius: 12,
            padding: EdgeInsets.zero,
            child: IconButton(
              icon: const Icon(Icons.arrow_back, color: Colors.white),
              onPressed: () => Navigator.of(context).pop(),
            ),
          ),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.all(8),
            child: GlassContainer(
              borderRadius: 12,
              padding: EdgeInsets.zero,
              child: IconButton(
                icon: const Icon(Icons.share, color: Colors.white),
                onPressed: () {
                  ref.read(courseRepositoryProvider).shareCourse(slug);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Course link copied to clipboard!'),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
      body: courseAsync.when(
        data: (course) => _CourseDetailContent(course: course),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => ErrorView(
          message: 'Failed to load course details: $error',
          onRetry: () => ref.refresh(courseDetailProvider(slug)),
        ),
      ),
    );
  }
}

class _CourseDetailContent extends ConsumerStatefulWidget {
  const _CourseDetailContent({required this.course});

  final Course course;

  @override
  ConsumerState<_CourseDetailContent> createState() =>
      _CourseDetailContentState();
}

class _CourseDetailContentState extends ConsumerState<_CourseDetailContent> {
  bool _isEnrolling = false;

  @override
  Widget build(BuildContext context) {
    final course = widget.course;
    final isEnrolled = course.isEnrolled;

    return LayoutBuilder(
      builder: (context, constraints) {
        final isDesktop = constraints.maxWidth >= 900;

        return SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Hero Section with Video/Thumbnail Preview
              Stack(
                children: [
                  SizedBox(
                    height: isDesktop ? 440 : 360,
                    width: double.infinity,
                    child: course.thumbnailUrl != null
                        ? CachedNetworkImage(
                            imageUrl: course.thumbnailUrl!,
                            width: double.infinity,
                            fit: BoxFit.cover,
                            placeholder: (context, url) =>
                                const Center(child: CircularProgressIndicator()),
                            errorWidget: (context, url, error) => Container(
                              color: const Color(0xFF1E293B),
                              child: const Icon(Icons.code,
                                  size: 80, color: Colors.white24),
                            ),
                          )
                        : Container(
                            color: const Color(0xFF1E293B),
                            child: const Icon(Icons.code,
                                size: 80, color: Colors.white24),
                          ),
                  ),
                  Positioned.fill(
                    child: Container(
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.transparent,
                            Color(0x990F172A),
                            Color(0xFF0F172A),
                          ],
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: 24,
                    left: 20,
                    right: 20,
                    child: Center(
                      child: GestureDetector(
                        onTap: () => _openPlayer(context, course),
                        child: GlassContainer(
                          borderRadius: 30,
                          padding: const EdgeInsets.symmetric(
                              horizontal: 20, vertical: 12),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.play_arrow,
                                  color: Colors.white, size: 28),
                              const SizedBox(width: 8),
                              Text(
                                isEnrolled
                                    ? 'Continue Learning'
                                    : 'Watch Preview',
                                style: GoogleFonts.outfit(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),

              // Main Body Content
              Padding(
                padding: EdgeInsets.symmetric(
                  horizontal: isDesktop ? 48 : 20,
                  vertical: 16,
                ),
                child: isDesktop
                    ? Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            flex: 7,
                            child: _buildLeftColumn(course),
                          ),
                          const SizedBox(width: 32),
                          Expanded(
                            flex: 5,
                            child: _buildRightSidebar(course),
                          ),
                        ],
                      )
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildHeaderBadges(course),
                          const SizedBox(height: 16),
                          _buildTitleAndDescription(course),
                          const SizedBox(height: 24),
                          _buildPriceAndEnrollmentBar(course),
                          const SizedBox(height: 32),
                          _buildLearningObjectives(course),
                          const SizedBox(height: 32),
                          _buildCurriculum(course),
                          const SizedBox(height: 32),
                          _buildAssessmentsCard(course),
                          const SizedBox(height: 40),
                          _buildActionButtons(course),
                          const SizedBox(height: 60),
                        ],
                      ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildLeftColumn(Course course) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildHeaderBadges(course),
        const SizedBox(height: 16),
        _buildTitleAndDescription(course),
        const SizedBox(height: 32),
        _buildLearningObjectives(course),
        const SizedBox(height: 32),
        _buildCurriculum(course),
        const SizedBox(height: 32),
        _buildAssessmentsCard(course),
        const SizedBox(height: 60),
      ],
    );
  }

  Widget _buildRightSidebar(Course course) {
    return Column(
      children: [
        _buildPriceAndEnrollmentBar(course),
        const SizedBox(height: 24),
        _buildActionButtons(course),
      ],
    );
  }

  Widget _buildHeaderBadges(Course course) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: const Color(0xFF3B82F6).withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
                color: const Color(0xFF3B82F6).withValues(alpha: 0.3)),
          ),
          child: Text(
            (course.categoryName ?? 'Engineering').toUpperCase(),
            style: GoogleFonts.outfit(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: const Color(0xFF60A5FA),
            ),
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.bar_chart, color: Colors.white70, size: 14),
              const SizedBox(width: 4),
              Text(
                (course.level ?? course.difficulty).toUpperCase(),
                style: GoogleFonts.outfit(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Colors.white70,
                ),
              ),
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.schedule, color: Colors.white70, size: 14),
              const SizedBox(width: 4),
              Text(
                course.formattedDuration,
                style: GoogleFonts.outfit(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Colors.white70,
                ),
              ),
            ],
          ),
        ),
        if (course.isEnrolled)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFF10B981).withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                  color: const Color(0xFF10B981).withValues(alpha: 0.4)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.check_circle, color: Color(0xFF10B981), size: 14),
                const SizedBox(width: 4),
                Text(
                  'ENROLLED',
                  style: GoogleFonts.outfit(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF10B981),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _buildTitleAndDescription(Course course) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          course.title,
          style: GoogleFonts.outfit(
            fontSize: 26,
            fontWeight: FontWeight.bold,
            color: Colors.white,
            height: 1.2,
          ),
        ).animate().fadeIn(delay: 200.ms),
        if (course.shortDescription != null &&
            course.shortDescription!.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(
            course.shortDescription!,
            style: GoogleFonts.outfit(
              fontSize: 16,
              color: Colors.white70,
            ),
          ),
        ],
        const SizedBox(height: 16),
        Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: const Color(0xFF3B82F6),
              child: Text(
                course.instructorName != null &&
                        course.instructorName!.isNotEmpty
                    ? course.instructorName![0].toUpperCase()
                    : 'I',
                style: GoogleFonts.outfit(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Created by',
                  style: GoogleFonts.outfit(
                      color: Colors.white38, fontSize: 11),
                ),
                Text(
                  course.instructorName ?? 'Lead Instructor',
                  style: GoogleFonts.outfit(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ],
        ),
        const SizedBox(height: 24),
        Text(
          'About this course',
          style: GoogleFonts.outfit(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 12),
        Text(
          course.description,
          style: GoogleFonts.outfit(
            fontSize: 15,
            height: 1.6,
            color: Colors.white70,
          ),
        ),
      ],
    );
  }

  Widget _buildPriceAndEnrollmentBar(Course course) {
    return GlassContainer(
      opacity: 0.05,
      padding: const EdgeInsets.all(20),
      child: Row(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Course Access',
                style: GoogleFonts.outfit(
                  fontSize: 12,
                  color: Colors.white54,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                course.formattedPrice,
                style: GoogleFonts.outfit(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF3B82F6),
                ),
              ),
            ],
          ),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFFF59E0B).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                const Icon(Icons.star, color: Color(0xFFF59E0B), size: 18),
                const SizedBox(width: 8),
                Text(
                  '${course.rating.toStringAsFixed(1)} (${course.totalStudents} students)',
                  style: GoogleFonts.outfit(
                    color: const Color(0xFFF59E0B),
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLearningObjectives(Course course) {
    final objectives = course.learningObjectives.isNotEmpty
        ? course.learningObjectives
        : [
            'Master end-to-end architectures and design principles',
            'Develop hands-on projects with production testing and security',
            'Gain practical problem-solving skills with real industry tooling',
            'Earn a verified certificate of completion for your portfolio',
          ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          "What you'll learn",
          style: GoogleFonts.outfit(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 16),
        GlassContainer(
          opacity: 0.05,
          padding: const EdgeInsets.all(20),
          child: Column(
            children: objectives
                .map((text) => _LearnPoint(text: text))
                .toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildCurriculum(Course course) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Curriculum',
              style: GoogleFonts.outfit(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            Text(
              '${course.modules.length} modules • ${course.totalLessons} lessons',
              style: GoogleFonts.outfit(
                fontSize: 13,
                color: Colors.white54,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        if (course.modules.isEmpty)
          GlassContainer(
            opacity: 0.03,
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                const Icon(Icons.info_outline, color: Colors.white38),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Full syllabus and lessons available immediately upon enrollment.',
                    style: GoogleFonts.outfit(color: Colors.white70),
                  ),
                ),
              ],
            ),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: course.modules.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, mIndex) {
              final module = course.modules[mIndex];
              return _ModuleExpansionCard(
                module: module,
                index: mIndex,
                course: course,
                onLessonClick: (lesson) =>
                    _openPlayerWithLesson(context, course, lesson),
              );
            },
          ),
      ],
    );
  }

  Widget _buildAssessmentsCard(Course course) {
    return GlassContainer(
      opacity: 0.06,
      padding: const EdgeInsets.all(20),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF10B981).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.assignment_turned_in,
                color: Color(0xFF10B981), size: 28),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Tests A+ & Skill Assessment',
                  style: GoogleFonts.outfit(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Benchmark your mastery with timed quizzes and real challenges.',
                  style: GoogleFonts.outfit(
                    color: Colors.white60,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          FilledButton.tonal(
            onPressed: () => context.push('/hub'),
            child: const Text('Open Hub'),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons(Course course) {
    final authState = ref.watch(authControllerProvider);
    final user = authState.value;
    final isGuest = user == null || user.role == 'guest';

    if (course.isEnrolled) {
      return Column(
        children: [
          FilledButton.icon(
            onPressed: () => _openPlayer(context, course),
            icon: const Icon(Icons.play_circle_filled),
            label: const Text('Continue Learning'),
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              padding: const EdgeInsets.symmetric(vertical: 18),
              textStyle:
                  GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold),
              minimumSize: const Size(double.infinity, 58),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () async {
              try {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Generating Certificate...')),
                );
                final certRepo = ref.read(certificateRepositoryProvider);
                final url = await certRepo.generateCertificate(course.slug);
                if (url != null && context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Certificate Ready: $url')),
                  );
                }
              } on Exception catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Certificate Error: $e')),
                  );
                }
              }
            },
            icon: const Icon(Icons.workspace_premium),
            label: const Text('View Certificate'),
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.white,
              side: BorderSide(color: Colors.white.withValues(alpha: 0.2)),
              minimumSize: const Size(double.infinity, 54),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
        ],
      );
    }

    return Column(
      children: [
        FilledButton(
          onPressed: _isEnrolling ? null : () => _handleEnrollment(course, isGuest, user),
          style: FilledButton.styleFrom(
            backgroundColor: const Color(0xFF3B82F6),
            padding: const EdgeInsets.symmetric(vertical: 18),
            textStyle:
                GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold),
            minimumSize: const Size(double.infinity, 58),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
          ),
          child: _isEnrolling
              ? const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    color: Colors.white,
                  ),
                )
              : Text(
                  isGuest
                      ? 'Login to Enroll'
                      : (course.isFree || course.price <= 0
                          ? 'Enroll for Free'
                          : 'Enroll Now (${course.formattedPrice})'),
                ),
        ),
        if (!isGuest && !course.isFree && course.price > 0)
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: OutlinedButton.icon(
              onPressed: () {
                final cart = ref.read(cartProvider);
                if (cart.containsCourse(course.id)) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Already in cart!'),
                      backgroundColor: Colors.orange,
                    ),
                  );
                } else {
                  ref.read(cartProvider.notifier).addToCart(course);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('${course.title} added to cart!'),
                      backgroundColor: const Color(0xFF10B981),
                    ),
                  );
                }
              },
              icon: const Icon(Icons.add_shopping_cart),
              label: const Text('Add to Cart'),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF3B82F6),
                side: const BorderSide(color: Color(0xFF3B82F6)),
                minimumSize: const Size(double.infinity, 54),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
            ),
          ),
      ],
    );
  }

  Future<void> _handleEnrollment(
      Course course, bool isGuest, User? user) async {
    if (isGuest) {
      context.push('/login');
      return;
    }

    if (course.isFree || course.price <= 0) {
      setState(() => _isEnrolling = true);
      try {
        final success = await ref
            .read(courseControllerProvider.notifier)
            .enrollInCourse(course.slug);

        if (success && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.check_circle, color: Colors.white),
                  const SizedBox(width: 8),
                  Text('Successfully enrolled in ${course.title}! 🎉'),
                ],
              ),
              backgroundColor: const Color(0xFF10B981),
              behavior: SnackBarBehavior.floating,
            ),
          );
          ref.invalidate(courseDetailProvider(course.slug));
        } else if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Enrollment could not be completed. Please try again.'),
              backgroundColor: Colors.redAccent,
            ),
          );
        }
      } on Exception catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Enrollment failed: $e')),
          );
        }
      } finally {
        if (mounted) {
          setState(() => _isEnrolling = false);
        }
      }
    } else {
      // Paid Course Razorpay Payment Flow
      try {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Starting secure checkout...')),
        );
        final paymentService = ref.read(paymentServiceProvider);
        await paymentService.startPayment(
          courseId: int.tryParse(course.id) ?? 0,
          userEmail: user?.email ?? 'student@learninghub.com',
          userPhone: '9999999999',
        );
      } on Exception catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Payment Failed: $e')),
          );
        }
      }
    }
  }

  void _openPlayer(BuildContext context, Course course) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => LessonPlayerScreen(course: course),
      ),
    );
  }

  void _openPlayerWithLesson(
      BuildContext context, Course course, CourseLesson lesson) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => LessonPlayerScreen(
          course: course,
          initialLesson: lesson,
        ),
      ),
    );
  }
}

class _ModuleExpansionCard extends StatelessWidget {
  const _ModuleExpansionCard({
    required this.module,
    required this.index,
    required this.course,
    required this.onLessonClick,
  });

  final CourseModule module;
  final int index;
  final Course course;
  final ValueChanged<CourseLesson> onLessonClick;

  @override
  Widget build(BuildContext context) {
    return GlassContainer(
      opacity: 0.04,
      borderRadius: 16,
      padding: EdgeInsets.zero,
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          initiallyExpanded: index == 0,
          leading: Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: const Color(0xFF3B82F6).withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                '${index + 1}',
                style: GoogleFonts.outfit(
                  color: const Color(0xFF3B82F6),
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          title: Text(
            module.title,
            style: GoogleFonts.outfit(
              color: Colors.white,
              fontWeight: FontWeight.w600,
              fontSize: 15,
            ),
          ),
          subtitle: Text(
            '${module.lessons.length} lessons • ${module.totalDurationMinutes > 0 ? "${module.totalDurationMinutes} min" : "Self-paced"}',
            style: GoogleFonts.outfit(
              color: Colors.white54,
              fontSize: 12,
            ),
          ),
          children: module.lessons.map((lesson) {
            final canAccess = course.isEnrolled || lesson.isPreview;
            return ListTile(
              onTap: canAccess ? () => onLessonClick(lesson) : null,
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
              leading: Icon(
                lesson.isVideo
                    ? Icons.play_circle_outline
                    : (lesson.isQuiz
                        ? Icons.help_outline
                        : Icons.article_outlined),
                size: 20,
                color: canAccess ? const Color(0xFF3B82F6) : Colors.white24,
              ),
              title: Text(
                lesson.title,
                style: GoogleFonts.outfit(
                  color: canAccess ? Colors.white : Colors.white38,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (lesson.isPreview && !course.isEnrolled)
                    Container(
                      margin: const EdgeInsets.only(right: 8),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981).withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        'PREVIEW',
                        style: GoogleFonts.outfit(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF10B981),
                        ),
                      ),
                    ),
                  Text(
                    lesson.formattedDuration,
                    style: GoogleFonts.outfit(
                      fontSize: 12,
                      color: Colors.white38,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Icon(
                    canAccess
                        ? (lesson.isCompleted
                            ? Icons.check_circle
                            : Icons.arrow_forward_ios)
                        : Icons.lock_outline,
                    size: 14,
                    color: lesson.isCompleted
                        ? const Color(0xFF10B981)
                        : (canAccess ? Colors.white54 : Colors.white24),
                  ),
                ],
              ),
            );
          }).toList(),
        ),
      ),
    );
  }
}

class _LearnPoint extends StatelessWidget {
  const _LearnPoint({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.check_circle_outline,
              color: Color(0xFF10B981), size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: GoogleFonts.outfit(
                fontSize: 14,
                color: Colors.white70,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
