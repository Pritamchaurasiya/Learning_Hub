import 'dart:convert';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Question types for quizzes
enum QuestionType {
  multipleChoice,
  trueFalse,
  fillBlank,
  matching,
  ordering,
}

/// Quiz difficulty levels
enum QuizDifficulty {
  beginner,
  intermediate,
  advanced,
  expert,
}

/// Generated quiz question
class QuizQuestion {
  final String id;
  final QuestionType type;
  final String question;
  final List<String>? options;
  final dynamic correctAnswer; // Could be String, List, or int
  final String? explanation;
  final QuizDifficulty difficulty;
  final int points;
  final int timeLimitSeconds;
  final String? hint;
  final Map<String, dynamic>? metadata;

  const QuizQuestion({
    required this.id,
    required this.type,
    required this.question,
    this.options,
    required this.correctAnswer,
    this.explanation,
    required this.difficulty,
    this.points = 10,
    this.timeLimitSeconds = 60,
    this.hint,
    this.metadata,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type.index,
        'question': question,
        if (options != null) 'options': options,
        'correctAnswer': correctAnswer,
        if (explanation != null) 'explanation': explanation,
        'difficulty': difficulty.index,
        'points': points,
        'timeLimitSeconds': timeLimitSeconds,
        if (hint != null) 'hint': hint,
        if (metadata != null) 'metadata': metadata,
      };

  factory QuizQuestion.fromJson(Map<String, dynamic> json) {
    return QuizQuestion(
      id: json['id'] as String,
      type: QuestionType.values[json['type'] as int],
      question: json['question'] as String,
      options: (json['options'] as List?)?.cast<String>(),
      correctAnswer: json['correctAnswer'],
      explanation: json['explanation'] as String?,
      difficulty: QuizDifficulty.values[json['difficulty'] as int],
      points: json['points'] as int? ?? 10,
      timeLimitSeconds: json['timeLimitSeconds'] as int? ?? 60,
      hint: json['hint'] as String?,
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }

  /// Check if answer is correct
  bool checkAnswer(dynamic userAnswer) {
    if (type == QuestionType.multipleChoice || type == QuestionType.trueFalse) {
      return userAnswer == correctAnswer;
    } else if (type == QuestionType.fillBlank) {
      final correct = (correctAnswer as String).toLowerCase().trim();
      final user = (userAnswer as String).toLowerCase().trim();
      return correct == user;
    } else if (type == QuestionType.matching || type == QuestionType.ordering) {
      if (userAnswer is List && correctAnswer is List) {
        if (userAnswer.length != (correctAnswer as List).length) return false;
        for (int i = 0; i < userAnswer.length; i++) {
          if (userAnswer[i] != (correctAnswer as List)[i]) return false;
        }
        return true;
      }
      return false;
    }
    return false;
  }
}

/// Generated quiz
class GeneratedQuiz {
  final String id;
  final String title;
  final String? description;
  final String sourceContentId; // Lesson or course ID
  final List<QuizQuestion> questions;
  final QuizDifficulty difficulty;
  final int totalPoints;
  final int timeLimitMinutes;
  final int passingScore; // Percentage
  final DateTime generatedAt;
  final DateTime? expiresAt;

  const GeneratedQuiz({
    required this.id,
    required this.title,
    this.description,
    required this.sourceContentId,
    required this.questions,
    required this.difficulty,
    required this.totalPoints,
    required this.timeLimitMinutes,
    this.passingScore = 70,
    required this.generatedAt,
    this.expiresAt,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        if (description != null) 'description': description,
        'sourceContentId': sourceContentId,
        'questions': questions.map((q) => q.toJson()).toList(),
        'difficulty': difficulty.index,
        'totalPoints': totalPoints,
        'timeLimitMinutes': timeLimitMinutes,
        'passingScore': passingScore,
        'generatedAt': generatedAt.toIso8601String(),
        if (expiresAt != null) 'expiresAt': expiresAt!.toIso8601String(),
      };

  factory GeneratedQuiz.fromJson(Map<String, dynamic> json) {
    return GeneratedQuiz(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      sourceContentId: json['sourceContentId'] as String,
      questions: (json['questions'] as List)
          .map((q) => QuizQuestion.fromJson(q as Map<String, dynamic>))
          .toList(),
      difficulty: QuizDifficulty.values[json['difficulty'] as int],
      totalPoints: json['totalPoints'] as int,
      timeLimitMinutes: json['timeLimitMinutes'] as int,
      passingScore: json['passingScore'] as int? ?? 70,
      generatedAt: DateTime.parse(json['generatedAt'] as String),
      expiresAt: json['expiresAt'] != null
          ? DateTime.parse(json['expiresAt'] as String)
          : null,
    );
  }
}

/// Quiz result with analytics
class QuizResult {
  final String quizId;
  final String userId;
  final int score;
  final int maxScore;
  final int correctAnswers;
  final int totalQuestions;
  final Duration timeTaken;
  final bool passed;
  final Map<String, dynamic> questionResults;
  final DateTime completedAt;

  const QuizResult({
    required this.quizId,
    required this.userId,
    required this.score,
    required this.maxScore,
    required this.correctAnswers,
    required this.totalQuestions,
    required this.timeTaken,
    required this.passed,
    required this.questionResults,
    required this.completedAt,
  });

  double get percentage => maxScore > 0 ? (score / maxScore) * 100 : 0;

  Map<String, dynamic> toJson() => {
        'quizId': quizId,
        'userId': userId,
        'score': score,
        'maxScore': maxScore,
        'correctAnswers': correctAnswers,
        'totalQuestions': totalQuestions,
        'timeTaken': timeTaken.inSeconds,
        'passed': passed,
        'questionResults': questionResults,
        'completedAt': completedAt.toIso8601String(),
      };
}

/// User performance data for adaptive quizzes
class UserPerformanceData {
  final Map<String, double> topicScores;
  final List<String> strongTopics;
  final List<String> weakTopics;
  final double averageScore;
  final int quizzesTaken;

  const UserPerformanceData({
    this.topicScores = const {},
    this.strongTopics = const [],
    this.weakTopics = const [],
    this.averageScore = 0,
    this.quizzesTaken = 0,
  });
}

/// Spaced repetition item
class SpacedRepetitionItem {
  final String questionId;
  final DateTime nextReviewDate;
  final int repetitions;
  final double easeFactor;
  final int interval; // days

  const SpacedRepetitionItem({
    required this.questionId,
    required this.nextReviewDate,
    this.repetitions = 0,
    this.easeFactor = 2.5,
    this.interval = 1,
  });

  Map<String, dynamic> toJson() => {
        'questionId': questionId,
        'nextReviewDate': nextReviewDate.toIso8601String(),
        'repetitions': repetitions,
        'easeFactor': easeFactor,
        'interval': interval,
      };

  factory SpacedRepetitionItem.fromJson(Map<String, dynamic> json) {
    return SpacedRepetitionItem(
      questionId: json['questionId'] as String,
      nextReviewDate: DateTime.parse(json['nextReviewDate'] as String),
      repetitions: json['repetitions'] as int? ?? 0,
      easeFactor: (json['easeFactor'] as num?)?.toDouble() ?? 2.5,
      interval: json['interval'] as int? ?? 1,
    );
  }

  /// Calculate next interval using SM-2 algorithm
  SpacedRepetitionItem updateAfterReview(int quality) {
    // quality: 0-5 (0=complete failure, 5=perfect)
    if (quality < 3) {
      // Reset if failed
      return SpacedRepetitionItem(
        questionId: questionId,
        nextReviewDate: DateTime.now().add(const Duration(days: 1)),
        repetitions: 0,
        easeFactor: max(1.3, easeFactor - 0.2),
        interval: 1,
      );
    }

    // Calculate new ease factor
    final newEaseFactor = max(1.3,
        easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

    // Calculate new interval
    int newInterval;
    if (repetitions == 0) {
      newInterval = 1;
    } else if (repetitions == 1) {
      newInterval = 6;
    } else {
      newInterval = (interval * newEaseFactor).round();
    }

    return SpacedRepetitionItem(
      questionId: questionId,
      nextReviewDate: DateTime.now().add(Duration(days: newInterval)),
      repetitions: repetitions + 1,
      easeFactor: newEaseFactor,
      interval: newInterval,
    );
  }
}

/// Quiz generation service with adaptive learning
class QuizGenerationService {
  static final QuizGenerationService _instance = QuizGenerationService._();
  static QuizGenerationService get instance => _instance;

  QuizGenerationService._();

  factory QuizGenerationService() => _instance;

  static const String _spacedRepKey = 'spaced_repetition_data';
  static const String _performanceKey = 'quiz_performance_data';

  final Random _random = Random();
  final Map<String, SpacedRepetitionItem> _spacedRepItems = {};
  UserPerformanceData _performance = const UserPerformanceData();

  /// Initialize service
  Future<void> initialize() async {
    await _loadSpacedRepetitionData();
    await _loadPerformanceData();
  }

  /// Generate quiz from lesson content
  Future<GeneratedQuiz> generateFromLesson({
    required String lessonId,
    required String lessonTitle,
    required String lessonContent,
    int questionCount = 10,
    QuizDifficulty? difficulty,
    List<QuestionType>? allowedTypes,
  }) async {
    // Determine difficulty based on user performance or explicit setting
    final targetDifficulty = difficulty ?? _determineOptimalDifficulty();
    final types = allowedTypes ?? QuestionType.values;

    // Generate questions from content
    final questions = _generateQuestionsFromContent(
      content: lessonContent,
      title: lessonTitle,
      count: questionCount,
      difficulty: targetDifficulty,
      types: types,
    );

    final totalPoints = questions.fold<int>(0, (sum, q) => sum + q.points);

    return GeneratedQuiz(
      id: 'quiz_${lessonId}_${DateTime.now().millisecondsSinceEpoch}',
      title: 'Quiz: $lessonTitle',
      description: 'Test your understanding of $lessonTitle',
      sourceContentId: lessonId,
      questions: questions,
      difficulty: targetDifficulty,
      totalPoints: totalPoints,
      timeLimitMinutes: (questionCount * 1.5).ceil(),
      generatedAt: DateTime.now(),
      expiresAt: DateTime.now().add(const Duration(days: 30)),
    );
  }

  /// Generate questions from content
  List<QuizQuestion> _generateQuestionsFromContent({
    required String content,
    required String title,
    required int count,
    required QuizDifficulty difficulty,
    required List<QuestionType> types,
  }) {
    final questions = <QuizQuestion>[];
    final sentences = _extractKeyPoints(content);

    for (int i = 0; i < min(count, sentences.length); i++) {
      final type = types[_random.nextInt(types.length)];
      final sentence = sentences[i % sentences.length];

      final question = _generateQuestion(
        id: 'q_${DateTime.now().millisecondsSinceEpoch}_$i',
        sourceText: sentence,
        type: type,
        difficulty: difficulty,
        topic: title,
      );

      if (question != null) {
        questions.add(question);
      }
    }

    // Shuffle questions
    questions.shuffle(_random);

    return questions;
  }

  /// Extract key points from content
  List<String> _extractKeyPoints(String content) {
    // Split into sentences
    final sentences = content
        .split(RegExp(r'[.!?]'))
        .map((s) => s.trim())
        .where((s) => s.length > 20)
        .toList();

    // Filter for educational content
    return sentences.where((s) {
      // Look for definition patterns
      if (s.contains(' is ') || s.contains(' are ')) return true;
      // Look for explanation patterns
      if (s.contains('can ') || s.contains('will ')) return true;
      // Look for key terms (capitalized words, technical terms)
      if (RegExp(r'\b[A-Z][a-z]+\b').hasMatch(s)) return true;
      return s.split(' ').length >= 5;
    }).toList();
  }

  /// Generate a single question
  QuizQuestion? _generateQuestion({
    required String id,
    required String sourceText,
    required QuestionType type,
    required QuizDifficulty difficulty,
    required String topic,
  }) {
    switch (type) {
      case QuestionType.multipleChoice:
        return _generateMCQ(id, sourceText, difficulty, topic);
      case QuestionType.trueFalse:
        return _generateTrueFalse(id, sourceText, difficulty, topic);
      case QuestionType.fillBlank:
        return _generateFillBlank(id, sourceText, difficulty, topic);
      case QuestionType.matching:
        return _generateMatching(id, sourceText, difficulty, topic);
      case QuestionType.ordering:
        return _generateOrdering(id, sourceText, difficulty, topic);
    }
  }

  /// Generate multiple choice question
  QuizQuestion _generateMCQ(
    String id,
    String sourceText,
    QuizDifficulty difficulty,
    String topic,
  ) {
    // Extract key concept for question
    final words = sourceText.split(' ');
    final keyWordIndex = _random.nextInt(max(1, words.length - 3));
    final keyWord = words.skip(keyWordIndex).take(3).join(' ');

    // Generate distractors
    final options = [
      keyWord,
      '_placeholder_option_A_',
      '_placeholder_option_B_',
      '_placeholder_option_C_',
    ];
    options.shuffle(_random);
    final correctIndex = options.indexOf(keyWord);

    // Replace placeholders with generated options
    for (int i = 0; i < options.length; i++) {
      if (options[i].startsWith('_placeholder_')) {
        options[i] = _generateDistractor(keyWord, i);
      }
    }

    return QuizQuestion(
      id: id,
      type: QuestionType.multipleChoice,
      question:
          'According to the lesson on $topic, which of the following is correct about "${keyWord.substring(0, min(20, keyWord.length))}..."?',
      options: options,
      correctAnswer: correctIndex,
      explanation: 'The correct answer comes from: "$sourceText"',
      difficulty: difficulty,
      points: _getPointsForDifficulty(difficulty),
      timeLimitSeconds: _getTimeLimitForDifficulty(difficulty),
      metadata: {'topic': topic, 'sourceText': sourceText},
    );
  }

  /// Generate true/false question
  QuizQuestion _generateTrueFalse(
    String id,
    String sourceText,
    QuizDifficulty difficulty,
    String topic,
  ) {
    final isTrue = _random.nextBool();
    String statement;

    if (isTrue) {
      statement = sourceText;
    } else {
      // Negate or modify the statement
      statement = _negateStatement(sourceText);
    }

    return QuizQuestion(
      id: id,
      type: QuestionType.trueFalse,
      question: 'True or False: $statement',
      options: ['True', 'False'],
      correctAnswer: isTrue ? 0 : 1,
      explanation: isTrue
          ? 'This statement is true.'
          : 'This statement has been modified. The original is: "$sourceText"',
      difficulty: difficulty,
      points: _getPointsForDifficulty(difficulty) ~/ 2,
      timeLimitSeconds: 30,
      metadata: {'topic': topic, 'sourceText': sourceText},
    );
  }

  /// Generate fill-in-the-blank question
  QuizQuestion _generateFillBlank(
    String id,
    String sourceText,
    QuizDifficulty difficulty,
    String topic,
  ) {
    final words = sourceText.split(' ');
    if (words.length < 3) {
      return _generateTrueFalse(id, sourceText, difficulty, topic);
    }

    // Find a meaningful word to blank out
    int blankIndex = words.length ~/ 2;
    for (int i = 0; i < words.length; i++) {
      if (words[i].length > 4 && !_isCommonWord(words[i])) {
        blankIndex = i;
        break;
      }
    }

    final correctWord = words[blankIndex].replaceAll(RegExp(r'[^\w]'), '');
    words[blankIndex] = '_______';

    return QuizQuestion(
      id: id,
      type: QuestionType.fillBlank,
      question: 'Fill in the blank: ${words.join(' ')}',
      correctAnswer: correctWord,
      explanation: 'The complete sentence is: "$sourceText"',
      difficulty: difficulty,
      points: _getPointsForDifficulty(difficulty),
      timeLimitSeconds: _getTimeLimitForDifficulty(difficulty),
      hint: 'The word starts with "${correctWord[0]}"',
      metadata: {'topic': topic, 'sourceText': sourceText},
    );
  }

  /// Generate matching question (simplified)
  QuizQuestion _generateMatching(
    String id,
    String sourceText,
    QuizDifficulty difficulty,
    String topic,
  ) {
    // For now, convert to MCQ since matching requires multiple statements
    return _generateMCQ(id, sourceText, difficulty, topic);
  }

  /// Generate ordering question (simplified)
  QuizQuestion _generateOrdering(
    String id,
    String sourceText,
    QuizDifficulty difficulty,
    String topic,
  ) {
    // For now, convert to MCQ since ordering requires process steps
    return _generateMCQ(id, sourceText, difficulty, topic);
  }

  /// Generate distractor option
  String _generateDistractor(String correct, int index) {
    final distractors = [
      'A different concept',
      'An alternative approach',
      'Another perspective',
      'A contrasting view',
    ];
    return distractors[index % distractors.length];
  }

  /// Negate a statement for true/false
  String _negateStatement(String statement) {
    if (statement.contains(' is ')) {
      return statement.replaceFirst(' is ', ' is not ');
    }
    if (statement.contains(' are ')) {
      return statement.replaceFirst(' are ', ' are not ');
    }
    if (statement.contains(' can ')) {
      return statement.replaceFirst(' can ', ' cannot ');
    }
    return 'It is false that: $statement';
  }

  /// Check if word is common
  bool _isCommonWord(String word) {
    const common = {
      'the',
      'a',
      'an',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'to',
      'of',
      'and',
      'in',
      'that',
      'for',
      'it',
      'with',
      'as',
    };
    return common.contains(word.toLowerCase());
  }

  /// Get points based on difficulty
  int _getPointsForDifficulty(QuizDifficulty difficulty) {
    switch (difficulty) {
      case QuizDifficulty.beginner:
        return 5;
      case QuizDifficulty.intermediate:
        return 10;
      case QuizDifficulty.advanced:
        return 15;
      case QuizDifficulty.expert:
        return 20;
    }
  }

  /// Get time limit based on difficulty
  int _getTimeLimitForDifficulty(QuizDifficulty difficulty) {
    switch (difficulty) {
      case QuizDifficulty.beginner:
        return 45;
      case QuizDifficulty.intermediate:
        return 60;
      case QuizDifficulty.advanced:
        return 90;
      case QuizDifficulty.expert:
        return 120;
    }
  }

  /// Determine optimal difficulty based on performance
  QuizDifficulty _determineOptimalDifficulty() {
    if (_performance.averageScore >= 90) return QuizDifficulty.expert;
    if (_performance.averageScore >= 75) return QuizDifficulty.advanced;
    if (_performance.averageScore >= 50) return QuizDifficulty.intermediate;
    return QuizDifficulty.beginner;
  }

  /// Record quiz result for analytics
  Future<void> recordResult(QuizResult result) async {
    // Update performance data
    final newAverage = (_performance.averageScore * _performance.quizzesTaken +
            result.percentage) /
        (_performance.quizzesTaken + 1);

    _performance = UserPerformanceData(
      topicScores: _performance.topicScores,
      strongTopics: _performance.strongTopics,
      weakTopics: _performance.weakTopics,
      averageScore: newAverage,
      quizzesTaken: _performance.quizzesTaken + 1,
    );

    await _savePerformanceData();

    // Update spaced repetition for questions
    for (final entry in result.questionResults.entries) {
      final quality = (entry.value as bool) ? 4 : 1;
      await updateSpacedRepetition(entry.key, quality);
    }
  }

  /// Update spaced repetition item
  Future<void> updateSpacedRepetition(String questionId, int quality) async {
    final existing = _spacedRepItems[questionId];
    if (existing != null) {
      _spacedRepItems[questionId] = existing.updateAfterReview(quality);
    } else {
      _spacedRepItems[questionId] = SpacedRepetitionItem(
        questionId: questionId,
        nextReviewDate: DateTime.now().add(const Duration(days: 1)),
      ).updateAfterReview(quality);
    }
    await _saveSpacedRepetitionData();
  }

  /// Get questions due for review
  List<String> getDueQuestions() {
    final now = DateTime.now();
    return _spacedRepItems.entries
        .where((e) => e.value.nextReviewDate.isBefore(now))
        .map((e) => e.key)
        .toList();
  }

  /// Load spaced repetition data
  Future<void> _loadSpacedRepetitionData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = prefs.getString(_spacedRepKey);
      if (json != null) {
        final data = jsonDecode(json) as Map<String, dynamic>;
        for (final entry in data.entries) {
          _spacedRepItems[entry.key] = SpacedRepetitionItem.fromJson(
            entry.value as Map<String, dynamic>,
          );
        }
      }
    } catch (e) {
      if (kDebugMode) debugPrint('Failed to load spaced rep data: $e');
    }
  }

  /// Save spaced repetition data
  Future<void> _saveSpacedRepetitionData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final data = _spacedRepItems.map((k, v) => MapEntry(k, v.toJson()));
      await prefs.setString(_spacedRepKey, jsonEncode(data));
    } catch (e) {
      if (kDebugMode) debugPrint('Failed to save spaced rep data: $e');
    }
  }

