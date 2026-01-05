import 'package:flutter/foundation.dart';

import '../../data/models/course_model.dart';
import '../../data/models/live_class_model.dart';
import '../error/exceptions.dart';
import 'api_client.dart';
import 'cache_manager.dart';
import 'sync_service.dart';

/// Course progress data
class CourseProgress {
// ... (omitting unchanged lines for brevity but ensuring imports are correct)

  final String courseId;
  final double progress;
  final int completedLessons;
  final int totalLessons;
  final int timeSpentMinutes;
  final DateTime lastAccessed;

  const CourseProgress({
    required this.courseId,
    required this.progress,
    required this.completedLessons,
    required this.totalLessons,
    required this.timeSpentMinutes,
    required this.lastAccessed,
  });

  Map<String, dynamic> toJson() => {
        'courseId': courseId,
        'progress': progress,
        'completedLessons': completedLessons,
        'totalLessons': totalLessons,
        'timeSpentMinutes': timeSpentMinutes,
        'lastAccessed': lastAccessed.toIso8601String(),
      };

  factory CourseProgress.fromJson(Map<String, dynamic> json) {
    return CourseProgress(
      courseId: json['courseId'] as String,
      progress: (json['progress'] as num).toDouble(),
      completedLessons: json['completedLessons'] as int,
      totalLessons: json['totalLessons'] as int,
      timeSpentMinutes: json['timeSpentMinutes'] as int,
      lastAccessed: DateTime.parse(json['lastAccessed'] as String),
    );
  }
}

/// Course service for API integration
class CourseService {
  static final CourseService _instance = CourseService._();
  static CourseService get instance => _instance;

  /// Visible for testing to inject dependencies

  @visibleForTesting
  CourseService.test({
    ApiClient? api,
    CacheManager? cache,
    SyncService? sync,
  })  : api = api ?? ApiClient.instance,
        _cache = cache ?? CacheManager.instance,
        _sync = sync ?? SyncService.instance;

  ApiClient api;
  final CacheManager _cache;
  final SyncService _sync;

  CourseService._()
      : api = ApiClient.instance,
        _cache = CacheManager.instance,
        _sync = SyncService.instance;

  /// Get all courses with caching
  Future<List<Course>> getCourses({
    String? category,
    bool forceRefresh = false,
  }) async {
    final cacheKey = category != null
        ? CacheKeys.courseList(category)
        : CacheKeys.featuredCourses;

    return _cache.getOrFetch<List<Course>>(
      cacheKey,
      () async {
        final response = await api.get<Map<String, dynamic>>(
          '/courses',
          queryParameters: category != null ? {'category': category} : null,
        );

        if (response.success && response.data != null) {
          final payload = response.data!;
          final data = payload.containsKey('data')
              ? payload['data'] as Map<String, dynamic>
              : payload;

          final courses = (data['courses'] as List)
              .map((e) => Course.fromJson(e as Map<String, dynamic>))
              .toList();
          return courses;
        }
        return [];
      },
      ttl: const Duration(minutes: 15),
      forceRefresh: forceRefresh,
      decoder: (data) => (data as List)
          .map((e) => Course.fromJson(e as Map<String, dynamic>))
          .toList(),
      encoder: (courses) => courses.map((c) => c.toJson()).toList(),
    );
  }

  /// Get single course by ID
  Future<Course?> getCourse(String courseId,
      {bool forceRefresh = false}) async {
    return _cache.getOrFetch<Course>(
      CacheKeys.course(courseId),
      () async {
        final response = await api.get<Map<String, dynamic>>(
          '/courses/$courseId',
        );

        if (response.success && response.data != null) {
          final payload = response.data!;
          final data = payload.containsKey('data')
              ? payload['data'] as Map<String, dynamic>
              : payload;
          return Course.fromJson(data);
        }
        throw ServerException(
          message: 'Course with ID $courseId not found.',
          statusCode: 404,
          code: 'COURSE_NOT_FOUND',
        );
      },
      ttl: const Duration(hours: 1),
      forceRefresh: forceRefresh,
      decoder: (data) => Course.fromJson(data as Map<String, dynamic>),
      encoder: (course) => course.toJson(),
    );
  }

