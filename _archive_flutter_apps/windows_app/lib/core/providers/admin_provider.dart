import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/feature_flags_service.dart';
import '../services/health_check_service.dart';

// --- Feature Flags Provider ---

class FeatureFlagsState {
  final Map<String, FeatureFlag> flags;
  final Map<String, FlagOverride> overrides;

  const FeatureFlagsState({
    this.flags = const {},
    this.overrides = const {},
  });
}

class FeatureFlagsNotifier extends StateNotifier<FeatureFlagsState> {
  final FeatureFlagsService _service;

  FeatureFlagsNotifier(this._service) : super(const FeatureFlagsState()) {
    _load();
    // Listen to changes in service
    _service.addListener((key, value) {
      _load();
    });
  }

  void _load() {
    state = FeatureFlagsState(
      flags: _service.allFlags,
      overrides: _service.allOverrides,
    );
  }

  Future<void> setOverride(String key, dynamic value) async {
    await _service.setOverride(key, value);
    // _load is triggered by listener
  }

  Future<void> removeOverride(String key) async {
    await _service.removeOverride(key);
  }

  Future<void> clearOverrides() async {
    await _service.clearOverrides();
  }
}

final featureFlagsProvider =
    StateNotifierProvider<FeatureFlagsNotifier, FeatureFlagsState>((ref) {
  return FeatureFlagsNotifier(FeatureFlagsService.instance);
});

// --- Health Check Provider ---

class HealthCheckState {
  final bool isLoading;
  final HealthReport? report;
  final PerformanceMetrics? latestMetrics;

  const HealthCheckState({
    this.isLoading = false,
    this.report,
    this.latestMetrics,
  });
}

class HealthCheckNotifier extends StateNotifier<HealthCheckState> {
  final HealthCheckService _service;
  Timer? _metricsTimer;

  HealthCheckNotifier(this._service) : super(const HealthCheckState()) {
    refreshHealth();
    // Periodically update metrics view
    _metricsTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      state = HealthCheckState(
        isLoading: state.isLoading,
        report: state.report,
        latestMetrics: _service.latestMetrics,
      );
    });
  }

  Future<void> refreshHealth() async {
    state = HealthCheckState(
        isLoading: true,
        report: state.report,
        latestMetrics: state.latestMetrics);

    final report = await _service.checkAll();

    state = HealthCheckState(
      isLoading: false,
      report: report,
      latestMetrics: _service.latestMetrics,
    );
  }

  @override
  void dispose() {
    _metricsTimer?.cancel();
    super.dispose();
  }
}

final healthCheckProvider =
    StateNotifierProvider<HealthCheckNotifier, HealthCheckState>((ref) {
  return HealthCheckNotifier(HealthCheckService.instance);
});
