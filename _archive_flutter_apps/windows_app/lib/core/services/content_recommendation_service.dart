import 'dart:math';
import 'package:shared_preferences/shared_preferences.dart';
import '../../data/models/course_model.dart';
import 'logging_service.dart';

/// Content Recommendation Service using Hybrid Filtering
class ContentRecommendationService {
  static final ContentRecommendationService _instance =
      ContentRecommendationService._();
  static ContentRecommendationService get instance => _instance;

  ContentRecommendationService._();

  static const String _userInteractionsKey = 'rec_user_interactions';
  static const String _userVectorsKey = 'rec_user_vectors';

  // Weights for hybrid scoring
  static const double _contentWeight = 0.4;
  static const double _collaborativeWeight = 0.4;
  static const double _popularityWeight = 0.2;

  // Interaction weights
  static const double _viewWeight = 1.0;
  static const double _enrollWeight = 5.0;
  static const double _completeWeight = 10.0;
  static const double _rateWeight = 2.0; // Multiplied by rating-3

  final _logger = ScopedLogger('ContentRecommendationService');

  final Map<String, double> _userInteractions = {}; // CourseID -> Score
  final Map<String, double> _tagPreferences = {}; // Tag -> Score

  /// Initialize service
  Future<void> initialize() async {
    await _loadUserData();
  }

  /// Record user interaction
  Future<void> recordInteraction(String courseId, String type,
      {List<String>? tags, double? rating}) async {
    double scoreDelta = 0;

    switch (type) {
      case 'view':
        scoreDelta = _viewWeight;
        break;
      case 'enroll':
        scoreDelta = _enrollWeight;
        break;
      case 'complete':
        scoreDelta = _completeWeight;
        break;
      case 'rate':
        if (rating != null) {
          scoreDelta =
              _rateWeight * (rating - 3); // Negative impact for low ratings
        }
        break;
    }

    // Update course interaction score
    _userInteractions[courseId] =
        (_userInteractions[courseId] ?? 0) + scoreDelta;

    // Update tag preferences
    if (tags != null) {
      for (final tag in tags) {
        _tagPreferences[tag] = (_tagPreferences[tag] ?? 0) + (scoreDelta * 0.5);
      }
    }

    await _saveUserData();

    // Log interaction for ML training data collection
    _logger.info(
        'Recommendation Interaction: User interacted with $courseId ($type)',
        context: {
          'courseId': courseId,
          'interactionType': type,
          'scoreDelta': scoreDelta,
          'timestamp': DateTime.now().toIso8601String(),
        });
  }

  /// Get recommendations for user
  List<CourseRecommendation> getRecommendations(List<Course> allCourses,
      {int limit = 10}) {
    if (allCourses.isEmpty) return [];

    final suggestions = <CourseRecommendation>[];

    for (final course in allCourses) {
      // Skip courses user has already completed or enrolled (if strict)
      // For now, allow re-recommendation but maybe lower score

      final double contentScore = _calculateContentScore(course);
      final double collaborativeScore = _calculateCollaborativeScore(course);
      final double popularityScore = _calculatePopularityScore(course);

      double totalScore = (contentScore * _contentWeight) +
          (collaborativeScore * _collaborativeWeight) +
          (popularityScore * _popularityWeight);

      // Random perturbation for diversity (epsilon-greedy-ish)
      totalScore += (Random().nextDouble() * 0.1);

      if (totalScore > 0.1) {
        suggestions.add(CourseRecommendation(
          course: course,
          score: totalScore,
          reason: _getRecommendationReason(
              contentScore, collaborativeScore, popularityScore),
        ));
      }
    }

    // Sort by score descending
    suggestions.sort((a, b) => b.score.compareTo(a.score));

    return suggestions.take(limit).toList();
  }

