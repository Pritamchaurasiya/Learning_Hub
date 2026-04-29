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

class CourseRepository {
  CourseRepository(this._apiClient, this._networkInfo);
  final ApiClient _apiClient;
  final NetworkInfo _networkInfo;

  // Simple in-memory cache
  final Map<String, _CacheEntry<dynamic>> _cache = {};

  Future<Either<Failure, List<Course>>> getCourses(
      {bool forceRefresh = false}) async {
    const key = 'courses';
    if (!forceRefresh && _cache.containsKey(key) && _cache[key]!.isValid) {
      AppLogger.d('CourseRepository: Returning cached courses');
      return Right(_cache[key]!.data as List<Course>);
    }

    if (!await _networkInfo.isConnected) {
      if (_cache.containsKey(key)) {
        AppLogger.d('CourseRepository: Offline — returning stale cache');
        return Right(_cache[key]!.data as List<Course>);
      }
      return const Left(NetworkFailure());
    }

    try {
      final response = await _apiClient.get(ApiConstants.courses);
      final results = _extractResults(response.data);

      final courses = results
          .map((e) => Course.fromJson(e as Map<String, dynamic>))
          .toList();

      _cache[key] = _CacheEntry(courses);
      return Right(courses);
    } on Exception catch (e) {
      AppLogger.e('CourseRepository: Error fetching courses', e);
      if (_cache.containsKey(key)) {
        AppLogger.w('CourseRepository: Serving stale cache after error');
        return Right(_cache[key]!.data as List<Course>);
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
        return Right(Course.fromJson(data));
      }
      return const Left(DataParsingFailure());
    } on Exception catch (e) {
      AppLogger.e('CourseRepository: Error fetching course detail', e);
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

  Future<Either<Failure, void>> createCourse(Map<String, dynamic> courseData,
      {List<int>? thumbnailBytes}) async {
    if (!await _networkInfo.isConnected) {
      return const Left(NetworkFailure());
    }
    try {
      await _apiClient.post(ApiConstants.courses, data: courseData);
      _cache.remove('courses');
      return const Right(null);
    } on Exception catch (e) {
      AppLogger.e('CourseRepository: Error creating course', e);
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
      final courses = results
          .map((e) => Course.fromJson(
              (e as Map<String, dynamic>)['course'] as Map<String, dynamic>))
          .toList();
      return courses;
    } on Exception catch (e) {
      AppLogger.e('CourseRepository: Error fetching my courses', e);
      rethrow;
    }
  }

  Future<void> enrollInCourse(String slug) async {
    if (!await _networkInfo.isConnected) {
      throw const NetworkFailure();
    }
    try {
      await _apiClient.post('${ApiConstants.courses}$slug/enroll/',
          data: <String, dynamic>{});
    } on Exception catch (e) {
      AppLogger.e('CourseRepository: Error enrolling in course $slug', e);
      rethrow;
    }
  }

  /// Extracted helper for safe result parsing
  List<dynamic> _extractResults(dynamic data) {
    if (data is Map<String, dynamic>) {
      // Check common pagination patterns
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

  // ========== Course Action APIs ==========

  /// Toggle bookmark on a course. Returns true if bookmarked, false if unbookmarked.
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

  /// Get user's bookmarked courses
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

  /// Get courses similar to a given course
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

  /// Share a course - returns share URL and metadata
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
}

/// Course share info returned from share API
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
