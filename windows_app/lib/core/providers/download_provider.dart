import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Download status enum
enum DownloadStatus {
  pending,
  downloading,
  paused,
  completed,
  failed,
}

/// Download item model
class DownloadItem {
  final String id;
  final String courseId;
  final String courseName;
  final String? lessonId;
  final String title;
  final String? thumbnailUrl;
  final int totalSizeBytes;
  final int downloadedBytes;
  final DownloadStatus status;
  final DateTime createdAt;
  final DateTime? completedAt;
  final String? errorMessage;

  const DownloadItem({
    required this.id,
    required this.courseId,
    required this.courseName,
    this.lessonId,
    required this.title,
    this.thumbnailUrl,
    required this.totalSizeBytes,
    this.downloadedBytes = 0,
    this.status = DownloadStatus.pending,
    required this.createdAt,
    this.completedAt,
    this.errorMessage,
  });

  double get progress {
    if (totalSizeBytes <= 0) {
      return 0;
    }
    return (downloadedBytes / totalSizeBytes).clamp(0.0, 1.0);
  }

  String get formattedSize {
    if (totalSizeBytes >= 1024 * 1024 * 1024) {
      return '${(totalSizeBytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
    } else if (totalSizeBytes >= 1024 * 1024) {
      return '${(totalSizeBytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    } else if (totalSizeBytes >= 1024) {
      return '${(totalSizeBytes / 1024).toStringAsFixed(1)} KB';
    }
    return '$totalSizeBytes B';
  }

  String get formattedProgress {
    final downloaded = downloadedBytes / (1024 * 1024);
    final total = totalSizeBytes / (1024 * 1024);
    return '${downloaded.toStringAsFixed(1)} / ${total.toStringAsFixed(1)} MB';
  }

  DownloadItem copyWith({
    int? downloadedBytes,
    DownloadStatus? status,
    DateTime? completedAt,
    String? errorMessage,
  }) {
    return DownloadItem(
      id: id,
      courseId: courseId,
      courseName: courseName,
      lessonId: lessonId,
      title: title,
      thumbnailUrl: thumbnailUrl,
      totalSizeBytes: totalSizeBytes,
      downloadedBytes: downloadedBytes ?? this.downloadedBytes,
      status: status ?? this.status,
      createdAt: createdAt,
      completedAt: completedAt ?? this.completedAt,
      errorMessage: errorMessage,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'courseId': courseId,
        'courseName': courseName,
        'lessonId': lessonId,
        'title': title,
        'thumbnailUrl': thumbnailUrl,
        'totalSizeBytes': totalSizeBytes,
        'downloadedBytes': downloadedBytes,
        'status': status.index,
        'createdAt': createdAt.toIso8601String(),
        'completedAt': completedAt?.toIso8601String(),
        'errorMessage': errorMessage,
      };

  factory DownloadItem.fromJson(Map<String, dynamic> json) {
    return DownloadItem(
      id: json['id'] as String,
      courseId: json['courseId'] as String,
      courseName: json['courseName'] as String,
      lessonId: json['lessonId'] as String?,
      title: json['title'] as String,
      thumbnailUrl: json['thumbnailUrl'] as String?,
      totalSizeBytes: json['totalSizeBytes'] as int,
      downloadedBytes: json['downloadedBytes'] as int? ?? 0,
      status: DownloadStatus.values[json['status'] as int? ?? 0],
      createdAt: DateTime.parse(json['createdAt'] as String),
      completedAt: json['completedAt'] != null
          ? DateTime.parse(json['completedAt'] as String)
          : null,
      errorMessage: json['errorMessage'] as String?,
    );
  }
}

/// Download state
class DownloadState {
  final List<DownloadItem> downloads;
  final bool isDownloading;
  final String? currentDownloadId;
  final int totalStorageUsedBytes;

  const DownloadState({
    this.downloads = const [],
    this.isDownloading = false,
    this.currentDownloadId,
    this.totalStorageUsedBytes = 0,
  });

  /// Get downloads by status
  List<DownloadItem> getByStatus(DownloadStatus status) {
    return downloads.where((d) => d.status == status).toList();
  }

  /// Get completed downloads
  List<DownloadItem> get completedDownloads =>
      getByStatus(DownloadStatus.completed);

