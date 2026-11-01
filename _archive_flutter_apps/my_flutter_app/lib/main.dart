import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:meta_seo/meta_seo.dart';

import 'package:my_flutter_app/src/app/app.dart';
import 'package:my_flutter_app/src/core/utils/performance_monitor.dart';
import 'package:my_flutter_app/src/core/widgets/custom_error_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Load environment variables
  try {
    await dotenv.load();
  } on Object catch (e) {
    debugPrint('Warning: .env file not found or invalid: $e');
    // Continue running even if .env is missing, as we might have defaults or be in a CI env
  }

  if (kIsWeb) {
    MetaSEO().config();
  }

  // Set global error builder for better UX during crashes
  ErrorWidget.builder = (details) {
    return CustomErrorScreen(details: details);
  };

  // Start performance tracing
  PerformanceMonitor().startTrace('AppStartup');

  runApp(
    const ProviderScope(
      child: MyApp(),
    ),
  );

  // Stop performance tracing after first frame
  WidgetsBinding.instance.addPostFrameCallback((_) {
    PerformanceMonitor().stopTrace('AppStartup');
  });
}