  /// Load performance data
  Future<void> _loadPerformanceData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = prefs.getString(_performanceKey);
      if (json != null) {
        final data = jsonDecode(json) as Map<String, dynamic>;
        _performance = UserPerformanceData(
          topicScores: Map<String, double>.from((data['topicScores'] ??
              <String, double>{}) as Map<dynamic, dynamic>),
          strongTopics: List<String>.from(
              (data['strongTopics'] ?? <String>[]) as Iterable<dynamic>),
          weakTopics: List<String>.from(
              (data['weakTopics'] ?? <String>[]) as Iterable<dynamic>),
          averageScore: (data['averageScore'] as num?)?.toDouble() ?? 0,
          quizzesTaken: data['quizzesTaken'] as int? ?? 0,
        );
      }
    } catch (e) {
      if (kDebugMode) debugPrint('Failed to load performance data: $e');
    }
  }

  /// Save performance data
  Future<void> _savePerformanceData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final data = {
        'topicScores': _performance.topicScores,
        'strongTopics': _performance.strongTopics,
        'weakTopics': _performance.weakTopics,
        'averageScore': _performance.averageScore,
        'quizzesTaken': _performance.quizzesTaken,
      };
      await prefs.setString(_performanceKey, jsonEncode(data));
    } catch (e) {
      if (kDebugMode) debugPrint('Failed to save performance data: $e');
    }
  }

  /// Get user performance data
  UserPerformanceData get performance => _performance;

  /// Reset all data
  Future<void> reset() async {
    _spacedRepItems.clear();
    _performance = const UserPerformanceData();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_spacedRepKey);
    await prefs.remove(_performanceKey);
  }
}

/// Global quiz generation service
final quizGen = QuizGenerationService.instance;