  /// Get featured courses
  Future<List<Course>> getFeaturedCourses({bool forceRefresh = false}) async {
    return getCourses(forceRefresh: forceRefresh);
  }

  /// Get upcoming live classes
  Future<List<LiveClassModel>> getUpcomingLiveClasses() async {
    // Mock implementation for now, moved from HomeScreen
    return [
      LiveClassModel(
        id: 'live1',
        title: 'Advanced Flutter Patterns',
        instructorName: 'Dr. Angela Yu',
        scheduledTime: DateTime.now().add(const Duration(hours: 4)),
      ),
      LiveClassModel(
        id: 'live2',
        title: 'Data Science Q&A',
        instructorName: 'Jose Portilla',
        scheduledTime: DateTime.now().add(const Duration(days: 1, hours: 10)),
      ),
    ];
  }

  /// Get course progress
  Future<Map<String, CourseProgress>> getUserProgress() async {
    return _cache.getOrFetch<Map<String, CourseProgress>>(
      CacheKeys.userProgress,
      () async {
        final response = await api.get<Map<String, dynamic>>('/user/progress');

        if (response.success && response.data != null) {
          final payload = response.data!;
          final data = payload.containsKey('data')
              ? payload['data'] as Map<String, dynamic>
              : payload;

          final progressMap = <String, CourseProgress>{};
          final progressData = data['progress'] as Map<String, dynamic>;

          progressData.forEach((key, value) {
            progressMap[key] =
                CourseProgress.fromJson(value as Map<String, dynamic>);
          });

          return progressMap;
        }
        return {};
      },
      ttl: const Duration(minutes: 30),
      // Encode Map<String, CourseProgress> to Map<String, dynamic>
      encoder: (map) => map.map((k, v) => MapEntry(k, v.toJson())),
      // Decode Map<String, dynamic> back to Map<String, CourseProgress>
      decoder: (data) {
        final map = data as Map<String, dynamic>;
        return map.map((k, v) =>
            MapEntry(k, CourseProgress.fromJson(v as Map<String, dynamic>)));
      },
    );
  }

  /// Update lesson completion
  Future<void> completeLesson({
    required String courseId,
    required String lessonId,
    required int watchedSeconds,
  }) async {
    // 1. Queue for sync
    await _sync.queue(
      type: SyncTypes.lessonCompletion,
      action: 'create',
      data: {
        'courseId': courseId,
        'lessonId': lessonId,
        'watchedSeconds': watchedSeconds,
        'completedAt': DateTime.now().toIso8601String(),
      },
    );

    // 2. Optimistic Cache Update
    try {
      final currentMap = await getUserProgress(); // Hits memory/disk cache
      if (currentMap.containsKey(courseId)) {
        final oldProgress = currentMap[courseId]!;
        // Simple incremental logic for optimistic UI
        // In real app, we might need more complex logic or just trust next fetch
        // For now, update lastAccessed at minimum
        final updatedProgress = CourseProgress(
          courseId: oldProgress.courseId,
          progress: oldProgress
              .progress, // Hard to calc exact progress locally without total lessons count
          completedLessons: oldProgress.completedLessons + 1,
          totalLessons: oldProgress.totalLessons,
          timeSpentMinutes:
              oldProgress.timeSpentMinutes + (watchedSeconds ~/ 60),
          lastAccessed: DateTime.now(),
        );

        final newMap = Map<String, CourseProgress>.from(currentMap);
        newMap[courseId] = updatedProgress;

        await _cache.set<Map<String, CourseProgress>>(
          CacheKeys.userProgress,
          newMap,
          encoder: (map) => map.map((k, v) => MapEntry(k, v.toJson())),
        );
      }
    } catch (_) {
      // Ignore cache update errors
    }
  }

