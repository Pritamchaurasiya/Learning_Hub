import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/l10n/app_localizations.dart';
import 'package:my_flutter_app/src/core/router/app_router.dart';
import 'package:my_flutter_app/src/core/theme/app_theme.dart';
import 'package:my_flutter_app/src/core/widgets/connectivity_wrapper.dart';
import 'package:my_flutter_app/src/features/gamification/presentation/xp_toast_overlay.dart'
    as xp_toast;

class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'Learning Hub',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      routerConfig: router,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      builder: (context, child) {
        // God-Mode: Global XP Toast Listener & Connectivity Wrapper
        return ConnectivityWrapper(
          child: xp_toast.XPToastOverlay(child: child!),
        );
      },
    );
  }
}
