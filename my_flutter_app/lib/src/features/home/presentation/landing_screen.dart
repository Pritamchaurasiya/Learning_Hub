import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:my_flutter_app/src/core/widgets/responsive_layout.dart';
import 'package:my_flutter_app/src/features/auth/presentation/auth_controller.dart';
import 'package:my_flutter_app/src/features/gamification/presentation/gamification_controller.dart';
import 'package:my_flutter_app/src/features/gamification/presentation/widgets/gamification_widgets.dart';

class LandingScreen extends StatelessWidget {
  const LandingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const ResponsiveLayout(
      mobileBody: _MobileLanding(),
      desktopBody: _DesktopLanding(),
    );
  }
}

class _DesktopLanding extends StatelessWidget {
  const _DesktopLanding();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: Text(
          'Learning Hub',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
        ),
        actions: [
          Consumer(
            builder: (context, ref, _) {
              final user = ref.watch(authControllerProvider).value;
              if (user != null) {
                return Row(
                  children: [
                    Text('Hi, ${user.displayName ?? user.username}'),
                    const SizedBox(width: 8),
                    IconButton(
                      icon: const Icon(Icons.logout),
                      onPressed: () =>
                          ref.read(authControllerProvider.notifier).logout(),
                    ),
                  ],
                );
              }
              return Row(
                children: [
                  TextButton(
                    onPressed: () => context.go('/login'),
                    child: const Text('Login'),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    onPressed: () => context.go('/register'),
                    child: const Text('Sign Up'),
                  ),
                ],
              );
            },
          ),
          const SizedBox(width: 32),
        ],
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF1A1C19), Color(0xFF2D1B4E)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Center(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(64),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Master Flutter\nwith Excellence',
                        style: GoogleFonts.outfit(
                          fontSize: 72,
                          fontWeight: FontWeight.w800,
                          height: 1.1,
                          color: Colors.white,
                        ),
                      ).animate().fadeIn(duration: 800.ms).slideX(begin: -0.2),
                      const SizedBox(height: 24),
                      Text(
                        'A premium, production-ready educational platform\n'
                        'built for the future.',
                        style: GoogleFonts.outfit(
                          fontSize: 24,
                          color: Colors.white70,
                        ),
                      ).animate().fadeIn(delay: 400.ms),
                      const SizedBox(height: 24),
                      Consumer(
                        builder: (context, ref, _) {
                          final gamification =
                              ref.watch(gamificationControllerProvider);
                          return gamification.when(
                            data: (state) => Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (state.xp != null)
                                  XPBadgeWidget(
                                      xp: state.xp!, streak: state.streak,),
                                const SizedBox(height: 16),
                                TextButton.icon(
                                  onPressed: () => context.push('/leaderboard'),
                                  icon: const Icon(Icons.leaderboard),
                                  label: const Text('Global Leaderboard'),
                                  style: TextButton.styleFrom(
                                    foregroundColor: Colors.white70,
                                  ),
                                ),
                              ],
                            ),
                            loading: () => const SizedBox.shrink(),
                            error: (_, __) => const SizedBox.shrink(),
                          );
                        },
                      ),
                      const SizedBox(height: 48),
                      FilledButton.icon(
                        onPressed: () => context.go('/counter'),
                        icon: const Icon(Icons.rocket_launch),
                        label: const Text('Get Started'),
                        style: FilledButton.styleFrom(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 48,
                            vertical: 24,
                          ),
                          textStyle: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ).animate().scale(delay: 800.ms),
                    ],
                  ),
                ),
              ),
              Expanded(
                child: Center(
                  child: Icon(
                    Icons.school_rounded,
                    size: 400,
                    color: Colors.white.withValues(alpha: 0.05),
                  ).animate().rotate(duration: 20.seconds).scale(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MobileLanding extends StatelessWidget {
  const _MobileLanding();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF1A1C19), Color(0xFF2D1B4E)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.school, size: 80, color: Colors.white),
                const SizedBox(height: 32),
                Text(
                  'Learning Hub',
                  style: GoogleFonts.outfit(
                    fontSize: 48,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                  textAlign: TextAlign.center,
                ).animate().fadeIn().slideY(begin: 0.2),
                const SizedBox(height: 16),
                Text(
                  'Premium Flutter Learning',
                  style:
                      GoogleFonts.outfit(fontSize: 20, color: Colors.white70),
                ),
                const SizedBox(height: 16),
                Consumer(
                  builder: (context, ref, _) {
                    final gamification =
                        ref.watch(gamificationControllerProvider);
                    return gamification.when(
                      data: (state) => Column(
                        children: [
                          if (state.xp != null)
                            XPBadgeWidget(xp: state.xp!, streak: state.streak),
                          const SizedBox(height: 16),
                          TextButton.icon(
                            onPressed: () => context.push('/leaderboard'),
                            icon: const Icon(Icons.leaderboard),
                            label: const Text('View Leaderboard'),
                          ),
                        ],
                      ),
                      loading: () => const SizedBox.shrink(),
                      error: (_, __) => const SizedBox.shrink(),
                    );
                  },
                ),
                const SizedBox(height: 48),
                FilledButton(
                  onPressed: () => context.go('/courses'),
                  child: const Text('Browse Courses'),
                ).animate().scale(delay: 400.ms),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
