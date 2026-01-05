import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:learning_hub/l10n/generated/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/theme/app_theme.dart';
import 'core/router/app_router.dart';
import 'core/providers/theme_provider.dart';
import 'core/ui/desktop_shortcuts.dart';

/// Main LearningHub Application Widget
///
/// This is the root widget that configures:
/// - Theme (light/dark mode support)
/// - Navigation (GoRouter for declarative routing)
/// - Responsive layout support for all platforms
class LearningHubApp extends ConsumerStatefulWidget {
  const LearningHubApp({super.key});

  @override
  ConsumerState<LearningHubApp> createState() => _LearningHubAppState();
}

class _LearningHubAppState extends ConsumerState<LearningHubApp> {
  bool _initialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      // Pre-cache critical local assets
      precacheImage(const AssetImage('assets/icons/app_icon.png'), context);
      _initialized = true;
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeMode = ref.watch(themeModeProvider);
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'LearningHub',
      debugShowCheckedModeBanner: false,

      // Theme Configuration
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: themeMode,

      // Localization Configuration
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: AppLocalizations.supportedLocales,
      onGenerateTitle: (context) => AppLocalizations.of(context)!.appTitle,

      // Router Configuration
      routerConfig: router,

      // Builder for responsive layouts and overlays
      builder: (context, child) {
        return MediaQuery(
          // Prevent text scaling beyond 1.2 for consistent UI
          data: MediaQuery.of(context).copyWith(
            textScaler: TextScaler.linear(
              MediaQuery.of(context).textScaler.scale(1.0).clamp(0.8, 1.2),
            ),
          ),
          child: DesktopShortcuts(
            child: child ?? const SizedBox.shrink(),
          ),
        );
      },
    );
  }
}
