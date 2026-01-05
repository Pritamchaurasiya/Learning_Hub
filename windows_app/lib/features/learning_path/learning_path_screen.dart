import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/providers/learning_path_provider.dart';
import '../../core/services/learning_path_service.dart';

/// Screen to list all learning paths
class LearningPathListScreen extends ConsumerStatefulWidget {
  const LearningPathListScreen({super.key});

  @override
  ConsumerState<LearningPathListScreen> createState() =>
      _LearningPathListScreenState();
}

class _LearningPathListScreenState
    extends ConsumerState<LearningPathListScreen> {
  @override
  void initState() {
    super.initState();
    // Ensure paths are loaded
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(learningPathProvider.notifier).loadPaths();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(learningPathProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Learning Paths'),
        centerTitle: false,
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.error != null
              ? Center(child: Text('Error: ${state.error}'))
              : _buildContent(context, state, theme),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreatePathDialog(context, ref),
        label: const Text('New Path'),
        icon: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildContent(
      BuildContext context, LearningPathState state, ThemeData theme) {
    if (state.availablePaths.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.map_outlined,
                size: 80, color: theme.colorScheme.outline),
            const SizedBox(height: 16),
            Text(
              'No learning paths yet',
              style: theme.textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'Create a personalized path to start your journey',
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: 24),
            FilledButton.tonal(
              onPressed: () => _showCreatePathDialog(context, ref),
              child: const Text('Create Path'),
            )
          ],
        ).animate().fadeIn().scale(),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: state.availablePaths.length,
      itemBuilder: (context, index) {
        final path = state.availablePaths[index];
        return _LearningPathCard(path: path)
            .animate()
            .fadeIn(delay: (index * 100).ms)
            .slideX();
      },
    );
  }

  void _showCreatePathDialog(BuildContext context, WidgetRef ref) {
    // For now, simple dialog to generate a path from templates
    // In a real app, this would be a multi-step wizard
    showDialog(
      context: context,
      builder: (context) => _CreatePathDialog(),
    );
  }
}

class _LearningPathCard extends StatelessWidget {
  final LearningPath path;

  const _LearningPathCard({required this.path});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final progress = path.progress;

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/learning-path/${path.id}'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with Progress
            Container(
              height: 120,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppColors.primary,
                    AppColors.primary.withValues(alpha: 0.7),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Stack(
                children: [
                  Positioned(
                    right: -20,
                    top: -20,
                    child: Icon(
                      Icons.school,
                      size: 150,
                      color: Colors.white.withValues(alpha: 0.1),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Chip(
                              label: Text(
                                path.goalType.name.toUpperCase(),
                                style: const TextStyle(
                                    fontSize: 10, color: Colors.white),
                              ),
                              backgroundColor: Colors.black26,
                              padding: EdgeInsets.zero,
                              visualDensity: VisualDensity.compact,
                              side: BorderSide.none,
                            ),
                            if (path.isActive)
                              const Icon(Icons.check_circle,
                                  color: Colors.white70),
                          ],
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              path.title,
                              style: theme.textTheme.titleLarge?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${path.milestones.length} Milestones • ~${path.totalEstimatedHours} Hours',
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: Colors.white70,
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

            // Progress Bar
            LinearProgressIndicator(
              value: progress,
              backgroundColor: theme.colorScheme.surfaceContainerHighest,
              minHeight: 6,
            ),

            // Description & Footer
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    path.description,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${(progress * 100).toInt()}% Complete',
                        style: theme.textTheme.labelLarge?.copyWith(
                          color: AppColors.primary,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const Icon(Icons.arrow_forward,
                          size: 16, color: AppColors.primary),
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

class _CreatePathDialog extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final templates = LearningPathService.instance.getTemplates();

    return AlertDialog(
      title: const Text('Choose a Learning Path'),
      content: SizedBox(
        width: 400,
        height: 500,
        child: ListView.builder(
          shrinkWrap: true,
          itemCount: templates.length,
          itemBuilder: (context, index) {
            final template = templates[index];
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                title: Text(template.title),
                subtitle: Text(template.difficulty),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  // Generate path
                  ref.read(learningPathProvider.notifier).generatePath(
                    goal: template.title,
                    targetSkills: template.skillNames,
                    timeCommitment: '10 hours/week',
                    preferredStyles: ['Video', 'Project'],
                  );
                  Navigator.of(context).pop();
                },
              ),
            );
          },
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
      ],
    );
  }
}

/// Screen to view details of a specific learning path
class LearningPathDetailScreen extends ConsumerWidget {
  final String pathId;

  const LearningPathDetailScreen({super.key, required this.pathId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(learningPathProvider);
    final theme = Theme.of(context);

    // Find valid path
    final path = state.availablePaths.where((p) => p.id == pathId).firstOrNull;

    if (path == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Path Not Found')),
        body: const Center(child: Text('This learning path does not exist.')),
      );
    }

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 200,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              title: Text(
                path.title,
                style: const TextStyle(
                  color: Colors.white,
                  shadows: [Shadow(color: Colors.black45, blurRadius: 2)],
                ),
              ),
              background: Container(
                decoration: const BoxDecoration(
                  gradient: AppColors.primaryGradient,
                ),
                child: Center(
                  child: Icon(
                    Icons.map,
                    size: 80,
                    color: Colors.white.withValues(alpha: 0.2),
                  ),
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildStats(context, path),
                  const SizedBox(height: 24),
                  Text(
                    'Your Journey',
                    style: theme.textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),
          SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, index) {
                final milestone = path.milestones[index];
                final isLast = index == path.milestones.length - 1;
                return _MilestoneItem(
                  milestone: milestone,
                  index: index,
                  isLast: isLast,
                  pathId: path.id,
                );
              },
              childCount: path.milestones.length,
            ),
          ),
          const SliverPadding(padding: EdgeInsets.only(bottom: 40)),
        ],
      ),
    );
  }

  Widget _buildStats(BuildContext context, LearningPath path) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: [
        _StatItem(
          label: 'Completed',
          value: '${(path.progress * 100).toInt()}%',
          icon: Icons.pie_chart,
          color: Colors.blue,
        ),
        _StatItem(
          label: 'Hours',
          value: '${path.totalEstimatedHours}',
          icon: Icons.timer,
          color: Colors.orange,
        ),
        _StatItem(
          label: 'Skills',
          value: '${path.targetSkills.length}',
          icon: Icons.bolt,
          color: Colors.purple,
        ),
      ],
    );
  }
}

