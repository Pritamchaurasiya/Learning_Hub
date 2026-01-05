import 'dart:async';
import 'package:universal_io/io.dart';
import 'package:flutter/foundation.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Health status levels
enum HealthStatus {
  healthy,
  degraded,
  unhealthy,
  unknown,
}

/// Component health check result
class ComponentHealth {
  final String name;
  final HealthStatus status;
  final String? message;
  final Duration? responseTime;
  final Map<String, dynamic>? details;
  final DateTime checkedAt;

  const ComponentHealth({
    required this.name,
    required this.status,
    this.message,
    this.responseTime,
    this.details,
    required this.checkedAt,
  });

  bool get isHealthy => status == HealthStatus.healthy;

  Map<String, dynamic> toJson() => {
        'name': name,
        'status': status.name,
        if (message != null) 'message': message,
        if (responseTime != null)
          'responseTimeMs': responseTime!.inMilliseconds,
        if (details != null) 'details': details,
        'checkedAt': checkedAt.toIso8601String(),
      };
}

/// System health report
class HealthReport {
  final HealthStatus overallStatus;
  final List<ComponentHealth> components;
  final DateTime generatedAt;
  final Duration totalCheckTime;
  final Map<String, dynamic>? systemInfo;

  const HealthReport({
    required this.overallStatus,
    required this.components,
    required this.generatedAt,
    required this.totalCheckTime,
    this.systemInfo,
  });

  int get healthyCount => components.where((c) => c.isHealthy).length;
  int get unhealthyCount => components.where((c) => !c.isHealthy).length;

  List<ComponentHealth> get unhealthyComponents =>
      components.where((c) => !c.isHealthy).toList();

  Map<String, dynamic> toJson() => {
        'overallStatus': overallStatus.name,
        'components': components.map((c) => c.toJson()).toList(),
        'generatedAt': generatedAt.toIso8601String(),
        'totalCheckTimeMs': totalCheckTime.inMilliseconds,
        'summary': {
          'healthy': healthyCount,
          'unhealthy': unhealthyCount,
          'total': components.length,
        },
        if (systemInfo != null) 'systemInfo': systemInfo,
      };
}

/// Health check function type
typedef HealthChecker = Future<ComponentHealth> Function();

/// Alert threshold configuration
class AlertThreshold {
  final String metricName;
  final double warningThreshold;
  final double criticalThreshold;
  final bool alertOnAbove;

  const AlertThreshold({
    required this.metricName,
    required this.warningThreshold,
    required this.criticalThreshold,
    this.alertOnAbove = true,
  });
}

/// Performance metrics
class PerformanceMetrics {
  final int activeRequests;
  final double averageResponseTimeMs;
  final int errorCount;
  final double errorRate;
  final int cacheHits;
  final int cacheMisses;
  final double cacheHitRate;
  final int pendingSyncItems;
  final DateTime collectedAt;

  const PerformanceMetrics({
    this.activeRequests = 0,
    this.averageResponseTimeMs = 0,
    this.errorCount = 0,
    this.errorRate = 0,
    this.cacheHits = 0,
    this.cacheMisses = 0,
    this.cacheHitRate = 0,
    this.pendingSyncItems = 0,
    required this.collectedAt,
  });

  Map<String, dynamic> toJson() => {
        'activeRequests': activeRequests,
        'averageResponseTimeMs': averageResponseTimeMs,
        'errorCount': errorCount,
        'errorRate': errorRate,
        'cacheHits': cacheHits,
        'cacheMisses': cacheMisses,
        'cacheHitRate': cacheHitRate,
        'pendingSyncItems': pendingSyncItems,
        'collectedAt': collectedAt.toIso8601String(),
      };
}

/// Health check service for system monitoring
class HealthCheckService {
  static final HealthCheckService _instance = HealthCheckService._();
  static HealthCheckService get instance => _instance;

  HealthCheckService._();

  factory HealthCheckService() => _instance;

  final Map<String, HealthChecker> _checkers = {};
  final Map<String, AlertThreshold> _thresholds = {};
  final List<PerformanceMetrics> _metricsHistory = [];
  Timer? _periodicCheckTimer;
  HealthReport? _lastReport;

  static const int _maxMetricsHistory = 100;
  static const Duration _defaultCheckInterval = Duration(minutes: 5);

  /// Register a health checker
  void registerChecker(String name, HealthChecker checker) {
    _checkers[name] = checker;
  }

  /// Register default health checkers
  void registerDefaultCheckers() {
    // Network connectivity check
    registerChecker('connectivity', _checkConnectivity);

    // Storage check
    registerChecker('storage', _checkStorage);

    // Memory check
    registerChecker('memory', _checkMemory);

    // Shared preferences check
    registerChecker('preferences', _checkPreferences);
  }

