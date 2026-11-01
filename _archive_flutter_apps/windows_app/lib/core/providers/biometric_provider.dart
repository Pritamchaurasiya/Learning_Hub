import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/biometric_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

class BiometricState {
  final bool isAvailable;
  final bool isEnabled;
  final bool isAuthenticated;

  BiometricState({
    this.isAvailable = false,
    this.isEnabled = false,
    this.isAuthenticated = false,
  });

  BiometricState copyWith({
    bool? isAvailable,
    bool? isEnabled,
    bool? isAuthenticated,
  }) {
    return BiometricState(
      isAvailable: isAvailable ?? this.isAvailable,
      isEnabled: isEnabled ?? this.isEnabled,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
    );
  }
}

class BiometricNotifier extends Notifier<BiometricState> {
  final BiometricService _service = BiometricService.instance;

  @override
  BiometricState build() {
    _init();
    return BiometricState();
  }

  Future<void> _init() async {
    final available = await _service.canCheckBiometrics;
    final prefs = await SharedPreferences.getInstance();
    final enabled = prefs.getBool('biometrics_enabled') ?? false;

    state = state.copyWith(
      isAvailable: available,
      isEnabled: enabled,
    );
  }

  Future<void> toggleBiometrics(bool value) async {
    if (value) {
      // Authenticate to enable
      final success = await _service.authenticate(
          reason: 'Authenticate to enable biometrics');
      if (success) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setBool('biometrics_enabled', true);
        state = state.copyWith(isEnabled: true);
      }
    } else {
      // Disable
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('biometrics_enabled', false);
      state = state.copyWith(isEnabled: false);
    }
  }

  Future<bool> authenticateUser() async {
    if (!state.isEnabled || !state.isAvailable) {
      return true; // Pass if not enabled
    }

    final success =
        await _service.authenticate(reason: 'Authenticate to access app');
    state = state.copyWith(isAuthenticated: success);
    return success;
  }
}

final biometricProvider =
    NotifierProvider<BiometricNotifier, BiometricState>(() {
  return BiometricNotifier();
});
