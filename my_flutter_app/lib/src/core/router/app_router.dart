import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:my_flutter_app/src/features/ai/presentation/ai_hub_screen.dart';
import 'package:my_flutter_app/src/features/ai/presentation/causal_graph_screen.dart';
import 'package:my_flutter_app/src/features/ai/presentation/curriculum_generator_screen.dart';
import 'package:my_flutter_app/src/features/ai/presentation/curriculum_screen.dart'
    deferred as curriculum_page;
import 'package:my_flutter_app/src/features/ai/presentation/module_detail_screen.dart';
import 'package:my_flutter_app/src/features/ai/presentation/quiz_screen.dart';
import 'package:my_flutter_app/src/features/ai/presentation/world_model_screen.dart';
import 'package:my_flutter_app/src/features/ai_chat/presentation/ai_chat_screen.dart';
import 'package:my_flutter_app/src/features/ai_engine/presentation/ai_tutor_screen.dart';
import 'package:my_flutter_app/src/features/auth/presentation/auth_controller.dart';
import 'package:my_flutter_app/src/features/auth/presentation/login_screen.dart';
import 'package:my_flutter_app/src/features/auth/presentation/profile_screen.dart';
import 'package:my_flutter_app/src/features/auth/presentation/register_screen.dart';
import 'package:my_flutter_app/src/features/cart/presentation/cart_screen.dart';
import 'package:my_flutter_app/src/features/courses/presentation/course_detail_screen.dart';
import 'package:my_flutter_app/src/features/courses/presentation/course_list_screen.dart';
import 'package:my_flutter_app/src/features/courses/presentation/downloads_screen.dart';
import 'package:my_flutter_app/src/features/dashboard/presentation/dashboard_screen.dart';
import 'package:my_flutter_app/src/features/discussions/presentation/discussion_screen.dart';
import 'package:my_flutter_app/src/features/dsa/presentation/dsa_screen.dart'
    deferred as dsa_page;
