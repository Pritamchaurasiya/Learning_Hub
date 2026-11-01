import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:learning_hub/data/models/course_model.dart';
import 'featured_course_card.dart';

class FeaturedCoursesSection extends StatelessWidget {
  final List<Course> courses;

  const FeaturedCoursesSection({super.key, required this.courses});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 240,
      child: PageView.builder(
        controller: PageController(viewportFraction: 0.92),
        padEnds: false,
        itemCount: courses.length,
        itemBuilder: (context, index) {
          final course = courses[index];
          return Padding(
            padding: EdgeInsets.only(
              left: index == 0 ? 16 : 4,
              right: index == courses.length - 1 ? 16 : 4,
            ),
            child: FeaturedCourseCard(course: course),
          ).animate().fadeIn(delay: (100 * index).ms, duration: 400.ms);
        },
      ),
    );
  }
}

class FeaturedCoursesGrid extends StatelessWidget {
  final List<Course> courses;

  const FeaturedCoursesGrid({super.key, required this.courses});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
          maxCrossAxisExtent: 400,
          mainAxisExtent: 240,
          crossAxisSpacing: 16,
          mainAxisSpacing: 16,
        ),
        itemCount: courses.length,
        itemBuilder: (context, index) {
          return FeaturedCourseCard(course: courses[index])
              .animate()
              .fadeIn(delay: (50 * index).ms, duration: 300.ms);
        },
      ),
    );
  }
}
