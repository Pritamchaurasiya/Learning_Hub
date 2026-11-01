import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';

/// Log levels for structured logging
enum LogLevel {
  debug,
  info,
  warn,
  error,
  fatal,
}

/// Log entry structure
class LogEntry {
  final DateTime timestamp;
  final LogLevel level;
  final String message;
  final String? source;
  final Map<String, dynamic>? context;
  final String? stackTrace;
  final String? correlationId;

  const LogEntry({
    required this.timestamp,
    required this.level,
    required this.message,
    this.source,
    this.context,
    this.stackTrace,
    this.correlationId,
  });

  Map<String, dynamic> toJson() => {
        'timestamp': timestamp.toIso8601String(),
        'level': level.name.toUpperCase(),
        'message': message,
        if (source != null) 'source': source,
        if (context != null) 'context': context,
        if (stackTrace != null) 'stackTrace': stackTrace,
        if (correlationId != null) 'correlationId': correlationId,
      };

  @override
  String toString() {
    final buffer = StringBuffer();
    buffer.write('[${timestamp.toIso8601String()}]');
    buffer.write(' [${level.name.toUpperCase()}]');
    if (source != null) buffer.write(' [$source]');
    buffer.write(' $message');
    if (context != null && context!.isNotEmpty) {
      buffer.write(' | ${jsonEncode(context)}');
    }
    return buffer.toString();
  }
}

/// Log formatter interface
abstract class LogFormatter {
  String format(LogEntry entry);
}

/// JSON log formatter
class JsonLogFormatter implements LogFormatter {
  @override
  String format(LogEntry entry) => jsonEncode(entry.toJson());
}

/// Pretty log formatter for development
class PrettyLogFormatter implements LogFormatter {
  static const Map<LogLevel, String> _levelColors = {
    LogLevel.debug: '🔍',
    LogLevel.info: 'ℹ️',
    LogLevel.warn: '⚠️',
    LogLevel.error: '❌',
    LogLevel.fatal: '💀',
  };

  @override
  String format(LogEntry entry) {
    final emoji = _levelColors[entry.level] ?? '📝';
    final time = _formatTime(entry.timestamp);
    final source = entry.source != null ? '[${entry.source}] ' : '';

    var output = '$emoji $time $source${entry.message}';

    if (entry.context != null && entry.context!.isNotEmpty) {
      output += '\n   Context: ${jsonEncode(entry.context)}';
    }

    if (entry.stackTrace != null) {
      output += '\n   Stack: ${entry.stackTrace}';
    }

    return output;
  }

  String _formatTime(DateTime dt) {
    return '${dt.hour.toString().padLeft(2, '0')}:'
        '${dt.minute.toString().padLeft(2, '0')}:'
        '${dt.second.toString().padLeft(2, '0')}.'
        '${dt.millisecond.toString().padLeft(3, '0')}';
  }
}

/// Log output handler interface
abstract class LogHandler {
  void handle(LogEntry entry, String formattedMessage);
}

/// Console log handler
class ConsoleLogHandler implements LogHandler {
  @override
  void handle(LogEntry entry, String formattedMessage) {
    if (kDebugMode) {
      debugPrint(formattedMessage);
    }
  }
}

/// In-memory log handler with circular buffer
class MemoryLogHandler implements LogHandler {
  final int maxEntries;
  final List<LogEntry> _entries = [];

  MemoryLogHandler({this.maxEntries = 1000});

  @override
  void handle(LogEntry entry, String formattedMessage) {
    _entries.add(entry);
    while (_entries.length > maxEntries) {
      _entries.removeAt(0);
    }
  }

  List<LogEntry> get entries => List.unmodifiable(_entries);

  List<LogEntry> query({
    LogLevel? minLevel,
    String? source,
    DateTime? after,
    DateTime? before,
    String? containing,
    int? limit,
  }) {
    var results = _entries.where((e) {
      if (minLevel != null && e.level.index < minLevel.index) {
        return false;
      }
      if (source != null && e.source != source) {
        return false;
      }
      if (after != null && e.timestamp.isBefore(after)) {
        return false;
      }
      if (before != null && e.timestamp.isAfter(before)) {
        return false;
      }
      if (containing != null &&
          !e.message.toLowerCase().contains(containing.toLowerCase())) {
        return false;
      }
      return true;
    });

    if (limit != null) {
      results = results.take(limit);
    }

    return results.toList();
  }

