import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Feature flag data types
enum FeatureFlagType {
  boolean,
  string,
  integer,
  json,
}

/// A/B test variant
class Variant {
  final String name;
  final double weight;
  final Map<String, dynamic>? payload;

  const Variant({
    required this.name,
    required this.weight,
    this.payload,
  });

  Map<String, dynamic> toJson() => {
        'name': name,
        'weight': weight,
        if (payload != null) 'payload': payload,
      };

  factory Variant.fromJson(Map<String, dynamic> json) {
    return Variant(
      name: json['name'] as String,
      weight: (json['weight'] as num).toDouble(),
      payload: json['payload'] as Map<String, dynamic>?,
    );
  }
}

/// Feature flag definition
class FeatureFlag {
  final String key;
  final String? description;
  final FeatureFlagType type;
  final dynamic defaultValue;
  final bool enabled;
  final List<Variant>? variants;
  final Map<String, dynamic>? targetingRules;
  final double? rolloutPercentage;
  final DateTime? expiresAt;

  const FeatureFlag({
    required this.key,
    this.description,
    required this.type,
    required this.defaultValue,
    this.enabled = true,
    this.variants,
    this.targetingRules,
    this.rolloutPercentage,
    this.expiresAt,
  });

  bool get isExpired {
    if (expiresAt == null) return false;
    return DateTime.now().isAfter(expiresAt!);
  }

  Map<String, dynamic> toJson() => {
        'key': key,
        if (description != null) 'description': description,
        'type': type.index,
        'defaultValue': defaultValue,
        'enabled': enabled,
        if (variants != null)
          'variants': variants!.map((v) => v.toJson()).toList(),
        if (targetingRules != null) 'targetingRules': targetingRules,
        if (rolloutPercentage != null) 'rolloutPercentage': rolloutPercentage,
        if (expiresAt != null) 'expiresAt': expiresAt!.toIso8601String(),
      };

  factory FeatureFlag.fromJson(Map<String, dynamic> json) {
    return FeatureFlag(
      key: json['key'] as String,
      description: json['description'] as String?,
      type: FeatureFlagType.values[json['type'] as int? ?? 0],
      defaultValue: json['defaultValue'],
      enabled: json['enabled'] as bool? ?? true,
      variants: (json['variants'] as List?)
          ?.map((v) => Variant.fromJson(v as Map<String, dynamic>))
          .toList(),
      targetingRules: json['targetingRules'] as Map<String, dynamic>?,
      rolloutPercentage: (json['rolloutPercentage'] as num?)?.toDouble(),
      expiresAt: json['expiresAt'] != null
          ? DateTime.parse(json['expiresAt'] as String)
          : null,
    );
  }
}

/// User context for targeting rules
class FeatureFlagContext {
  final String? userId;
  final String? userEmail;
  final String? userRole;
  final Map<String, dynamic>? customAttributes;
  final String? deviceType;
  final String? appVersion;
  final String? locale;

  const FeatureFlagContext({
    this.userId,
    this.userEmail,
    this.userRole,
    this.customAttributes,
    this.deviceType,
    this.appVersion,
    this.locale,
  });

  Map<String, dynamic> toMap() => {
        if (userId != null) 'userId': userId,
        if (userEmail != null) 'userEmail': userEmail,
        if (userRole != null) 'userRole': userRole,
        if (deviceType != null) 'deviceType': deviceType,
        if (appVersion != null) 'appVersion': appVersion,
        if (locale != null) 'locale': locale,
        ...?customAttributes,
      };
}

/// Feature evaluation result
class EvaluationResult<T> {
  final String flagKey;
  final T value;
  final String reason;
  final String? variantName;
  final bool fromCache;

  const EvaluationResult({
    required this.flagKey,
    required this.value,
    required this.reason,
    this.variantName,
    this.fromCache = false,
  });
}

/// Feature flag override for testing/debugging
class FlagOverride {
  final String key;
  final dynamic value;
  final DateTime? expiresAt;

  const FlagOverride({
    required this.key,
    required this.value,
    this.expiresAt,
  });
}

