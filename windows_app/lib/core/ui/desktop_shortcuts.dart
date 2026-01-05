import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

class SearchIntent extends Intent {
  const SearchIntent();
}

class SettingsIntent extends Intent {
  const SettingsIntent();
}

class HomeIntent extends Intent {
  const HomeIntent();
}

/// A wrapper widget that adds global keyboard shortcuts for Desktop
class DesktopShortcuts extends StatelessWidget {
  final Widget child;
  final GlobalKey<NavigatorState>? navigatorKey;

  const DesktopShortcuts({
    super.key,
    required this.child,
    this.navigatorKey,
  });

  @override
  Widget build(BuildContext context) {
    return Shortcuts(
      shortcuts: <LogicalKeySet, Intent>{
        // Ctrl + F -> Search
        LogicalKeySet(LogicalKeyboardKey.control, LogicalKeyboardKey.keyF):
            const SearchIntent(),
        // Ctrl + , -> Settings (standard convention)
        LogicalKeySet(LogicalKeyboardKey.control, LogicalKeyboardKey.comma):
            const SettingsIntent(),
        // Alt + Home -> Go Home
        LogicalKeySet(LogicalKeyboardKey.alt, LogicalKeyboardKey.home):
            const HomeIntent(),
      },
      child: Actions(
        actions: <Type, Action<Intent>>{
          SearchIntent: CallbackAction<SearchIntent>(
            onInvoke: (intent) {
              context.push('/search');
              return null;
            },
          ),
          SettingsIntent: CallbackAction<SettingsIntent>(
            onInvoke: (intent) {
              context.push('/profile/settings');
              return null;
            },
          ),
          HomeIntent: CallbackAction<HomeIntent>(
            onInvoke: (intent) {
              context.go('/home');
              return null;
            },
          ),
        },
        child: child,
      ),
    );
  }
}
