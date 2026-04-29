import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:learning_hub/core/providers/auth_provider.dart';
import 'package:learning_hub/features/auth/login_screen.dart';
import 'package:learning_hub/data/models/user_model.dart';

// Mock User
final mockUser = User(
  id: 'test_user',
  email: 'test@test.com',
  displayName: 'Test User',
  role: UserRole.student,
  enrolledCourseIds: [],
  completedCourseIds: [],
  wishlistCourseIds: [],
  preferences: UserPreferences.defaultPreferences(),
  stats: UserStats.empty(),
  lastLoginAt: DateTime.now(),
  createdAt: DateTime.now(),
  isActive: true,
  isVerified: true,
);

class MockAuthNotifier extends AuthNotifier {
  @override
  Future<User?> build() async {
    return null; // Start unauthenticated
  }

  @override
  Future<bool> login(String email, String password) async {
    if (email == 'test@test.com' && password == 'password') {
      state = AsyncValue.data(mockUser);
      return true;
    }
    return false;
  }
}

void main() {
  testWidgets('Integration: Login Flow navigates to Home on success',
      (WidgetTester tester) async {
    // Setup GoRouter
    final router = GoRouter(
      initialLocation: '/login',
      routes: [
        GoRoute(
          path: '/login',
          builder: (context, state) => const LoginScreen(),
        ),
        GoRoute(
          path: '/',
          builder: (context, state) =>
              const Scaffold(body: Text('Home Screen')),
        ),
      ],
    );

    // Set viewport
    tester.view.physicalSize = const Size(1200, 800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    // Pump widget with mocked auth provider
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authProvider.overrideWith(() => MockAuthNotifier()),
        ],
        child: MaterialApp.router(
          routerConfig: router,
        ),
      ),
    );

    // Verify Login Screen
    expect(find.byType(LoginScreen), findsOneWidget);
    expect(find.text('Welcome Back'), findsOneWidget);

    // Enter credentials
    await tester.enterText(find.byType(TextFormField).at(0), 'test@test.com');
    await tester.enterText(find.byType(TextFormField).at(1), 'password');
    await tester.pump();

    // Tap Login
    // Find button - text 'Login' might be in title and button. Find Valid button.
    // Usually the button text is "Login" or "Sign In".
    // Assuming 'Login' text works or by Type FilledButton.
    await tester.tap(find.widgetWithText(ElevatedButton, 'Sign In'));

    // Pump for async login and navigation
    await tester.pumpAndSettle();

    // Verify Navigation to Home
    expect(find.text('Home Screen'), findsOneWidget);
    expect(find.byType(LoginScreen), findsNothing);
  });

  testWidgets('Integration: Login Flow shows error on failure',
      (WidgetTester tester) async {
    // Setup GoRouter
    final router = GoRouter(
      initialLocation: '/login',
      routes: [
        GoRoute(
          path: '/login',
          builder: (context, state) => const LoginScreen(),
        ),
      ],
    );

    // Set viewport
    tester.view.physicalSize = const Size(1200, 800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authProvider.overrideWith(() => MockAuthNotifier()),
        ],
        child: MaterialApp.router(
          routerConfig: router,
        ),
      ),
    );

    // Enter INVALID credentials
    await tester.enterText(find.byType(TextFormField).at(0), 'wrong@test.com');
    await tester.enterText(find.byType(TextFormField).at(1), 'wrongpassword');
    await tester.pump();

    // Tap Login
    await tester.tap(find.widgetWithText(ElevatedButton, 'Sign In'));
    await tester.pumpAndSettle();

    // Verify Error Message
    expect(find.text('Invalid email or password'), findsOneWidget);
    expect(find.byType(LoginScreen), findsOneWidget);
  });
}
