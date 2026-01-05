import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

/// Sync status for items
enum SyncStatus {
  pending,
  syncing,
  synced,
  failed,
}

/// Sync item representing a pending sync operation
class SyncItem {
  final String id;
  final String type;
  final String action; // create, update, delete
  final Map<String, dynamic> data;
  final DateTime createdAt;
  final int retryCount;
  final SyncStatus status;
  final String? errorMessage;

  const SyncItem({
    required this.id,
    required this.type,
    required this.action,
    required this.data,
    required this.createdAt,
    this.retryCount = 0,
    this.status = SyncStatus.pending,
    this.errorMessage,
  });

  SyncItem copyWith({
    int? retryCount,
    SyncStatus? status,
    String? errorMessage,
  }) {
    return SyncItem(
      id: id,
      type: type,
      action: action,
      data: data,
      createdAt: createdAt,
      retryCount: retryCount ?? this.retryCount,
      status: status ?? this.status,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type,
        'action': action,
        'data': data,
        'createdAt': createdAt.toIso8601String(),
        'retryCount': retryCount,
        'status': status.index,
        'errorMessage': errorMessage,
      };

  factory SyncItem.fromJson(Map<String, dynamic> json) {
    return SyncItem(
      id: json['id'] as String,
      type: json['type'] as String,
      action: json['action'] as String,
      data: Map<String, dynamic>.from(json['data'] as Map),
      createdAt: DateTime.parse(json['createdAt'] as String),
      retryCount: json['retryCount'] as int? ?? 0,
      status: SyncStatus.values[json['status'] as int? ?? 0],
      errorMessage: json['errorMessage'] as String?,
    );
  }
}

/// Sync conflict resolution strategy
enum ConflictResolution {
  clientWins,
  serverWins,
  merge,
  manual,
}

/// Background sync service for offline-first architecture
class SyncService {
  static final SyncService _instance = SyncService();
  static SyncService get instance => _instance;

  SyncService() {
    _initialize();
  }

  /// Constructor for testing without initialization side effects
  @visibleForTesting
  SyncService.test();

  static const String _queueKey = 'sync_queue';
  static const String _lastSyncKey = 'last_sync_timestamp';
  static const int _maxRetries = 3;
  static const Duration _retryDelay = Duration(seconds: 30);

  final List<SyncItem> _queue = [];
  bool _isSyncing = false;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;
  Timer? _retryTimer;

  // Sync handlers by type
  final Map<String, Future<bool> Function(SyncItem)> _handlers = {};

  /// Initialize sync service
  Future<void> _initialize() async {
    await _loadQueue();
    _setupConnectivityListener();
  }

  /// Reset for testing
  @visibleForTesting
  Future<void> reset() async {
    _queue.clear();
    _handlers.clear();
    _isSyncing = false;
    await _connectivitySubscription?.cancel();
    _connectivitySubscription = null;
    _retryTimer?.cancel();
    _retryTimer = null;
    // Re-initialize if allowed, or leave for manual re-init in test
  }

  /// Load pending sync items from disk
  Future<void> _loadQueue() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final queueJson = prefs.getString(_queueKey);