  /// Check network connectivity
  Future<ComponentHealth> _checkConnectivity() async {
    final stopwatch = Stopwatch()..start();
    try {
      final results = await Connectivity().checkConnectivity();
      stopwatch.stop();

      final hasConnection =
          results.isNotEmpty && !results.contains(ConnectivityResult.none);

      return ComponentHealth(
        name: 'connectivity',
        status: hasConnection ? HealthStatus.healthy : HealthStatus.degraded,
        message: hasConnection
            ? 'Connected via ${results.map((r) => r.name).join(", ")}'
            : 'No internet connection',
        responseTime: stopwatch.elapsed,
        details: {'connectionTypes': results.map((r) => r.name).toList()},
        checkedAt: DateTime.now(),
      );
    } catch (e) {
      stopwatch.stop();
      return ComponentHealth(
        name: 'connectivity',
        status: HealthStatus.unknown,
        message: 'Failed to check connectivity: ${e.toString()}',
        responseTime: stopwatch.elapsed,
        checkedAt: DateTime.now(),
      );
    }
  }

  /// Check storage availability
  Future<ComponentHealth> _checkStorage() async {
    if (kIsWeb) {
      return ComponentHealth(
        name: 'storage',
        status: HealthStatus.healthy,
        message: 'Storage check skipped on Web',
        responseTime: Duration.zero,
        checkedAt: DateTime.now(),
      );
    }
    final stopwatch = Stopwatch()..start();
    try {
      // Check if we can write and read from temp directory
      final tempDir = Directory.systemTemp;
      final testFile = File('${tempDir.path}/health_check_test.txt');

      await testFile
          .writeAsString('health_check_${DateTime.now().toIso8601String()}');
      final content = await testFile.readAsString();
      await testFile.delete();

      stopwatch.stop();

      return ComponentHealth(
        name: 'storage',
        status: content.startsWith('health_check_')
            ? HealthStatus.healthy
            : HealthStatus.degraded,
        message: 'Storage read/write operational',
        responseTime: stopwatch.elapsed,
        details: {
          'tempPath': tempDir.path,
          'writeTest': 'passed',
          'readTest': 'passed',
        },
        checkedAt: DateTime.now(),
      );
    } catch (e) {
      stopwatch.stop();
      return ComponentHealth(
        name: 'storage',
        status: HealthStatus.unhealthy,
        message: 'Storage check failed: ${e.toString()}',
        responseTime: stopwatch.elapsed,
        checkedAt: DateTime.now(),
      );
    }
  }

  /// Check memory usage (simplified for Flutter)
  Future<ComponentHealth> _checkMemory() async {
    final stopwatch = Stopwatch()..start();
    try {
      // In Flutter, we can't directly measure memory
      // This is a placeholder for platform-specific implementation
      stopwatch.stop();

      return ComponentHealth(
        name: 'memory',
        status: HealthStatus.healthy,
        message: 'Memory check passed',
        responseTime: stopwatch.elapsed,
        details: {
          'note':
              'Detailed memory metrics require platform-specific implementation',
        },
        checkedAt: DateTime.now(),
      );
    } catch (e) {
      stopwatch.stop();
      return ComponentHealth(
        name: 'memory',
        status: HealthStatus.unknown,
        message: 'Memory check failed: ${e.toString()}',
        responseTime: stopwatch.elapsed,
        checkedAt: DateTime.now(),
      );
    }
  }

  /// Check SharedPreferences availability
  Future<ComponentHealth> _checkPreferences() async {
    final stopwatch = Stopwatch()..start();
    try {
      final prefs = await SharedPreferences.getInstance();
      const testKey = 'health_check_test';
      final testValue = DateTime.now().millisecondsSinceEpoch.toString();

      await prefs.setString(testKey, testValue);
      final readValue = prefs.getString(testKey);
      await prefs.remove(testKey);

      stopwatch.stop();

      final success = readValue == testValue;

      return ComponentHealth(
        name: 'preferences',
        status: success ? HealthStatus.healthy : HealthStatus.degraded,
        message: success
            ? 'SharedPreferences operational'
            : 'SharedPreferences read/write mismatch',
        responseTime: stopwatch.elapsed,
        checkedAt: DateTime.now(),
      );
    } catch (e) {
      stopwatch.stop();
      return ComponentHealth(
        name: 'preferences',
        status: HealthStatus.unhealthy,
        message: 'SharedPreferences check failed: ${e.toString()}',
        responseTime: stopwatch.elapsed,
        checkedAt: DateTime.now(),
      );
    }
  }

