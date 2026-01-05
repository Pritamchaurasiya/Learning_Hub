import 'dart:convert';
import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Cache entry with metadata
class CacheEntry<T> {
  final T data;
  final DateTime createdAt;
  final Duration ttl;

  const CacheEntry({
    required this.data,
    required this.createdAt,
    required this.ttl,
  });

  bool get isExpired => DateTime.now().difference(createdAt) > ttl;

  Map<String, dynamic> toJson(dynamic Function(T) encoder) => {
        'data': encoder(data),
        'createdAt': createdAt.toIso8601String(),
        'ttlSeconds': ttl.inSeconds,
      };

  factory CacheEntry.fromJson(
    Map<String, dynamic> json,
    T Function(dynamic) decoder,
  ) {
    return CacheEntry(
      data: decoder(json['data']),
      createdAt: DateTime.parse(json['createdAt'] as String),
      ttl: Duration(seconds: json['ttlSeconds'] as int),
    );
  }
}

/// Cache statistics
class CacheStats {
  final int hits;
  final int misses;
  final int entries;
  final int memoryBytes;

  const CacheStats({
    required this.hits,
    required this.misses,
    required this.entries,
    required this.memoryBytes,
  });

  double get hitRate => hits + misses > 0 ? hits / (hits + misses) : 0;
}

/// Intelligent cache manager with LRU eviction and TTL
class CacheManager {
  static final CacheManager _instance = CacheManager();
  static CacheManager get instance => _instance;

  CacheManager();

  // In-memory LRU cache
  final Map<String, CacheEntry<dynamic>> _memoryCache = {};
  final List<String> _lruKeys = [];
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  // Stats
  int _hits = 0;
  int _misses = 0;

  // Config
  static const int _maxMemoryEntries = 100;
  static const String _diskCachePrefix = 'cache_';
  static const Duration _defaultTtl = Duration(hours: 1);

  /// Get value from cache (memory first, then disk)
  Future<T?> get<T>(
    String key, {
    T Function(dynamic)? decoder,
  }) async {
    // Check memory cache first
    if (_memoryCache.containsKey(key)) {
      final entry = _memoryCache[key]!;
      if (!entry.isExpired) {
        _hits++;
        _updateLru(key);
        return entry.data as T;
      } else {
        // Remove expired entry
        _memoryCache.remove(key);
        _lruKeys.remove(key);
      }
    }

    // Check disk cache (Secure Storage)
    try {
      final jsonString =
          await _secureStorage.read(key: '$_diskCachePrefix$key');

      if (jsonString != null) {
        final json = jsonDecode(jsonString) as Map<String, dynamic>;
        final entry = CacheEntry<T>.fromJson(
          json,
          decoder ?? (d) => d as T,
        );

        if (!entry.isExpired) {
          _hits++;
          // Promote to memory cache
          _setMemory(key, entry);
          return entry.data;
        } else {
          // Remove expired disk entry
          await _secureStorage.delete(key: '$_diskCachePrefix$key');
        }
      }
    } catch (_) {
      // Log error securely without exposing sensitive information
      if (kDebugMode) {
        debugPrint('Cache read error');
      }
    }

    _misses++;
    return null;
  }

  /// Set value in cache
  Future<void> set<T>(
    String key,
    T value, {
    Duration? ttl,
    bool persistToDisk = true,
    dynamic Function(T)? encoder,
  }) async {
    final entry = CacheEntry<T>(
      data: value,
      createdAt: DateTime.now(),
      ttl: ttl ?? _defaultTtl,
    );

    // Store in memory
    _setMemory(key, entry);

    // Store on disk if requested
    if (persistToDisk) {
      try {
        final json = entry.toJson(encoder ?? (d) => d);
        await _secureStorage.write(
            key: '$_diskCachePrefix$key', value: jsonEncode(json));
      } catch (_) {
        // Log error securely without exposing sensitive information
        if (kDebugMode) {
          debugPrint('Cache write error');
        }
      }
    }
  }

  /// Set entry in memory cache with LRU eviction
  void _setMemory(String key, CacheEntry<dynamic> entry) {
    // Evict if at capacity
    while (_memoryCache.length >= _maxMemoryEntries && _lruKeys.isNotEmpty) {
      final evictKey = _lruKeys.removeAt(0);
      _memoryCache.remove(evictKey);
    }

    _memoryCache[key] = entry;
    _updateLru(key);
  }

  /// Update LRU order
  void _updateLru(String key) {
    _lruKeys.remove(key);
    _lruKeys.add(key);
  }

