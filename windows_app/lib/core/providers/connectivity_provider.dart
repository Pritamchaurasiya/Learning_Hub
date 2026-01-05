import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Network connectivity state
enum NetworkStatus {
  online,
  offline,
  unknown;

  bool get isOnline => this == NetworkStatus.online;
  bool get isOffline => this == NetworkStatus.offline;
}

/// Connectivity notifier for monitoring network state
class ConnectivityNotifier extends Notifier<NetworkStatus> {
  final Connectivity _connectivity = Connectivity();
  StreamSubscription<List<ConnectivityResult>>? _subscription;

  @override
  NetworkStatus build() {
    // Check initial status
    _checkConnectivity();

    // Listen for changes
    _subscription = _connectivity.onConnectivityChanged.listen(_updateStatus);

    ref.onDispose(() {
      _subscription?.cancel();
    });

    return NetworkStatus.unknown;
  }

  Future<void> _checkConnectivity() async {
    try {
      final results = await _connectivity.checkConnectivity();
      _updateStatus(results);
    } catch (e) {
      state = NetworkStatus.unknown;
    }
  }

  void _updateStatus(List<ConnectivityResult> results) {
    if (results.isEmpty || results.contains(ConnectivityResult.none)) {
      state = NetworkStatus.offline;
    } else {
      state = NetworkStatus.online;
    }
  }

  /// Force refresh connectivity status
  Future<void> refresh() async {
    await _checkConnectivity();
  }
}

/// Connectivity provider
final connectivityProvider =
    NotifierProvider<ConnectivityNotifier, NetworkStatus>(() {
  return ConnectivityNotifier();
});

/// Helper provider to check if currently online
final isOnlineProvider = Provider<bool>((ref) {
  return ref.watch(connectivityProvider).isOnline;
});

/// Helper provider to check if currently offline
final isOfflineProvider = Provider<bool>((ref) {
  return ref.watch(connectivityProvider).isOffline;
});
