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

  final Map<String, CacheEntry<dynamic>> _memoryCache = {};
  final List<String> _lruKeys = [];
  static const FlutterSecureStorage _secureStorage = FlutterSecureStorage();

  int _hits = 0;
  int _misses = 0;

  static const int _maxMemoryEntries = 200;
  static const int _maxMemoryBytes = 50 * 1024 * 1024;
  static const String _diskCachePrefix = 'cache_';
  static const Duration _defaultTtl = Duration(hours: 1);

  int _currentMemoryBytes = 0;

  Future<T?> get<T>(
    String key, {
    T Function(dynamic)? decoder,
  }) async {
    if (_memoryCache.containsKey(key)) {
      final entry = _memoryCache[key]!;
      if (!entry.isExpired) {
        _hits++;
        _updateLru(key);
        return entry.data as T;
      }
      _memoryCache.remove(key);
      _lruKeys.remove(key);
    }

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
          _setMemory(key, entry);
          return entry.data;
        }
        await _secureStorage.delete(key: '$_diskCachePrefix$key');
      }
    } catch (_) {
      if (kDebugMode) {
        debugPrint('Cache read error');
      }
    }

    _misses++;
    return null;
  }

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

    _setMemory(key, entry);

    if (persistToDisk) {
      try {
        final json = entry.toJson(encoder ?? (d) => d);
        final jsonStr = jsonEncode(json);
        if (jsonStr.length < 100000) {
          await _secureStorage.write(
            key: '$_diskCachePrefix$key',
            value: jsonStr,
          );
        }
      } catch (_) {
        if (kDebugMode) {
          debugPrint('Cache write error');
        }
      }
    }
  }

  void _setMemory(String key, CacheEntry<dynamic> entry) {
    while ((_memoryCache.length >= _maxMemoryEntries ||
            _currentMemoryBytes >= _maxMemoryBytes) &&
        _lruKeys.isNotEmpty) {
      final evictKey = _lruKeys.removeAt(0);
      final removed = _memoryCache.remove(evictKey);
      if (removed != null) {
        try {
          _currentMemoryBytes -= jsonEncode(removed.data).length * 2;
        } catch (_) {
          _currentMemoryBytes = _currentMemoryBytes > 1024
              ? _currentMemoryBytes - 1024
              : 0;
        }
      }
    }

    _memoryCache[key] = entry;
    _updateLru(key);
    try {
      _currentMemoryBytes += jsonEncode(entry.data).length * 2;
    } catch (_) {
      _currentMemoryBytes += 1024;
    }
  }

  void _updateLru(String key) {
    _lruKeys.remove(key);
    _lruKeys.add(key);
  }

  Future<void> remove(String key) async {
    final removed = _memoryCache.remove(key);
    if (removed != null) {
      try {
        _currentMemoryBytes -= jsonEncode(removed.data).length * 2;
      } catch (_) {
        _currentMemoryBytes =
            (_currentMemoryBytes - 1024).clamp(0, _currentMemoryBytes);
      }
    }
    _lruKeys.remove(key);

    try {
      await _secureStorage.delete(key: '$_diskCachePrefix$key');
    } catch (_) {
      if (kDebugMode) {
        debugPrint('Cache remove error');
      }
    }
  }

  Future<void> clearPattern(String pattern) async {
    final keysToRemove =
        _memoryCache.keys.where((k) => k.contains(pattern)).toList();
    for (final key in keysToRemove) {
      final removed = _memoryCache.remove(key);
      if (removed != null) {
        try {
          _currentMemoryBytes -= jsonEncode(removed.data).length * 2;
        } catch (_) {
          _currentMemoryBytes =
              (_currentMemoryBytes - 1024).clamp(0, _currentMemoryBytes);
        }
      }
      _lruKeys.remove(key);
    }

    try {
      final allData = await _secureStorage.readAll();
      for (final key in allData.keys) {
        if (key.startsWith(_diskCachePrefix) && key.contains(pattern)) {
          await _secureStorage.delete(key: key);
        }
      }
    } catch (_) {
      if (kDebugMode) {
        debugPrint('Cache clear pattern error');
      }
    }
  }

  Future<void> clearAll() async {
    _memoryCache.clear();
    _lruKeys.clear();
    _currentMemoryBytes = 0;
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
      if (kDebugMode) {
        debugPrint('Cache clear all error');
      }
    }
  }

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
      if (kDebugMode) {
        debugPrint('Prefetch error');
      }
    }
  }

  CacheStats get stats => CacheStats(
        hits: _hits,
        misses: _misses,
        entries: _memoryCache.length,
        memoryBytes: _currentMemoryBytes,
      );

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
