import 'dart:convert';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Recommendation reason
enum RecommendationReason {
  basedOnHistory,
  trending,
  similarToCompleted,
  sameInstructor,
  sameCategory,
  popularInArea,
  newRelease,
  personalized,
}

/// Course recommendation with scoring
class CourseRecommendation {
  final String courseId;
  final double score;
  final List<RecommendationReason> reasons;
  final DateTime generatedAt;

  const CourseRecommendation({
    required this.courseId,
    required this.score,
    required this.reasons,
    required this.generatedAt,
  });

  String get primaryReason {
    if (reasons.isEmpty) {
      return 'Recommended for you';
    }
    switch (reasons.first) {
      case RecommendationReason.basedOnHistory:
        return 'Based on your learning history';
      case RecommendationReason.trending:
        return 'Trending now';
      case RecommendationReason.similarToCompleted:
        return 'Similar to courses you completed';
      case RecommendationReason.sameInstructor:
        return 'From an instructor you follow';
      case RecommendationReason.sameCategory:
        return 'In your favorite category';
      case RecommendationReason.popularInArea:
        return 'Popular in your area';
      case RecommendationReason.newRelease:
        return 'Just released';
      case RecommendationReason.personalized:
        return 'Picked for you';
    }
  }

  Map<String, dynamic> toJson() => {
        'courseId': courseId,
        'score': score,
        'reasons': reasons.map((r) => r.index).toList(),
        'generatedAt': generatedAt.toIso8601String(),
      };

  factory CourseRecommendation.fromJson(Map<String, dynamic> json) {
    return CourseRecommendation(
      courseId: json['courseId'] as String,
      score: (json['score'] as num).toDouble(),
      reasons: (json['reasons'] as List)
          .map((r) => RecommendationReason.values[r as int])
          .toList(),
      generatedAt: DateTime.parse(json['generatedAt'] as String),
    );
  }
}

/// User learning profile for recommendations
class LearningProfile {
  final Map<String, double> categoryAffinities;
  final List<String> completedCourseIds;
  final List<String> favoriteInstructorIds;
  final Map<String, int> viewCounts;
  final int totalLearningMinutes;
  final DateTime lastUpdated;

  const LearningProfile({
    this.categoryAffinities = const {},
    this.completedCourseIds = const [],
    this.favoriteInstructorIds = const [],
    this.viewCounts = const {},
    this.totalLearningMinutes = 0,
    required this.lastUpdated,
  });

  LearningProfile copyWith({
    Map<String, double>? categoryAffinities,
    List<String>? completedCourseIds,
    List<String>? favoriteInstructorIds,
    Map<String, int>? viewCounts,
    int? totalLearningMinutes,
    DateTime? lastUpdated,
  }) {
    return LearningProfile(
      categoryAffinities: categoryAffinities ?? this.categoryAffinities,
      completedCourseIds: completedCourseIds ?? this.completedCourseIds,
      favoriteInstructorIds:
          favoriteInstructorIds ?? this.favoriteInstructorIds,
      viewCounts: viewCounts ?? this.viewCounts,
      totalLearningMinutes: totalLearningMinutes ?? this.totalLearningMinutes,
      lastUpdated: lastUpdated ?? this.lastUpdated,
    );
  }

  Map<String, dynamic> toJson() => {
        'categoryAffinities': categoryAffinities,
        'completedCourseIds': completedCourseIds,
        'favoriteInstructorIds': favoriteInstructorIds,
        'viewCounts': viewCounts,
        'totalLearningMinutes': totalLearningMinutes,
        'lastUpdated': lastUpdated.toIso8601String(),
      };

  factory LearningProfile.fromJson(Map<String, dynamic> json) {
    return LearningProfile(
      categoryAffinities: Map<String, double>.from(
          (json['categoryAffinities'] ?? <String, double>{})
              as Map<dynamic, dynamic>),
      completedCourseIds: List<String>.from(
          (json['completedCourseIds'] ?? <String>[]) as Iterable<dynamic>),
      favoriteInstructorIds: List<String>.from(
          (json['favoriteInstructorIds'] ?? <String>[]) as Iterable<dynamic>),
      viewCounts: Map<String, int>.from(
          (json['viewCounts'] ?? <String, int>{}) as Map<dynamic, dynamic>),
      totalLearningMinutes: json['totalLearningMinutes'] as int? ?? 0,
      lastUpdated: json['lastUpdated'] != null
          ? DateTime.parse(json['lastUpdated'] as String)
          : DateTime.now(),
    );
  }
}