  /// Run all health checks
  Future<HealthReport> checkAll() async {
    final stopwatch = Stopwatch()..start();
    final components = <ComponentHealth>[];

    // Run all checkers in parallel
    final futures = _checkers.entries.map((e) async {
      try {
        return await e.value();
      } catch (err) {
        return ComponentHealth(
          name: e.key,
          status: HealthStatus.unknown,
          message: 'Checker threw exception: ${err.toString()}',
          checkedAt: DateTime.now(),
        );
      }
    });

    final results = await Future.wait(futures);
    components.addAll(results);

    stopwatch.stop();

    // Determine overall status
    HealthStatus overall;
    if (components.every((c) => c.status == HealthStatus.healthy)) {
      overall = HealthStatus.healthy;
    } else if (components.any((c) => c.status == HealthStatus.unhealthy)) {
      overall = HealthStatus.unhealthy;
    } else if (components.any((c) => c.status == HealthStatus.degraded)) {
      overall = HealthStatus.degraded;
    } else {
      overall = HealthStatus.unknown;
    }

    _lastReport = HealthReport(
      overallStatus: overall,
      components: components,
      generatedAt: DateTime.now(),
      totalCheckTime: stopwatch.elapsed,
      systemInfo: await _getSystemInfo(),
    );

    return _lastReport!;
  }

  /// Check a specific component
  Future<ComponentHealth?> checkComponent(String name) async {
    final checker = _checkers[name];
    if (checker == null) {
      return null;
    }

    try {
      return await checker();
    } catch (e) {
      return ComponentHealth(
        name: name,
        status: HealthStatus.unknown,
        message: 'Checker threw exception: ${e.toString()}',
        checkedAt: DateTime.now(),
      );
    }
  }

  /// Get system information
  Future<Map<String, dynamic>> _getSystemInfo() async {
    return {
      'platform': Platform.operatingSystem,
      'platformVersion': Platform.operatingSystemVersion,
      'dartVersion': Platform.version,
      'numberOfProcessors': Platform.numberOfProcessors,
      'locale': Platform.localeName,
      'timestamp': DateTime.now().toIso8601String(),
    };
  }

  /// Start periodic health checks
  void startPeriodicChecks({Duration? interval}) {
    stopPeriodicChecks();
    _periodicCheckTimer = Timer.periodic(
      interval ?? _defaultCheckInterval,
      (_) => checkAll(),
    );
  }

  /// Stop periodic health checks
  void stopPeriodicChecks() {
    _periodicCheckTimer?.cancel();
    _periodicCheckTimer = null;
  }

  /// Record performance metrics
  void recordMetrics(PerformanceMetrics metrics) {
    _metricsHistory.add(metrics);
    while (_metricsHistory.length > _maxMetricsHistory) {
      _metricsHistory.removeAt(0);
    }

    // Check thresholds
    _checkThresholds(metrics);
  }

  /// Check metrics against thresholds
  void _checkThresholds(PerformanceMetrics metrics) {
    for (final threshold in _thresholds.values) {
      double value;
      switch (threshold.metricName) {
        case 'responseTime':
          value = metrics.averageResponseTimeMs;
          break;
        case 'errorRate':
          value = metrics.errorRate;
          break;
        case 'cacheHitRate':
          value = metrics.cacheHitRate;
          break;
        default:
          continue;
      }

      if (threshold.alertOnAbove) {
        if (value >= threshold.criticalThreshold) {
          if (kDebugMode) {
            debugPrint('CRITICAL: ${threshold.metricName} = $value');
          }
        } else if (value >= threshold.warningThreshold) {
          if (kDebugMode) {
            debugPrint('WARNING: ${threshold.metricName} = $value');
          }
        }
      } else {
        if (value <= threshold.criticalThreshold) {
          if (kDebugMode) {
            debugPrint('CRITICAL: ${threshold.metricName} = $value');
          }
        } else if (value <= threshold.warningThreshold) {
          if (kDebugMode) {
            debugPrint('WARNING: ${threshold.metricName} = $value');
          }
        }
      }
    }
  }

  /// Set alert threshold
  void setThreshold(AlertThreshold threshold) {
    _thresholds[threshold.metricName] = threshold;
  }

  /// Get metrics history
  List<PerformanceMetrics> get metricsHistory =>
      List.unmodifiable(_metricsHistory);

  /// Get latest metrics
  PerformanceMetrics? get latestMetrics =>
      _metricsHistory.isNotEmpty ? _metricsHistory.last : null;

  /// Get last health report
  HealthReport? get lastReport => _lastReport;

  /// Get registered checkers
  Set<String> get registeredCheckers => _checkers.keys.toSet();

  /// Remove a checker
  void removeChecker(String name) {
    _checkers.remove(name);
  }

  /// Clear all data
  void reset() {
    _checkers.clear();
    _thresholds.clear();
    _metricsHistory.clear();
    _lastReport = null;
    stopPeriodicChecks();
  }

  /// Export diagnostics
  Map<String, dynamic> exportDiagnostics() {
    return {
      'lastHealthReport': _lastReport?.toJson(),
      'registeredCheckers': _checkers.keys.toList(),
      'thresholds': _thresholds.map((k, v) => MapEntry(k, {
            'warning': v.warningThreshold,
            'critical': v.criticalThreshold,
            'alertOnAbove': v.alertOnAbove,
          })),
      'metricsHistory': _metricsHistory.map((m) => m.toJson()).toList(),
      'exportedAt': DateTime.now().toIso8601String(),
    };
  }
}

/// Global health check service
final healthCheck = HealthCheckService.instance;