/// Feature flags service for A/B testing and gradual rollouts
class FeatureFlagsService {
  static final FeatureFlagsService _instance = FeatureFlagsService._();
  static FeatureFlagsService get instance => _instance;

  FeatureFlagsService._();

  /// Factory for testing
  factory FeatureFlagsService({Map<String, FeatureFlag>? initialFlags}) {
    if (initialFlags != null) {
      _instance._flags.addAll(initialFlags);
    }
    return _instance;
  }

  static const String _cacheKey = 'feature_flags_cache';
  static const String _overridesKey = 'feature_flags_overrides';

  final Map<String, FeatureFlag> _flags = {};
  final Map<String, FlagOverride> _overrides = {};
  FeatureFlagContext? _context;
  bool _isInitialized = false;
  DateTime? _lastFetch;
  static const Duration _defaultCacheDuration = Duration(hours: 1);

  /// Callbacks for flag updates
  final List<void Function(String key, dynamic value)> _listeners = [];

  /// Initialize the service
  Future<void> initialize() async {
    if (_isInitialized) return;

    await _loadFromCache();
    await _loadOverrides();
    _registerDefaultFlags();
    _lastFetch = DateTime.now();
    _isInitialized = true;
  }

  /// Check if cache needs refresh
  bool get _needsCacheRefresh {
    if (_lastFetch == null) return true;
    return DateTime.now().difference(_lastFetch!) > _defaultCacheDuration;
  }

  /// Refresh flags from cache if stale
  Future<void> refreshIfNeeded() async {
    if (_needsCacheRefresh) {
      await _loadFromCache();
      _lastFetch = DateTime.now();
    }
  }

  /// Register default flags
  void _registerDefaultFlags() {
    // App-wide feature flags
    registerFlag(const FeatureFlag(
      key: 'ai_tutor_enabled',
      description: 'Enable AI Tutor feature',
      type: FeatureFlagType.boolean,
      defaultValue: true,
    ));

    registerFlag(const FeatureFlag(
      key: 'new_quiz_generation',
      description: 'Enable new quiz generation algorithm',
      type: FeatureFlagType.boolean,
      defaultValue: false,
      rolloutPercentage: 20,
    ));

    registerFlag(const FeatureFlag(
      key: 'learning_path_v2',
      description: 'Enable Learning Path V2 with personalization',
      type: FeatureFlagType.boolean,
      defaultValue: false,
      rolloutPercentage: 10,
    ));

    registerFlag(const FeatureFlag(
      key: 'search_algorithm',
      description: 'Search algorithm version',
      type: FeatureFlagType.string,
      defaultValue: 'fuzzy_v1',
      variants: [
        Variant(name: 'fuzzy_v1', weight: 0.7),
        Variant(name: 'semantic_v1', weight: 0.3),
      ],
    ));

    registerFlag(const FeatureFlag(
      key: 'gamification_boost_multiplier',
      description: 'XP boost multiplier for special events',
      type: FeatureFlagType.integer,
      defaultValue: 1,
    ));

    registerFlag(const FeatureFlag(
      key: 'recommendation_config',
      description: 'Recommendation engine configuration',
      type: FeatureFlagType.json,
      defaultValue: {
        'maxRecommendations': 10,
        'categoryWeight': 0.4,
        'instructorWeight': 0.2,
        'ratingWeight': 0.2,
        'popularityWeight': 0.1,
        'newCourseWeight': 0.1,
      },
    ));
  }

  /// Register a feature flag
  void registerFlag(FeatureFlag flag) {
    _flags[flag.key] = flag;
    // Fire-and-forget cache update
    unawaited(_saveToCache());
  }

  /// Set user context for targeting
  void setContext(FeatureFlagContext context) {
    _context = context;
  }

  /// Get boolean flag value
  bool getBool(String key, {bool defaultValue = false}) {
    return _evaluate<bool>(key, defaultValue).value;
  }

  /// Get string flag value
  String getString(String key, {String defaultValue = ''}) {
    return _evaluate<String>(key, defaultValue).value;
  }

