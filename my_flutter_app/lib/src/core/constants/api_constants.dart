import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class ApiConstants {
  ApiConstants._();

  /// Ensures URL ends with a trailing slash
  static String _ensureTrailingSlash(String url) {
    return url.endsWith('/') ? url : '$url/';
  }

  static String get baseUrl {
    String? envUrl;
    try {
      if (dotenv.isInitialized) {
        envUrl = dotenv.env['API_BASE_URL'];
      }
    } on Exception catch (_) {
      debugPrint('Warning: dotenv not initialized');
    }

    // 1. Check build-time environment variable (dart-define)
    const buildEnvUrl = String.fromEnvironment('API_URL');
    if (buildEnvUrl.isNotEmpty) {
      return _ensureTrailingSlash(buildEnvUrl);
    }

    // 2. Check runtime environment variable (.env)
    if (envUrl != null && envUrl.isNotEmpty) {
      return _ensureTrailingSlash(envUrl);
    }

    // Fallback for different environments
    if (kIsWeb) {
      // In production (release mode), use relative path for same-origin Nginx proxy
      if (kReleaseMode) {
        return '/api/v1/';
      }
      return 'http://127.0.0.1:8000/api/v1/';
    } else if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:8000/api/v1/'; // Android Emulator
    }

    return 'http://127.0.0.1:8000/api/v1/';
  }

  static String get wsUrl {
    final base = baseUrl;
    if (base.startsWith('https')) {
      return base.replaceFirst('https', 'wss').split('/api')[0];
    }
    return base.replaceFirst('http', 'ws').split('/api')[0];
  }

  static const Duration connectTimeout = Duration(milliseconds: 10000);
  static const Duration receiveTimeout = Duration(milliseconds: 10000);

  // Endpoints
  static const String login = 'auth/login/';
  static const String refresh = 'auth/refresh/';
  static const String register = 'auth/register/';
  static const String userProfile = 'auth/user/';
  static const String courses = 'courses/';
  static const String recommendations = 'courses/recommendations/';
  static const String certificates = 'courses/certificates/';
  static const String feedback = 'support/feedback/';
  static const String conversations = 'chat/conversations/';
  static const String messages = 'chat/messages/';
  static const String instructorStats = 'dashboard/instructor/stats/';
  static const String instructorCourses = 'dashboard/instructor/courses/';
  static const String instructorRevenue = 'dashboard/instructor/revenue/';
  static const String tutors = 'tutors/list/';
  static const String bookings = 'tutors/bookings/';
  static const String liveSessions = 'live/sessions/';
  static const String downloads = 'downloads/items/';
  static const String studyGroups = 'study/groups/';
  static const String notifications = 'notifications/';
  static const String gamificationStats = 'gamification/stats/';
  static const String gamificationLeaderboard = 'gamification/leaderboard/';
  static const String discussions = 'discussions/';
  static const String payments = 'payments/';
  static const String content = 'content/';

  // AI Engine Endpoints
  static const String aiRecommendations = 'ai/recommendations/';
  static const String aiTrending = 'ai/trending/';
  static const String aiLearningStats = 'ai/learning-stats/';
  static const String aiPopularCategories = 'ai/popular-categories/';

  // Phase 7: Quiz & Progress
  static const String aiCurriculum = 'ai/curriculum/';
  static const String aiCurriculumGenerate = 'ai/curriculum/generate/';
  static String aiQuiz(String moduleSlug) => 'ai/quiz/$moduleSlug/';
  static String aiQuizSubmit(String moduleSlug) =>
      'ai/quiz/$moduleSlug/submit/';
  static const String aiTutorAsk = 'ai/tutor/ask/';
  static const String aiTutorStream = 'ai/tutor/stream/';
  static const String aiVoiceTranscribe = 'ai/voice/transcribe/';
  static const String aiProgress = 'ai/progress/';

  // Phase 6: Analytics & Challenges
  static const String aiAnalytics = 'ai/analytics/';
  static const String aiAnalyticsTrack = 'ai/analytics/track/';
  static const String aiAnalyticsHeatmap = 'ai/analytics/heatmap/';
  static const String aiChallenges = 'ai/challenges/';
  static String aiChallengeJoin(int challengeId) =>
      'ai/challenges/$challengeId/join/';

  // Search APIs
  static const String search = 'search/';
  static const String searchSuggestions = 'search/suggestions/';
  static const String searchAdvanced = 'search/advanced/';
  static const String searchTrending = 'search/trending/';

  // Analytics APIs
  static const String analyticsDashboard = 'analytics/dashboard/';
  static const String analyticsCourses = 'analytics/courses/';
  static const String analyticsUsers = 'analytics/users/';
  static const String analyticsRevenue = 'analytics/revenue/';
  static const String analyticsEngagement = 'analytics/engagement/';
  static const String analyticsReportsGenerate = 'analytics/reports/generate/';
  static String analyticsReportsDownload(String reportId) =>
      'analytics/reports/$reportId/download/';

  // Admin APIs
  static const String adminUsers = 'core/admin/users/';
  static const String adminUserBulk = 'core/admin/users/bulk-action/';
  static const String adminPendingCourses = 'core/admin/courses/pending/';
  static String adminCourseApprove(String courseId) =>
      'core/admin/courses/$courseId/approve/';
  static const String adminSystemLogs = 'core/admin/system-logs/';
  static const String adminHealth = 'core/admin/health/';

  // Course Actions
  static String courseBookmark(String slug) => 'courses/$slug/bookmark/';
  static const String courseBookmarks = 'courses/bookmarks/';
  static String courseSimilar(String slug) => 'courses/$slug/similar/';
  static String courseShare(String slug) => 'courses/$slug/share/';
}
