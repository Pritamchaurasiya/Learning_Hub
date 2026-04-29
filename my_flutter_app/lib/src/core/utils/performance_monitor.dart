import 'dart:async';
import 'package:flutter/foundation.dart';

class PerformanceMonitor {
  factory PerformanceMonitor() => _instance;
  PerformanceMonitor._internal();
  static final PerformanceMonitor _instance = PerformanceMonitor._internal();

  final Map<String, int> _traces = {};

  // Stream for real-time updates
  final _logController = StreamController<String>.broadcast();
  Stream<String> get logStream => _logController.stream;

  void startTrace(String name) {
    _traces[name] = DateTime.now().millisecondsSinceEpoch;
    _log('⚡ Started: $name');
  }

  void stopTrace(String name) {
    final startTime = _traces[name];
    if (startTime != null) {
      final duration = DateTime.now().millisecondsSinceEpoch - startTime;
      _log('✅ Completed: $name in ${duration}ms');
      _traces.remove(name);
    } else {
      _log('⚠️ Warning: Trace $name stopped but never started.');
    }
  }

  void log(String message) {
    _log('ℹ️ $message');
  }

  void _log(String message) {
    debugPrint('[Perf] $message');
    _logController.add(message);
  }
}
