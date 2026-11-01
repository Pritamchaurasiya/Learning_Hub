import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Video quality setting
enum VideoQuality {
  auto,
  low, // 360p
  medium, // 480p
  high, // 720p
  ultra, // 1080p
}

extension VideoQualityExtension on VideoQuality {
  String get displayName {
    switch (this) {
      case VideoQuality.auto:
        return 'Auto';
      case VideoQuality.low:
        return '360p';
      case VideoQuality.medium:
        return '480p';
      case VideoQuality.high:
        return '720p';
      case VideoQuality.ultra:
        return '1080p';
    }
  }
}

/// Download quality setting
enum DownloadQuality {
  low, // ~50MB/hr
  medium, // ~150MB/hr
  high, // ~500MB/hr
}

extension DownloadQualityExtension on DownloadQuality {
  String get displayName {
    switch (this) {
      case DownloadQuality.low:
        return 'Low (~50MB/hr)';
      case DownloadQuality.medium:
        return 'Medium (~150MB/hr)';
      case DownloadQuality.high:
        return 'High (~500MB/hr)';
    }
  }
}

/// App preferences state
class PreferencesState {
  // Video settings
  final VideoQuality videoQuality;
  final double defaultPlaybackSpeed;
  final bool autoPlayNext;
  final bool showSubtitles;
  final String subtitleLanguage;

  // Download settings
  final DownloadQuality downloadQuality;
  final bool downloadOverWifiOnly;
  final bool autoDeleteCompleted;
  final int maxConcurrentDownloads;

  // Notification settings
  final bool studyReminders;
  final bool discussionNotifications;
  final bool achievementNotifications;
  final bool courseUpdates;
  final bool liveClassAlerts;
  final TimeOfDay? dailyReminderTime;

  // Learning settings
  final int dailyGoalMinutes;
  final bool focusModeEnabled;
  final bool showProgressOnHome;
  final bool enableGamification;

  // Accessibility
  final bool reducedMotion;
  final bool highContrast;
  final double textScale;
  final bool screenReaderOptimized;

  // Privacy & security
  final bool biometricLock;
  final bool showLearningActivity;
  final bool analyticsEnabled;

  // Appearance
  final ThemeMode themeMode;
  final bool useSystemFont;

  const PreferencesState({
    this.videoQuality = VideoQuality.auto,
    this.defaultPlaybackSpeed = 1.0,
    this.autoPlayNext = true,
    this.showSubtitles = false,
    this.subtitleLanguage = 'en',
    this.downloadQuality = DownloadQuality.medium,
    this.downloadOverWifiOnly = true,
    this.autoDeleteCompleted = false,
    this.maxConcurrentDownloads = 2,
    this.studyReminders = true,
    this.discussionNotifications = true,
    this.achievementNotifications = true,
    this.courseUpdates = true,
    this.liveClassAlerts = true,
    this.dailyReminderTime,
    this.dailyGoalMinutes = 30,
    this.focusModeEnabled = false,
    this.showProgressOnHome = true,
    this.enableGamification = true,
    this.reducedMotion = false,
    this.highContrast = false,
    this.textScale = 1.0,
    this.screenReaderOptimized = false,
    this.biometricLock = false,
    this.showLearningActivity = true,
    this.analyticsEnabled = true,
    this.themeMode = ThemeMode.system,
    this.useSystemFont = true,
  });

  PreferencesState copyWith({
    VideoQuality? videoQuality,
    double? defaultPlaybackSpeed,
    bool? autoPlayNext,
    bool? showSubtitles,
    String? subtitleLanguage,
    DownloadQuality? downloadQuality,
    bool? downloadOverWifiOnly,
    bool? autoDeleteCompleted,
    int? maxConcurrentDownloads,
    bool? studyReminders,
    bool? discussionNotifications,
    bool? achievementNotifications,
    bool? courseUpdates,
    bool? liveClassAlerts,
    TimeOfDay? dailyReminderTime,
    int? dailyGoalMinutes,
    bool? focusModeEnabled,
    bool? showProgressOnHome,
    bool? enableGamification,
    bool? reducedMotion,
    bool? highContrast,
    double? textScale,
    bool? screenReaderOptimized,
    bool? biometricLock,
    bool? showLearningActivity,
    bool? analyticsEnabled,
    ThemeMode? themeMode,
    bool? useSystemFont,
  }) {
    return PreferencesState(
      videoQuality: videoQuality ?? this.videoQuality,
      defaultPlaybackSpeed: defaultPlaybackSpeed ?? this.defaultPlaybackSpeed,
      autoPlayNext: autoPlayNext ?? this.autoPlayNext,
      showSubtitles: showSubtitles ?? this.showSubtitles,
      subtitleLanguage: subtitleLanguage ?? this.subtitleLanguage,
      downloadQuality: downloadQuality ?? this.downloadQuality,
      downloadOverWifiOnly: downloadOverWifiOnly ?? this.downloadOverWifiOnly,
      autoDeleteCompleted: autoDeleteCompleted ?? this.autoDeleteCompleted,
      maxConcurrentDownloads:
          maxConcurrentDownloads ?? this.maxConcurrentDownloads,
      studyReminders: studyReminders ?? this.studyReminders,
      discussionNotifications:
          discussionNotifications ?? this.discussionNotifications,
      achievementNotifications:
          achievementNotifications ?? this.achievementNotifications,
      courseUpdates: courseUpdates ?? this.courseUpdates,
      liveClassAlerts: liveClassAlerts ?? this.liveClassAlerts,
      dailyReminderTime: dailyReminderTime ?? this.dailyReminderTime,
      dailyGoalMinutes: dailyGoalMinutes ?? this.dailyGoalMinutes,
      focusModeEnabled: focusModeEnabled ?? this.focusModeEnabled,
      showProgressOnHome: showProgressOnHome ?? this.showProgressOnHome,
      enableGamification: enableGamification ?? this.enableGamification,
      reducedMotion: reducedMotion ?? this.reducedMotion,
      highContrast: highContrast ?? this.highContrast,
      textScale: textScale ?? this.textScale,
      screenReaderOptimized:
          screenReaderOptimized ?? this.screenReaderOptimized,
      biometricLock: biometricLock ?? this.biometricLock,
      showLearningActivity: showLearningActivity ?? this.showLearningActivity,
      analyticsEnabled: analyticsEnabled ?? this.analyticsEnabled,
      themeMode: themeMode ?? this.themeMode,
      useSystemFont: useSystemFont ?? this.useSystemFont,
    );
  }

