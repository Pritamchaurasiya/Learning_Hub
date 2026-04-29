import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Persistent settings model backed by SharedPreferences.
class AppSettings {
  final bool autoDownload;
  final bool autoplay;
  final bool pushNotifications;
  final bool streakReminders;
  final bool promotions;
  final bool analyticsEnabled;
  final double playbackSpeed;
  final String videoQuality;
  final String subtitleLanguage;

  const AppSettings({
    this.autoDownload = true,
    this.autoplay = true,
    this.pushNotifications = true,
    this.streakReminders = true,
    this.promotions = false,
    this.analyticsEnabled = true,
    this.playbackSpeed = 1.0,
    this.videoQuality = 'Auto',
    this.subtitleLanguage = 'English',
  });

  AppSettings copyWith({
    bool? autoDownload,
    bool? autoplay,
    bool? pushNotifications,
    bool? streakReminders,
    bool? promotions,
    bool? analyticsEnabled,
    double? playbackSpeed,
    String? videoQuality,
    String? subtitleLanguage,
  }) {
    return AppSettings(
      autoDownload: autoDownload ?? this.autoDownload,
      autoplay: autoplay ?? this.autoplay,
      pushNotifications: pushNotifications ?? this.pushNotifications,
      streakReminders: streakReminders ?? this.streakReminders,
      promotions: promotions ?? this.promotions,
      analyticsEnabled: analyticsEnabled ?? this.analyticsEnabled,
      playbackSpeed: playbackSpeed ?? this.playbackSpeed,
      videoQuality: videoQuality ?? this.videoQuality,
      subtitleLanguage: subtitleLanguage ?? this.subtitleLanguage,
    );
  }
}

/// Notifier that persists settings to SharedPreferences.
class AppSettingsNotifier extends StateNotifier<AppSettings> {
  AppSettingsNotifier() : super(const AppSettings()) {
    _load();
  }

  static const _prefix = 'settings_';

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    state = AppSettings(
      autoDownload: prefs.getBool('${_prefix}autoDownload') ?? true,
      autoplay: prefs.getBool('${_prefix}autoplay') ?? true,
      pushNotifications: prefs.getBool('${_prefix}pushNotifications') ?? true,
      streakReminders: prefs.getBool('${_prefix}streakReminders') ?? true,
      promotions: prefs.getBool('${_prefix}promotions') ?? false,
      analyticsEnabled: prefs.getBool('${_prefix}analyticsEnabled') ?? true,
      playbackSpeed: prefs.getDouble('${_prefix}playbackSpeed') ?? 1.0,
      videoQuality: prefs.getString('${_prefix}videoQuality') ?? 'Auto',
      subtitleLanguage:
          prefs.getString('${_prefix}subtitleLanguage') ?? 'English',
    );
  }

  Future<void> _saveBool(String key, bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('$_prefix$key', value);
  }

  Future<void> _saveDouble(String key, double value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble('$_prefix$key', value);
  }

  Future<void> _saveString(String key, String value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('$_prefix$key', value);
  }

  void setAutoDownload(bool value) {
    state = state.copyWith(autoDownload: value);
    _saveBool('autoDownload', value);
  }

  void setAutoplay(bool value) {
    state = state.copyWith(autoplay: value);
    _saveBool('autoplay', value);
  }

  void setPushNotifications(bool value) {
    state = state.copyWith(pushNotifications: value);
    _saveBool('pushNotifications', value);
  }

  void setStreakReminders(bool value) {
    state = state.copyWith(streakReminders: value);
    _saveBool('streakReminders', value);
  }

  void setPromotions(bool value) {
    state = state.copyWith(promotions: value);
    _saveBool('promotions', value);
  }

  void setAnalyticsEnabled(bool value) {
    state = state.copyWith(analyticsEnabled: value);
    _saveBool('analyticsEnabled', value);
  }

  void setPlaybackSpeed(double value) {
    state = state.copyWith(playbackSpeed: value);
    _saveDouble('playbackSpeed', value);
  }

  void setVideoQuality(String value) {
    state = state.copyWith(videoQuality: value);
    _saveString('videoQuality', value);
  }

  void setSubtitleLanguage(String value) {
    state = state.copyWith(subtitleLanguage: value);
    _saveString('subtitleLanguage', value);
  }
}

/// Provider for app settings.
final appSettingsProvider =
    StateNotifierProvider<AppSettingsNotifier, AppSettings>((ref) {
  return AppSettingsNotifier();
});
