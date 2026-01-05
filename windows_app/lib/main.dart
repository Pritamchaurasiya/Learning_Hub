import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:sentry_flutter/sentry_flutter.dart';
import 'app.dart';
import 'core/di/injection_container.dart';
import 'core/bloc/base_bloc.dart';
import 'core/utils/app_logger.dart';
import 'core/services/ai_tutor_service.dart';
import 'package:learning_hub/core/utils/window_manager.dart';

import 'package:learning_hub/core/config/url_strategy.dart'; // Web Path Routing

void main() async {
  configureUrlStrategy(); // Remove # from URLs on Web
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Sentry for production monitoring
  await SentryFlutter.init(
    (options) {
      options.dsn = const String.fromEnvironment('SENTRY_DSN');
      options.tracesSampleRate = 1.0;
      options.profilesSampleRate = 1.0;
      options.environment = kReleaseMode ? 'production' : 'development';
      options.attachScreenshot = true;
      options.attachViewHierarchy = true;
      options.enableAutoPerformanceTracing = true;
    },
    appRunner: () async {
      // Initialize Hive for local storage
      await Hive.initFlutter();
      await Hive.openBox<dynamic>('gamification');

      // Initialize dependency injection
      await initDependencies();

      // Initialize AI Service
      await AiTutorService.instance.initialize();

      // Setup BLoC observer for debugging (only in debug mode)
      if (kDebugMode) {
        Bloc.observer = AppBlocObserver();
      }

      // Configure logging level
      if (kReleaseMode) {
        AppLogger.disable();
      }

      AppLogger.info('LearningHub app starting...');

      _setupErrorWidget();

      runApp(
        DefaultAssetBundle(
          bundle: SentryAssetBundle(),
          child: const ProviderScope(child: LearningHubApp()),
        ),
      );

      // Initialize window manager (conditional import handles web/desktop)
      await initializeWindowManager();
    },
  );
}

// Global error handling is now managed by Sentry, but we keep the builder for fallback UI
void _setupErrorWidget() {
  ErrorWidget.builder = (FlutterErrorDetails details) {
    return Material(
      child: Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, color: Colors.red, size: 48),
                const SizedBox(height: 16),
                const Text(
                  'Something went wrong',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Please restart the app or contact support.',
                  textAlign: TextAlign.center,
                ),
                if (kDebugMode && details.exceptionAsString().isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.grey[200],
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      details.exceptionAsString(),
                      maxLines: 5,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontFamily: 'monospace', fontSize: 12),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  };
}
