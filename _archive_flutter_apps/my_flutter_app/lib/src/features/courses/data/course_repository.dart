import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fpdart/fpdart.dart';
import 'package:my_flutter_app/src/core/constants/api_constants.dart';
import 'package:my_flutter_app/src/core/error/failures.dart';
import 'package:my_flutter_app/src/core/network/api_client.dart';
import 'package:my_flutter_app/src/core/network/network_info.dart';
import 'package:my_flutter_app/src/core/utils/logger.dart';
import 'package:my_flutter_app/src/features/courses/domain/certificate_model.dart';
import 'package:my_flutter_app/src/features/courses/domain/course_model.dart';

final courseRepositoryProvider = Provider<CourseRepository>((ref) {
  return CourseRepository(
    ref.watch(apiClientProvider),
    ref.watch(networkInfoProvider),
  );
});

// Enrolled courses API fetches real count
final enrolledCoursesCountProvider = FutureProvider<int>((ref) async {
  final repo = ref.watch(courseRepositoryProvider);
  final courses = await repo.getMyCourses();
  return courses.length;
});

class _CacheEntry<T> {
  _CacheEntry(this.data) : timestamp = DateTime.now();
  final T data;
  final DateTime timestamp;

  bool get isValid => DateTime.now().difference(timestamp).inMinutes < 5;
}

class CourseProgressSummary {
  CourseProgressSummary({
    required this.courseTitle,
    required this.courseSlug,
    required this.progressPercentage,
    required this.totalLessons,
    required this.completedLessonsCount,
    required this.isCompleted,
    required this.completedLessonIds,
    this.completedAt,
    this.nextLesson,
  });

  factory CourseProgressSummary.fromJson(Map<String, dynamic> json) {
    final rawCompletedIds = json['completed_lesson_ids'];
    final completedIds = rawCompletedIds is List
        ? rawCompletedIds.map((e) => e.toString()).toList()
        : <String>[];

    return CourseProgressSummary(
      courseTitle: (json['course_title'] as String?) ?? '',
      courseSlug: (json['course_slug'] as String?) ?? '',
      progressPercentage: (json['progress_percentage'] as num?)?.toInt() ?? 0,
      totalLessons: (json['total_lessons'] as num?)?.toInt() ?? 0,
      completedLessonsCount:
          (json['completed_lessons_count'] as num?)?.toInt() ?? 0,
      isCompleted: json['is_completed'] as bool? ?? false,
      completedLessonIds: completedIds,
      completedAt: json['completed_at'] as String?,
      nextLesson: json['next_lesson'] as Map<String, dynamic>?,
    );
  }

  final String courseTitle;
  final String courseSlug;
  final int progressPercentage;
  final int totalLessons;
  final int completedLessonsCount;
  final bool isCompleted;
  final List<String> completedLessonIds;
  final String? completedAt;
  final Map<String, dynamic>? nextLesson;
}

class CourseRepository {
  CourseRepository(this._apiClient, this._networkInfo);
  final ApiClient _apiClient;
  final NetworkInfo _networkInfo;

  // In-memory cache
  final Map<String, _CacheEntry<dynamic>> _cache = {};

  Future<Either<Failure, List<Course>>> getCourses({
    bool forceRefresh = false,
    String? category,
    String? difficulty,
    String? search,
  }) async {
    final cacheKey =
        'courses_${category ?? "all"}_${difficulty ?? "all"}_${search ?? ""}';
    if (!forceRefresh &&
        _cache.containsKey(cacheKey) &&
        _cache[cacheKey]!.isValid) {
      AppLogger.d('CourseRepository: Returning cached courses');
      return Right(_cache[cacheKey]!.data as List<Course>);
    }

    if (!await _networkInfo.isConnected) {
      if (_cache.containsKey(cacheKey)) {
        AppLogger.d('CourseRepository: Offline — returning stale cache');
        return Right(_cache[cacheKey]!.data as List<Course>);
      }
      return const Left(NetworkFailure());
    }

    try {
      final queryParams = <String, dynamic>{};
      if (category != null && category.isNotEmpty) {
        queryParams['category'] = category;
      }
      if (difficulty != null && difficulty.isNotEmpty) {
        queryParams['difficulty'] = difficulty.toLowerCase();
      }
      if (search != null && search.isNotEmpty) {
        queryParams['search'] = search;
      }

      final response = await _apiClient.get(
        ApiConstants.courses,
        queryParameters: queryParams.isNotEmpty ? queryParams : null,
      );
      final results = _extractResults(response.data);

      final courses = results
          .map((e) => Course.fromJson(e as Map<String, dynamic>))
          .toList();

      _cache[cacheKey] = _CacheEntry(courses);
      return Right(courses);
    } on Exception catch (e) {
      AppLogger.e('CourseRepository: Error fetching courses', e);
      if (_cache.containsKey(cacheKey)) {
        AppLogger.w('CourseRepository: Serving stale cache after error');
        return Right(_cache[cacheKey]!.data as List<Course>);
      }
      return Left(ServerFailure(e.toString()));
    }
  }

