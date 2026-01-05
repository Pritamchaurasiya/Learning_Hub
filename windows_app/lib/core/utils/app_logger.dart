import 'package:logger/logger.dart';

/// Application-wide logger with structured logging levels.
///
/// Usage:
/// ```dart
/// AppLogger.info('User logged in', {'userId': '123'});
/// AppLogger.error('Failed to fetch data', error, stackTrace);
/// ```
class AppLogger {
  static final Logger _logger = Logger(
    printer: PrettyPrinter(
      methodCount: 2,
      errorMethodCount: 8,
      lineLength: 120,
      colors: true,
      printEmojis: true,
      dateTimeFormat: DateTimeFormat.onlyTimeAndSinceStart,
    ),
    level: Level.debug,
  );

  /// Verbose logging - most detailed
  static void verbose(String message, [Map<String, dynamic>? data]) {
    _logger.t(_formatMessage(message, data));
  }

  /// Debug logging - development info
  static void debug(String message, [Map<String, dynamic>? data]) {
    _logger.d(_formatMessage(message, data));
  }

  /// Info logging - general information
  static void info(String message, [Map<String, dynamic>? data]) {
    _logger.i(_formatMessage(message, data));
  }

  /// Warning logging - potential issues
  static void warning(String message, [Map<String, dynamic>? data]) {
    _logger.w(_formatMessage(message, data));
  }

  /// Error logging - errors with optional stack trace
  static void error(
    String message, [
    dynamic error,
    StackTrace? stackTrace,
    Map<String, dynamic>? data,
  ]) {
    _logger.e(
      _formatMessage(message, data),
      error: error,
      stackTrace: stackTrace,
    );
  }

  /// Fatal logging - critical errors
  static void fatal(
    String message, [
    dynamic error,
    StackTrace? stackTrace,
    Map<String, dynamic>? data,
  ]) {
    _logger.f(
      _formatMessage(message, data),
      error: error,
      stackTrace: stackTrace,
    );
  }

  /// Format message with optional data
  static String _formatMessage(String message, Map<String, dynamic>? data) {
    if (data == null || data.isEmpty) {
      return message;
    }
    return '$message | Data: $data';
  }

  /// Set logging level
  static void setLevel(Level level) {
    Logger.level = level;
  }

  /// Disable logging (for production)
  static void disable() {
    Logger.level = Level.off;
  }
}

/// Log levels for external configuration
enum LogLevel {
  verbose,
  debug,
  info,
  warning,
  error,
  fatal,
  off,
}

extension LogLevelExtension on LogLevel {
  Level toLoggerLevel() {
    switch (this) {
      case LogLevel.verbose:
        return Level.trace;
      case LogLevel.debug:
        return Level.debug;
      case LogLevel.info:
        return Level.info;
      case LogLevel.warning:
        return Level.warning;
      case LogLevel.error:
        return Level.error;
      case LogLevel.fatal:
        return Level.fatal;
      case LogLevel.off:
        return Level.off;
    }
  }
}
