import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

// Feature imports
import '../providers/auth_provider.dart';
import '../../data/models/user_model.dart';
import '../../features/splash/splash_screen.dart';
import '../../features/onboarding/onboarding_screen.dart';
import '../../features/auth/login_screen.dart';
import '../../features/auth/signup_screen.dart';
import '../../features/auth/forgot_password_screen.dart';
import '../../features/home/home_screen_v2.dart';
import '../../features/search/search_screen.dart';
import '../../features/library/library_screen.dart';
import '../../features/profile/profile_screen.dart';
import '../../features/course/course_detail_screen.dart';
import '../../features/course/lesson_player_screen.dart';
import '../../features/quiz/quiz_screen.dart';
import '../../features/ai_tutor/ai_tutor_screen.dart';
import '../../features/live/live_class_screen.dart';
import '../../features/settings/settings_screen.dart';
import '../../features/settings/admin_screen.dart';
import '../../features/peer_review/peer_review_screen.dart';
import '../../features/notifications/notifications_screen.dart';
import '../../features/study_planner/study_planner_screen.dart';
import '../../features/bookmarks/bookmarks_screen.dart';
import '../../features/downloads/downloads_screen.dart';
import '../../features/discussions/discussions_screen.dart';
import '../../features/profile/certificates_screen.dart';
import '../../features/achievements/achievements_screen.dart';
import '../../features/analytics/analytics_screen.dart';
import '../../features/mentorship/mentorship_screen.dart';
import '../../features/cart/cart_screen.dart';
import '../../features/gamification/screens/leaderboard_screen.dart';
import '../../features/learning_path/learning_path_screen.dart';
import '../../shared/widgets/main_scaffold.dart';

/// Navigation shell key for bottom navigation
final GlobalKey<NavigatorState> _rootNavigatorKey =
    GlobalKey<NavigatorState>(debugLabel: 'root');
final GlobalKey<NavigatorState> _shellNavigatorKey =
    GlobalKey<NavigatorState>(debugLabel: 'shell');

