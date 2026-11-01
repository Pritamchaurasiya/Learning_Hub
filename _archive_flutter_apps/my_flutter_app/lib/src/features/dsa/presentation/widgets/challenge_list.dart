import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:my_flutter_app/src/features/dsa/data/dsa_repository.dart';
import 'package:my_flutter_app/src/features/dsa/domain/dsa_models.dart';

class DsaChallengeList extends ConsumerWidget {
  const DsaChallengeList({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final problemsAsync = ref.watch(dsaProblemsProvider);
    final tagsAsync = ref.watch(dsaTagsProvider);
    final selectedDifficulty = ref.watch(dsaDifficultyFilterProvider);
    final selectedTag = ref.watch(dsaTagFilterProvider);

    return Column(
      children: [
        // Filter Bar
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              // Difficulty Filters
              _FilterChip(
                label: 'Easy',
                isSelected: selectedDifficulty == 'EASY',
                onSelected: (val) => ref
                    .read(dsaDifficultyFilterProvider.notifier)
                    .state = val ? 'EASY' : null,
                color: Colors.green,
              ),
              const SizedBox(width: 8),
              _FilterChip(
                label: 'Medium',
                isSelected: selectedDifficulty == 'MEDIUM',
                onSelected: (val) => ref
                    .read(dsaDifficultyFilterProvider.notifier)
                    .state = val ? 'MEDIUM' : null,
                color: Colors.orange,
              ),
              const SizedBox(width: 8),
              _FilterChip(
                label: 'Hard',
                isSelected: selectedDifficulty == 'HARD',
                onSelected: (val) => ref
                    .read(dsaDifficultyFilterProvider.notifier)
                    .state = val ? 'HARD' : null,
                color: Colors.red,
              ),
              const VerticalDivider(width: 20),
              // Dynamic Tag Filters
              tagsAsync.when(
                data: (tags) => Row(
                  children: tags
                      .map((tag) => Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: FilterChip(
                              label: Text(tag.name),
                              selected: selectedTag == tag.slug,
                              onSelected: (val) => ref
                                  .read(dsaTagFilterProvider.notifier)
                                  .state = val ? tag.slug : null,
                            ),
                          ))
                      .toList(),
                ),
                loading: () => const SizedBox.shrink(),
                error: (_, __) => const SizedBox.shrink(),
              ),
            ],
          ),
        ),

        // Problem List
        Expanded(
          child: problemsAsync.when(
            data: (problems) => ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: problems.length,
              itemBuilder: (context, index) {
                final problem = problems[index];
                return ProblemCard(problem: problem);
              },
            ),
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (err, stack) => Center(child: Text('Error: $err')),
          ),
        ),
      ],
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.isSelected,
    required this.onSelected,
    required this.color,
  });
  final String label;
  final bool isSelected;
  final ValueChanged<bool> onSelected;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(label),
      selected: isSelected,
      onSelected: onSelected,
      selectedColor: color.withValues(alpha: 0.2),
      checkmarkColor: color,
      labelStyle: TextStyle(
        color: isSelected ? color : Colors.grey[400],
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
      ),
    );
  }
}

class ProblemCard extends StatelessWidget {
  const ProblemCard({super.key, required this.problem});
  final DsaProblem problem;

  @override
  Widget build(BuildContext context) {
    Color difficultyColor;
    switch (problem.difficulty.toUpperCase()) {
      case 'EASY':
        difficultyColor = Colors.green;
        break;
      case 'MEDIUM':
        difficultyColor = Colors.orange;
        break;
      case 'HARD':
        difficultyColor = Colors.red;
        break;
      default:
        difficultyColor = Colors.blue;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        title: Text(
          problem.title,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        subtitle: Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: difficultyColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: difficultyColor),
              ),
              child: Text(
                problem.difficulty,
                style: TextStyle(
                    color: difficultyColor,
                    fontSize: 12,
                    fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(width: 12),
            Icon(Icons.stars, size: 16, color: Colors.amber[700]),
            const SizedBox(width: 4),
            Text('${problem.points} pts'),
          ],
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: () {
          _navigateToDetail(context, problem.slug);
        },
      ),
    );
  }

  void _navigateToDetail(BuildContext context, String slug) {
    context.go('/dsa/$slug');
  }
}