  /// Get active downloads (pending + downloading)
  List<DownloadItem> get activeDownloads {
    return downloads
        .where((d) =>
            d.status == DownloadStatus.pending ||
            d.status == DownloadStatus.downloading)
        .toList();
  }

  /// Get current download progress
  DownloadItem? get currentDownload {
    if (currentDownloadId == null) {
      return null;
    }
    return downloads.where((d) => d.id == currentDownloadId).firstOrNull;
  }

  /// Formatted total storage
  String get formattedStorageUsed {
    if (totalStorageUsedBytes >= 1024 * 1024 * 1024) {
      return '${(totalStorageUsedBytes / (1024 * 1024 * 1024)).toStringAsFixed(2)} GB';
    } else if (totalStorageUsedBytes >= 1024 * 1024) {
      return '${(totalStorageUsedBytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    }
    return '${(totalStorageUsedBytes / 1024).toStringAsFixed(1)} KB';
  }

  DownloadState copyWith({
    List<DownloadItem>? downloads,
    bool? isDownloading,
    String? currentDownloadId,
    int? totalStorageUsedBytes,
    bool clearCurrentDownload = false,
  }) {
    return DownloadState(
      downloads: downloads ?? this.downloads,
      isDownloading: isDownloading ?? this.isDownloading,
      currentDownloadId: clearCurrentDownload
          ? null
          : (currentDownloadId ?? this.currentDownloadId),
      totalStorageUsedBytes:
          totalStorageUsedBytes ?? this.totalStorageUsedBytes,
    );
  }

  Map<String, dynamic> toJson() => {
        'downloads': downloads.map((d) => d.toJson()).toList(),
        'totalStorageUsedBytes': totalStorageUsedBytes,
      };

  factory DownloadState.fromJson(Map<String, dynamic> json) {
    final downloads = (json['downloads'] as List?)
            ?.map((d) => DownloadItem.fromJson(d as Map<String, dynamic>))
            .toList() ??
        [];

    return DownloadState(
      downloads: downloads,
      totalStorageUsedBytes: json['totalStorageUsedBytes'] as int? ?? 0,
    );
  }
}

/// Download notifier
class DownloadNotifier extends StateNotifier<DownloadState> {
  DownloadNotifier() : super(const DownloadState()) {
    _loadState();
  }

  static const String _stateKey = 'download_state';

  Future<void> _loadState() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final stateJson = prefs.getString(_stateKey);

      if (stateJson != null) {
        final json = jsonDecode(stateJson) as Map<String, dynamic>;
        state = DownloadState.fromJson(json);
      }
    } catch (e) {
      // Keep initial state
    }
  }

