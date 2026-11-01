import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:my_flutter_app/src/features/ai/data/ai_repository.dart';
import 'package:my_flutter_app/src/features/analytics/data/analytics_repository.dart';

class QuizView extends ConsumerStatefulWidget {
  const QuizView({super.key, required this.moduleSlug});
  final String moduleSlug;

  @override
  ConsumerState<QuizView> createState() => _QuizViewState();
}

class _QuizViewState extends ConsumerState<QuizView> {
  final Map<String, String> _answers = {};
  bool _isSubmitting = false;
  QuizResult? _result;

  @override
  Widget build(BuildContext context) {
    final quizAsync = ref.watch(quizProvider(widget.moduleSlug));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Module Quiz'),
        bottom: quizAsync.hasValue
            ? PreferredSize(
                preferredSize: const Size.fromHeight(4),
                child: LinearProgressIndicator(
                  value: _calculateProgress(quizAsync.value!),
                ),
              )
            : null,
      ),
      body: quizAsync.when(
        data: (quiz) {
          if (_result != null) {
            return _buildResultView(quiz);
          }
          return _buildQuizForm(quiz);
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
      ),
    );
  }

  Widget _buildQuizForm(ResearchQuiz quiz) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          quiz.title,
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 8),
        Text('Win ${quiz.xpReward} XP upon passing (70% required)'),
        const Divider(height: 32),
        ...quiz.questions.map(_buildQuestion),
        const SizedBox(height: 24),
        ElevatedButton(
          onPressed: _isSubmitting || _answers.length != quiz.questions.length
              ? null
              : () => _submitQuiz(quiz),
          child: _isSubmitting
              ? const CircularProgressIndicator()
              : const Text('Submit Answers'),
        ),
      ],
    );
  }

  Widget _buildQuestion(QuizQuestion question) {
    final isAnswered = _answers.containsKey(question.id);

    return Card(
      elevation: isAnswered ? 2 : 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: isAnswered
            ? BorderSide(color: Theme.of(context).colorScheme.primary)
            : BorderSide.none,
      ),
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Q${question.order}. ${question.text}',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            ...question.choices.map((choice) {
              return RadioListTile<String>(
                title: Text(choice.text),
                value: choice.id,
                // ignore: deprecated_member_use
                groupValue: _answers[question.id],
                // ignore: deprecated_member_use
                onChanged: (val) {
                  setState(() {
                    if (val != null) {
                      _answers[question.id] = val;
                    }
                  });
                },
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildResultView(ResearchQuiz quiz) {
    final passed = _result!.passed;
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            passed ? Icons.check_circle : Icons.cancel,
            color: passed ? Colors.green : Colors.red,
            size: 64,
          ),
          const SizedBox(height: 16),
          Text(
            passed ? 'Quiz Passed!' : 'Try Again',
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: 8),
          Text('Score: ${_result!.score} / ${_result!.total}'),
          if (passed)
            Text(
              '+${_result!.xpAwarded} XP Awarded',
              style: const TextStyle(
                  color: Colors.amber, fontWeight: FontWeight.bold),
            ),
          const SizedBox(height: 24),
          if (!passed && _result!.remedialContent != null) ...[
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color:
                    Theme.of(context).colorScheme.errorContainer.withAlpha(51),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                    color: Theme.of(context).colorScheme.errorContainer),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Icon(Icons.auto_awesome,
                          color: Theme.of(context).colorScheme.error),
                      const SizedBox(width: 8),
                      Text('AI Study Guide',
                          style: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.copyWith(
                                  color: Theme.of(context).colorScheme.error)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  MarkdownBody(data: _result!.remedialContent!),
                ],
              ),
            ),
            const SizedBox(height: 24),
          ],
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              ElevatedButton(
                onPressed: () => context.pop(),
                child: const Text('Return to Module'),
              ),
              if (!passed) ...[
                const SizedBox(width: 12),
                OutlinedButton.icon(
                  onPressed: () {
                    context.go('/ai-chat', extra: {
                      'initialQuery':
                          'I need help passing the ${quiz.title} quiz.'
                    });
                  },
                  icon: const Icon(Icons.support_agent),
                  label: const Text('Ask AI for Help'),
                ),
              ]
            ],
          ),
        ],
      ),
    ).animate().fadeIn();
  }

  Future<void> _submitQuiz(ResearchQuiz quiz) async {
    setState(() => _isSubmitting = true);
    try {
      final result = await ref
          .read(aiRepositoryProvider)
          .submitQuiz(widget.moduleSlug, _answers);
      setState(() => _result = result);

      // Phase 6: Silently track activity for the AI Heatmap
      await ref.read(analyticsRepositoryProvider).trackActivity(
        action: 'completed_quiz',
        contentType: 'quiz',
        metadata: {
          'module_slug': widget.moduleSlug,
          'score': result.score,
          'passed': result.passed,
        },
      );
    } on Exception catch (e) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Error submitting quiz: $e')));
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  double _calculateProgress(ResearchQuiz quiz) {
    if (quiz.questions.isEmpty) {
      return 0;
    }
    return _answers.length / quiz.questions.length;
  }
}

final quizProvider =
    FutureProvider.family<ResearchQuiz, String>((ref, slug) async {
  return ref.watch(aiRepositoryProvider).getQuiz(slug);
});
