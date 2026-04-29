import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:my_flutter_app/src/core/common_widgets/error_view.dart';
import 'package:my_flutter_app/src/core/widgets/glass_container.dart';
import 'package:my_flutter_app/src/features/auth/presentation/auth_controller.dart';
import 'package:my_flutter_app/src/features/cart/data/cart_repository.dart';
import 'package:my_flutter_app/src/features/courses/data/certificate_repository.dart';
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
      backgroundColor: const Color(0xFF0F172A), // Deep Slate
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

class _CourseDetailContent extends StatelessWidget {
  const _CourseDetailContent({required this.course});

  final Course course;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Hero Section with Video Preview
          Stack(
            children: [
              // Background Image
              SizedBox(
                height: 400,
                width: double.infinity,
                child: course.thumbnailUrl != null
                    ? CachedNetworkImage(
                        imageUrl: course.thumbnailUrl!,
                        width: double.infinity,
                        height: 200,
                        fit: BoxFit.cover,
                        placeholder: (context, url) =>
                            const Center(child: CircularProgressIndicator()),
                        errorWidget: (context, url, error) =>
                            const Icon(Icons.error),
                      )
                    : Container(
                        color: const Color(0xFF1E293B),
                        child: const Icon(Icons.code,
                            size: 80, color: Colors.white24),
                      ),
              ),
              // Gradient Overlay
              Positioned.fill(
                child: Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.transparent,
                        Color(0xFF0F172A), // Fade to background
                      ],
                      stops: [0.0, 0.9],
                    ),
                  ),
                ),
              ),
              // Content Overlay
              Positioned(
                bottom: 24,
                left: 24,
                right: 24,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (course.level != null)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFF3B82F6),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          course.level!,
                          style: GoogleFonts.outfit(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ).animate().fadeIn().slideX(),
                    const SizedBox(height: 12),
                    Text(
                      course.title,
                      style: GoogleFonts.outfit(
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        shadows: [
                          const Shadow(
                            color: Colors.black45,
                            blurRadius: 8,
                            offset: Offset(0, 4),
                          ),
                        ],
                      ),
                    ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.2),
                    const SizedBox(height: 16),
                    // Instructor
                    if (course.instructorName != null)
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(2),
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              color: Colors.white,
                            ),
                            child: CircleAvatar(
                              radius: 16,
                              backgroundColor: const Color(0xFF1E293B),
                              child: Text(
                                course.instructorName![0].toUpperCase(),
                                style: GoogleFonts.outfit(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Instructor',
                                style: GoogleFonts.outfit(
                                  color: Colors.white60,
                                  fontSize: 12,
                                ),
                              ),
                              Text(
                                course.instructorName!,
                                style: GoogleFonts.outfit(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ).animate().fadeIn(delay: 300.ms),
                  ],
                ),
              ),
              // Play Button
              Positioned.fill(
                child: Center(
                  child: Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.2),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF3B82F6).withValues(alpha: 0.3),
                          blurRadius: 32,
                          spreadRadius: 8,
                        ),
                      ],
                    ),
                    child: GlassContainer(
                      borderRadius: 100,
                      padding: EdgeInsets.zero,
                      child: IconButton(
                        onPressed: () {
                          // Navigate to Lesson Player
                          if (course.hlsPlaylist != null || true) {
                            // Allow fallback for demo
                            Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (context) =>
                                    LessonPlayerScreen(course: course),
                              ),
                            );
                          }
                        },
                        icon: const Icon(Icons.play_arrow_rounded,
                            color: Colors.white, size: 40),
                      ),
                    ),
                  ).animate().scale(
                      curve: Curves.elasticOut,
                      duration: 1.seconds,
                      delay: 500.ms),
                ),
              ),
            ],
          ),

          // 2. Main Body
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Price and Actions
                Row(
                  children: [
                    Text(
                      r'${course.price ?? 0}',
                      style: GoogleFonts.outfit(
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                        color: const Color(0xFF3B82F6),
                      ),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF59E0B).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.star,
                              color: Color(0xFFF59E0B), size: 18),
                          const SizedBox(width: 8),
                          Text(
                            '4.8 (1.2k reviews)',
                            style: GoogleFonts.outfit(
                              color: const Color(0xFFF59E0B),
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ).animate().fadeIn(delay: 400.ms),
                const SizedBox(height: 32),

                // What you'll learn (Glass Card)
                Text(
                  "What you'll learn",
                  style: GoogleFonts.outfit(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 16),
                const GlassContainer(
                  opacity: 0.05,
                  padding: EdgeInsets.all(24),
                  child: Column(
                    children: [
                      _LearnPoint(
                          text:
                              'Build robust backend APIs with Node.js and Express'),
                      _LearnPoint(
                          text:
                              'Master frontend development using React and Tailwind CSS'),
                      _LearnPoint(
                          text:
                              'Deploy full stack apps to cloud platforms like AWS'),
                      _LearnPoint(
                          text:
                              'Understand database design with MongoDB and SQL'),
                    ],
                  ),
                ).animate().fadeIn(delay: 500.ms),
                const SizedBox(height: 32),

                // Description
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
                    fontSize: 16,
                    height: 1.6,
                    color: Colors.white70,
                  ),
                ).animate().fadeIn(delay: 600.ms),
                const SizedBox(height: 32),

                // Curriculum Section
                Text(
                  'Curriculum',
                  style: GoogleFonts.outfit(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 16),
                _CurriculumList(courseTitle: course.title),
                const SizedBox(height: 48),

                // Footer Actions
                Consumer(
                  builder: (context, ref, _) {
                    final authState = ref.watch(authControllerProvider);
                    final user = authState.value;
                    final isGuest = user?.role == 'guest';

                    return Column(
                      children: [
                        FilledButton(
                          onPressed: () async {
                            if (isGuest) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                    content: Text(
                                        'Please login to enroll in courses.')),
                              );
                            } else {
                              // Trigger Payment Flow
                              try {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                      content: Text('Starting Payment...')),
                                );

                                final paymentService =
                                    ref.read(paymentServiceProvider);
                                await paymentService.startPayment(
                                  courseId: int.tryParse(course.id) ?? 0,
                                  userEmail:
                                      user?.email ?? 'student@learninghub.com',
                                  userPhone: '9999999999',
                                );
                              } on Exception catch (e) {
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                        content: Text('Payment Failed: $e')),
                                  );
                                }
                              }
                            }
                          },
                          style: FilledButton.styleFrom(
                            backgroundColor: const Color(0xFF3B82F6),
                            padding: const EdgeInsets.symmetric(vertical: 20),
                            textStyle: GoogleFonts.outfit(
                                fontSize: 18, fontWeight: FontWeight.bold),
                            minimumSize: const Size(double.infinity, 60),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          child: Text(isGuest
                              ? 'Login to Enroll'
                              : 'Enroll Now (\$${course.price})'),
                        ),

                        // Add to Cart Button
                        if (!isGuest)
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
                                  ref
                                      .read(cartProvider.notifier)
                                      .addToCart(course);
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(
                                          '${course.title} added to cart!'),
                                      backgroundColor: const Color(0xFF10B981),
                                      action: SnackBarAction(
                                        label: 'VIEW CART',
                                        textColor: Colors.white,
                                        onPressed: () {
                                          // Navigate to cart
                                        },
                                      ),
                                    ),
                                  );
                                }
                              },
                              icon: const Icon(Icons.add_shopping_cart),
                              label: const Text('Add to Cart'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: const Color(0xFF3B82F6),
                                side: const BorderSide(
                                  color: Color(0xFF3B82F6),
                                ),
                                padding:
                                    const EdgeInsets.symmetric(vertical: 20),
                                minimumSize: const Size(double.infinity, 60),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                              ),
                            ),
                          ),

                        // Certificate Button (Demo)
                        if (!isGuest)
                          Padding(
                            padding: const EdgeInsets.only(top: 16),
                            child: OutlinedButton.icon(
                              onPressed: () async {
                                try {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                        content:
                                            Text('Generating Certificate...')),
                                  );
                                  final certRepo =
                                      ref.read(certificateRepositoryProvider);
                                  final url = await certRepo
                                      .generateCertificate(course.slug);
                                  if (url != null) {
                                    if (context.mounted) {
                                      ScaffoldMessenger.of(context)
                                          .showSnackBar(
                                        SnackBar(
                                            content: Text(
                                                'Certificate Ready: $url')),
                                      );
                                    }
                                  }
                                } on Exception catch (e) {
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                          content:
                                              Text('Certificate Error: $e')),
                                    );
                                  }
                                }
                              },
                              icon: const Icon(Icons.workspace_premium),
                              label:
                                  const Text('Download Certificate (Preview)'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.white,
                                side: BorderSide(
                                  color: Colors.white.withValues(alpha: 0.2),
                                ),
                                padding:
                                    const EdgeInsets.symmetric(vertical: 20),
                                minimumSize: const Size(double.infinity, 60),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                              ),
                            ),
                          ),
                      ],
                    );
                  },
                ).animate().slideY(delay: 800.ms, begin: 0.2),
                const SizedBox(height: 60),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CurriculumList extends StatelessWidget {
  const _CurriculumList({required this.courseTitle});
  final String courseTitle;

  @override
  Widget build(BuildContext context) {
    // Mock data for "Wow" factor
    final modules = [
      'Introduction to $courseTitle',
      'Core Concepts & Architecture',
      'Advanced Techniques',
      'Real-world Project Implementation',
      'Final Assessment',
    ];

    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: modules.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        return GlassContainer(
          opacity: 0.03,
          blur: 0,
          padding: EdgeInsets.zero,
          child: ListTile(
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
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
              modules[index],
              style: GoogleFonts.outfit(
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
            ),
            trailing:
                const Icon(Icons.lock_outline, size: 20, color: Colors.white24),
          ),
        ).animate().slideX(delay: (100 * index).ms);
      },
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
