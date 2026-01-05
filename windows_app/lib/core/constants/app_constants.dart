/// Application-wide constants for LearningHub
///
/// Centralized configuration for security, gamification,
/// and application settings.
library;

/// Security-related constants
class SecurityConstants {
  SecurityConstants._();

  /// Maximum failed login attempts before rate limiting
  static const int maxLoginAttempts = 5;

  /// Lockout duration after max failed attempts (in minutes)
  static const int lockoutDurationMinutes = 15;

  /// Session timeout duration (in minutes)
  static const int sessionTimeoutMinutes = 30;

  /// Token refresh threshold (refresh when this many minutes remain)
  static const int tokenRefreshThresholdMinutes = 5;

  /// Minimum password length
  static const int minPasswordLength = 8;

  /// Maximum password length
  static const int maxPasswordLength = 128;

  /// Maximum email length
  static const int maxEmailLength = 254;

  /// Rate limit window (in seconds)
  static const int rateLimitWindowSeconds = 60;

  /// Maximum requests per rate limit window
  static const int maxRequestsPerWindow = 100;
}

/// Gamification XP values
class XPValues {
  XPValues._();

  /// XP for completing a lesson
  static const int lessonComplete = 10;

  /// XP for completing a course
  static const int courseComplete = 100;

  /// XP for passing a quiz (per correct answer)
  static const int quizCorrectAnswer = 5;

  /// XP for perfect quiz score
  static const int perfectQuizBonus = 25;

  /// XP for daily login streak
  static const int dailyStreakBonus = 15;

  /// XP for 7-day streak milestone
  static const int weekStreakMilestone = 50;

  /// XP for 30-day streak milestone
  static const int monthStreakMilestone = 200;

  /// XP for first course enrollment
  static const int firstEnrollment = 20;

  /// XP for leaving a course review
  static const int courseReview = 10;

  /// XP for attending live class
  static const int liveClassAttendance = 15;

  /// XP for asking AI tutor a question
  static const int aiTutorQuestion = 2;
}

/// Level thresholds for gamification
class LevelThresholds {
  LevelThresholds._();

  /// Get level based on XP
  static int getLevelForXP(int xp) {
    for (int i = levels.length - 1; i >= 0; i--) {
      if (xp >= levels[i]) {
        return i + 1;
      }
    }
    return 1;
  }

  /// Get XP required for next level
  static int getXPForNextLevel(int currentXP) {
    final currentLevel = getLevelForXP(currentXP);
    if (currentLevel >= levels.length) {
      return 0;
    }
    return levels[currentLevel] - currentXP;
  }

  /// Get progress percentage to next level
  static double getProgressToNextLevel(int currentXP) {
    final currentLevel = getLevelForXP(currentXP);
    if (currentLevel >= levels.length) {
      return 1.0;
    }

    final currentLevelXP = currentLevel > 1 ? levels[currentLevel - 1] : 0;
    final nextLevelXP = levels[currentLevel];
    final progressXP = currentXP - currentLevelXP;
    final requiredXP = nextLevelXP - currentLevelXP;

    return (progressXP / requiredXP).clamp(0.0, 1.0);
  }

  /// Level names
  static const List<String> levelNames = [
    'Beginner',
    'Learner',
    'Explorer',
    'Achiever',
    'Expert',
    'Master',
    'Grandmaster',
    'Legend',
    'Champion',
    'Prodigy',
  ];

  /// XP thresholds for each level
  static const List<int> levels = [
    0, // Level 1
    100, // Level 2
    300, // Level 3
    600, // Level 4
    1000, // Level 5
    1500, // Level 6
    2200, // Level 7
    3000, // Level 8
    4000, // Level 9
    5500, // Level 10
  ];
}

/// Analytics tracking constants
class AnalyticsConstants {
  AnalyticsConstants._();

  /// Minimum session duration to track (in seconds)
  static const int minSessionDurationSeconds = 30;

  /// Maximum idle time before session ends (in minutes)
  static const int maxIdleTimeMinutes = 5;

  /// Days to retain detailed analytics
  static const int analyticsRetentionDays = 90;

  /// Weekly goal default (in minutes)
  static const int defaultWeeklyGoalMinutes = 300;
}

/// Offline mode constants
class OfflineConstants {
  OfflineConstants._();

  /// Maximum offline storage (in MB)
  static const int maxOfflineStorageMB = 2000;

  /// Sync interval when online (in minutes)
  static const int syncIntervalMinutes = 5;

  /// Maximum pending sync items
  static const int maxPendingSyncItems = 100;

  /// Download chunk size (in bytes)
  static const int downloadChunkSize = 1024 * 1024; // 1MB
}

/// Certificate constants
class CertificateConstants {
  CertificateConstants._();

  /// Certificate validity period (in years)
  static const int validityYears = 99;

  /// Verification code length
  static const int verificationCodeLength = 12;

  /// QR code size (in pixels)
  static const int qrCodeSize = 200;
}

/// App-wide configuration
class AppConfig {
  AppConfig._();

  /// App name
  static const String appName = 'LearningHub';

  /// App version
  static const String appVersion = '1.0.0';

  /// Support email
  static const String supportEmail = 'support@learninghub.app';

  /// Privacy policy URL
  static const String privacyPolicyUrl = 'https://learninghub.app/privacy';

  /// Terms of service URL
  static const String termsOfServiceUrl = 'https://learninghub.app/terms';

  /// Certificate verification base URL
  static const String certificateVerifyUrl = 'https://learninghub.app/verify';
}
