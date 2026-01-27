import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:learning_hub/core/providers/auth_provider.dart';
import 'package:learning_hub/features/auth/login_screen.dart';
import 'package:learning_hub/data/models/user_model.dart';
import 'package:mocktail/mocktail.dart';

// Mock AuthNotifier
class MockAuthNotifier extends AsyncNotifier<User?> with Mock implements AuthNotifier {
  @override
  Future<User?> build() async {
    return null; // Initial state: not logged in
  }
}

void main() {
  setUpAll(() {
    registerFallbackValue(AsyncValue<User?>.data(null));
  });

  testWidgets('LoginScreen has accessible social buttons and password toggle', (WidgetTester tester) async {
    // Set a large enough screen size to avoid overflows
    tester.binding.window.physicalSizeTestValue = const Size(1200, 1000);
    tester.binding.window.devicePixelRatioTestValue = 1.0;
    addTearDown(tester.binding.window.clearPhysicalSizeTestValue);

    // Arrange
    final mockAuthNotifier = MockAuthNotifier();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authProvider.overrideWith(() => mockAuthNotifier),
        ],
        child: MaterialApp(
          home: const LoginScreen(),
          builder: (context, child) {
            return MediaQuery(
              data: MediaQuery.of(context).copyWith(
                textScaler: const TextScaler.linear(0.5),
              ),
              child: child!,
            );
          },
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Act & Assert 1: Social Buttons
    // Find social buttons by finding the icons first
    final googleIcon = find.byIcon(Icons.g_mobiledata);
    final appleIcon = find.byIcon(Icons.apple);
    final facebookIcon = find.byIcon(Icons.facebook);

    expect(googleIcon, findsOneWidget);
    expect(appleIcon, findsOneWidget);
    expect(facebookIcon, findsOneWidget);

    // Verify Semantics
    expect(find.bySemanticsLabel('Sign in with Google'), findsOneWidget);
    expect(find.bySemanticsLabel('Sign in with Apple'), findsOneWidget);
    expect(find.bySemanticsLabel('Sign in with Facebook'), findsOneWidget);

    // Verify Tooltip
    expect(find.byTooltip('Sign in with Google'), findsOneWidget);
    expect(find.byTooltip('Sign in with Apple'), findsOneWidget);
    expect(find.byTooltip('Sign in with Facebook'), findsOneWidget);

    // Act & Assert 2: Password Visibility Toggle
    // Initial state: Obscured = true. Icon should be "visibility_outlined" (Eye).
    final visibilityIcon = find.byIcon(Icons.visibility_outlined);
    expect(visibilityIcon, findsOneWidget);

    // Check for "Show password" tooltip
    expect(find.byTooltip('Show password'), findsOneWidget);

    // Tap to show password
    await tester.tap(visibilityIcon);
    await tester.pump();

    // New state: Obscured = false. Icon should be "visibility_off_outlined" (Eye Slash).
    expect(find.byIcon(Icons.visibility_off_outlined), findsOneWidget);

    // Check for "Hide password" tooltip
    expect(find.byTooltip('Hide password'), findsOneWidget);
  });
}