  /// Remove entry from cache
  Future<void> remove(String key) async {
    _memoryCache.remove(key);
    _lruKeys.remove(key);

    try {
      await _secureStorage.delete(key: '$_diskCachePrefix$key');
    } catch (_) {
      // Log error securely without exposing sensitive information
      if (kDebugMode) {
        debugPrint('Cache remove error');
      }
    }
  }

  /// Clear all cache entries matching pattern
  Future<void> clearPattern(String pattern) async {
    // Clear memory cache
    final keysToRemove =
        _memoryCache.keys.where((k) => k.contains(pattern)).toList();
    for (final key in keysToRemove) {
      _memoryCache.remove(key);
      _lruKeys.remove(key);
    }

    // Clear disk cache
    try {
      final allData = await _secureStorage.readAll();
      for (final key in allData.keys) {
        if (key.startsWith(_diskCachePrefix) && key.contains(pattern)) {
          await _secureStorage.delete(key: key);
        }
      }
    } catch (_) {
      // Log error securely without exposing sensitive information
      if (kDebugMode) {
        debugPrint('Cache clear pattern error');
      }
    }
  }

  /// Clear all cache
  Future<void> clearAll() async {
    _memoryCache.clear();
    _lruKeys.clear();
    _hits = 0;
    _misses = 0;

    try {
      final allData = await _secureStorage.readAll();
      for (final key in allData.keys) {
        if (key.startsWith(_diskCachePrefix)) {
          await _secureStorage.delete(key: key);
        }
      }
    } catch (_) {
      // Log error securely without exposing sensitive information
      if (kDebugMode) {
        debugPrint('Cache clear all error');
      }
    }
  }

  /// Get or fetch with caching
  Future<T> getOrFetch<T>(
    String key,
    Future<T> Function() fetcher, {
    Duration? ttl,
    T Function(dynamic)? decoder,
    dynamic Function(T)? encoder,
    bool forceRefresh = false,
  }) async {
    if (!forceRefresh) {
      final cached = await get<T>(key, decoder: decoder);
      if (cached != null) {
        return cached;
      }
    }

    final value = await fetcher();
    await set(key, value, ttl: ttl, encoder: encoder);
    return value;
  }

  /// Prefetch and cache data
  Future<void> prefetch<T>(
    String key,
    Future<T> Function() fetcher, {
    Duration? ttl,
    dynamic Function(T)? encoder,
  }) async {
    try {
      final value = await fetcher();
      await set(key, value, ttl: ttl, encoder: encoder);
    } catch (_) {
      // Log error securely without exposing sensitive information
      if (kDebugMode) {
        debugPrint('Prefetch error');
      }
    }
  }

  /// Get cache statistics
  CacheStats get stats => CacheStats(
        hits: _hits,
        misses: _misses,
        entries: _memoryCache.length,
        memoryBytes: _estimateMemoryUsage(),
      );

  int _estimateMemoryUsage() {
    // Rough estimate based on JSON serialization
    int bytes = 0;
    for (final entry in _memoryCache.entries) {
      try {
        bytes += jsonEncode(entry.value.data).length * 2; // UTF-16
      } catch (_) {
        bytes += 1024; // Default estimate
      }
    }
    return bytes;
  }

  /// Check if key exists and is valid
  Future<bool> has(String key) async {
    if (_memoryCache.containsKey(key) && !_memoryCache[key]!.isExpired) {
      return true;
    }

    try {
      final exists =
          await _secureStorage.containsKey(key: '$_diskCachePrefix$key');
      if (exists) {
        final jsonString =
            await _secureStorage.read(key: '$_diskCachePrefix$key');
        if (jsonString != null) {
          final json = jsonDecode(jsonString) as Map<String, dynamic>;
          final createdAt = DateTime.parse(json['createdAt'] as String);
          final ttlSeconds = json['ttlSeconds'] as int;
          return DateTime.now().difference(createdAt).inSeconds < ttlSeconds;
        }
      }
    } catch (_) {}

    return false;
  }
}

/// Cache keys for the app
class CacheKeys {
  CacheKeys._();

  static String course(String id) => 'course_$id';
  static String courseList(String category) => 'courses_$category';
  static String userProfile(String id) => 'user_$id';
  static String lessonContent(String courseId, String lessonId) =>
      'lesson_${courseId}_$lessonId';
  static const String featuredCourses = 'featured_courses';
  static const String categories = 'categories';
  static const String userProgress = 'user_progress';
  static const String recommendations = 'recommendations';
}