/// Router provider
final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/splash',
    debugLogDiagnostics: true,

    // Authentication and Role-based Guards
    redirect: (context, state) {
      final authState = ref.read(authProvider);
      final user = authState.value;
      final isAuthenticated = user != null;

      final isSplash = state.matchedLocation == '/splash';
      final isLoggingIn = state.matchedLocation == '/login' ||
          state.matchedLocation == '/signup';

      // 1. Handle splash screen transition
      if (isSplash) return null;

      // 2. Redirect to login if not authenticated and trying to access protected route
      final protectedRoutes = [
        '/profile',
        '/settings',
        '/admin',
        '/ai-tutor',
        '/leaderboard',
        '/cart',
      ];
      final isProtectedRoute = protectedRoutes.any(
        (url) => state.matchedLocation.startsWith(url),
      );

      if (!isAuthenticated && isProtectedRoute) {
        return '/login';
      }

      // 3. Redirect to home if logged in and trying to access login/signup
      if (isAuthenticated && isLoggingIn) {
        return '/';
      }

      // 4. Admin Role Check
      if (state.matchedLocation.startsWith('/admin')) {
        if (user?.role != UserRole.admin) {
          return '/';
        }
      }

      return null;
    },

    routes: [
      // Splash Screen
      GoRoute(
        path: '/splash',
        name: 'splash',
        builder: (context, state) => const SplashScreen(),
      ),

      // Onboarding Screen
      GoRoute(
        path: '/onboarding',
        name: 'onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),

      // ... (existing routes)

      // Authentication Routes
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/signup',
        name: 'signup',
        builder: (context, state) => const SignupScreen(),
      ),
      GoRoute(
        path: '/forgot-password',
        name: 'forgot-password',
        builder: (context, state) => const ForgotPasswordScreen(),
      ),

      // Main App with Bottom Navigation Shell
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) => MainScaffold(child: child),
        routes: [
          // Home
          GoRoute(
            path: '/',
            name: 'home',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: HomeScreenV2(),
            ),
          ),

          // Search
          GoRoute(
            path: '/search',
            name: 'search',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: SearchScreen(),
            ),
          ),

          // Library / My Learning
          GoRoute(
            path: '/library',
            name: 'library',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: LibraryScreen(),
            ),
          ),

          // Profile
          GoRoute(
            path: '/profile',
            name: 'profile',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: ProfileScreen(),
            ),
          ),
        ],
      ),

      // Leaderboard
      GoRoute(
        path: '/leaderboard',
        name: 'leaderboard',
        builder: (context, state) => const LeaderboardScreen(),
      ),

      // Course Detail (Full Screen)
      GoRoute(
        path: '/course/:courseId',
        name: 'course-detail',
        builder: (context, state) {
          final courseId = state.pathParameters['courseId'] ?? '';
          return CourseDetailScreen(courseId: courseId);
        },
        routes: [
          // Lesson Player (Nested under course)
          GoRoute(
            path: 'lesson/:lessonId',
            name: 'lesson-player',
            builder: (context, state) {
              final courseId = state.pathParameters['courseId'] ?? '';
              final lessonId = state.pathParameters['lessonId'] ?? '';
              return LessonPlayerScreen(
                courseId: courseId,
                lessonId: lessonId,
              );
            },
          ),

          // Quiz (Nested under course)
          GoRoute(
            path: 'quiz/:quizId',
            name: 'quiz',
            builder: (context, state) {
              final courseId = state.pathParameters['courseId'] ?? '';
              final quizId = state.pathParameters['quizId'] ?? '';
              return QuizScreen(
                courseId: courseId,
                quizId: quizId,
              );
            },
          ),
        ],
      ),

      // AI Tutor
      GoRoute(
        path: '/ai-tutor',
        name: 'ai-tutor',
        builder: (context, state) {
          final lessonId = state.uri.queryParameters['lessonId'];
          return AiTutorScreen(lessonId: lessonId);
        },
      ),

      // Live Class
      GoRoute(
        path: '/live/:classId',
        name: 'live-class',
        builder: (context, state) {
          final classId = state.pathParameters['classId'] ?? '';
          return LiveClassScreen(classId: classId);
        },
      ),

      // Settings
      GoRoute(
        path: '/settings',
        name: 'settings',
        builder: (context, state) => const SettingsScreen(),
      ),

      // Certificates
      GoRoute(
        path: '/certificates',
        name: 'certificates',
        builder: (context, state) => const CertificatesScreen(),
      ),

      // Notifications
      GoRoute(
        path: '/notifications',
        name: 'notifications',
        builder: (context, state) => const NotificationsScreen(),
      ),

      // Study Planner
      GoRoute(
        path: '/study-planner',
        name: 'study-planner',
        builder: (context, state) => const StudyPlannerScreen(),
      ),

      // Bookmarks
      GoRoute(
        path: '/bookmarks',
        name: 'bookmarks',
        builder: (context, state) => const BookmarksScreen(),
      ),

      // Downloads
      GoRoute(
        path: '/downloads',
        name: 'downloads',
        builder: (context, state) => const DownloadsScreen(),
      ),

      // Discussions
      GoRoute(
        path: '/discussions/:courseId',
        name: 'discussions',
        builder: (context, state) {
          final courseId = state.pathParameters['courseId'] ?? '';
          return DiscussionsScreen(courseId: courseId);
        },
      ),

      // Achievements
      GoRoute(
        path: '/achievements',
        name: 'achievements',
        builder: (context, state) => const AchievementsScreen(),
      ),

      // Mentorship
      GoRoute(
        path: '/mentorship',
        name: 'mentorship',
        builder: (context, state) => const MentorshipScreen(),
      ),

      // Analytics
      GoRoute(
        path: '/analytics',
        name: 'analytics',
        builder: (context, state) => const AnalyticsScreen(),
      ),

      // Admin Dashboard
      GoRoute(
        path: '/admin',
        name: 'admin',
        builder: (context, state) => const AdminScreen(),
      ),

      // Peer Reviews
      GoRoute(
        path: '/peer-reviews',
        name: 'peer-reviews',
        builder: (context, state) => const PeerReviewScreen(),
      ),

      // Learning Path
      GoRoute(
        path: '/learning-path',
        name: 'learning-path',
        builder: (context, state) => const LearningPathListScreen(),
        routes: [
          GoRoute(
            path: ':pathId',
            name: 'learning-path-detail',
            builder: (context, state) {
              final pathId = state.pathParameters['pathId'] ?? '';
              return LearningPathDetailScreen(pathId: pathId);
            },
          ),
        ],
      ),

      // Cart
      GoRoute(
        path: '/cart',
        name: 'cart',
        builder: (context, state) => const CartScreen(),
      ),
    ],

    // Premium Error Page
    errorBuilder: (context, state) {
      final theme = Theme.of(context);
      final isDark = theme.brightness == Brightness.dark;
      return Scaffold(
        body: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(32),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Animated 404 illustration
                  Container(
                    width: 160,
                    height: 160,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          theme.colorScheme.primary.withValues(alpha: 0.1),
                          theme.colorScheme.secondary.withValues(alpha: 0.1),
                        ],
                      ),
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        '404',
                        style: theme.textTheme.displayLarge?.copyWith(
                          fontWeight: FontWeight.w900,
                          foreground: Paint()
                            ..shader = LinearGradient(
                              colors: [
                                theme.colorScheme.primary,
                                theme.colorScheme.secondary,
                              ],
                            ).createShader(
                                const Rect.fromLTWH(0, 0, 200, 70)),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),
                  Text(
                    'Oops! Page Not Found',
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'The page you\'re looking for doesn\'t exist or has been moved. Let\'s get you back on track.',
                    style: theme.textTheme.bodyLarge?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                      height: 1.5,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.05)
                          : Colors.black.withValues(alpha: 0.04),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      state.uri.path,
                      style: theme.textTheme.bodySmall?.copyWith(
                        fontFamily: 'monospace',
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                  const SizedBox(height: 40),
                  // Primary CTA
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton.icon(
                      onPressed: () => context.go('/'),
                      icon: const Icon(Icons.home_outlined),
                      label: const Text('Go to Home'),
                    ),
                  ),
                  const SizedBox(height: 12),
                  // Secondary CTA
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: OutlinedButton.icon(
                      onPressed: () => context.go('/search'),
                      icon: const Icon(Icons.search),
                      label: const Text('Search Courses'),
                    ),
                  ),
                  const SizedBox(height: 32),
                  // Quick links
                  Text(
                    'Popular Destinations',
                    style: theme.textTheme.labelLarge?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    alignment: WrapAlignment.center,
                    children: [
                      _QuickLink(
                          label: 'My Learning',
                          onTap: () => context.go('/library')),
                      _QuickLink(
                          label: 'AI Tutor',
                          onTap: () => context.go('/ai-tutor')),
                      _QuickLink(
                          label: 'Live Classes',
                          onTap: () => context.go('/')),
                      _QuickLink(
                          label: 'Profile',
                          onTap: () => context.go('/profile')),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    },
  );
});

