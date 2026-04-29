import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:my_flutter_app/src/core/widgets/glass_container.dart';
import 'package:my_flutter_app/src/features/ai/data/ai_repository.dart';

// --- State Management ---

final quizProvider =
    FutureProvider.family<ResearchQuiz, String>((ref, slug) async {
  return ref.read(aiRepositoryProvider).getQuiz(slug);
});

// --- UI ---

class QuizScreen extends ConsumerStatefulWidget {
  const QuizScreen({super.key, required this.moduleSlug});
  final String moduleSlug;

  @override
  ConsumerState<QuizScreen> createState() => _QuizScreenState();
}

class _QuizScreenState extends ConsumerState<QuizScreen> {
  int _currentIndex = 0;
  final Map<String, String> _answers = {}; // QuestionID -> ChoiceID
  bool _submitting = false;
  QuizResult? _result;
  bool _gettingHint = false;
  String? _currentHint;

  void _selectAnswer(String questionId, String choiceId) {
    if (_submitting || _result != null) {
      return;
    }
    setState(() {
      _answers[questionId] = choiceId;
    });
  }

  Future<void> _submit() async {
    setState(() => _submitting = true);
    try {
      final repo = ref.read(aiRepositoryProvider);
      final result = await repo.submitQuiz(widget.moduleSlug, _answers);
      setState(() => _result = result);
    } on Exception catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Submission failed: $e')),
        );
      }
    } finally {
      setState(() => _submitting = false);
    }
  }

  Future<void> _getHint(String questionText) async {
    if (_gettingHint) {
      return;
    }
    setState(() {
      _gettingHint = true;
      _currentHint = null;
    });

    try {
      final hint = await ref.read(aiRepositoryProvider).askTutor(
            '${widget.moduleSlug}.md',
            'Give me a short hint for this question: "$questionText". Do not reveal the answer.',
          );
      if (mounted) {
        setState(() => _currentHint = hint);
      }
    } on Exception catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to get hint: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _gettingHint = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final quizAsync = ref.watch(quizProvider(widget.moduleSlug));

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: const Text('Knowledge Check'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: quizAsync.when(
          data: _buildQuizBody,
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, stack) => Center(
              child: Text('Error: $err',
                  style: const TextStyle(color: Colors.white))),
        ),
      ),
    );
  }

  Widget _buildQuizBody(ResearchQuiz quiz) {
    if (_result != null) {
      return _buildResultView(quiz);
    }

    // Guard against empty questions list
    if (quiz.questions.isEmpty) {
      return const Center(
        child: Text('No questions available',
            style: TextStyle(color: Colors.white)),
      );
    }

    // Guard against invalid current index
    if (_currentIndex >= quiz.questions.length) {
      return const Center(
        child: Text('Invalid question index',
            style: TextStyle(color: Colors.white)),
      );
    }

    final question = quiz.questions[_currentIndex];
    final total = quiz.questions.length;
    final progress = (_currentIndex + 1) / total;

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 60),
          // Progress
          LinearProgressIndicator(
            value: progress,
            backgroundColor: Colors.white10,
            valueColor: const AlwaysStoppedAnimation(Color(0xFF3B82F6)),
            borderRadius: BorderRadius.circular(4),
          ),
          const SizedBox(height: 12),
          Text('Question ${_currentIndex + 1} of $total',
              style: const TextStyle(color: Colors.white54)),
          const SizedBox(height: 32),

          // Question Card
          Expanded(
            child: GlassContainer(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          question.text,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ).animate().fadeIn().slideY(begin: 0.1),
                      ),
                      IconButton(
                        onPressed: () => _getHint(question.text),
                        icon: _gettingHint
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child:
                                    CircularProgressIndicator(strokeWidth: 2))
                            : const Icon(Icons.lightbulb_outline,
                                color: Colors.amberAccent),
                        tooltip: 'Get AI Hint',
                      ),
                    ],
                  ),
                  if (_currentHint != null)
                    Container(
                      margin: const EdgeInsets.only(top: 16),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.amberAccent.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                            color: Colors.amberAccent.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.auto_awesome,
                              color: Colors.amberAccent, size: 16),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _currentHint!,
                              style: const TextStyle(
                                  color: Colors.amberAccent,
                                  fontStyle: FontStyle.italic),
                            ),
                          ),
                        ],
                      ),
                    ).animate().fadeIn(),
                  const SizedBox(height: 32),
                  ...question.choices.map((choice) {
                    final isSelected = _answers[question.id] == choice.id;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: InkWell(
                        onTap: () => _selectAnswer(question.id, choice.id),
                        borderRadius: BorderRadius.circular(12),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? const Color(0xFF3B82F6).withValues(alpha: 0.2)
                                : Colors.white.withValues(alpha: 0.05),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isSelected
                                  ? const Color(0xFF3B82F6)
                                  : Colors.white10,
                            ),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                isSelected
                                    ? Icons.radio_button_checked
                                    : Icons.radio_button_unchecked,
                                color: isSelected
                                    ? const Color(0xFF3B82F6)
                                    : Colors.white54,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  choice.text,
                                  style: const TextStyle(color: Colors.white),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ).animate().fadeIn(delay: 100.ms).slideX();
                  }),
                ],
              ),
            ),
          ),

          const SizedBox(height: 24),

          // Navigation
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              if (_currentIndex > 0)
                TextButton(
                  onPressed: () => setState(() => _currentIndex--),
                  child: const Text('Previous'),
                )
              else
                const SizedBox(),
              if (_currentIndex < total - 1)
                FilledButton(
                  onPressed: () => setState(() => _currentIndex++),
                  child: const Text('Next'),
                )
              else
                // Check that all questions have answers
                FilledButton.icon(
                  onPressed:
                      _answers.length == total && !_submitting ? _submit : null,
                  icon: const Icon(Icons.check),
                  label: _submitting
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('Submit Quiz'),
                  style: FilledButton.styleFrom(backgroundColor: Colors.green),
                ),
            ],
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildResultView(ResearchQuiz quiz) {
    final passed = _result!.passed;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: GlassContainer(
          padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: passed
                      ? Colors.amber.withValues(alpha: 0.1)
                      : Colors.redAccent.withValues(alpha: 0.1),
                  border: Border.all(
                    color: passed
                        ? Colors.amber.withValues(alpha: 0.5)
                        : Colors.redAccent.withValues(alpha: 0.5),
                    width: 2,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: passed
                          ? Colors.amber.withValues(alpha: 0.2)
                          : Colors.redAccent.withValues(alpha: 0.2),
                      blurRadius: 30,
                      spreadRadius: 10,
                    ),
                  ],
                ),
                child: Icon(
                  passed ? Icons.emoji_events : Icons.sentiment_dissatisfied,
                  size: 80,
                  color: passed ? Colors.amber : Colors.redAccent,
                ),
              ),
              const SizedBox(height: 32),
              Text(
                passed ? 'Outstanding Work!' : 'Keep Learning',
                style: const TextStyle(
                  fontSize: 36,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'You scored ${_result!.score} out of ${_result!.total}',
                style: const TextStyle(
                  color: Colors.white70,
                  fontSize: 20,
                  fontWeight: FontWeight.w500,
                ),
              ),
              if (passed)
                Padding(
                  padding: const EdgeInsets.only(top: 24),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 24, vertical: 12),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFFF59E0B), Color(0xFFD97706)],
                      ),
                      borderRadius: BorderRadius.circular(30),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.amber.withValues(alpha: 0.3),
                          blurRadius: 15,
                          offset: const Offset(0, 5),
                        )
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.bolt, color: Colors.white),
                        const SizedBox(width: 8),
                        Text(
                          '+${_result!.xpAwarded} XP Earned',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              const SizedBox(height: 48),
              SizedBox(
                width: double.infinity,
                height: 56,
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor:
                        passed ? const Color(0xFF3B82F6) : Colors.white24,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  onPressed: () => context.pop(),
                  child: Text(
                    passed ? 'Continue Journey' : 'Review & Retry',
                    style: const TextStyle(
                        fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