  Future<void> _saveState() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_stateKey, jsonEncode(state.toJson()));
    } catch (e) {
      // Handle silently
    }
  }

  /// Add download to queue
  Future<void> addDownload({
    required String courseId,
    required String courseName,
    String? lessonId,
    required String title,
    String? thumbnailUrl,
    required int totalSizeBytes,
  }) async {
    // Check if already exists
    if (state.downloads.any((d) =>
        d.courseId == courseId &&
        d.lessonId == lessonId &&
        d.status != DownloadStatus.failed)) {
      return;
    }

    final download = DownloadItem(
      id: 'download_${DateTime.now().millisecondsSinceEpoch}',
      courseId: courseId,
      courseName: courseName,
      lessonId: lessonId,
      title: title,
      thumbnailUrl: thumbnailUrl,
      totalSizeBytes: totalSizeBytes,
      createdAt: DateTime.now(),
    );

    state = state.copyWith(
      downloads: [...state.downloads, download],
    );
    await _saveState();

    // Auto-start if not currently downloading
    if (!state.isDownloading) {
      await _startNextDownload();
    }
  }

  /// Start next download in queue
  Future<void> _startNextDownload() async {
    final pending = state.downloads
        .where((d) => d.status == DownloadStatus.pending)
        .toList();

    if (pending.isEmpty) {
      state = state.copyWith(
        isDownloading: false,
        clearCurrentDownload: true,
      );
      return;
    }

    final next = pending.first;
    state = state.copyWith(
      isDownloading: true,
      currentDownloadId: next.id,
      downloads: state.downloads.map((d) {
        return d.id == next.id
            ? d.copyWith(status: DownloadStatus.downloading)
            : d;
      }).toList(),
    );

    // Simulate download (in real app, this would be actual download)
    await _simulateDownload(next.id);
  }

  /// Simulate download progress (for demo)
  Future<void> _simulateDownload(String downloadId) async {
    final download =
        state.downloads.where((d) => d.id == downloadId).firstOrNull;
    if (download == null) {
      return;
    }

    int downloaded = 0;
    final chunkSize = download.totalSizeBytes ~/ 20;

    while (downloaded < download.totalSizeBytes) {
      await Future<void>.delayed(const Duration(milliseconds: 200));

      // Check if paused or cancelled
      final current =
          state.downloads.where((d) => d.id == downloadId).firstOrNull;
      if (current == null || current.status != DownloadStatus.downloading) {
        return;
      }

      downloaded += chunkSize;
      if (downloaded > download.totalSizeBytes) {
        downloaded = download.totalSizeBytes;
      }

      state = state.copyWith(
        downloads: state.downloads.map((d) {
          return d.id == downloadId
              ? d.copyWith(downloadedBytes: downloaded)
              : d;
        }).toList(),
      );
    }

    // Complete
    state = state.copyWith(
      downloads: state.downloads.map((d) {
        return d.id == downloadId
            ? d.copyWith(
                status: DownloadStatus.completed,
                downloadedBytes: download.totalSizeBytes,
                completedAt: DateTime.now(),
              )
            : d;
      }).toList(),
      totalStorageUsedBytes:
          state.totalStorageUsedBytes + download.totalSizeBytes,
    );

    await _saveState();
    await _startNextDownload();
  }

  /// Pause download
  Future<void> pauseDownload(String downloadId) async {
    state = state.copyWith(
      downloads: state.downloads.map((d) {
        return d.id == downloadId && d.status == DownloadStatus.downloading
            ? d.copyWith(status: DownloadStatus.paused)
            : d;
      }).toList(),
      isDownloading: false,
      clearCurrentDownload: true,
    );
    await _saveState();
  }

  /// Resume download
  Future<void> resumeDownload(String downloadId) async {
    state = state.copyWith(
      downloads: state.downloads.map((d) {
        return d.id == downloadId && d.status == DownloadStatus.paused
            ? d.copyWith(status: DownloadStatus.pending)
            : d;
      }).toList(),
    );

    if (!state.isDownloading) {
      await _startNextDownload();
    }
  }

  /// Cancel/remove download
  Future<void> removeDownload(String downloadId) async {
    final download =
        state.downloads.where((d) => d.id == downloadId).firstOrNull;

    int storageToReclaim = 0;
    if (download != null && download.status == DownloadStatus.completed) {
      storageToReclaim = download.downloadedBytes;
    }

    state = state.copyWith(
      downloads: state.downloads.where((d) => d.id != downloadId).toList(),
      totalStorageUsedBytes: state.totalStorageUsedBytes - storageToReclaim,
      clearCurrentDownload: state.currentDownloadId == downloadId,
    );

    await _saveState();

    if (state.currentDownloadId == null && state.isDownloading) {
      await _startNextDownload();
    }
  }

  /// Check if content is downloaded
  bool isDownloaded(String courseId, String? lessonId) {
    return state.downloads.any((d) =>
        d.courseId == courseId &&
        d.lessonId == lessonId &&
        d.status == DownloadStatus.completed);
  }

  /// Clear all completed downloads
  Future<void> clearCompleted() async {
    final completed = state.completedDownloads;
    final totalToReclaim = completed.fold<int>(
      0,
      (sum, d) => sum + d.downloadedBytes,
    );

    state = state.copyWith(
      downloads: state.downloads
          .where((d) => d.status != DownloadStatus.completed)
          .toList(),
      totalStorageUsedBytes: state.totalStorageUsedBytes - totalToReclaim,
    );
    await _saveState();
  }

  /// Reset
  Future<void> reset() async {
    state = const DownloadState();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_stateKey);
  }
}

/// Download provider
final downloadProvider =
    StateNotifierProvider<DownloadNotifier, DownloadState>((ref) {
  return DownloadNotifier();
});

/// Completed downloads provider
final completedDownloadsProvider = Provider<List<DownloadItem>>((ref) {
  return ref.watch(downloadProvider).completedDownloads;
});

/// Active downloads provider
final activeDownloadsProvider = Provider<List<DownloadItem>>((ref) {
  return ref.watch(downloadProvider).activeDownloads;
});