  Future<Either<Failure, Course>> getCourseDetail(String slug) async {
    if (!await _networkInfo.isConnected) {
      return const Left(NetworkFailure());
    }
    try {
      final response = await _apiClient.get('${ApiConstants.courses}$slug/');
      final data = response.data;
      if (data is Map<String, dynamic>) {
        final courseData = data.containsKey('data') && data['data'] is Map<String, dynamic>
            ? data['data'] as Map<String, dynamic>
            : data;
        return Right(Course.fromJson(courseData));
      }
      return const Left(DataParsingFailure());
    } on Exception catch (e) {
      AppLogger.e('CourseRepository: Error fetching course detail for $slug', e);
      return Left(ServerFailure(e.toString()));
    }
  }

  Future<Either<Failure, List<CourseCategory>>> getCategories() async {
    const key = 'course_categories';
    if (_cache.containsKey(key) && _cache[key]!.isValid) {
      return Right(_cache[key]!.data as List<CourseCategory>);
    }

    if (!await _networkInfo.isConnected) {
      if (_cache.containsKey(key)) {
        return Right(_cache[key]!.data as List<CourseCategory>);
      }
      return const Left(NetworkFailure());
    }

    try {
      final response = await _apiClient.get('courses/categories/');
      final results = _extractResults(response.data);
      final categories = results
          .map((e) => CourseCategory.fromJson(e as Map<String, dynamic>))
          .toList();
      _cache[key] = _CacheEntry(categories);
      return Right(categories);
    } on Exception catch (e) {
      AppLogger.e('CourseRepository: Error fetching categories', e);
      return Left(ServerFailure(e.toString()));
    }
  }

  Future<Either<Failure, List<Course>>> getFeaturedCourses() async {
    const key = 'courses_featured';
    if (_cache.containsKey(key) && _cache[key]!.isValid) {
      return Right(_cache[key]!.data as List<Course>);
    }

    if (!await _networkInfo.isConnected) {
      if (_cache.containsKey(key)) {
        return Right(_cache[key]!.data as List<Course>);
      }
      return const Left(NetworkFailure());
    }

    try {
      final response =
          await _apiClient.get('${ApiConstants.courses}featured/');
      final results = _extractResults(response.data);
      final courses = results
          .map((e) => Course.fromJson(e as Map<String, dynamic>))
          .toList();
      _cache[key] = _CacheEntry(courses);
      return Right(courses);
    } on Exception catch (e) {
      AppLogger.e('CourseRepository: Error fetching featured courses', e);
      return Left(ServerFailure(e.toString()));
    }
  }

  Future<Either<Failure, List<Course>>> getTrendingCourses() async {
    const key = 'courses_trending';
    if (_cache.containsKey(key) && _cache[key]!.isValid) {
      return Right(_cache[key]!.data as List<Course>);
    }

    if (!await _networkInfo.isConnected) {
      if (_cache.containsKey(key)) {
        return Right(_cache[key]!.data as List<Course>);
      }
      return const Left(NetworkFailure());
    }

    try {
      final response =
          await _apiClient.get('${ApiConstants.courses}trending/');
      final results = _extractResults(response.data);
      final courses = results
          .map((e) => Course.fromJson(e as Map<String, dynamic>))
          .toList();
      _cache[key] = _CacheEntry(courses);
      return Right(courses);
    } on Exception catch (e) {
      AppLogger.e('CourseRepository: Error fetching trending courses', e);
      return Left(ServerFailure(e.toString()));
    }
  }