      if (queueJson != null) {
        final list = jsonDecode(queueJson) as List;
        _queue.clear();
        _queue.addAll(
          list.map((e) => SyncItem.fromJson(e as Map<String, dynamic>)),
        );
      }
    } catch (e) {
      // Log error securely without exposing sensitive information
      if (kDebugMode) {
        debugPrint('Failed to load sync queue');
      }
    }
  }

  /// Save queue to disk
  Future<void> _saveQueue() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = _queue.map((e) => e.toJson()).toList();
      await prefs.setString(_queueKey, jsonEncode(json));
    } catch (e) {
      // Log error securely without exposing sensitive information
      if (kDebugMode) {
        debugPrint('Failed to save sync queue');
      }
    }
  }

  /// Setup connectivity listener for auto-sync
  void _setupConnectivityListener() {
    _connectivitySubscription?.cancel(); // Cancel existing if any
    _connectivitySubscription =
        Connectivity().onConnectivityChanged.listen((results) {
      final hasConnection =
          results.isNotEmpty && !results.contains(ConnectivityResult.none);

      if (hasConnection && _queue.isNotEmpty) {
        syncNow();
      }
    });
  }

  /// Register a sync handler for a type
  void registerHandler(
    String type,
    Future<bool> Function(SyncItem) handler,
  ) {
    _handlers[type] = handler;
  }

  /// Queue an item for sync
  Future<void> queue({
    required String type,
    required String action,
    required Map<String, dynamic> data,
  }) async {
    final item = SyncItem(
      id: 'sync_${DateTime.now().millisecondsSinceEpoch}',
      type: type,
      action: action,
      data: data,
      createdAt: DateTime.now(),
    );

    _queue.add(item);
    await _saveQueue();

    // Try immediate sync if online
    unawaited(_tryImmediateSync());
  }

  /// Try to sync immediately if connected
  Future<void> _tryImmediateSync() async {
    final results = await Connectivity().checkConnectivity();
    final hasConnection =
        results.isNotEmpty && !results.contains(ConnectivityResult.none);

    if (hasConnection) {
      await syncNow();
    }
  }

  /// Sync all pending items
  Future<SyncResult> syncNow() async {
    if (_isSyncing) {
      return SyncResult(synced: 0, failed: 0, pending: _queue.length);
    }

    _isSyncing = true;
    int synced = 0;
    int failed = 0;

    final itemsToSync =
        _queue.where((e) => e.status != SyncStatus.syncing).toList();

    for (final item in itemsToSync) {
      final handler = _handlers[item.type];
      if (handler == null) {
        if (kDebugMode) {
          debugPrint('No handler for sync type');
        }
        continue;
      }

      // Update status
      final index = _queue.indexWhere((e) => e.id == item.id);
      if (index >= 0) {
        _queue[index] = item.copyWith(status: SyncStatus.syncing);
      }

      try {
        final success = await handler(item);

        if (success) {
          _queue.removeWhere((e) => e.id == item.id);
          synced++;
        } else {
          _handleSyncFailure(item, 'Sync returned false');
          failed++;
        }
      } catch (e) {
        _handleSyncFailure(item, e.toString());
        failed++;
      }
    }

    await _saveQueue();
    await _updateLastSyncTime();
    _isSyncing = false;

    return SyncResult(
      synced: synced,
      failed: failed,
      pending: _queue.length,
    );
  }

  /// Handle sync failure with retry logic
  void _handleSyncFailure(SyncItem item, String error) {
    final index = _queue.indexWhere((e) => e.id == item.id);
    if (index < 0) {
      return;
    }

    if (item.retryCount >= _maxRetries) {
      _queue[index] = item.copyWith(
        status: SyncStatus.failed,
        errorMessage: error,
        retryCount: item.retryCount + 1,
      );
    } else {
      _queue[index] = item.copyWith(
        status: SyncStatus.pending,
        retryCount: item.retryCount + 1,
        errorMessage: error,
      );

      // Schedule retry
      _scheduleRetry();
    }
  }

  /// Schedule a retry attempt
  void _scheduleRetry() {
    _retryTimer?.cancel();
    _retryTimer = Timer(_retryDelay, () {
      unawaited(syncNow());
    });
  }

  /// Update last sync timestamp
  Future<void> _updateLastSyncTime() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        _lastSyncKey,
        DateTime.now().toIso8601String(),
      );
    } catch (_) {}
  }

  /// Get last sync time
  Future<DateTime?> get lastSyncTime async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final timestamp = prefs.getString(_lastSyncKey);
      return timestamp != null ? DateTime.parse(timestamp) : null;
    } catch (_) {
      return null;
    }
  }

  /// Get pending sync count
  int get pendingCount => _queue
      .where(
        (e) => e.status == SyncStatus.pending,
      )
      .length;

  /// Get failed sync count
  int get failedCount => _queue
      .where(
        (e) => e.status == SyncStatus.failed,
      )
      .length;

  /// Get all pending items
  List<SyncItem> get pendingItems => List.unmodifiable(
        _queue.where((e) => e.status == SyncStatus.pending),
      );

  /// Get all failed items
  List<SyncItem> get failedItems => List.unmodifiable(
        _queue.where((e) => e.status == SyncStatus.failed),
      );

  /// Retry failed items
  Future<void> retryFailed() async {
    for (var i = 0; i < _queue.length; i++) {
      if (_queue[i].status == SyncStatus.failed) {
        _queue[i] = _queue[i].copyWith(
          status: SyncStatus.pending,
          retryCount: 0,
        );
      }
    }
    await _saveQueue();
    await syncNow();
  }

  /// Remove a specific sync item
  Future<void> remove(String id) async {
    _queue.removeWhere((e) => e.id == id);
    await _saveQueue();
  }

  /// Clear all pending syncs
  Future<void> clearAll() async {
    _queue.clear();
    await _saveQueue();
  }

  /// Dispose resources
  void dispose() {
    _connectivitySubscription?.cancel();
    _retryTimer?.cancel();
  }
}

/// Sync result
class SyncResult {
  final int synced;
  final int failed;
  final int pending;

  const SyncResult({
    required this.synced,
    required this.failed,
    required this.pending,
  });

  bool get hasErrors => failed > 0;
  bool get isComplete => pending == 0 && failed == 0;
}

/// Sync types for the app
class SyncTypes {
  SyncTypes._();

  static const String courseProgress = 'course_progress';
  static const String lessonCompletion = 'lesson_completion';
  static const String quizResult = 'quiz_result';
  static const String bookmark = 'bookmark';
  static const String note = 'note';
  static const String studySession = 'study_session';
  static const String analyticsUpdate = 'analytics_update';
  static const String xpUpdate = 'xp_update';
  static const String achievementUnlock = 'achievement_unlock';
}
