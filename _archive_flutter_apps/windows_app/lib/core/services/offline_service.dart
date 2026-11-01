import 'package:universal_io/io.dart';
import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:path_provider/path_provider.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

/// Service to manage offline content and synchronization
class OfflineService {
  static final OfflineService _instance = OfflineService._();
  static OfflineService get instance => _instance;

  OfflineService._();

  late Box<dynamic> _offlineBox;
  final Dio _dio = Dio();
  bool _isInitialized = false;

  /// Initialize Hive and offline boxes
  Future<void> initialize() async {
    if (_isInitialized) {
      return;
    }

    await Hive.initFlutter();

    // Open boxes
    _offlineBox = await Hive.openBox('offline_content');

    _isInitialized = true;
  }

  /// Dispose of resources - close Hive box and Dio client
  /// Call this at app shutdown if needed
  Future<void> dispose() async {
    if (!_isInitialized) {
      return;
    }
    try {
      await _offlineBox.close();
      _dio.close();
      _isInitialized = false;
      if (kDebugMode) debugPrint('[OfflineService] Disposed successfully');
    } catch (e) {
      if (kDebugMode) debugPrint('[OfflineService] Error disposing: $e');
    }
  }

  /// Check if device is connected to internet
  Future<bool> get isOnline async {
    final connectivityResult = await Connectivity().checkConnectivity();
    return !connectivityResult.contains(ConnectivityResult.none);
  }

  /// Download a resource (video/pdf) for offline use
  Future<String?> downloadResource({
    required String url,
    required String id,
    required String type, // 'video' or 'pdf'
    void Function(double progress)? onProgress,
  }) async {
    // Web does not support file system access this way
    if (kIsWeb) {
      return null;
    }

    try {
      // Security validation
      if (!_isValidResourceId(id)) {
        throw Exception('Invalid resource ID');
      }

      if (!_isValidResourceType(type)) {
        throw Exception('Invalid resource type');
      }

      if (!_isValidUrl(url)) {
        throw Exception('Invalid URL');
      }

      if (!await isOnline) {
        throw Exception('No internet connection');
      }

      final dir = await getApplicationDocumentsDirectory();
      final sanitizedId = _sanitizeFileName(id);
      final extension = type == 'video' ? 'mp4' : 'pdf';
      final fileName = '${sanitizedId}_$type.$extension';
      final savePath = '${dir.path}/offline/$fileName';

      // Ensure directory exists
      await Directory('${dir.path}/offline').create(recursive: true);

      // Check if already downloaded
      if (await _fileValid(savePath)) {
        return savePath;
      }

      // Download
      await _dio.download(
        url,
        savePath,
        onReceiveProgress: (received, total) {
          if (total != -1 && onProgress != null) {
            onProgress(received / total);
          }
        },
      );

      // Save metadata
      await _offlineBox.put(id, {
        'id': id,
        'path': savePath,
        'type': type,
        'url': url,
        'timestamp': DateTime.now().toIso8601String(),
        // ignore: avoid_slow_async_io
        'size': File(savePath).lengthSync(),
      });

      return savePath;
    } catch (e) {
      // Log error securely without exposing sensitive information
      if (kDebugMode) {
        debugPrint('Download failed');
      }
      return null;
    }
  }

  String? getLocalPath(String id) {
    if (kIsWeb) {
      return null;
    }
    final rawData = _offlineBox.get(id);
    if (rawData != null) {
      final data = Map<String, dynamic>.from(rawData as Map);
      final path = data['path'] as String?;
      if (path != null) {
        // ignore: avoid_slow_async_io
        if (File(path).existsSync()) {
          return path;
        } else {
          // File missing, remove metadata
          _offlineBox.delete(id);
        }
      }
    }
    return null;
  }

  /// Remove detailed offline content
  Future<void> removeResource(String id) async {
    if (kIsWeb) {
      return;
    }
    final rawData = _offlineBox.get(id);
    if (rawData != null) {
      final data = Map<String, dynamic>.from(rawData as Map);
      final path = data['path'] as String?;
      if (path != null) {
        final file = File(path);
        // ignore: avoid_slow_async_io
        if (await file.exists()) {
          await file.delete();
        }
      }
      await _offlineBox.delete(id);
    }
  }

  /// Get all downloaded items
  List<Map<String, dynamic>> getDownloadedItems() {
    return _offlineBox.values
        .map((e) => Map<String, dynamic>.from(e as Map<dynamic, dynamic>))
        .toList();
  }

  /// Clear all offline content (e.g. on logout)
  Future<void> clearAll() async {
    if (kIsWeb) {
      await _offlineBox.clear();
      return;
    }
    final dir = await getApplicationDocumentsDirectory();
    final offlineDir = Directory('${dir.path}/offline');
    // ignore: avoid_slow_async_io
    if (offlineDir.existsSync()) {
      await offlineDir.delete(recursive: true);
    }
    await _offlineBox.clear();
  }

  /// Validate resource ID to prevent path traversal attacks
  bool _isValidResourceId(String id) {
    // Allow only alphanumeric characters, hyphens, and underscores
    final regex = RegExp(r'^[a-zA-Z0-9_-]+$');
    return regex.hasMatch(id) && id.length <= 100;
  }

  /// Validate resource type
  bool _isValidResourceType(String type) {
    return type == 'video' || type == 'pdf';
  }

  /// Validate URL to prevent malicious downloads
  bool _isValidUrl(String url) {
    try {
      final uri = Uri.parse(url);
      return uri.hasScheme && (uri.scheme == 'https' || uri.scheme == 'http');
    } catch (e) {
      return false;
    }
  }

  /// Sanitize file name to prevent path traversal
  String _sanitizeFileName(String fileName) {
    return fileName.replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '_');
  }

  Future<bool> _fileValid(String path) async {
    final file = File(path);
    // ignore: avoid_slow_async_io
    return file.existsSync() && file.lengthSync() > 0;
  }
}