  Future<Either<Failure, List<Course>>> getRecommendations() async {
    if (!await _networkInfo.isConnected) {
      return const Left(NetworkFailure());
    }
    try {
      final response = await _apiClient.get(ApiConstants.recommendations);
      final results = _extractResults(response.data);
      final courses = results
          .map((e) => Course.fromJson(e as Map<String, dynamic>))
          .toList();
      return Right(courses);
    } on Exception catch (e) {
      AppLogger.e('CourseRepository: Error fetching recommendations', e);
      return Left(ServerFailure(e.toString()));
    }
  }

  Future<Either<Failure, List<Certificate>>> getCertificates() async {
    if (!await _networkInfo.isConnected) {
      return const Left(NetworkFailure());
    }
    try {
      final response = await _apiClient.get(ApiConstants.certificates);
      final results = _extractResults(response.data);
      final certs = results
          .map((e) => Certificate.fromJson(e as Map<String, dynamic>))
          .toList();
      return Right(certs);
    } on Exception catch (e) {
      AppLogger.e('CourseRepository: Error fetching certificates', e);
      return Left(ServerFailure(e.toString()));
    }
  }

  Future<List<Course>> getMyCourses() async {
    if (!await _networkInfo.isConnected) {
      throw const NetworkFailure();
    }
    try {
      final response =
          await _apiClient.get('${ApiConstants.courses}my-courses/');
      final results = _extractResults(response.data);
      final courses = <Course>[];
      for (final item in results) {
        if (item is Map<String, dynamic>) {
          if (item.containsKey('course') && item['course'] is Map<String, dynamic>) {
            final c = Course.fromJson(item['course'] as Map<String, dynamic>);
            final progress = (item['progress_percentage'] as num?)?.toDouble();
            courses.add(c.copyWith(isEnrolled: true, userProgress: progress));
          } else {
            courses.add(Course.fromJson(item).copyWith(isEnrolled: true));
          }
        }
      }
      return courses;
    } on Exception catch (e) {
      AppLogger.e('CourseRepository: Error fetching my courses', e);
      rethrow;
    }
  }

  Future<Either<Failure, bool>> enrollInCourse(String slug) async {
    if (!await _networkInfo.isConnected) {
      return const Left(NetworkFailure());
    }
    try {
      final response = await _apiClient.post(
        '${ApiConstants.courses}$slug/enroll/',
        data: <String, dynamic>{},
      );
      _cache.clear();
      final isSuccess =
          response.statusCode == 200 || response.statusCode == 201;
      return Right(isSuccess);
    } on Exception catch (e) {
      AppLogger.e('CourseRepository: Error enrolling in course $slug', e);
      return Left(ServerFailure(e.toString()));
    }
  }

  Future<Either<Failure, int>> completeLesson({
    required String courseSlug,
    required String lessonId,
  }) async {
    if (!await _networkInfo.isConnected) {
      return const Left(NetworkFailure());
    }
    try {
      final response = await _apiClient.post(
        '${ApiConstants.courses}$courseSlug/complete-lesson/',
        data: {'lesson_id': lessonId},
      );
      final data = response.data;
      final progress = (data?['progress'] as num?)?.toInt() ?? 100;
      _cache.clear();
      return Right(progress);
    } on Exception catch (e) {
      AppLogger.e('CourseRepository: Error completing lesson $lessonId', e);
      return Left(ServerFailure(e.toString()));
    }
  }

  Future<Either<Failure, void>> updateLessonProgress({
    required String courseSlug,
    required String lessonId,
    required double seconds,
  }) async {
    if (!await _networkInfo.isConnected) {
      return const Left(NetworkFailure());
    }
    try {
      await _apiClient.post(
        '${ApiConstants.courses}$courseSlug/update-progress/',
        data: {'lesson_id': lessonId, 'seconds': seconds},
      );
      return const Right(null);
    } on Exception catch (e) {
      AppLogger.e('CourseRepository: Error updating progress for lesson $lessonId', e);
      return Left(ServerFailure(e.toString()));
    }
  }

