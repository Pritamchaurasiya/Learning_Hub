import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

// Provider that asynchronously loads SharedPreferences
final sharedPreferencesProvider =
    FutureProvider<SharedPreferences>((ref) async {
  return SharedPreferences.getInstance();
});

class UserSettings {
  UserSettings({
    this.isDarkMode = true,
    this.notificationsEnabled = true,
    this.language = 'English (US)',
  });

  final bool isDarkMode;
  final bool notificationsEnabled;
  final String language;

  UserSettings copyWith({
    bool? isDarkMode,
    bool? notificationsEnabled,
    String? language,
  }) {
    return UserSettings(
      isDarkMode: isDarkMode ?? this.isDarkMode,
      notificationsEnabled: notificationsEnabled ?? this.notificationsEnabled,
      language: language ?? this.language,
    );
  }
}

class SettingsNotifier extends StateNotifier<AsyncValue<UserSettings>> {
  SettingsNotifier(this.ref) : super(const AsyncLoading()) {
    _init();
  }

  final Ref ref;
  late SharedPreferences _prefs;

  Future<void> _init() async {
    try {
      _prefs = await ref.watch(sharedPreferencesProvider.future);
      state = AsyncData(UserSettings(
        isDarkMode:
            _prefs.getBool('isDarkMode') ?? true, // Default to dark mode
        notificationsEnabled: _prefs.getBool('notificationsEnabled') ?? true,
        language: _prefs.getString('language') ?? 'English (US)',
      ));
    } on Exception catch (e, st) {
      state = AsyncError(e, st);
    }
  }

  Future<void> toggleDarkMode({required bool value}) async {
    final currentState = state.valueOrNull;
    if (currentState != null) {
      await _prefs.setBool('isDarkMode', value);
      state = AsyncData(currentState.copyWith(isDarkMode: value));
    }
  }

  Future<void> toggleNotifications({required bool value}) async {
    final currentState = state.valueOrNull;
    if (currentState != null) {
      await _prefs.setBool('notificationsEnabled', value);
      state = AsyncData(currentState.copyWith(notificationsEnabled: value));
    }
  }

  Future<void> setLanguage(String lang) async {
    final currentState = state.valueOrNull;
    if (currentState != null) {
      await _prefs.setString('language', lang);
      state = AsyncData(currentState.copyWith(language: lang));
    }
  }
}

final settingsProvider =
    StateNotifierProvider<SettingsNotifier, AsyncValue<UserSettings>>((ref) {
  return SettingsNotifier(ref);
});
