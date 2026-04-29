import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:my_flutter_app/src/features/ai/data/ai_repository.dart';

final curriculumProvider = FutureProvider<List<LearningModule>>((ref) async {
  // Mock curriculum for when backend is unavailable
  final mockModules = [
    LearningModule(
        id: '1',
        title: 'Flutter Fundamentals',
        filename: '01_flutter_basics.md'),
    LearningModule(
        id: '2', title: 'State Management', filename: '02_state_management.md'),
    LearningModule(
        id: '3',
        title: 'Clean Architecture',
        filename: '03_clean_architecture.md'),
    LearningModule(
        id: '4', title: 'Testing Best Practices', filename: '04_testing.md'),
  ];

  try {
    return await ref.watch(aiRepositoryProvider).getCurriculum();
  } on Exception catch (_) {
    return mockModules;
  }
});

final progressProvider = FutureProvider<List<ModuleProgress>>((ref) async {
  return ref.watch(aiRepositoryProvider).getAllProgress();
});

class CurriculumScreen extends ConsumerWidget {
  const CurriculumScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final curriculumAsync = ref.watch(curriculumProvider);
    final progressAsync = ref.watch(progressProvider);

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: const Text('Research Curriculum'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Theme.of(context).colorScheme.surface,
              Theme.of(context).colorScheme.primary.withValues(alpha: 0.05),
              Theme.of(context).colorScheme.secondary.withValues(alpha: 0.05),
            ],
          ),
        ),
        child: curriculumAsync.when(
          data: (modules) => ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 100, 16, 16),
            itemCount: modules.length,
            itemBuilder: (context, index) {
              final module = modules[index];
              return progressAsync.when(
                data: (progressList) {
                  final progress = progressList.firstWhere(
                    (p) =>
                        p.moduleSlug == module.filename.replaceAll('.md', ''),
                    orElse: () => ModuleProgress(
                      id: '',
                      moduleSlug: '',
                      isCompleted: false,
                      quizPassed: false,
                    ),
                  );
                  return _CurriculumCard(
                    module: module,
                    index: index,
                    isCompleted: progress.isCompleted,
                  );
                },
                loading: () => _CurriculumCard(
                    module: module, index: index, isCompleted: false),
                error: (_, __) => _CurriculumCard(
                    module: module, index: index, isCompleted: false),
              );
            },
          ),
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, stack) => Center(child: Text('Error: $err')),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/curriculum/generate'),
        icon: const Icon(Icons.auto_awesome),
        label: const Text('Generate Course'),
      ),
    );
  }
}

class _CurriculumCard extends StatelessWidget {
  const _CurriculumCard({
    required this.module,
    required this.index,
    required this.isCompleted,
  });
  final LearningModule module;
  final int index;
  final bool isCompleted;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.1),
        ),
      ),
      color: Colors.white.withValues(alpha: 0.7),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => context.push('/curriculum/${module.filename}'),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: isCompleted
                      ? Colors.green.withValues(alpha: 0.1)
                      : Theme.of(context).colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(12),
                  border: isCompleted
                      ? Border.all(color: Colors.green.withValues(alpha: 0.5))
                      : null,
                ),
                child: Center(
                  child: isCompleted
                      ? const Icon(Icons.check, color: Colors.green)
                      : Text(
                          module.filename.substring(0, 2),
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Theme.of(context)
                                .colorScheme
                                .onPrimaryContainer,
                          ),
                        ),
                ),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      module.title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Module ${module.id.split('_')[0]}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Theme.of(context)
                                .textTheme
                                .bodySmall
                                ?.color
                                ?.withValues(alpha: 0.7),
                          ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right_rounded,
                color: Theme.of(context).colorScheme.primary,
              ),
            ],
          ),
        ),
      ),
    )
        .animate()
        .fadeIn(delay: Duration(milliseconds: 50 * index))
        .slideX(begin: 0.1);
  }
}