  Future<Either<Failure, CourseProgressSummary>> getProgressSummary(
      String courseSlug) async {
    if (!await _networkInfo.isConnected) {
      return const Left(NetworkFailure());
    }
    try {
      final response = await _apiClient.get(
        '${ApiConstants.courses}$courseSlug/progress-summary/',
      );
      final data = response.data;
      if (data is Map<String, dynamic> && data['data'] is Map<String, dynamic>) {
        return Right(
          CourseProgressSummary.fromJson(data['data'] as Map<String, dynamic>),
        );
      }
      return const Left(DataParsingFailure());
    } on Exception catch (e) {
      AppLogger.e('CourseRepository: Error fetching progress summary for $courseSlug', e);
      return Left(ServerFailure(e.toString()));
    }
  }

  Future<Either<Failure, bool>> toggleBookmark(String slug) async {
    if (!await _networkInfo.isConnected) {
      return const Left(NetworkFailure());
    }
    try {
      final response = await _apiClient.post(ApiConstants.courseBookmark(slug));
      final data = response.data;
      final bookmarked = data?['bookmarked'] as bool? ?? false;
      return Right(bookmarked);
    } on Exception catch (e) {
      AppLogger.e('CourseRepository: Error toggling bookmark for $slug', e);
      return Left(ServerFailure(e.toString()));
    }
  }

  Future<Either<Failure, List<Course>>> getBookmarkedCourses() async {
    if (!await _networkInfo.isConnected) {
      return const Left(NetworkFailure());
    }
    try {
      final response = await _apiClient.get(ApiConstants.courseBookmarks);
      final data = response.data;
      final results = data?['data'] as List? ?? [];
      final courses = results
          .map((e) => Course.fromJson(e as Map<String, dynamic>))
          .toList();
      return Right(courses);
    } on Exception catch (e) {
      AppLogger.e('CourseRepository: Error fetching bookmarks', e);
      return Left(ServerFailure(e.toString()));
    }
  }

  Future<Either<Failure, List<Course>>> getSimilarCourses(String slug) async {
    if (!await _networkInfo.isConnected) {
      return const Left(NetworkFailure());
    }
    try {
      final response = await _apiClient.get(ApiConstants.courseSimilar(slug));
      final data = response.data;
      final results = data?['data'] as List? ?? [];
      final courses = results
          .map((e) => Course.fromJson(e as Map<String, dynamic>))
          .toList();
      return Right(courses);
    } on Exception catch (e) {
      AppLogger.e('CourseRepository: Error fetching similar courses', e);
      return Left(ServerFailure(e.toString()));
    }
  }

  Future<Either<Failure, CourseShareInfo>> shareCourse(String slug) async {
    if (!await _networkInfo.isConnected) {
      return const Left(NetworkFailure());
    }
    try {
      final response = await _apiClient.post(ApiConstants.courseShare(slug));
      final data = response.data;
      if (data == null) {
        return const Left(DataParsingFailure());
      }
      return Right(CourseShareInfo.fromJson(data));
    } on Exception catch (e) {
      AppLogger.e('CourseRepository: Error sharing course $slug', e);
      return Left(ServerFailure(e.toString()));
    }
  }

  List<dynamic> _extractResults(dynamic data) {
    if (data is Map<String, dynamic>) {
      if (data.containsKey('data') && data['data'] is List) {
        return data['data'] as List;
      }
      if (data.containsKey('results') && data['results'] is List) {
        return data['results'] as List;
      }
    }
    if (data is List) {
      return data;
    }
    return <dynamic>[];
  }
}

class CourseShareInfo {
  CourseShareInfo({
    required this.shareUrl,
    required this.title,
    required this.description,
  });

  factory CourseShareInfo.fromJson(Map<String, dynamic> json) {
    return CourseShareInfo(
      shareUrl: json['share_url'] as String? ?? '',
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
    );
  }

  final String shareUrl;
  final String title;
  final String description;
}