/// Navigation helper extensions
extension GoRouterExtensions on GoRouter {
  /// Navigate to leaderboard
  void goToLeaderboard() {
    go('/leaderboard');
  }

  /// Navigate to course detail
  void goToCourse(String courseId) {
    go('/course/$courseId');
  }

  /// Navigate to lesson player
  void goToLesson(String courseId, String lessonId) {
    go('/course/$courseId/lesson/$lessonId');
  }

  /// Navigate to quiz
  void goToQuiz(String courseId, String quizId) {
    go('/course/$courseId/quiz/$quizId');
  }

  /// Navigate to AI tutor with optional lesson context
  void goToAiTutor({String? lessonId}) {
    if (lessonId != null) {
      go('/ai-tutor?lessonId=$lessonId');
    } else {
      go('/ai-tutor');
    }
  }

  /// Navigate to live class
  void goToLiveClass(String classId) {
    go('/live/$classId');
  }

  /// Navigate to study planner
  void goToStudyPlanner() {
    go('/study-planner');
  }

  /// Navigate to bookmarks
  void goToBookmarks() {
    go('/bookmarks');
  }

  /// Navigate to downloads
  void goToDownloads() {
    go('/downloads');
  }

  /// Navigate to discussions
  void goToDiscussions(String courseId) {
    go('/discussions/$courseId');
  }

  /// Navigate to admin dashboard
  void goToAdmin() {
    go('/admin');
  }

  /// Navigate to peer reviews
  void goToPeerReviews() {
    go('/peer-reviews');
  }
}

/// Quick link chip widget for 404 error page
class _QuickLink extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _QuickLink({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ActionChip(
      label: Text(label),
      onPressed: onTap,
      backgroundColor: theme.colorScheme.surfaceContainerHighest,
      labelStyle: theme.textTheme.labelMedium?.copyWith(
        color: theme.colorScheme.primary,
        fontWeight: FontWeight.w500,
      ),
      side: BorderSide(
        color: theme.colorScheme.primary.withValues(alpha: 0.2),
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
      ),
    );
  }
}