  Map<String, dynamic> toJson() => {
        'videoQuality': videoQuality.index,
        'defaultPlaybackSpeed': defaultPlaybackSpeed,
        'autoPlayNext': autoPlayNext,
        'showSubtitles': showSubtitles,
        'subtitleLanguage': subtitleLanguage,
        'downloadQuality': downloadQuality.index,
        'downloadOverWifiOnly': downloadOverWifiOnly,
        'autoDeleteCompleted': autoDeleteCompleted,
        'maxConcurrentDownloads': maxConcurrentDownloads,
        'studyReminders': studyReminders,
        'discussionNotifications': discussionNotifications,
        'achievementNotifications': achievementNotifications,
        'courseUpdates': courseUpdates,
        'liveClassAlerts': liveClassAlerts,
        'dailyReminderTimeHour': dailyReminderTime?.hour,
        'dailyReminderTimeMinute': dailyReminderTime?.minute,
        'dailyGoalMinutes': dailyGoalMinutes,
        'focusModeEnabled': focusModeEnabled,
        'showProgressOnHome': showProgressOnHome,
        'enableGamification': enableGamification,
        'reducedMotion': reducedMotion,
        'highContrast': highContrast,
        'textScale': textScale,
        'screenReaderOptimized': screenReaderOptimized,
        'biometricLock': biometricLock,
        'showLearningActivity': showLearningActivity,
        'analyticsEnabled': analyticsEnabled,
        'themeMode': themeMode.index,
        'useSystemFont': useSystemFont,
      };

  factory PreferencesState.fromJson(Map<String, dynamic> json) {
    TimeOfDay? reminderTime;
    if (json['dailyReminderTimeHour'] != null) {
      reminderTime = TimeOfDay(
        hour: json['dailyReminderTimeHour'] as int,
        minute: json['dailyReminderTimeMinute'] as int? ?? 0,
      );
    }

    return PreferencesState(
      videoQuality: VideoQuality.values[json['videoQuality'] as int? ?? 0],
      defaultPlaybackSpeed:
          (json['defaultPlaybackSpeed'] as num?)?.toDouble() ?? 1.0,
      autoPlayNext: json['autoPlayNext'] as bool? ?? true,
      showSubtitles: json['showSubtitles'] as bool? ?? false,
      subtitleLanguage: json['subtitleLanguage'] as String? ?? 'en',
      downloadQuality:
          DownloadQuality.values[json['downloadQuality'] as int? ?? 1],
      downloadOverWifiOnly: json['downloadOverWifiOnly'] as bool? ?? true,
      autoDeleteCompleted: json['autoDeleteCompleted'] as bool? ?? false,
      maxConcurrentDownloads: json['maxConcurrentDownloads'] as int? ?? 2,
      studyReminders: json['studyReminders'] as bool? ?? true,
      discussionNotifications: json['discussionNotifications'] as bool? ?? true,
      achievementNotifications:
          json['achievementNotifications'] as bool? ?? true,
      courseUpdates: json['courseUpdates'] as bool? ?? true,
      liveClassAlerts: json['liveClassAlerts'] as bool? ?? true,
      dailyReminderTime: reminderTime,
      dailyGoalMinutes: json['dailyGoalMinutes'] as int? ?? 30,
      focusModeEnabled: json['focusModeEnabled'] as bool? ?? false,
      showProgressOnHome: json['showProgressOnHome'] as bool? ?? true,
      enableGamification: json['enableGamification'] as bool? ?? true,
      reducedMotion: json['reducedMotion'] as bool? ?? false,
      highContrast: json['highContrast'] as bool? ?? false,
      textScale: (json['textScale'] as num?)?.toDouble() ?? 1.0,
      screenReaderOptimized: json['screenReaderOptimized'] as bool? ?? false,
      biometricLock: json['biometricLock'] as bool? ?? false,
      showLearningActivity: json['showLearningActivity'] as bool? ?? true,
      analyticsEnabled: json['analyticsEnabled'] as bool? ?? true,
      themeMode: ThemeMode.values[json['themeMode'] as int? ?? 0],
      useSystemFont: json['useSystemFont'] as bool? ?? true,
    );
  }
}