  /// Get integer flag value
  int getInt(String key, {int defaultValue = 0}) {
    return _evaluate<int>(key, defaultValue).value;
  }

  /// Get JSON flag value
  Map<String, dynamic> getJson(String key,
      {Map<String, dynamic>? defaultValue}) {
    return _evaluate<Map<String, dynamic>>(key, defaultValue ?? {}).value;
  }

  /// Get detailed evaluation result
  EvaluationResult<T> _evaluate<T>(String key, T defaultValue) {
    // Check for override first
    if (_overrides.containsKey(key)) {
      final override = _overrides[key]!;
      if (override.expiresAt == null ||
          DateTime.now().isBefore(override.expiresAt!)) {
        return EvaluationResult(
          flagKey: key,
          value: override.value as T,
          reason: 'override',
        );
      } else {
        // Override expired, remove it
        _overrides.remove(key);
        _saveOverrides();
      }
    }

    // Get flag definition
    final flag = _flags[key];
    if (flag == null) {
      return EvaluationResult(
        flagKey: key,
        value: defaultValue,
        reason: 'flag_not_found',
      );
    }

    // Check if flag is expired
    if (flag.isExpired) {
      return EvaluationResult(
        flagKey: key,
        value: flag.defaultValue as T,
        reason: 'flag_expired',
      );
    }

    // Check if flag is disabled
    if (!flag.enabled) {
      return EvaluationResult(
        flagKey: key,
        value: flag.defaultValue as T,
        reason: 'flag_disabled',
      );
    }

    // Check rollout percentage
    if (flag.rolloutPercentage != null && _context?.userId != null) {
      final hash = _context!.userId!.hashCode.abs() % 100;
      if (hash >= flag.rolloutPercentage!) {
        return EvaluationResult(
          flagKey: key,
          value: flag.defaultValue as T,
          reason: 'rollout_excluded',
        );
      }
    }

    // Check variants for A/B testing
    if (flag.variants != null && flag.variants!.isNotEmpty) {
      final variant = _selectVariant(flag.variants!, _context?.userId);
      if (variant != null) {
        if (variant.payload != null && variant.payload!.containsKey('value')) {
          return EvaluationResult(
            flagKey: key,
            value: variant.payload!['value'] as T,
            reason: 'variant_selected',
            variantName: variant.name,
          );
        }
        return EvaluationResult(
          flagKey: key,
          value: variant.name as T,
          reason: 'variant_selected',
          variantName: variant.name,
        );
      }
    }

    // Check targeting rules
    if (flag.targetingRules != null && _context != null) {
      final targetedValue =
          _evaluateTargetingRules(flag.targetingRules!, _context!);
      if (targetedValue != null) {
        return EvaluationResult(
          flagKey: key,
          value: targetedValue as T,
          reason: 'targeting_matched',
        );
      }
    }

    // Return default value
    return EvaluationResult(
      flagKey: key,
      value: flag.defaultValue as T,
      reason: 'default_value',
    );
  }

  /// Select variant based on user ID hash
  Variant? _selectVariant(List<Variant> variants, String? userId) {
    if (variants.isEmpty) return null;

    final totalWeight = variants.fold<double>(0, (sum, v) => sum + v.weight);
    if (totalWeight <= 0) return variants.first;

    // Use userId hash for deterministic selection
    final hash =
        (userId?.hashCode ?? DateTime.now().millisecondsSinceEpoch).abs();
    final bucket = (hash % 1000) / 1000.0 * totalWeight;

    double cumulative = 0;
    for (final variant in variants) {
      cumulative += variant.weight;
      if (bucket < cumulative) {
        return variant;
      }
    }

    return variants.last;
  }

  /// Evaluate targeting rules
  dynamic _evaluateTargetingRules(
    Map<String, dynamic> rules,
    FeatureFlagContext context,
  ) {
    final contextMap = context.toMap();

    // Check if user matches targeting rules
    if (rules.containsKey('userIds')) {
      final userIds = rules['userIds'] as List;
      if (context.userId != null && userIds.contains(context.userId)) {
        return rules['value'];
      }
    }

    if (rules.containsKey('userRoles')) {
      final roles = rules['userRoles'] as List;
      if (context.userRole != null && roles.contains(context.userRole)) {
        return rules['value'];
      }
    }

    if (rules.containsKey('attributes')) {
      final attrRules = rules['attributes'] as Map<String, dynamic>;
      for (final entry in attrRules.entries) {
        if (contextMap[entry.key] == entry.value) {
          return rules['value'];
        }
      }
    }

    return null;
  }

