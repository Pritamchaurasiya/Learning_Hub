import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:my_flutter_app/src/features/auth/presentation/auth_controller.dart';
import 'package:my_flutter_app/src/features/auth/presentation/login_screen.dart';
import 'package:my_flutter_app/src/features/auth/presentation/register_screen.dart';
import 'package:my_flutter_app/src/features/courses/presentation/course_list_screen.dart';
import 'package:my_flutter_app/src/features/gamification/presentation/leaderboard_screen.dart';
import 'package:my_flutter_app/src/features/home/presentation/landing_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authControllerProvider);

  return GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const LandingScreen(),
      ),
      GoRoute(
        path: '/courses',
        builder: (context, state) => const CourseListScreen(),
        routes: [
          GoRoute(
            path: ':slug',
            builder: (context, state) => Scaffold(
              appBar: AppBar(
                title: Text(
                  'Course: ${state.pathParameters['slug']}',
                ),
              ),
            ), // Placeholder for details
          ),
        ],
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/leaderboard',
        builder: (context, state) => const LeaderboardScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
    ],
    redirect: (context, state) {
      final isLoggedIn = authState.asData?.value != null;
      final isLoggingIn =
          state.uri.path == '/login' || state.uri.path == '/register';

      if (!isLoggedIn && !isLoggingIn) {
        return '/login';
      }
      if (isLoggedIn && isLoggingIn) {
        // Redirect to home if logged in
        return '/';
      }

      return null;
    },
    errorBuilder: (context, state) => const Scaffold(
      body: Center(child: Text('404: Page Not Found')),
    ),
  );
});