/// Preferences notifier
class PreferencesNotifier extends StateNotifier<PreferencesState> {
  PreferencesNotifier() : super(const PreferencesState()) {
    _loadPreferences();
  }

  static const String _prefsKey = 'app_preferences';

  Future<void> _loadPreferences() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = prefs.getString(_prefsKey);

      if (json != null) {
        state = PreferencesState.fromJson(
          jsonDecode(json) as Map<String, dynamic>,
        );
      }
    } catch (e) {
      // Keep defaults
    }
  }

  Future<void> _savePreferences() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefsKey, jsonEncode(state.toJson()));
    } catch (e) {
      // Handle silently
    }
  }

  // Video settings
  Future<void> setVideoQuality(VideoQuality quality) async {
    state = state.copyWith(videoQuality: quality);
    await _savePreferences();
  }

  Future<void> setPlaybackSpeed(double speed) async {
    state = state.copyWith(defaultPlaybackSpeed: speed);
    await _savePreferences();
  }

  Future<void> setAutoPlayNext(bool enabled) async {
    state = state.copyWith(autoPlayNext: enabled);
    await _savePreferences();
  }

  Future<void> setShowSubtitles(bool show) async {
    state = state.copyWith(showSubtitles: show);
    await _savePreferences();
  }

  // Download settings
  Future<void> setDownloadQuality(DownloadQuality quality) async {
    state = state.copyWith(downloadQuality: quality);
    await _savePreferences();
  }

  Future<void> setDownloadOverWifiOnly(bool wifiOnly) async {
    state = state.copyWith(downloadOverWifiOnly: wifiOnly);
    await _savePreferences();
  }

  // Notification settings
  Future<void> setStudyReminders(bool enabled) async {
    state = state.copyWith(studyReminders: enabled);
    await _savePreferences();
  }

  Future<void> setDiscussionNotifications(bool enabled) async {
    state = state.copyWith(discussionNotifications: enabled);
    await _savePreferences();
  }

  Future<void> setAchievementNotifications(bool enabled) async {
    state = state.copyWith(achievementNotifications: enabled);
    await _savePreferences();
  }

  Future<void> setDailyReminderTime(TimeOfDay? time) async {
    state = state.copyWith(dailyReminderTime: time);
    await _savePreferences();
  }

  // Learning settings
  Future<void> setDailyGoalMinutes(int minutes) async {
    state = state.copyWith(dailyGoalMinutes: minutes);
    await _savePreferences();
  }

  Future<void> setFocusModeEnabled(bool enabled) async {
    state = state.copyWith(focusModeEnabled: enabled);
    await _savePreferences();
  }

  Future<void> setEnableGamification(bool enabled) async {
    state = state.copyWith(enableGamification: enabled);
    await _savePreferences();
  }

  // Accessibility
  Future<void> setReducedMotion(bool reduced) async {
    state = state.copyWith(reducedMotion: reduced);
    await _savePreferences();
  }

  Future<void> setHighContrast(bool enabled) async {
    state = state.copyWith(highContrast: enabled);
    await _savePreferences();
  }

  Future<void> setTextScale(double scale) async {
    state = state.copyWith(textScale: scale.clamp(0.8, 1.5));
    await _savePreferences();
  }

  // Privacy & security
  Future<void> setBiometricLock(bool enabled) async {
    state = state.copyWith(biometricLock: enabled);
    await _savePreferences();
  }

  Future<void> setAnalyticsEnabled(bool enabled) async {
    state = state.copyWith(analyticsEnabled: enabled);
    await _savePreferences();
  }

  // Appearance
  Future<void> setThemeMode(ThemeMode mode) async {
    state = state.copyWith(themeMode: mode);
    await _savePreferences();
  }

  // Reset all preferences
  Future<void> resetToDefaults() async {
    state = const PreferencesState();
    await _savePreferences();
  }
}

/// Preferences provider
final preferencesProvider =
    StateNotifierProvider<PreferencesNotifier, PreferencesState>((ref) {
  return PreferencesNotifier();
});

/// Theme mode provider
final themeModeProvider = Provider<ThemeMode>((ref) {
  return ref.watch(preferencesProvider).themeMode;
});

/// Text scale provider
final textScaleProvider = Provider<double>((ref) {
  return ref.watch(preferencesProvider).textScale;
});

/// Reduced motion provider
final reducedMotionProvider = Provider<bool>((ref) {
  return ref.watch(preferencesProvider).reducedMotion;
});
