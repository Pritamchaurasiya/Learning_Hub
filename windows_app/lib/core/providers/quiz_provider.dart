import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/quiz_generation_service.dart';

/// Quiz Feature State
class QuizState {
  final GeneratedQuiz? quiz;
  final bool isLoading;
  final int currentQuestionIndex;
  final Map<String, int> selectedAnswers; // questionId -> answerIndex
  final bool isSubmitting;
  final QuizResult? result;
  final String? error;

  const QuizState({
    this.quiz,
    this.isLoading = false,
    this.currentQuestionIndex = 0,
    this.selectedAnswers = const {},
    this.isSubmitting = false,
    this.result,
    this.error,
  });

  QuizState copyWith({
    GeneratedQuiz? quiz,
    bool? isLoading,
    int? currentQuestionIndex,
    Map<String, int>? selectedAnswers,
    bool? isSubmitting,
    QuizResult? result,
    String? error,
  }) {
    return QuizState(
      quiz: quiz ?? this.quiz,
      isLoading: isLoading ?? this.isLoading,
      currentQuestionIndex: currentQuestionIndex ?? this.currentQuestionIndex,
      selectedAnswers: selectedAnswers ?? this.selectedAnswers,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      result: result ?? this.result,
      error: error ?? this.error,
    );
  }

  bool get isCompleted => result != null;
}

/// Quiz Notifier
class QuizNotifier extends StateNotifier<QuizState> {
  final QuizGenerationService _service;

  QuizNotifier(this._service) : super(const QuizState());

  Future<void> loadQuiz(String quizId) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      // In a real app, fetch by ID.
      // For now, prompt the service to generate a mock quiz or retrieve one.
      // We'll simulate fetching a specific quiz by generating one "on the fly"
      // if not found, to keep the flow working.

      final quiz = await _service.generateFromLesson(
        lessonId: quizId,
        lessonTitle: 'Generated Quiz',
        lessonContent: 'Learning Hub is an advanced platform. '
            'Riverpod is used for state management. '
            'Flutter is a UI toolkit. '
            'Dart is the language used. '
            'Clean Architecture ensures loose coupling. '
            'LoggingService helps with debugging. '
            'Feature Flags allow A/B testing. '
            'Widgets are the building blocks of Flutter apps. '
            'StatelessWidget is immutable. '
            'StatefulWidget maintains state.',
      );

      state = state.copyWith(
        quiz: quiz,
        isLoading: false,
        currentQuestionIndex: 0,
        selectedAnswers: {},
        result: null,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void selectAnswer(String questionId, int answerIndex) {
    if (state.isCompleted) return;

    final newAnswers = Map<String, int>.from(state.selectedAnswers);
    newAnswers[questionId] = answerIndex;

    state = state.copyWith(selectedAnswers: newAnswers);
  }

  void nextQuestion() {
    if (state.quiz == null) return;
    if (state.currentQuestionIndex < state.quiz!.questions.length - 1) {
      state =
          state.copyWith(currentQuestionIndex: state.currentQuestionIndex + 1);
    } else {
      submitQuiz();
    }
  }

  void previousQuestion() {
    if (state.currentQuestionIndex > 0) {
      state =
          state.copyWith(currentQuestionIndex: state.currentQuestionIndex - 1);
    }
  }

  Future<void> submitQuiz() async {
    if (state.quiz == null) return;

    state = state.copyWith(isSubmitting: true);

    try {
      // Calculate result locally since service implementation for 'submitQuiz' might be different
      // effectively simulating service logic here or calling a service method if it exists.
      // The Service has recordResult, but we need to construct result first.

      int score = 0;
      int correctAnswers = 0;
      final questionResults = <String, bool>{};

      for (final question in state.quiz!.questions) {
        final userAnswerIndex = state.selectedAnswers[question.id];

        // Check if user's answer matches the correct answer
        final bool correct = userAnswerIndex != null &&
            userAnswerIndex == question.correctAnswer;

        if (correct) {
          score += question.points;
          correctAnswers++;
        }
        questionResults[question.id] = correct;
      }

      final result = QuizResult(
        quizId: state.quiz!.id,
        userId: 'current_user',
        score: score,
        maxScore: state.quiz!.totalPoints,
        correctAnswers: correctAnswers,
        totalQuestions: state.quiz!.questions.length,
        timeTaken: const Duration(minutes: 5), // Mock
        passed:
            score >= (state.quiz!.totalPoints * state.quiz!.passingScore / 100),
        questionResults: questionResults,
        completedAt: DateTime.now(),
      );

      // Record result in service
      await _service.recordResult(result);

      state = state.copyWith(
        isSubmitting: false,
        result: result,
      );
    } catch (e) {
      state = state.copyWith(isSubmitting: false, error: e.toString());
    }
  }

  void retry() {
    if (state.quiz != null) {
      state = state.copyWith(
        currentQuestionIndex: 0,
        selectedAnswers: {},
        result: null,
        isSubmitting: false,
      );
    }
  }
}

final quizProvider = StateNotifierProvider.autoDispose
    .family<QuizNotifier, QuizState, String>((ref, quizId) {
  final notifier = QuizNotifier(QuizGenerationService.instance);
  notifier.loadQuiz(quizId);
  return notifier;
});
