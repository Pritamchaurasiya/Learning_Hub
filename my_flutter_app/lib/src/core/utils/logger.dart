import 'package:logger/logger.dart';

final logger = Logger(
  printer: PrettyPrinter(
    methodCount: 0,
    errorMethodCount: 0,
  ),
);

class AppLogger {
  AppLogger._(); // Private constructor to prevent instantiation

  static void d(String message) => logger.d(message);
  static void i(String message) => logger.i(message);
  static void w(String message) => logger.w(message);
  static void e(String message, [dynamic error, StackTrace? stackTrace]) =>
      logger.e(message, error: error, stackTrace: stackTrace);
}