/// Content recommendation engine
class RecommendationService {
  static final RecommendationService _instance = RecommendationService._();
  static RecommendationService get instance => _instance;

  RecommendationService._();

  static const String _profileKey = 'learning_profile';
  static const String _recommendationsKey = 'cached_recommendations';
  static const Duration _cacheValidity = Duration(hours: 6);

  LearningProfile? _profile;
  List<CourseRecommendation> _cachedRecommendations = [];

  /// Initialize the recommendation engine
  Future<void> initialize() async {
    await _loadProfile();
    await _loadCachedRecommendations();
  }

  /// Load user learning profile
  Future<void> _loadProfile() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = prefs.getString(_profileKey);

      if (json != null) {
        _profile = LearningProfile.fromJson(
          jsonDecode(json) as Map<String, dynamic>,
        );
      } else {
        _profile = LearningProfile(lastUpdated: DateTime.now());
      }
    } catch (e) {
      // Log error securely without exposing sensitive information
      if (kDebugMode) {
        debugPrint('Failed to load learning profile');
      }
      _profile = LearningProfile(lastUpdated: DateTime.now());
    }
  }

  /// Save user learning profile
  Future<void> _saveProfile() async {
    if (_profile == null) {
      return;
    }

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_profileKey, jsonEncode(_profile!.toJson()));
    } catch (e) {
      // Log error securely without exposing sensitive information
      if (kDebugMode) {
        debugPrint('Failed to save learning profile');
      }
    }
  }

  /// Load cached recommendations
  Future<void> _loadCachedRecommendations() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = prefs.getString(_recommendationsKey);

      if (json != null) {
        final list = jsonDecode(json) as List;
        _cachedRecommendations = list
            .map(
                (e) => CourseRecommendation.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (e) {
      // Log error securely without exposing sensitive information
      if (kDebugMode) {
        debugPrint('Failed to load cached recommendations');
      }
    }
  }

  /// Save cached recommendations
  Future<void> _saveCachedRecommendations() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = _cachedRecommendations.map((r) => r.toJson()).toList();
      await prefs.setString(_recommendationsKey, jsonEncode(json));
    } catch (e) {
      // Log error securely without exposing sensitive information
      if (kDebugMode) {
        debugPrint('Failed to save cached recommendations');
      }
    }
  }

  /// Track course view
  Future<void> trackCourseView(String courseId, String category) async {
    if (_profile == null) {
      await _loadProfile();
    }

    final viewCounts = Map<String, int>.from(_profile!.viewCounts);
    viewCounts[courseId] = (viewCounts[courseId] ?? 0) + 1;

    // Update category affinity
    final affinities = Map<String, double>.from(_profile!.categoryAffinities);
    affinities[category] = (affinities[category] ?? 0) + 0.1;

    // Normalize affinities
    final total = affinities.values.fold(0.0, (a, b) => a + b);
    if (total > 0) {
      affinities.updateAll((key, value) => value / total);
    }

    _profile = _profile!.copyWith(
      viewCounts: viewCounts,
      categoryAffinities: affinities,
      lastUpdated: DateTime.now(),
    );

    await _saveProfile();
  }

  /// Track course completion
  Future<void> trackCourseCompletion(
    String courseId,
    String instructorId,
    int durationMinutes,
  ) async {
    if (_profile == null) {
      await _loadProfile();
    }

    final completedIds = List<String>.from(_profile!.completedCourseIds);
    if (!completedIds.contains(courseId)) {
      completedIds.add(courseId);
    }

    final instructorIds = List<String>.from(_profile!.favoriteInstructorIds);
    if (!instructorIds.contains(instructorId)) {
      instructorIds.add(instructorId);
    }

    _profile = _profile!.copyWith(
      completedCourseIds: completedIds,
      favoriteInstructorIds: instructorIds,
      totalLearningMinutes: _profile!.totalLearningMinutes + durationMinutes,
      lastUpdated: DateTime.now(),
    );

    await _saveProfile();

    // Invalidate recommendations cache
    _cachedRecommendations.clear();
    await _saveCachedRecommendations();
  }

  /// Get personalized recommendations
  Future<List<CourseRecommendation>> getRecommendations({
    required List<Map<String, dynamic>> availableCourses,
    int limit = 10,
    bool forceRefresh = false,
  }) async {
    // Check cache validity
    if (!forceRefresh &&
        _cachedRecommendations.isNotEmpty &&
        _cachedRecommendations.first.generatedAt
                .difference(DateTime.now())
                .abs() <
            _cacheValidity) {
      return _cachedRecommendations.take(limit).toList();
    }

    if (_profile == null) {
      await _loadProfile();
    }

    final recommendations = <CourseRecommendation>[];
    final completedSet = _profile!.completedCourseIds.toSet();

    for (final course in availableCourses) {
      final courseId = course['id'] as String;

      // Skip completed courses
      if (completedSet.contains(courseId)) {
        continue;
      }

      final score = _calculateScore(course);
      final reasons = _getReasons(course);

      if (score > 0) {
        recommendations.add(CourseRecommendation(
          courseId: courseId,
          score: score,
          reasons: reasons,
          generatedAt: DateTime.now(),
        ));
      }
    }

    // Sort by score descending
    recommendations.sort((a, b) => b.score.compareTo(a.score));

    // Cache top recommendations
    _cachedRecommendations = recommendations.take(50).toList();
    await _saveCachedRecommendations();

    return recommendations.take(limit).toList();
  }

  /// Calculate recommendation score for a course
  double _calculateScore(Map<String, dynamic> course) {
    double score = 0.0;

    // Category affinity (0-40 points)
    final category = course['category'] as String?;
    if (category != null &&
        _profile!.categoryAffinities.containsKey(category)) {
      score += _profile!.categoryAffinities[category]! * 40;
    }

    // Instructor preference (0-20 points)
    final instructorId = course['instructorId'] as String?;
    if (instructorId != null &&
        _profile!.favoriteInstructorIds.contains(instructorId)) {
      score += 20;
    }

    // Course rating (0-20 points)
    final rating = (course['rating'] as num?)?.toDouble() ?? 4.0;
    score += (rating / 5) * 20;

    // Popularity boost (0-10 points)
    final enrollments = (course['enrollments'] as num?)?.toInt() ?? 0;
    score += min(10, log(max(1, enrollments)) / log(10) * 3);

    // New course bonus (0-10 points)
    final createdAt = course['createdAt'] as String?;
    if (createdAt != null) {
      final created = DateTime.tryParse(createdAt);
      if (created != null) {
        final daysAgo = DateTime.now().difference(created).inDays;
        if (daysAgo < 30) {
          score += 10;
        } else if (daysAgo < 90) {
          score += 5;
        }
      }
    }

    return score;
  }

  /// Get reasons for recommendation
  List<RecommendationReason> _getReasons(Map<String, dynamic> course) {
    final reasons = <RecommendationReason>[];

    final category = course['category'] as String?;
    if (category != null &&
        (_profile!.categoryAffinities[category] ?? 0) > 0.2) {
      reasons.add(RecommendationReason.sameCategory);
    }

    final instructorId = course['instructorId'] as String?;
    if (instructorId != null &&
        _profile!.favoriteInstructorIds.contains(instructorId)) {
      reasons.add(RecommendationReason.sameInstructor);
    }

    final enrollments = (course['enrollments'] as num?)?.toInt() ?? 0;
    if (enrollments > 10000) {
      reasons.add(RecommendationReason.trending);
    }

    final createdAt = course['createdAt'] as String?;
    if (createdAt != null) {
      final created = DateTime.tryParse(createdAt);
      if (created != null && DateTime.now().difference(created).inDays < 30) {
        reasons.add(RecommendationReason.newRelease);
      }
    }

    if (reasons.isEmpty) {
      reasons.add(RecommendationReason.personalized);
    }

    return reasons;
  }

  /// Get "Continue Learning" suggestions
  List<String> getContinueLearning({
    required Map<String, double> courseProgress,
    int limit = 3,
  }) {
    // Sort by progress (incomplete courses first)
    final inProgress = courseProgress.entries
        .where((e) => e.value > 0 && e.value < 1)
        .toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    return inProgress.take(limit).map((e) => e.key).toList();
  }

  /// Get category distribution for user
  Map<String, double> get categoryAffinities =>
      Map.unmodifiable(_profile?.categoryAffinities ?? {});

  /// Get learning stats
  Map<String, dynamic> getStats() {
    return {
      'totalLearningMinutes': _profile?.totalLearningMinutes ?? 0,
      'completedCourses': _profile?.completedCourseIds.length ?? 0,
      'topCategories': (_profile?.categoryAffinities.entries.toList()
                ?..sort((a, b) => b.value.compareTo(a.value)))
              ?.take(3)
              .map((e) => e.key)
              .toList() ??
          [],
    };
  }

  /// Clear all recommendation data
  Future<void> clearData() async {
    _profile = LearningProfile(lastUpdated: DateTime.now());
    _cachedRecommendations.clear();

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_profileKey);
    await prefs.remove(_recommendationsKey);
  }
}
