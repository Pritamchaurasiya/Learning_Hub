import 'package:hive_flutter/hive_flutter.dart';
import 'package:intl/intl.dart';
import 'api_client.dart';
import 'sync_service.dart';

/// Service to track user learning analytics
class AnalyticsService {
  static final AnalyticsService _instance = AnalyticsService._();
  static AnalyticsService get instance => _instance;

  ApiClient api;
  final SyncService _sync;

  Map<String, dynamic>? _testStorage;

  AnalyticsService._({
    ApiClient? api,
    SyncService? sync,
    Map<String, dynamic>? testStorage,
  })  : api = api ?? ApiClient.instance,
        _sync = sync ?? SyncService.instance,
        _testStorage = testStorage;

  /// Factory for testing
  factory AnalyticsService({
    ApiClient? api,
    SyncService? sync,
    Map<String, dynamic>? testStorage,
  }) {
    if (api != null || sync != null || testStorage != null) {
      return AnalyticsService._(
        api: api,
        sync: sync,
        testStorage: testStorage,
      );
    }
    return _instance;
  }

  late Box<dynamic> _analyticsBox;
  bool _isInitialized = false;
  DateTime? _sessionStartTime;
  // final SyncService _syncService = SyncService.instance;

  /// Initialize Hive box
  Future<void> initialize() async {
    if (_isInitialized) {
      return;
    }

    if (_testStorage != null) {
      _isInitialized = true;
      await _fetchRemoteStats();
      return;
    }

    // Ensure Hive is initialized (handled by OfflineService usually)
    try {
      if (!Hive.isAdapterRegistered(0)) {
        await Hive.initFlutter();
      }
    } catch (e) {
      // Ignore
    }

    _analyticsBox = await Hive.openBox('analytics');
    _isInitialized = true;
    await _fetchRemoteStats();
  }

  // Storage helpers
  dynamic _get(String key, {dynamic defaultValue}) {
    if (_testStorage != null) {
      return _testStorage![key] ?? defaultValue;
    }
    return _analyticsBox.get(key, defaultValue: defaultValue);
  }

  Future<void> _put(String key, dynamic value) async {
    if (_testStorage != null) {
      _testStorage![key] = value;
      return;
    }
    await _analyticsBox.put(key, value);
  }

  Future<void> _fetchRemoteStats() async {
    try {
      final response =
          await api.get<Map<String, dynamic>>('/analytics/summary');
      if (response.success && response.data != null) {
        final data = response.data!;
        // Update local hive box with remote truth
        await _put('total_study_minutes', data['totalStudyMinutes']);
        await _put('completed_courses_count', data['completedCourses']);
        await _put('completed_lessons_count', data['completedLessons']);
        await _put('total_quizzes_taken', data['totalQuizzes']);
        await _put('avg_quiz_score', data['averageScore']);
      }
    } catch (_) {
      // Offline, stick to local
    }
  }

  // --- Session Tracking ---

  void startSession() {
    _sessionStartTime = DateTime.now();
  }

  Future<void> endSession() async {
    if (_sessionStartTime == null) {
      return;
    }

    final end = DateTime.now();
    final duration = end.difference(_sessionStartTime!);
    _sessionStartTime = null;

    if (duration.inSeconds < 10) {
      return;
    } // Ignore very short sessions

    await logStudySession(subject: 'General', duration: duration);
  }

  /// Manually log a study session or from endSession
  Future<void> logStudySession(
      {required String subject, required Duration duration}) async {
    if (!_isInitialized) {
      await initialize();
    } // Auto init if needed

    final dateKey = DateFormat('yyyy-MM-dd').format(DateTime.now());
    final currentMinutesValue = _get('study_time_$dateKey', defaultValue: 0);
    final currentMinutes = (currentMinutesValue as num).toInt();

    await _put('study_time_$dateKey', currentMinutes + duration.inMinutes);

    // Also log total time
    final totalValue = _get('total_study_minutes', defaultValue: 0);
    final total = (totalValue as num).toInt();
    await _put('total_study_minutes', total + duration.inMinutes);

    // Sync to backend
    await _sync.queue(
      type: SyncTypes.studySession,
      action: 'create',
      data: {
        'subject': subject,
        'date': dateKey,
        'duration': duration.inMinutes,
        'timestamp': DateTime.now().toIso8601String(),
      },
    );

    // Try immediate sync if online
    try {
      await api.post<dynamic>('/analytics/session', data: {
        'subject': subject,
        'date': dateKey,
        'duration': duration.inMinutes,
        'timestamp': DateTime.now().toIso8601String(),
      });
    } catch (_) {
      // Offline - handled by sync queue
    }
  }