  /// Calculate Content-Based Score (Tag matching)
  double _calculateContentScore(Course course) {
    if (_tagPreferences.isEmpty) return 0.0;

    double score = 0;
    int matches = 0;

    for (final tag in course.tags) {
      if (_tagPreferences.containsKey(tag)) {
        score += _tagPreferences[tag]!;
        matches++;
      }
    }

    // Normalize logic could allow scores > 1, so we clamp or use sigmoid in real ML
    // Here we just return raw sum damped by log
    return matches > 0 ? log(score + 1) : 0.0;
  }

  /// Calculate Collaborative Filtering Score (Simulated)
  /// In a real system, this would call an API or use matrix factorization.
  /// Here we simulate "people who liked X also liked Y" using hardcoded clusters or simple category logic.
  double _calculateCollaborativeScore(Course course) {
    // Placeholder: If user likes 'Flutter' category, boost other 'Flutter' courses
    // This is basically content-based in this simple version.
    // Real collaborative filtering needs other users' data.
    return 0.0;
  }

  /// Calculate Popularity Score
  double _calculatePopularityScore(Course course) {
    // Normalize rating (0-5) to 0-1
    final ratingScore = course.rating / 5.0;

    // Normalize students (log scale)
    final studentScore =
        min(log(course.enrolledStudents + 1) / log(10000), 1.0);

    return (ratingScore * 0.7) + (studentScore * 0.3);
  }

  String _getRecommendationReason(double content, double collab, double pop) {
    if (content > collab && content > pop) return 'Based on your interests';
    if (collab > content && collab > pop) return 'Similar users liked this';
    return 'Popular and highly rated';
  }

  Future<void> _loadUserData() async {
    final prefs = await SharedPreferences.getInstance();
    // Load user interactions
    final interactionsJson = prefs.getString(_userInteractionsKey);
    if (interactionsJson != null) {
      try {
        final Map<String, dynamic> decoded =
            Map<String, dynamic>.from(_parseJson(interactionsJson));
        _userInteractions.clear();
        decoded.forEach((key, value) {
          _userInteractions[key] = (value as num).toDouble();
        });
      } catch (e) {
        _logger.warn('Failed to load user interactions: $e');
      }
    }

    // Load tag preferences (using vectors key for tag vectors)
    final vectorsJson = prefs.getString(_userVectorsKey);
    if (vectorsJson != null) {
      try {
        final Map<String, dynamic> decoded =
            Map<String, dynamic>.from(_parseJson(vectorsJson));
        _tagPreferences.clear();
        decoded.forEach((key, value) {
          _tagPreferences[key] = (value as num).toDouble();
        });
      } catch (e) {
        _logger.warn('Failed to load tag preferences: $e');
      }
    }
  }

  Map<String, dynamic> _parseJson(String json) {
    // Simple JSON parsing for preference storage
    final result = <String, dynamic>{};
    if (json.isEmpty || json == '{}') return result;
    // Remove braces and parse key-value pairs
    final content = json.substring(1, json.length - 1);
    if (content.isEmpty) return result;
    for (final pair in content.split(',')) {
      final parts = pair.split(':');
      if (parts.length == 2) {
        final key = parts[0].trim().replaceAll('"', '');
        final value = double.tryParse(parts[1].trim()) ?? 0.0;
        result[key] = value;
      }
    }
    return result;
  }

  Future<void> _saveUserData() async {
    final prefs = await SharedPreferences.getInstance();
    // Save user interactions
    final interactionsJson = _mapToJson(_userInteractions);
    await prefs.setString(_userInteractionsKey, interactionsJson);

    // Save tag preferences
    final vectorsJson = _mapToJson(_tagPreferences);
    await prefs.setString(_userVectorsKey, vectorsJson);
  }

  String _mapToJson(Map<String, double> map) {
    if (map.isEmpty) return '{}';
    final pairs = map.entries.map((e) => '"${e.key}":${e.value}').join(',');
    return '{$pairs}';
  }
}

class CourseRecommendation {
  final Course course;
  final double score;
  final String reason;

  CourseRecommendation(
      {required this.course, required this.score, required this.reason});
}
