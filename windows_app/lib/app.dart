import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:learning_hub/l10n/generated/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/theme/app_theme.dart';
import 'core/router/app_router.dart';
import 'core/providers/theme_provider.dart';
import 'core/ui/desktop_shortcuts.dart';
import 'core/services/websocket_service.dart';

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
          child: _WebSocketListener(
            child: DesktopShortcuts(
              child: child ?? const SizedBox.shrink(),
            ),
          ),
        );
      },
    );
  }
}

class _WebSocketListener extends StatefulWidget {
  final Widget child;
  const _WebSocketListener({required this.child});

  @override
  State<_WebSocketListener> createState() => _WebSocketListenerState();
}

class _WebSocketListenerState extends State<_WebSocketListener> {
  @override
  void initState() {
    super.initState();
    // Lazy connect if we have a token (mocking check for now)
    // In real app, AuthProvider triggers this.
    // Lazy connect if we have a token (mocking check for now)
    // In real app, AuthProvider triggers this.
    // webSocketService is a singleton from the imported file
    webSocketService.events.listen(_handleEvent);
  }

  void _handleEvent(Map<String, dynamic> event) {
    if (event['event_type'] == 'level_up') {
      final data = event['data'] as Map<String, dynamic>?;
      if (data != null) {
        final level = data['new_level'] as int? ?? 1;
        final message = data['message'] as String? ?? 'Level Up!';
        _showLevelUpToast(level, message);
      }
    }
  }

  void _showLevelUpToast(int level, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        backgroundColor: Colors.transparent,
        elevation: 0,
        content: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A), // Slate 900
            borderRadius: BorderRadius.circular(12),
            border:
                Border.all(color: const Color(0xFF38BDF8), width: 2), // Sky 400
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF38BDF8).withValues(alpha: 0.3),
                blurRadius: 20,
                spreadRadius: 2,
              ),
            ],
          ),
          child: Row(
            children: [
              const Icon(Icons.rocket_launch,
                  color: Color(0xFF38BDF8), size: 32),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      'LEVEL UP!',
                      style: TextStyle(
                        color: Color(0xFF38BDF8),
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    Text(
                      message,
                      style: const TextStyle(color: Colors.white),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return widget.child;
  }
}