  // --- Data Retrieval ---

  Future<void> logQuizScore(String quizId, double score) async {
    if (!_isInitialized) {
      await initialize();
    } // Auto init

    final currentAvgValue = _get('avg_quiz_score', defaultValue: 0.0);
    final totalQuizzesValue = _get('total_quizzes_taken', defaultValue: 0);
    final currentAvg = (currentAvgValue as num).toDouble();
    final totalQuizzes = (totalQuizzesValue as num).toInt();

    final newTotal = totalQuizzes + 1;
    final newAvg = ((currentAvg * totalQuizzes) + score) / newTotal;

    await _put('avg_quiz_score', newAvg);
    await _put('total_quizzes_taken', newTotal);

    // Sync to backend using SyncService
    await _sync.queue(
      type: SyncTypes.quizResult,
      action: 'create',
      data: {
        'quizId': quizId,
        'score': score,
        'timestamp': DateTime.now().toIso8601String(),
      },
    );

    // Try immediate sync if online
    try {
      await api.post<dynamic>('/analytics/quiz/$quizId', data: {
        'score': score,
        'timestamp': DateTime.now().toIso8601String()
      });
    } catch (_) {
      // Offline - handled by sync queue
    }
  }

  double get averageQuizScore => _isInitialized
      ? (_get('avg_quiz_score', defaultValue: 0.0) as num).toDouble()
      : 0.0;

  int get completedLessons => _isInitialized
      ? (_get('completed_lessons_count', defaultValue: 0) as int)
      : 0;

  int get completedCourses => _isInitialized
      ? (_get('completed_courses_count', defaultValue: 0) as int)
      : 0;

  int get totalQuizzesTaken => _isInitialized
      ? (_get('total_quizzes_taken', defaultValue: 0) as int)
      : 0;

  // Call this when lesson completed
  Future<void> incrementLessonCount() async {
    if (!_isInitialized) {
      await initialize();
    }
    final current = completedLessons;
    await _put('completed_lessons_count', current + 1);

    // Sync event
    await _sync.queue(
      type: SyncTypes.lessonCompletion,
      action: 'update',
      data: {
        'count': current + 1,
        'timestamp': DateTime.now().toIso8601String(),
      },
    );
  }

  // Call this when course completed
  Future<void> incrementCourseCount() async {
    if (!_isInitialized) {
      await initialize();
    }
    final current = completedCourses;
    await _put('completed_courses_count', current + 1);

    // Sync event
    await _sync.queue(
      type: SyncTypes.courseProgress,
      action: 'update',
      data: {
        'type': 'course_complete',
        'count': current + 1,
        'timestamp': DateTime.now().toIso8601String(),
      },
    );
  }

  /// Get study minutes for a specific date
  int getStudyMinutes(DateTime date) {
    if (!_isInitialized) {
      return 0;
    }
    final dateKey = DateFormat('yyyy-MM-dd').format(date);
    return (_get('study_time_$dateKey', defaultValue: 0) as int);
  }

  /// Get total study hours
  double getTotalStudyHours() {
    if (!_isInitialized) {
      return 0.0;
    }
    final minutes = (_get('total_study_minutes', defaultValue: 0) as int);
    return minutes / 60.0;
  }

  /// Get study minutes for the last 7 days (including today)
  List<int> getWeeklyStudyData() {
    if (!_isInitialized) {
      return List.filled(7, 0);
    }
    final now = DateTime.now();
    return List.generate(7, (index) {
      final date = now.subtract(Duration(days: 6 - index));
      return getStudyMinutes(date);
    });
  }

  Map<String, dynamic> getStudyStats() {
    if (!_isInitialized) {
      return {};
    }

    // Calculate real stats based on available data
    // In a full implementation, this might aggregate specific course tags
    final totalTimeHours = getTotalStudyHours();
    final quizAvg = averageQuizScore; // 0.0 to 100.0 usually, or 1.0?
    // Assuming quiz scores are 0-100, normalize to 0-1.
    final normalizedQuiz = quizAvg > 1.0 ? quizAvg / 100.0 : quizAvg;

    // Derived mastery metrics
    return {
      'Overall Mastery':
          (normalizedQuiz * 0.7) + (completedCourses * 0.1).clamp(0.0, 0.3),
      'Dedication': (totalTimeHours / 20.0).clamp(0.0, 1.0), // Goal: 20 hours
      'Course Completion':
          (completedLessons / 50.0).clamp(0.0, 1.0), // Goal: 50 lessons
      'Quiz Performance': normalizedQuiz,
    };
  }
}
