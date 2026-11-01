
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/features/ai/presentation/widgets/trending_courses_section.dart';
import 'package:my_flutter_app/src/features/ai/providers/ai_providers.dart';

/// Widget to display personalized recommended courses.
class RecommendedCoursesSection extends ConsumerWidget {
  const RecommendedCoursesSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Watch relevant provider
    final recommendationsAsync = ref.watch(aiRecommendationsProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                 crossAxisAlignment: CrossAxisAlignment.start,
                 children: [
                   Text(
                        '✨ Recommended For You',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                   ),
                   const SizedBox(height: 4),
                   Text(
                     'Based on your learning history',
                     style: Theme.of(context).textTheme.bodySmall?.copyWith(
                       color: Colors.grey.shade600,
                     ),
                   ),
                 ],
              ),
              
            ],
          ),
        ),
        SizedBox(
          height: 220,
          child: recommendationsAsync.when(
            data: (courses) => courses.isEmpty
                ? const Center(child: Text('Start learning to get recommendations!'))
                : ListView.builder(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    itemCount: courses.length,
                    itemBuilder: (context, index) {
                      // Reuse card, just change color/badge via subclass or config? 
                      // For speed, using TrendingCard logic but we might ideally want a distinct look.
                      // Let's reuse TrendingCourseCard but we might want a "Recommended" badge implementation inside it.
                      // For now, reuse is fine.
                      return TrendingCourseCard(course: courses[index]);
                    },
                  ),
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, stack) {
               // Similar error handling as trending
               return const Center(child: Text('Unable to load recommendations'));
            },
          ),
        ),
      ],
    );
  }
}
