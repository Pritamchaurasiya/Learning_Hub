import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/course_model.dart';
import '../../core/providers/course_provider.dart';
import '../../core/utils/responsive.dart';
import 'package:learning_hub/features/payment/presentation/widgets/payment_modal.dart';
import 'widgets/course_detail_widgets.dart';
import 'package:learning_hub/shared/widgets/app_feedback.dart';
import 'package:learning_hub/shared/widgets/error_view.dart';
import 'package:learning_hub/shared/widgets/empty_state_view.dart';

/// Course detail screen with curriculum, reviews, enrollment, and notes
class CourseDetailScreen extends ConsumerStatefulWidget {
  final String courseId;

  const CourseDetailScreen({super.key, required this.courseId});

  @override
  ConsumerState<CourseDetailScreen> createState() => _CourseDetailScreenState();
}

class _CourseDetailScreenState extends ConsumerState<CourseDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isEnrolled = false;

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

  // Enrollment is handled by _onEnroll which properly takes the Course parameter

  void _onEnroll(Course course) async {
    if (_isEnrolled) return;
    await HapticFeedback.mediumImpact();
    if (!mounted) return;

    if (course.isFree) {
      setState(() => _isEnrolled = true);
      _showSuccessConfetti();
      return;
    }

    final success = await showDialog<bool>(
      context: context,
      builder: (context) => PaymentModal(course: course),
    );

    if (!mounted) return;

    if (success == true) {
      setState(() => _isEnrolled = true);
      _showSuccessConfetti();
    }
  }

  void _showSuccessConfetti() {
    AppFeedback.showSuccess(
        context, 'Enrollment Successful! Welcome to the course.');
  }

  @override
  Widget build(BuildContext context) {
    final isDesktop = Responsive.isDesktop(context);

    final courseAsync = ref.watch(courseDetailsProvider(widget.courseId));

    return Scaffold(
      body: courseAsync.when(
        data: (course) {
          if (course == null) {
            return const EmptyStateView(
              icon: Icons.school_outlined,
              title: 'Course Not Found',
              subtitle: 'This course may have been removed or is unavailable.',
            );
          }
          return isDesktop
              ? DesktopLayout(
                  course: course,
                  tabController: _tabController,
                  isEnrolled: _isEnrolled,
                  onEnroll: () => _onEnroll(course),
                )
              : MobileLayout(
                  course: course,
                  tabController: _tabController,
                  isEnrolled: _isEnrolled,
                  onEnroll: () => _onEnroll(course),
                );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => ErrorView(
          title: 'Failed to Load Course',
          subtitle: err.toString(),
          onRetry: () => ref.invalidate(courseDetailsProvider(widget.courseId)),
        ),
      ),
      bottomNavigationBar: !isDesktop
          ? courseAsync.when(
              data: (course) => course != null
                  ? MobilePurchaseBar(
                      course: course,
                      isEnrolled: _isEnrolled,
                      onEnroll: () =>
                          _onEnroll(course), // Corrected to pass course
                    )
                  : null,
              loading: () => null,
              error: (_, __) => null,
            )
          : null,
    );
  }
} // Closing _CourseDetailScreenState