  void clear() => _entries.clear();
}

/// Log filter for conditional logging
typedef LogFilter = bool Function(LogEntry entry);

/// Comprehensive logging service
class LoggingService {
  static final LoggingService _instance = LoggingService._();
  static LoggingService get instance => _instance;

  LoggingService._();

  /// For testing
  factory LoggingService() => _instance;

  LogLevel _minLevel = kDebugMode ? LogLevel.debug : LogLevel.info;
  LogFormatter _formatter =
      kDebugMode ? PrettyLogFormatter() : JsonLogFormatter();
  final List<LogHandler> _handlers = [ConsoleLogHandler()];
  final List<LogFilter> _filters = [];
  MemoryLogHandler? _memoryHandler;

  String? _correlationId;
  String? _defaultSource;

  /// Configure minimum log level
  void setMinLevel(LogLevel level) {
    _minLevel = level;
  }

  /// Configure log formatter
  void setFormatter(LogFormatter formatter) {
    _formatter = formatter;
  }

  /// Add a log handler
  void addHandler(LogHandler handler) {
    _handlers.add(handler);
    if (handler is MemoryLogHandler) {
      _memoryHandler = handler;
    }
  }

  /// Remove a log handler
  void removeHandler(LogHandler handler) {
    _handlers.remove(handler);
    if (handler == _memoryHandler) {
      _memoryHandler = null;
    }
  }

  /// Add a log filter
  void addFilter(LogFilter filter) {
    _filters.add(filter);
  }

  /// Clear all filters
  void clearFilters() {
    _filters.clear();
  }

  /// Set correlation ID for request tracing
  void setCorrelationId(String? id) {
    _correlationId = id;
  }

  /// Set default source for all logs
  void setDefaultSource(String? source) {
    _defaultSource = source;
  }

  /// Enable in-memory logging for analytics/debugging
  MemoryLogHandler enableMemoryLogging({int maxEntries = 1000}) {
    final handler = MemoryLogHandler(maxEntries: maxEntries);
    addHandler(handler);
    return handler;
  }

  /// Core log method
  void log(
    LogLevel level,
    String message, {
    String? source,
    Map<String, dynamic>? context,
    StackTrace? stackTrace,
    String? correlationId,
  }) {
    if (level.index < _minLevel.index) {
      return;
    }

    final entry = LogEntry(
      timestamp: DateTime.now(),
      level: level,
      message: message,
      source: source ?? _defaultSource,
      context: context,
      stackTrace: stackTrace?.toString(),
      correlationId: correlationId ?? _correlationId,
    );

    // Apply filters
    for (final filter in _filters) {
      if (!filter(entry)) {
        return;
      }
    }

    // Format and dispatch
    final formatted = _formatter.format(entry);
    for (final handler in _handlers) {
      handler.handle(entry, formatted);
    }
  }

  /// Debug level log
  void debug(String message, {String? source, Map<String, dynamic>? context}) {
    log(LogLevel.debug, message, source: source, context: context);
  }

  /// Info level log
  void info(String message, {String? source, Map<String, dynamic>? context}) {
    log(LogLevel.info, message, source: source, context: context);
  }

  /// Warning level log
  void warn(String message, {String? source, Map<String, dynamic>? context}) {
    log(LogLevel.warn, message, source: source, context: context);
  }

  /// Error level log
  void error(
    String message, {
    String? source,
    Map<String, dynamic>? context,
    Object? error,
    StackTrace? stackTrace,
  }) {
    final ctx = Map<String, dynamic>.from(context ?? {});
    if (error != null) {
      ctx['error'] = error.toString();
    }
    log(
      LogLevel.error,
      message,
      source: source,
      context: ctx.isNotEmpty ? ctx : null,
      stackTrace: stackTrace,
    );
  }