import 'package:my_flutter_app/src/features/dsa/presentation/screens/problem_detail_screen.dart';
import 'package:my_flutter_app/src/features/gamification/presentation/leaderboard_screen.dart';
import 'package:my_flutter_app/src/features/home/presentation/landing_screen.dart';
import 'package:my_flutter_app/src/features/home/presentation/skill_assessment_hub.dart';
import 'package:my_flutter_app/src/features/notifications/presentation/notifications_screen.dart';
import 'package:my_flutter_app/src/features/onboarding/presentation/onboarding_screen.dart';
import 'package:my_flutter_app/src/features/profile/presentation/instructor_profile_screen.dart';
import 'package:my_flutter_app/src/features/profile/presentation/settings_screen.dart';
import 'package:my_flutter_app/src/features/tutors/presentation/booking_screen.dart';
import 'package:my_flutter_app/src/features/tutors/presentation/tutors_list_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  ref.watch(authControllerProvider);

  return GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const LandingScreen(),
      ),
      GoRoute(
        path: '/hub',
        builder: (context, state) => const SkillAssessmentHub(),
      ),
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),
      GoRoute(
        path: '/dsa',
        builder: (context, state) => FutureBuilder(
          future: dsa_page.loadLibrary(),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.done) {
              return dsa_page.DSAScreen();
            }
            return const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            );
          },
        ),
        routes: [
          GoRoute(
            path: ':slug',
            builder: (context, state) => DsaProblemDetailScreen(
              slug: state.pathParameters['slug']!,
            ),
          ),
        ],
      ),
      GoRoute(
        path: '/courses',
        builder: (context, state) => const CourseListScreen(),
        routes: [
          GoRoute(
            path: ':slug',
            builder: (context, state) => CourseDetailScreen(
              slug: state.pathParameters['slug']!,
            ),
          ),
        ],
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/profile',
        builder: (context, state) => const ProfileScreen(),
      ),
      GoRoute(
        path: '/settings',
        builder: (context, state) => const SettingsScreen(),
      ),
      GoRoute(
        path: '/leaderboard',
        builder: (context, state) => const LeaderboardScreen(),
      ),
      GoRoute(
        path: '/notifications',
        builder: (context, state) => const NotificationsScreen(),
      ),
      GoRoute(
        path: '/discussions',
        builder: (context, state) => const DiscussionScreen(),
      ),
      GoRoute(
        path: '/dashboard',
        builder: (context, state) => const DashboardScreen(),
      ),
      GoRoute(
        path: '/cart',
        builder: (context, state) => const ShoppingCartScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/downloads',
        builder: (context, state) => const DownloadsScreen(),
      ),
      GoRoute(
        path: '/instructor/:id',
        builder: (context, state) => InstructorProfileScreen(
          instructorId: state.pathParameters['id']!,
        ),
      ),
      GoRoute(
        path: '/curriculum',
        builder: (context, state) => FutureBuilder(
          future: curriculum_page.loadLibrary(),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.done) {
              return curriculum_page.CurriculumScreen();
            }
            return const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            );
          },
        ),
        routes: [
          GoRoute(
            path: 'generate',
            builder: (context, state) => const CurriculumGeneratorScreen(),
          ),
          GoRoute(
            path: ':filename',
            builder: (context, state) => ModuleDetailScreen(
              filename: state.pathParameters['filename']!,
            ),
            routes: [
              GoRoute(
                path: 'quiz',
                builder: (context, state) => QuizScreen(
                  moduleSlug:
                      state.pathParameters['filename']!.replaceAll('.md', ''),
                ),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: '/ai-tutor',
        builder: (context, state) {
          final topic = state.uri.queryParameters['topic'];
          final contextFile = state.uri.queryParameters['contextFile'];
          return AiTutorScreen(topic: topic, contextFile: contextFile);
        },
      ),
      GoRoute(
        path: '/tutors',
        builder: (context, state) => const TutorsListScreen(),
        routes: [
          GoRoute(
            path: 'book',
            builder: (context, state) => const BookingScreen(),
          ),
        ],
      ),
      GoRoute(
        path: '/ai',
        builder: (context, state) => const AiHubScreen(),
        routes: [
          GoRoute(
            path: 'world-models',
            builder: (context, state) => const WorldModelScreen(),
          ),
          GoRoute(
            path: 'causal',
            builder: (context, state) => const CausalGraphScreen(),
          ),
        ],
      ),
      GoRoute(
        path: '/ai-chat',
        builder: (context, state) => const AiChatScreen(),
      ),
    ],
    redirect: (context, state) {
      final authState = ref.watch(authControllerProvider);
      final isLoggedIn = authState.asData?.value != null;
      final currentPath = state.uri.path;

      // Define public routes accessible without login
      const publicRoutes = [
        '/',
        '/login',
        '/register',
        '/courses',
        '/dsa',
        '/curriculum',
        '/leaderboard',
        '/instructor',
        '/onboarding',
      ];
      final isPublicRoute = publicRoutes.any(
        (route) => currentPath == route || currentPath.startsWith('$route/'),
      );

      // Protected routes that require authentication
      const protectedRoutes = ['/profile', '/downloads', '/settings'];
      final isProtectedRoute = protectedRoutes.any(
        (route) => currentPath == route || currentPath.startsWith('$route/'),
      );

      // Redirect logged-in users away from login/register
      if (isLoggedIn &&
          (currentPath == '/login' || currentPath == '/register')) {
        return '/';
      }

      // Require login only for protected routes
      if (!isLoggedIn && isProtectedRoute) {
        return '/login';
      }

      // Allow access to public routes without login
      if (isPublicRoute) {
        return null;
      }

      return null;
    },
    errorBuilder: (context, state) => const Scaffold(
      body: Center(child: Text('404: Page Not Found')),
    ),
  );
});
