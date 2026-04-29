import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:learning_hub/core/theme/app_colors.dart';
import 'package:learning_hub/core/providers/quiz_provider.dart';
import 'package:learning_hub/core/services/quiz_generation_service.dart';
import 'package:learning_hub/shared/widgets/error_view.dart';
import 'package:learning_hub/shared/widgets/shimmer_loading.dart';

/// Quiz screen with dynamic questions, animations, and scoring
class QuizScreen extends ConsumerWidget {
  final String courseId;
  final String quizId;

  const QuizScreen({
    super.key,
    required this.courseId,
    required this.quizId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final quizState = ref.watch(quizProvider(quizId));
    final notifier = ref.read(quizProvider(quizId).notifier);
    final theme = Theme.of(context);

    if (quizState.isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Loading Quiz...')),
        body: const Padding(
          padding: EdgeInsets.all(20),
          child: ShimmerList(itemCount: 5, itemHeight: 60),
        ),
      );
    }

    if (quizState.error != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Quiz')),
        body: ErrorView(
          title: quizState.error!,
          onRetry: () => ref.invalidate(quizProvider(quizId)),
        ),
      );
    }

    if (quizState.quiz == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Quiz')),
        body: const ErrorView(title: 'Quiz not found'),
      );
    }

    if (quizState.isCompleted && quizState.result != null) {
      return _ResultsScreen(
        result: quizState.result!,
        onRetry: notifier.retry,
        onContinue: () => context.pop(),
      );
    }

    final question = quizState.quiz!.questions[quizState.currentQuestionIndex];
    final questionId = question.id;
    final totalQuestions = quizState.quiz!.questions.length;
    final selectedAnswerIndex = quizState.selectedAnswers[questionId];
    final progress = (quizState.currentQuestionIndex + 1) / totalQuestions;

    return Scaffold(
      appBar: AppBar(
        title: Text(quizState.quiz!.title),
        actions: [
          Center(
            child: Padding(
              padding: const EdgeInsets.only(right: 16),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${quizState.currentQuestionIndex + 1}/$totalQuestions',
                  style: theme.textTheme.titleSmall?.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Animated progress bar
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: progress),
            duration: const Duration(milliseconds: 500),
            curve: Curves.easeInOutCubic,
            builder: (context, value, _) {
              return LinearProgressIndicator(
                value: value,
                backgroundColor: theme.colorScheme.surfaceContainerHighest,
                color: AppColors.primary,
                minHeight: 5,
              );
            },
          ),

          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Question number badge
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      'Question ${quizState.currentQuestionIndex + 1}',
                      style: const TextStyle(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  )
                      .animate(
                          key: ValueKey(
                              'q_badge_${quizState.currentQuestionIndex}'))
                      .fadeIn(duration: 200.ms)
                      .slideX(begin: -0.1, end: 0),

                  const SizedBox(height: 16),

                  // Question text — animated on change
                  Text(
                    question.question,
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w600,
                      height: 1.4,
                    ),
                  )
                      .animate(
                          key: ValueKey(
                              'q_text_${quizState.currentQuestionIndex}'))
                      .fadeIn(duration: 300.ms),

                  const SizedBox(height: 24),

                  // Options with staggered entrance
                  if (question.options != null && question.options!.isNotEmpty)
                    ...List.generate(question.options!.length, (index) {
                      final isSelected = selectedAnswerIndex == index;

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: InkWell(
                          onTap: () => notifier.selectAnswer(questionId, index),
                          borderRadius: BorderRadius.circular(14),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 250),
                            curve: Curves.easeOut,
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? AppColors.primary.withValues(alpha: 0.1)
                                  : theme.colorScheme.surface,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: isSelected
                                    ? AppColors.primary
                                    : theme.dividerColor,
                                width: isSelected ? 2 : 1,
                              ),
                              boxShadow: isSelected
                                  ? [
                                      BoxShadow(
                                        color: AppColors.primary
                                            .withValues(alpha: 0.12),
                                        blurRadius: 8,
                                        offset: const Offset(0, 2),
                                      )
                                    ]
                                  : null,
                            ),
                            child: Row(
                              children: [
                                AnimatedContainer(
                                  duration: const Duration(milliseconds: 250),
                                  width: 32,
                                  height: 32,
                                  decoration: BoxDecoration(
                                    color: isSelected
                                        ? AppColors.primary
                                        : theme.colorScheme
                                            .surfaceContainerHighest,
                                    shape: BoxShape.circle,
                                  ),
                                  child: Center(
                                    child: Text(
                                      String.fromCharCode(65 + index),
                                      style: TextStyle(
                                        color: isSelected
                                            ? Colors.white
                                            : theme
                                                .colorScheme.onSurfaceVariant,
                                        fontWeight: FontWeight.w700,
                                        fontSize: 14,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Text(
                                    question.options![index],
                                    style: theme.textTheme.bodyLarge?.copyWith(
                                      fontWeight: isSelected
                                          ? FontWeight.w600
                                          : FontWeight.normal,
                                    ),
                                  ),
                                ),
                                if (isSelected)
                                  const Icon(Icons.check_circle,
                                      color: AppColors.primary, size: 22),
                              ],
                            ),
                          ),
                        ),
                      )
                          .animate(
                              key: ValueKey(
                                  'opt_${quizState.currentQuestionIndex}_$index'))
                          .fadeIn(delay: (index * 60).ms, duration: 300.ms)
                          .slideX(begin: 0.08, end: 0, delay: (index * 60).ms);
                    })
                  else
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.surfaceContainerHighest
                            .withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.info_outline, size: 18),
                          SizedBox(width: 8),
                          Text('Question type not fully supported in UI yet'),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),

          // Navigation buttons
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: theme.colorScheme.surface,
              border: Border(top: BorderSide(color: theme.dividerColor)),
            ),
            child: SafeArea(
              top: false,
              child: Row(
                children: [
                  if (quizState.currentQuestionIndex > 0)
                    OutlinedButton.icon(
                      onPressed: notifier.previousQuestion,
                      icon: const Icon(Icons.arrow_back_rounded, size: 18),
                      label: const Text('Previous'),
                    ),
                  const Spacer(),
                  FilledButton.icon(
                    onPressed: selectedAnswerIndex != null
                        ? notifier.nextQuestion
                        : null,
                    icon: quizState.isSubmitting
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white))
                        : Icon(
                            quizState.currentQuestionIndex == totalQuestions - 1
                                ? Icons.check_circle_outline
                                : Icons.arrow_forward_rounded,
                            size: 18),
                    label: Text(
                        quizState.currentQuestionIndex == totalQuestions - 1
                            ? 'Finish'
                            : 'Next'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Results screen after quiz completion — with animated score
class _ResultsScreen extends StatelessWidget {
  final QuizResult result;
  final VoidCallback onRetry;
  final VoidCallback onContinue;

  const _ResultsScreen({
    required this.result,
    required this.onRetry,
    required this.onContinue,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final passed = result.passed;
    final percentage =
        result.maxScore > 0 ? result.score / result.maxScore : 0.0;
    final resultColor = passed ? AppColors.success : AppColors.error;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Result icon with animated entrance
                Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    color: resultColor.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    passed ? Icons.emoji_events : Icons.refresh,
                    size: 60,
                    color: resultColor,
                  ),
                )
                    .animate()
                    .scale(
                      begin: const Offset(0.5, 0.5),
                      end: const Offset(1, 1),
                      duration: 600.ms,
                      curve: Curves.elasticOut,
                    )
                    .fadeIn(duration: 300.ms),

                const SizedBox(height: 32),

                // Title
                Text(
                  passed ? 'Congratulations!' : 'Keep Learning!',
                  style: theme.textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ).animate().fadeIn(delay: 200.ms, duration: 400.ms),

                const SizedBox(height: 8),

                Text(
                  passed
                      ? 'You passed the quiz!'
                      : 'You need 70% to pass. Try again!',
                  style: theme.textTheme.bodyLarge?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ).animate().fadeIn(delay: 300.ms, duration: 400.ms),

                const SizedBox(height: 32),

                // Animated score card
                Container(
                  padding: const EdgeInsets.all(28),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: resultColor.withValues(alpha: 0.2),
                    ),
                  ),
                  child: Column(
                    children: [
                      // Animated percentage counter
                      TweenAnimationBuilder<double>(
                        tween: Tween(begin: 0, end: percentage * 100),
                        duration: const Duration(milliseconds: 1200),
                        curve: Curves.easeOutCubic,
                        builder: (context, value, _) {
                          return Text(
                            '${value.toInt()}%',
                            style: theme.textTheme.displaySmall?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: resultColor,
                            ),
                          );
                        },
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '${result.score.toInt()} out of ${result.maxScore} points',
                        style: theme.textTheme.bodyLarge,
                      ),
                      const SizedBox(height: 12),
                      // Animated progress bar
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: TweenAnimationBuilder<double>(
                          tween: Tween(begin: 0, end: percentage),
                          duration: const Duration(milliseconds: 1200),
                          curve: Curves.easeOutCubic,
                          builder: (context, value, _) {
                            return LinearProgressIndicator(
                              value: value,
                              minHeight: 10,
                              backgroundColor:
                                  resultColor.withValues(alpha: 0.1),
                              color: resultColor,
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                )
                    .animate()
                    .fadeIn(delay: 400.ms, duration: 500.ms)
                    .slideY(begin: 0.2, end: 0, delay: 400.ms),

                const SizedBox(height: 24),

                // SRS Info
                if (passed)
                  Container(
                    padding: const EdgeInsets.all(14),
                    margin: const EdgeInsets.only(bottom: 24),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primaryContainer
                          .withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.calendar_today, size: 16),
                        SizedBox(width: 8),
                        Flexible(
                          child: Text(
                            'Next review scheduled based on your performance',
                          ),
                        ),
                      ],
                    ),
                  ).animate().fadeIn(delay: 600.ms, duration: 400.ms),

                // Buttons
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: onRetry,
                        icon: const Icon(Icons.replay_rounded, size: 18),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        label: const Text('Try Again'),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: onContinue,
                        icon: const Icon(Icons.arrow_forward_rounded, size: 18),
                        style: FilledButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        label: const Text('Continue'),
                      ),
                    ),
                  ],
                ).animate().fadeIn(delay: 700.ms, duration: 400.ms),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
