import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:learning_hub/core/theme/app_colors.dart';
import 'package:learning_hub/core/providers/biometric_provider.dart';
import 'package:learning_hub/core/services/api_client.dart';

/// Splash screen with animated logo and initialization
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  String _version = '';

  @override
  void initState() {
    super.initState();
    _loadVersion();
    _initializeAndNavigate();
  }

  Future<void> _loadVersion() async {
    final info = await PackageInfo.fromPlatform();
    if (mounted) {
      setState(() => _version = 'v${info.version}');
    }
  }

  Future<void> _initializeAndNavigate() async {
    if (!mounted) {
      return;
    }

    // Ensure splash animations complete before navigating (minimum 2.5s display)
    final minDisplayFuture = Future<void>.delayed(const Duration(milliseconds: 2500));

    // Check if user has completed onboarding
    final prefs = await SharedPreferences.getInstance();
    final hasCompletedOnboarding =
        prefs.getBool('hasCompletedOnboarding') ?? false;
    // Use ApiClient to check for valid auth token (stored in secure storage)
    final isLoggedIn = await ApiClient.instance.hasToken;

    // Wait for minimum display time
    await minDisplayFuture;

    if (!mounted) {
      return;
    }

    // Check for biometrics
    final biometricsEnabled = prefs.getBool('biometrics_enabled') ?? false;
    if (biometricsEnabled) {
      final success =
          await ref.read(biometricProvider.notifier).authenticateUser();
      if (!success) {
        if (mounted) {
          context.go('/login');
        }
        return;
      }
    }

    if (!mounted) {
      return;
    }

    // Prioritize auth check to handle persistence correctly
    if (isLoggedIn) {
      context.go('/');
    } else if (!hasCompletedOnboarding) {
      context.go('/onboarding');
    } else {
      context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor:
          isDark ? AppColors.backgroundDark : AppColors.backgroundLight,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Animated Logo
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                gradient: AppColors.primaryGradient,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.3),
                    blurRadius: 30,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: const Icon(
                Icons.school,
                color: Colors.white,
                size: 50,
              ),
            )
                .animate()
                .fadeIn(duration: 600.ms)
                .scale(begin: const Offset(0.5, 0.5), end: const Offset(1, 1)),

            const SizedBox(height: 24),

            // App Name
            Text(
              'LearningHub',
              style: theme.textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.bold,
                letterSpacing: -0.5,
              ),
            )
                .animate(delay: 300.ms)
                .fadeIn(duration: 500.ms)
                .slideY(begin: 0.3, end: 0),

            const SizedBox(height: 8),

            // Tagline
            Text(
              'Learn. Grow. Succeed.',
              style: theme.textTheme.bodyLarge?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ).animate(delay: 500.ms).fadeIn(duration: 500.ms),

            const SizedBox(height: 60),

            // Loading indicator
            const SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(
                strokeWidth: 2.5,
                valueColor: AlwaysStoppedAnimation<Color>(
                  AppColors.primary,
                ),
              ),
            ).animate(delay: 800.ms).fadeIn(duration: 400.ms),

            const SizedBox(height: 24),

            // Version text
            if (_version.isNotEmpty)
              Text(
                _version,
                style: theme.textTheme.bodySmall?.copyWith(
                  color:
                      theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
                  letterSpacing: 1.2,
                ),
              ).animate(delay: 1000.ms).fadeIn(duration: 400.ms),
          ],
        ),
      ),
    );
  }
}
