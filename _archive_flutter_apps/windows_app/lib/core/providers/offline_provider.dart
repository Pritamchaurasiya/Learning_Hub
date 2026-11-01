import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/offline_service.dart';

/// State of offline downloads
class OfflineState {
  final List<String> downloadedIds;
  final Map<String, double> downloadProgress; // ID -> Progress (0.0 to 1.0)
  final bool isOfflineMode;

  OfflineState({
    this.downloadedIds = const [],
    this.downloadProgress = const {},
    this.isOfflineMode = false,
  });

  OfflineState copyWith({
    List<String>? downloadedIds,
    Map<String, double>? downloadProgress,
    bool? isOfflineMode,
  }) {
    return OfflineState(
      downloadedIds: downloadedIds ?? this.downloadedIds,
      downloadProgress: downloadProgress ?? this.downloadProgress,
      isOfflineMode: isOfflineMode ?? this.isOfflineMode,
    );
  }
}

class OfflineNotifier extends Notifier<OfflineState> {
  final OfflineService _service = OfflineService.instance;

  @override
  OfflineState build() {
    _init();
    return OfflineState();
  }

  Future<void> _init() async {
    await _service.initialize();
    final items = _service.getDownloadedItems();
    final ids = items.map((e) => e['id'] as String).toList();
    final isOnline = await _service.isOnline;

    state = state.copyWith(
      downloadedIds: ids,
      isOfflineMode: !isOnline,
    );
  }

  /// Toggle offline mode manually
  void toggleOfflineMode() {
    state = state.copyWith(isOfflineMode: !state.isOfflineMode);
  }

  /// Download a course resource
  Future<void> downloadResource(String url, String id, String type) async {
    if (state.downloadedIds.contains(id)) {
      return;
    }

    // Start progress
    final newProgress = Map<String, double>.from(state.downloadProgress);
    newProgress[id] = 0.0;
    state = state.copyWith(downloadProgress: newProgress);

    await _service.downloadResource(
      url: url,
      id: id,
      type: type,
      onProgress: (progress) {
        // Update progress
        final p = Map<String, double>.from(state.downloadProgress);
        p[id] = progress;
        state = state.copyWith(downloadProgress: p);
      },
    );

    // Complete
    final finalProgress = Map<String, double>.from(state.downloadProgress);
    finalProgress.remove(id);

    state = state.copyWith(
      downloadedIds: [...state.downloadedIds, id],
      downloadProgress: finalProgress,
    );
  }

  /// Remove download
  Future<void> removeDownload(String id) async {
    await _service.removeResource(id);
    final newIds = List<String>.from(state.downloadedIds)..remove(id);
    state = state.copyWith(downloadedIds: newIds);
  }

  /// Check if resource is available offline
  bool isContentAvailable(String id) {
    return state.downloadedIds.contains(id);
  }
}

final offlineProvider = NotifierProvider<OfflineNotifier, OfflineState>(() {
  return OfflineNotifier();
});