  /// Fatal level log
  void fatal(
    String message, {
    String? source,
    Map<String, dynamic>? context,
    Object? error,
    StackTrace? stackTrace,
  }) {
    final ctx = Map<String, dynamic>.from(context ?? {});
    if (error != null) {
      ctx['error'] = error.toString();
    }
    log(
      LogLevel.fatal,
      message,
      source: source,
      context: ctx.isNotEmpty ? ctx : null,
      stackTrace: stackTrace,
    );
  }

  /// Performance timing helper
  T timed<T>(
    String operation,
    T Function() action, {
    String? source,
    Map<String, dynamic>? context,
  }) {
    final stopwatch = Stopwatch()..start();
    try {
      final result = action();
      stopwatch.stop();
      info(
        '$operation completed',
        source: source,
        context: {
          ...?context,
          'durationMs': stopwatch.elapsedMilliseconds,
        },
      );
      return result;
    } catch (e, st) {
      stopwatch.stop();
      error(
        '$operation failed',
        source: source,
        context: {
          ...?context,
          'durationMs': stopwatch.elapsedMilliseconds,
        },
        error: e,
        stackTrace: st,
      );
      rethrow;
    }
  }

  /// Async performance timing helper
  Future<T> timedAsync<T>(
    String operation,
    Future<T> Function() action, {
    String? source,
    Map<String, dynamic>? context,
  }) async {
    final stopwatch = Stopwatch()..start();
    try {
      final result = await action();
      stopwatch.stop();
      info(
        '$operation completed',
        source: source,
        context: {
          ...?context,
          'durationMs': stopwatch.elapsedMilliseconds,
        },
      );
      return result;
    } catch (e, st) {
      stopwatch.stop();
      error(
        '$operation failed',
        source: source,
        context: {
          ...?context,
          'durationMs': stopwatch.elapsedMilliseconds,
        },
        error: e,
        stackTrace: st,
      );
      rethrow;
    }
  }

  /// Get recent logs from memory handler
  List<LogEntry> getRecentLogs({
    LogLevel? minLevel,
    String? source,
    int? limit,
  }) {
    return _memoryHandler?.query(
          minLevel: minLevel,
          source: source,
          limit: limit,
        ) ??
        [];
  }

  /// Export logs as JSON
  String exportLogs() {
    final entries = _memoryHandler?.entries ?? [];
    return jsonEncode(entries.map((e) => e.toJson()).toList());
  }

  /// Clear in-memory logs
  void clearMemoryLogs() {
    _memoryHandler?.clear();
  }
}

/// Shorthand global logger access
final logger = LoggingService.instance;

/// Scoped logger for a specific source
class ScopedLogger {
  final String source;
  final LoggingService _service;

  ScopedLogger(this.source, [LoggingService? service])
      : _service = service ?? LoggingService.instance;

  void debug(String message, {Map<String, dynamic>? context}) {
    _service.debug(message, source: source, context: context);
  }

  void info(String message, {Map<String, dynamic>? context}) {
    _service.info(message, source: source, context: context);
  }

  void warn(String message, {Map<String, dynamic>? context}) {
    _service.warn(message, source: source, context: context);
  }

  void error(
    String message, {
    Map<String, dynamic>? context,
    Object? error,
    StackTrace? stackTrace,
  }) {
    _service.error(
      message,
      source: source,
      context: context,
      error: error,
      stackTrace: stackTrace,
    );
  }

  void fatal(
    String message, {
    Map<String, dynamic>? context,
    Object? error,
    StackTrace? stackTrace,
  }) {
    _service.fatal(
      message,
      source: source,
      context: context,
      error: error,
      stackTrace: stackTrace,
    );
  }

  T timed<T>(String operation, T Function() action,
      {Map<String, dynamic>? context}) {
    return _service.timed(operation, action, source: source, context: context);
  }

  Future<T> timedAsync<T>(String operation, Future<T> Function() action,
      {Map<String, dynamic>? context}) {
    return _service.timedAsync(operation, action,
        source: source, context: context);
  }
}
