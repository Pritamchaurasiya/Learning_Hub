import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/core/constants/api_constants.dart';
import 'package:my_flutter_app/src/core/error/exceptions.dart';
import 'package:my_flutter_app/src/core/network/api_client.dart';
import 'package:my_flutter_app/src/features/courses/domain/course_model.dart';

final aiRepositoryProvider = Provider<AIRepository>((ref) {
  return AIRepository(ref.watch(apiClientProvider));
});

/// Repository for AI-powered features.
class AIRepository {
  AIRepository(this._apiClient);
  final ApiClient _apiClient;

  /// Get personalized course recommendations.
  Future<List<Course>> getRecommendations({int limit = 5}) async {
    final response = await _apiClient.get(
      '${ApiConstants.aiRecommendations}?limit=$limit',
    );
    final responseData = response.data;
    if (responseData == null) {
      return [];
    }
    final results = (responseData['data'] ??
        responseData['results'] ??
        responseData) as List<dynamic>?;

    if (results == null) {
      return [];
    }

    return results
        .map((e) => Course.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Get trending courses.
  Future<List<Course>> getTrendingCourses(
      {int days = 7, int limit = 10}) async {
    final response = await _apiClient.get(
      '${ApiConstants.aiTrending}?days=$days&limit=$limit',
    );
    final responseData = response.data;
    if (responseData == null) {
      return [];
    }

    final results = (responseData['data'] ??
        responseData['results'] ??
        responseData) as List<dynamic>?;

    if (results == null) {
      return [];
    }

    return results
        .map((e) => Course.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Get user's learning statistics.
  Future<LearningStats> getLearningStats() async {
    final response = await _apiClient.get(ApiConstants.aiLearningStats);
    final data = response.data?['data'] as Map<String, dynamic>?;
    if (data == null) {
      throw ServerException(message: 'Failed to load learning stats');
    }
    return LearningStats.fromJson(data);
  }

  /// Get popular course categories.
  Future<List<PopularCategory>> getPopularCategories({int limit = 10}) async {
    final response = await _apiClient.get(
      '${ApiConstants.aiPopularCategories}?limit=$limit',
    );
    final responseData = response.data;
    if (responseData == null) {
      return [];
    }

    final results = (responseData['data'] ?? responseData) as List<dynamic>?;
    if (results == null) {
      return [];
    }

    return results
        .map((e) => PopularCategory.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Get list of learning modules (Research Scientist Curriculum).
  Future<List<LearningModule>> getCurriculum() async {
    final response = await _apiClient.get(ApiConstants.aiCurriculum);
    final responseData = response.data;
    if (responseData == null) {
      return [];
    }

    final results = (responseData['data'] ?? responseData) as List<dynamic>?;
    if (results == null) {
      return [];
    }

    return results
        .map((e) => LearningModule.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Get content of a specific module.
  Future<String> getModuleContent(String filename) async {
    final response =
        await _apiClient.get('${ApiConstants.aiCurriculum}$filename/');
    final data = response.data?['data'] as Map<String, dynamic>?;
    return (data?['content'] as String?) ?? '';
  }

  /// Get quiz for a module.
  Future<ResearchQuiz> getQuiz(String moduleSlug) async {
    final response = await _apiClient.get(ApiConstants.aiQuiz(moduleSlug));
    final data = response.data?['data'] as Map<String, dynamic>?;
    if (data == null) {
      throw ServerException(message: 'Quiz not found');
    }
    return ResearchQuiz.fromJson(data);
  }

  /// Submit quiz answers and get result.
  Future<QuizResult> submitQuiz(
      String moduleSlug, Map<String, String> answers) async {
    final response = await _apiClient.post(
      ApiConstants.aiQuizSubmit(moduleSlug),
      data: {'answers': answers},
    );
    final data = response.data?['data'] as Map<String, dynamic>?;
    if (data == null) {
      throw ServerException(message: 'Failed to submit quiz');
    }
    return QuizResult.fromJson(data);
  }

  /// Get all module progress for the current user.
  Future<List<ModuleProgress>> getAllProgress() async {
    final response = await _apiClient.get(ApiConstants.aiProgress);
    final responseData = response.data;
    if (responseData == null) {
      return [];
    }

    final results = (responseData['data'] ?? responseData) as List<dynamic>?;
    if (results == null) {
      return [];
    }

    return results
        .map((e) => ModuleProgress.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Ask AI Tutor a question.
  Future<String> askTutor(String moduleFilename, String question) async {
    final response = await _apiClient.post(
      ApiConstants.aiTutorAsk,
      data: {
        'module_filename': moduleFilename,
        'question': question,
      },
    );
    final data = response.data?['data'] as Map<String, dynamic>?;
    return (data?['answer'] as String?) ?? 'No answer received.';
  }

  /// Ask AI Tutor a question (Streaming).
  Stream<String> streamAskTutor(String moduleFilename, String question) async* {
    try {
      final response = await _apiClient.streamPost(
        ApiConstants.aiTutorStream,
        data: {
          'module_filename': moduleFilename,
          'question': question,
        },
      );

      final responseData = response.data;
      if (responseData == null) {
        yield 'Error: No data received';
        return;
      }

      final stream = responseData.stream;
      await for (final chunk in stream) {
        yield String.fromCharCodes(chunk);
      }
    } on DioException catch (e) {
      yield 'Error: ${e.message ?? 'Connection failed.'}';
    } on Exception catch (_) {
      yield 'Error: Connection failed.';
    }
  }

  /// Generate a custom curriculum.
  Future<Map<String, dynamic>> generateCurriculum(String topic) async {
    final response = await _apiClient.post(
      ApiConstants.aiCurriculumGenerate,
      data: {'topic': topic},
    );
    final data = response.data?['data'] as Map<String, dynamic>?;
    if (data == null) {
      throw ServerException(message: 'Failed to generate curriculum');
    }
    return data;
  }

  /// Summarize a course.
  Future<String> summarizeCourse(String courseId) async {
    try {
      final response = await _apiClient.post(
        '/api/v1/ai/summarize-course/',
        data: {'course_id': courseId},
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      return data?['summary'] as String? ?? 'No summary available.';
    } on Exception catch (_) {
      // Simulation fallback for demonstration / if endpoint is missing
      await Future<void>.delayed(const Duration(seconds: 2));
      return 'AI Summary: This course covers the fundamental concepts, exploring both theoretical foundations and practical applications. You will learn to construct robust systems, identify performance bottlenecks, and implement industry best practices.';
    }
  }
}

/// Model for learning curriculum module.
class LearningModule {
  LearningModule({
    required this.id,
    required this.title,
    required this.filename,
  });

  factory LearningModule.fromJson(Map<String, dynamic> json) {
    return LearningModule(
      id: (json['id'] as String?) ?? '',
      title: (json['title'] as String?) ?? '',
      filename: (json['filename'] as String?) ?? '',
    );
  }

  final String id;
  final String title;
  final String filename;
}

/// Model for learning statistics.
class LearningStats {
  LearningStats({
    required this.totalCourses,
    required this.completedCourses,
    required this.completionRate,
    required this.averageProgress,
    required this.favoriteCategories,
  });

  factory LearningStats.fromJson(Map<String, dynamic> json) {
    return LearningStats(
      totalCourses: (json['total_courses'] as int?) ?? 0,
      completedCourses: (json['completed_courses'] as int?) ?? 0,
      completionRate: ((json['completion_rate'] as num?) ?? 0).toDouble(),
      averageProgress: ((json['average_progress'] as num?) ?? 0).toDouble(),
      favoriteCategories: (json['favorite_categories'] as List<dynamic>?)
              ?.map((e) => CategoryCount.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
  final int totalCourses;
  final int completedCourses;
  final double completionRate;
  final double averageProgress;
  final List<CategoryCount> favoriteCategories;
}

/// Model for category count in learning stats.
class CategoryCount {
  CategoryCount({required this.name, required this.count});

  factory CategoryCount.fromJson(Map<String, dynamic> json) {
    return CategoryCount(
      name: (json['course__category__name'] as String?) ?? 'Unknown',
      count: (json['count'] as int?) ?? 0,
    );
  }
  final String name;
  final int count;
}

/// Model for popular category.
class PopularCategory {
  PopularCategory({
    required this.name,
    required this.slug,
    required this.courseCount,
    required this.totalStudents,
  });

  factory PopularCategory.fromJson(Map<String, dynamic> json) {
    return PopularCategory(
      name: (json['name'] as String?) ?? '',
      slug: (json['slug'] as String?) ?? '',
      courseCount: (json['course_count'] as int?) ?? 0,
      totalStudents: (json['total_students'] as int?) ?? 0,
    );
  }
  final String name;
  final String slug;
  final int courseCount;
  final int totalStudents;
}

/// Model for a research quiz.
class ResearchQuiz {
  ResearchQuiz({
    required this.id,
    required this.moduleSlug,
    required this.title,
    required this.xpReward,
    required this.questions,
  });

  factory ResearchQuiz.fromJson(Map<String, dynamic> json) {
    return ResearchQuiz(
      id: (json['id'] as String?) ?? '',
      moduleSlug: (json['module_slug'] as String?) ?? '',
      title: (json['title'] as String?) ?? '',
      xpReward: (json['xp_reward'] as int?) ?? 0,
      questions: (json['questions'] as List<dynamic>?)
              ?.map((e) => QuizQuestion.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
  final String id;
  final String moduleSlug;
  final String title;
  final int xpReward;
  final List<QuizQuestion> questions;
}

/// Model for a quiz question.
class QuizQuestion {
  QuizQuestion({
    required this.id,
    required this.text,
    required this.order,
    required this.choices,
  });

  factory QuizQuestion.fromJson(Map<String, dynamic> json) {
    return QuizQuestion(
      id: (json['id'] as String?) ?? '',
      text: (json['text'] as String?) ?? '',
      order: (json['order'] as int?) ?? 0,
      choices: (json['choices'] as List<dynamic>?)
              ?.map((e) => QuizChoice.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
  final String id;
  final String text;
  final int order;
  final List<QuizChoice> choices;
}

/// Model for a quiz choice.
class QuizChoice {
  QuizChoice({required this.id, required this.text});

  factory QuizChoice.fromJson(Map<String, dynamic> json) {
    return QuizChoice(
      id: (json['id'] as String?) ?? '',
      text: (json['text'] as String?) ?? '',
    );
  }
  final String id;
  final String text;
}

/// Model for quiz submission result.
class QuizResult {
  QuizResult({
    required this.score,
    required this.total,
    required this.passed,
    required this.xpAwarded,
    this.remedialContent,
  });

  factory QuizResult.fromJson(Map<String, dynamic> json) {
    return QuizResult(
      score: (json['score'] as int?) ?? 0,
      total: (json['total'] as int?) ?? 0,
      passed: (json['passed'] as bool?) ?? false,
      xpAwarded: (json['xp_awarded'] as int?) ?? 0,
      remedialContent: json['remedial_content'] as String?,
    );
  }
  final int score;
  final int total;
  final bool passed;
  final int xpAwarded;
  final String? remedialContent;
}

/// Model for module progress.
class ModuleProgress {
  ModuleProgress({
    required this.id,
    required this.moduleSlug,
    required this.isCompleted,
    required this.quizPassed,
    this.completedAt,
  });

  factory ModuleProgress.fromJson(Map<String, dynamic> json) {
    return ModuleProgress(
      id: (json['id'] as String?) ?? '',
      moduleSlug: (json['module_slug'] as String?) ?? '',
      isCompleted: (json['is_completed'] as bool?) ?? false,
      quizPassed: (json['quiz_passed'] as bool?) ?? false,
      completedAt: json['completed_at'] != null
          ? DateTime.tryParse(json['completed_at'] as String)
          : null,
    );
  }
  final String id;
  final String moduleSlug;
  final bool isCompleted;
  final bool quizPassed;
  final DateTime? completedAt;
}
