/// In-memory LRU cache with TTL support
///
/// Provides fast key-value caching with:
/// - Maximum capacity with LRU eviction
/// - Time-to-live (TTL) per entry for automatic expiration
/// - Type-safe generic API
class AppCache<K, V> {
  final int maxSize;
  final Duration defaultTtl;
  final Map<K, _CacheEntry<V>> _cache = {};

  AppCache({
    this.maxSize = 100,
    this.defaultTtl = const Duration(minutes: 5),
  });

  /// Get a cached value by key, or null if not found/expired
  V? get(K key) {
    final entry = _cache[key];
    if (entry == null) return null;

    if (entry.isExpired) {
      _cache.remove(key);
      return null;
    }

    // Move to end (most recently used)
    _cache.remove(key);
    _cache[key] = entry;
    return entry.value;
  }

  /// Put a value in the cache
  void put(K key, V value, {Duration? ttl}) {
    // Remove existing entry first
    _cache.remove(key);

    // Evict oldest if at capacity
    while (_cache.length >= maxSize) {
      _cache.remove(_cache.keys.first);
    }

    _cache[key] = _CacheEntry(
      value: value,
      expiresAt: DateTime.now().add(ttl ?? defaultTtl),
    );
  }

  /// Get a value, computing it from [compute] if not cached
  Future<V> getOrCompute(K key, Future<V> Function() compute,
      {Duration? ttl}) async {
    final cached = get(key);
    if (cached != null) return cached;

    final value = await compute();
    put(key, value, ttl: ttl);
    return value;
  }

  /// Check if a non-expired value exists for the key
  bool containsKey(K key) {
    final entry = _cache[key];
    if (entry == null) return false;
    if (entry.isExpired) {
      _cache.remove(key);
      return false;
    }
    return true;
  }

  /// Remove a specific entry
  void remove(K key) => _cache.remove(key);

  /// Clear all cached entries
  void clear() => _cache.clear();

  /// Remove all expired entries
  void evictExpired() {
    _cache.removeWhere((_, entry) => entry.isExpired);
  }

  /// Current number of (non-expired) entries
  int get length {
    evictExpired();
    return _cache.length;
  }

  /// Whether the cache is empty
  bool get isEmpty => length == 0;
}

class _CacheEntry<V> {
  final V value;
  final DateTime expiresAt;

  _CacheEntry({required this.value, required this.expiresAt});

  bool get isExpired => DateTime.now().isAfter(expiresAt);
}

/// Singleton API response cache
final apiCache = AppCache<String, dynamic>(
  maxSize: 200,
  defaultTtl: const Duration(minutes: 10),
);
