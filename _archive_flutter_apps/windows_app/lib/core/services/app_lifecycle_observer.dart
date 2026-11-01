import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

/// App lifecycle observer for managing background/foreground transitions
///
/// Handles:
/// - Auto-pause/resume operations on background/foreground
/// - Session time tracking
/// - State preservation on app pause
class AppLifecycleObserver extends WidgetsBindingObserver {
  static AppLifecycleObserver? _instance;
  static AppLifecycleObserver get instance =>
      _instance ??= AppLifecycleObserver._();

  AppLifecycleObserver._();

  DateTime? _sessionStart;
  Duration _totalSessionTime = Duration.zero;
  final List<VoidCallback> _onPauseCallbacks = [];
  final List<VoidCallback> _onResumeCallbacks = [];
  AppLifecycleState _lastState = AppLifecycleState.resumed;

  /// Register this observer with WidgetsBinding
  void register() {
    final binding = WidgetsBinding.instance;
    binding.addObserver(this);
    _sessionStart = DateTime.now();
    if (kDebugMode) {
      debugPrint('[Lifecycle] Observer registered, session started');
    }
  }

  /// Unregister this observer
  void unregister() {
    WidgetsBinding.instance.removeObserver(this);
    _updateSessionTime();
    if (kDebugMode) {
      debugPrint(
          '[Lifecycle] Observer unregistered. Total session: $_totalSessionTime');
    }
  }

  /// Add a callback to run when app goes to background
  void addOnPause(VoidCallback callback) => _onPauseCallbacks.add(callback);

  /// Add a callback to run when app returns to foreground
  void addOnResume(VoidCallback callback) => _onResumeCallbacks.add(callback);

  /// Remove a specific pause callback
  void removeOnPause(VoidCallback callback) =>
      _onPauseCallbacks.remove(callback);

  /// Remove a specific resume callback
  void removeOnResume(VoidCallback callback) =>
      _onResumeCallbacks.remove(callback);

  /// Get the current session duration
  Duration get currentSessionDuration {
    if (_sessionStart == null) return _totalSessionTime;
    return _totalSessionTime + DateTime.now().difference(_sessionStart!);
  }

  /// Get the last known lifecycle state
  AppLifecycleState get lastState => _lastState;

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _lastState = state;
    switch (state) {
      case AppLifecycleState.paused:
      case AppLifecycleState.hidden:
        _onAppPaused();
      case AppLifecycleState.resumed:
        _onAppResumed();
      case AppLifecycleState.detached:
        _onAppDetached();
      case AppLifecycleState.inactive:
        break; // Transient state, ignore
    }
  }

  void _onAppPaused() {
    _updateSessionTime();
    if (kDebugMode) {
      debugPrint('[Lifecycle] App paused. Session so far: $_totalSessionTime');
    }
    for (final callback in _onPauseCallbacks) {
      try {
        callback();
      } catch (e) {
        if (kDebugMode) debugPrint('[Lifecycle] Pause callback error: $e');
      }
    }
  }

  void _onAppResumed() {
    _sessionStart = DateTime.now();
    if (kDebugMode) {
      debugPrint('[Lifecycle] App resumed. Restarting session timer.');
    }
    for (final callback in _onResumeCallbacks) {
      try {
        callback();
      } catch (e) {
        if (kDebugMode) debugPrint('[Lifecycle] Resume callback error: $e');
      }
    }
  }

  void _onAppDetached() {
    _updateSessionTime();
    if (kDebugMode) {
      debugPrint('[Lifecycle] App detached. Total session: $_totalSessionTime');
    }
  }

  void _updateSessionTime() {
    if (_sessionStart != null) {
      _totalSessionTime += DateTime.now().difference(_sessionStart!);
      _sessionStart = null;
    }
  }
}