class _StatItem extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _StatItem({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: color, size: 24),
        ),
        const SizedBox(height: 8),
        Text(
          value,
          style:
              theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
        ),
        Text(
          label,
          style: theme.textTheme.bodySmall,
        ),
      ],
    );
  }
}

class _MilestoneItem extends StatelessWidget {
  final PathMilestone milestone;
  final int index;
  final bool isLast;
  final String pathId;

  const _MilestoneItem({
    required this.milestone,
    required this.index,
    required this.isLast,
    required this.pathId,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Timeline Line
          SizedBox(
            width: 50,
            child: Column(
              children: [
                Container(
                  width: 30,
                  height: 30,
                  decoration: BoxDecoration(
                    color: milestone.isCompleted
                        ? AppColors.success
                        : theme.colorScheme.surfaceContainerHighest,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: milestone.isCompleted
                          ? AppColors.success
                          : theme.colorScheme.outline,
                      width: 2,
                    ),
                  ),
                  child: Center(
                    child: milestone.isCompleted
                        ? const Icon(Icons.check, size: 16, color: Colors.white)
                        : Text(
                            '${index + 1}',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: theme.colorScheme.onSurface,
                            ),
                          ),
                  ),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      color: milestone.isCompleted
                          ? AppColors.success.withValues(alpha: 0.5)
                          : theme.colorScheme.surfaceContainerHighest,
                    ),
                  ),
              ],
            ),
          ),

          // Content
          Expanded(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(8, 0, 16, 24),
              child: Card(
                elevation: 0,
                color: milestone.isCompleted
                    ? AppColors.success.withValues(alpha: 0.05)
                    : theme.colorScheme.surface,
                shape: RoundedRectangleBorder(
                  side: BorderSide(
                    color: theme.colorScheme.outlineVariant,
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        milestone.title,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color:
                              milestone.isCompleted ? AppColors.success : null,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        milestone.description,
                        style: theme.textTheme.bodyMedium,
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Icon(Icons.access_time,
                              size: 14,
                              color: theme.colorScheme.onSurfaceVariant),
                          const SizedBox(width: 4),
                          Text(
                            '~${milestone.estimatedHours} hours',
                            style: theme.textTheme.bodySmall,
                          ),
                          const Spacer(),
                          if (!milestone.isCompleted)
                            FilledButton.icon(
                              onPressed: () {
                                // Start first course in milestone
                                if (milestone.courseIds.isNotEmpty) {
                                  context.push(
                                      '/course/${milestone.courseIds.first}');
                                }
                              },
                              icon: const Icon(Icons.play_arrow, size: 16),
                              label: const Text('Start'),
                              style: FilledButton.styleFrom(
                                visualDensity: VisualDensity.compact,
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    )
        .animate()
        .fadeIn(delay: (index * 100).ms, duration: 500.ms)
        .slideX(begin: 0.1, end: 0);
  }
}
