import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:learning_hub/data/models/course_model.dart';
import 'package:learning_hub/shared/widgets/course_card.dart';

class CourseListHorizontal extends StatelessWidget {
  final List<Course> courses;
  final bool isDesktop;

  const CourseListHorizontal({
    super.key,
    required this.courses,
    required this.isDesktop,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: isDesktop ? 320 : 280,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        itemCount: courses.length,
        itemBuilder: (context, index) {
          final course = courses[index];
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: SizedBox(
              width: isDesktop ? 280 : 220,
              child: CourseCard(
                course: course,
                onTap: () => context.push('/course/${course.id}'),
              ),
            ),
          )
              .animate()
              .fadeIn(delay: (80 * index).ms, duration: 400.ms)
              .slideX(begin: 0.1, end: 0);
        },
      ),
    );
  }
}