  /// Add a flag override (for testing/debugging)
  Future<void> setOverride(String key, dynamic value,
      {Duration? duration}) async {
    _overrides[key] = FlagOverride(
      key: key,
      value: value,
      expiresAt: duration != null ? DateTime.now().add(duration) : null,
    );
    await _saveOverrides();
    _notifyListeners(key, value);
  }

  /// Remove a specific override
  Future<void> removeOverride(String key) async {
    _overrides.remove(key);
    await _saveOverrides();
  }

  /// Clear all overrides
  Future<void> clearOverrides() async {
    _overrides.clear();
    await _saveOverrides();
  }

  /// Check if a flag has an active override
  bool hasOverride(String key) {
    return _overrides.containsKey(key);
  }

  /// Add listener for flag changes
  void addListener(void Function(String key, dynamic value) listener) {
    _listeners.add(listener);
  }

  /// Remove listener
  void removeListener(void Function(String key, dynamic value) listener) {
    _listeners.remove(listener);
  }

  /// Notify all listeners
  void _notifyListeners(String key, dynamic value) {
    for (final listener in _listeners) {
      listener(key, value);
    }
  }

  /// Load flags from cache
  Future<void> _loadFromCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = prefs.getString(_cacheKey);
      if (json != null) {
        final data = jsonDecode(json) as Map<String, dynamic>;
        for (final entry in data.entries) {
          _flags[entry.key] = FeatureFlag.fromJson(
            entry.value as Map<String, dynamic>,
          );
        }
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('Failed to load feature flags cache: $e');
      }
    }
  }

  /// Save flags to cache
  Future<void> _saveToCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final data = _flags.map((key, flag) => MapEntry(key, flag.toJson()));
      await prefs.setString(_cacheKey, jsonEncode(data));
    } catch (e) {
      if (kDebugMode) {
        debugPrint('Failed to save feature flags cache: $e');
      }
    }
  }

  /// Load overrides from storage
  Future<void> _loadOverrides() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = prefs.getString(_overridesKey);
      if (json != null) {
        final data = jsonDecode(json) as Map<String, dynamic>;
        for (final entry in data.entries) {
          final override = entry.value as Map<String, dynamic>;
          _overrides[entry.key] = FlagOverride(
            key: entry.key,
            value: override['value'],
            expiresAt: override['expiresAt'] != null
                ? DateTime.parse(override['expiresAt'] as String)
                : null,
          );
        }
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('Failed to load feature flags overrides: $e');
      }
    }
  }

  /// Save overrides to storage
  Future<void> _saveOverrides() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final data = <String, dynamic>{};
      for (final entry in _overrides.entries) {
        data[entry.key] = {
          'value': entry.value.value,
          if (entry.value.expiresAt != null)
            'expiresAt': entry.value.expiresAt!.toIso8601String(),
        };
      }
      await prefs.setString(_overridesKey, jsonEncode(data));
    } catch (e) {
      if (kDebugMode) {
        debugPrint('Failed to save feature flags overrides: $e');
      }
    }
  }

  /// Get all registered flags (for debugging)
  Map<String, FeatureFlag> get allFlags => Map.unmodifiable(_flags);

  /// Get all overrides (for debugging)
  Map<String, FlagOverride> get allOverrides => Map.unmodifiable(_overrides);

  /// Check if service is initialized
  bool get isInitialized => _isInitialized;

  /// Clear all data and reset
  Future<void> reset() async {
    _flags.clear();
    _overrides.clear();
    _context = null;
    _isInitialized = false;

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_cacheKey);
    await prefs.remove(_overridesKey);
  }
}

/// Shorthand access
final featureFlags = FeatureFlagsService.instance;
