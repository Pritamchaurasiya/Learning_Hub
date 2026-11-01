import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:my_flutter_app/src/features/ai/data/ai_repository.dart';
import 'package:my_flutter_app/src/features/courses/data/course_repository.dart';

class CurriculumGeneratorScreen extends ConsumerStatefulWidget {
  const CurriculumGeneratorScreen({super.key});

  @override
  ConsumerState<CurriculumGeneratorScreen> createState() =>
      _CurriculumGeneratorScreenState();
}

class _CurriculumGeneratorScreenState
    extends ConsumerState<CurriculumGeneratorScreen> {
  final _topicController = TextEditingController();
  bool _isLoading = false;
  Map<String, dynamic>? _generatedData;
  String? _error;

  Future<void> _generate() async {
    final topic = _topicController.text.trim();
    if (topic.length < 3) {
      return;
    }
    // ... rest of the code

    setState(() {
      _isLoading = true;
      _error = null;
      _generatedData = null;
    });

    try {
      final data =
          await ref.read(aiRepositoryProvider).generateCurriculum(topic);
      if (mounted) {
        setState(() {
          _generatedData = data;
        });
      }
    } on Exception catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
        });
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Course Generator'),
        actions: [
          if (_generatedData != null)
            IconButton(
              icon: const Icon(Icons.share),
              onPressed: () {
                final title =
                    _generatedData!['title'] as String? ?? 'Custom Course';
                final desc = _generatedData!['description'] as String? ?? '';
                final shareText =
                    'Check out this AI-generated curriculum I created on Learning Hub: $title\n\n$desc';
                Clipboard.setData(ClipboardData(text: shareText)).then((_) {
                  HapticFeedback.mediumImpact();
                  if (!context.mounted) {
                    return;
                  }
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                        content: Text('Course summary copied to clipboard!')),
                  );
                });
              },
            ).animate().fade().scale(),
        ],
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Theme.of(context).colorScheme.surface,
              Theme.of(context)
                  .colorScheme
                  .surfaceContainerHighest
                  .withValues(alpha: 0.3),
            ],
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Input Section
              TextField(
                controller: _topicController,
                decoration: InputDecoration(
                  labelText: 'What do you want to learn?',
                  hintText: 'e.g., Quantum Computing, Astrophysics...',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  filled: true,
                  fillColor: Theme.of(context).colorScheme.surfaceContainer,
                  prefixIcon: const Icon(Icons.auto_awesome),
                  suffixIcon: _isLoading
                      ? const Padding(
                          padding: EdgeInsets.all(12),
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : IconButton(
                          icon: const Icon(Icons.arrow_forward),
                          onPressed: _generate,
                        ),
                ),
                onSubmitted: (_) => _generate(),
                textInputAction: TextInputAction.go,
              ).animate().fadeIn().slideY(begin: -0.2),

              const SizedBox(height: 24),

              // Error
              if (_error != null)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.errorContainer,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: Theme.of(context)
                          .colorScheme
                          .error
                          .withValues(alpha: 0.5),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.error_outline,
                          color: Theme.of(context).colorScheme.error),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          _error!,
                          style: TextStyle(
                              color: Theme.of(context)
                                  .colorScheme
                                  .onErrorContainer),
                        ),
                      ),
                    ],
                  ),
                ).animate().shake(),

              // Results
              if (_generatedData != null) ...[
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            (_generatedData!['title'] as String?) ??
                                'Custom Course',
                            style: Theme.of(context)
                                .textTheme
                                .headlineSmall
                                ?.copyWith(fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            (_generatedData!['description'] as String?) ?? '',
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                        ],
                      ),
                    ),
                    Hero(
                      tag: 'ai_badge',
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.primaryContainer,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.stars,
                                size: 16,
                                color: Theme.of(context).colorScheme.primary),
                            const SizedBox(width: 4),
                            Text(
                              'AI Generated',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ).animate().fadeIn().slideX(),
                const SizedBox(height: 16),
                Expanded(
                  child: ListView.builder(
                    itemCount: (_generatedData!['modules'] as List).length,
                    padding: const EdgeInsets.only(bottom: 80),
                    itemBuilder: (context, index) {
                      final module = (_generatedData!['modules'] as List)[index]
                          as Map<String, dynamic>;
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        elevation: 0,
                        color:
                            Theme.of(context).colorScheme.surfaceContainerLow,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: BorderSide(
                            color: Theme.of(context)
                                .colorScheme
                                .outlineVariant
                                .withValues(alpha: 0.5),
                          ),
                        ),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(16),
                          onTap: HapticFeedback.lightImpact,
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Row(
                              children: [
                                Container(
                                  width: 40,
                                  height: 40,
                                  decoration: BoxDecoration(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .primary
                                        .withValues(alpha: 0.1),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Center(
                                    child: Text(
                                      '${index + 1}',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        color: Theme.of(context)
                                            .colorScheme
                                            .primary,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        module['title'] as String,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w600,
                                          fontSize: 16,
                                        ),
                                      ),
                                      if (module['description'] != null) ...[
                                        const SizedBox(height: 4),
                                        Text(
                                          module['description'] as String,
                                          style: Theme.of(context)
                                              .textTheme
                                              .bodySmall,
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Icon(Icons.chevron_right,
                                        color: Theme.of(context)
                                            .colorScheme
                                            .onSurfaceVariant),
                                    const SizedBox(height: 4),
                                    Text(
                                      module['time_to_complete'] as String? ??
                                          '1h',
                                      style: Theme.of(context)
                                          .textTheme
                                          .labelSmall,
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      )
                          .animate(delay: Duration(milliseconds: 100 * index))
                          .fadeIn()
                          .slideX(begin: 0.2, curve: Curves.easeOutQuad);
                    },
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
      bottomNavigationBar: _generatedData != null
          ? Padding(
              padding: const EdgeInsets.all(16),
              child: FilledButton.icon(
                onPressed: _isLoading
                    ? null
                    : () async {
                        await HapticFeedback.mediumImpact();

                        final courseSlug =
                            _generatedData!['course_slug'] as String?;
                        if (courseSlug == null) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                  content: Text(
                                      'Error: Course ID not found in generation data.')),
                            );
                          }
                          return;
                        }

                        setState(() => _isLoading = true);
                        try {
                          await ref
                              .read(courseRepositoryProvider)
                              .enrollInCourse(courseSlug);

                          // Invalidate the enrolled courses count to fetch the new number
                          ref.invalidate(enrolledCoursesCountProvider);

                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                  content:
                                      Text('Course saved to your dashboard!')),
                            );

                            // Ask user if they want to go to their courses or stay on dashboard
                            await showDialog<void>(
                                context: context,
                                builder: (context) => AlertDialog(
                                      title:
                                          const Text('Enrollment Successful'),
                                      content: const Text(
                                          'Would you like to start learning this course right now?'),
                                      actions: [
                                        TextButton(
                                          onPressed: () {
                                            Navigator.pop(
                                                context); // Close dialog
                                            context
                                                .pop(); // Go back to dashboard/AI Hub
                                          },
                                          child: const Text('Later'),
                                        ),
                                        FilledButton(
                                          onPressed: () {
                                            Navigator.pop(context);
                                            context.go(
                                                '/profile'); // Could go to a dedicated 'My Courses' page if it existed
                                          },
                                          child:
                                              const Text('Yes, take me there'),
                                        ),
                                      ],
                                    ));
                          }
                        } on Exception catch (e) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Failed to save course: $e'),
                                backgroundColor:
                                    Theme.of(context).colorScheme.error,
                              ),
                            );
                          }
                        } finally {
                          if (mounted) {
                            setState(() => _isLoading = false);
                          }
                        }
                      },
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16)),
                ),
                icon: const Icon(Icons.bookmark_add),
                label: const Text('Start Learning This Course'),
              ).animate().scale(delay: const Duration(milliseconds: 500)),
            )
          : null,
    );
  }
}
