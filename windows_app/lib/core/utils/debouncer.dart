import 'dart:async';

/// A reusable debouncer for rate-limiting rapid events
///
/// Usage:
/// ```dart
/// final debouncer = Debouncer(milliseconds: 300);
/// debouncer.run(() => searchApi(query));
/// ```
class Debouncer {
  final int milliseconds;
  Timer? _timer;

  Debouncer({this.milliseconds = 300});

  /// Run the action after the debounce period
  /// Cancels any pending action from a previous call
  void run(void Function() action) {
    _timer?.cancel();
    _timer = Timer(Duration(milliseconds: milliseconds), action);
  }

  /// Cancel any pending debounced action
  void cancel() {
    _timer?.cancel();
    _timer = null;
  }

  /// Whether a debounced action is currently pending
  bool get isPending => _timer?.isActive ?? false;

  /// Dispose the debouncer and cancel any pending actions
  void dispose() {
    cancel();
  }
}

/// A throttler that ensures an action runs at most once per interval
///
/// Unlike debouncer (which delays), throttler runs immediately
/// then blocks subsequent calls until the interval passes.
class Throttler {
  final int milliseconds;
  DateTime? _lastRun;

  Throttler({this.milliseconds = 300});

  /// Run the action if enough time has passed since the last run
  void run(void Function() action) {
    final now = DateTime.now();
    if (_lastRun == null ||
        now.difference(_lastRun!) >= Duration(milliseconds: milliseconds)) {
      _lastRun = now;
      action();
    }
  }

  /// Reset the throttler, allowing the next call to run immediately
  void reset() {
    _lastRun = null;
  }
}