  /// Update course progress
  Future<void> updateProgress({
    required String courseId,
    required double progress,
    required int timeSpentMinutes,
  }) async {
    // 1. Queue for sync
    await _sync.queue(
      type: SyncTypes.courseProgress,
      action: 'update',
      data: {
        'courseId': courseId,
        'progress': progress,
        'timeSpentMinutes': timeSpentMinutes,
        'timestamp': DateTime.now().toIso8601String(),
      },
    );

    // 2. Optimistic Cache Update
    try {
      final currentMap = await getUserProgress();
      if (currentMap.containsKey(courseId)) {
        final old = currentMap[courseId]!;
        final updated = CourseProgress(
          courseId: old.courseId,
          progress: progress,
          completedLessons: old.completedLessons, // Keep existing
          totalLessons: old.totalLessons,
          timeSpentMinutes:
              timeSpentMinutes, // This is total or delta? Usually total from UI
          lastAccessed: DateTime.now(),
        );

        final newMap = Map<String, CourseProgress>.from(currentMap);
        newMap[courseId] = updated;

        await _cache.set(
          CacheKeys.userProgress,
          newMap,
          encoder: (map) => map.map((k, v) => MapEntry(k, v.toJson())),
        );
      }
    } catch (_) {}
  }

  /// Enroll in a course
  Future<bool> enrollCourse(String courseId) async {
    final response = await api.post<Map<String, dynamic>>(
      '/courses/$courseId/enroll',
    );

    if (response.success) {
      // Invalidate cache
      await _cache.clearPattern('courses');
      return true;
    }
    return false;
  }

  /// Rate a course
  Future<bool> rateCourse(String courseId, double rating,
      {String? review}) async {
    final response = await api.post<Map<String, dynamic>>(
      '/courses/$courseId/rate',
      data: {
        'rating': rating,
        if (review != null) 'review': review,
      },
    );
    return response.success;
  }

  /// Search courses
  Future<List<Course>> searchCourses(String query) async {
    final trimmedQuery = query.trim();
    if (trimmedQuery.isEmpty) return [];

    final response = await api.get<Map<String, dynamic>>(
      '/courses/search',
      queryParameters: {'q': trimmedQuery},
    );

    if (response.success && response.data != null) {
      final payload = response.data!;
      final data = payload.containsKey('data')
          ? payload['data'] as Map<String, dynamic>
          : payload;

      return (data['courses'] as List)
          .map((e) => Course.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Get categories
  Future<List<String>> getCategories() async {
    return _cache.getOrFetch<List<String>>(
      CacheKeys.categories,
      () async {
        final response = await api.get<Map<String, dynamic>>('/categories');
        if (response.success && response.data != null) {
          final payload = response.data!;
          final data = payload.containsKey('data')
              ? payload['data'] as Map<String, dynamic>
              : payload;
          return List<String>.from(data['categories'] as List);
        }
        return [];
      },
      ttl: const Duration(hours: 24),
      decoder: (data) => List<String>.from(data as List),
    );
  }

  /// Initialize sync handlers
  void initializeSyncHandlers() {
    _sync.registerHandler(SyncTypes.courseProgress, _handleProgressSync);
    _sync.registerHandler(SyncTypes.lessonCompletion, _handleLessonSync);
  }

  Future<bool> _handleProgressSync(SyncItem item) async {
    final response = await api.post<Map<String, dynamic>>(
      '/user/progress',
      data: item.data,
    );
    return response.success;
  }

  Future<bool> _handleLessonSync(SyncItem item) async {
    final courseId = item.data['courseId'] as String;
    final lessonId = item.data['lessonId'] as String;

    final response = await api.post<Map<String, dynamic>>(
      '/courses/$courseId/lessons/$lessonId/complete',
      data: item.data,
    );
    return response.success;
  }
}
