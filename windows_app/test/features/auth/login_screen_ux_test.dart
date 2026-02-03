import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:learning_hub/features/auth/login_screen.dart';
import 'package:learning_hub/core/providers/auth_provider.dart';
import 'package:learning_hub/data/models/user_model.dart';

// Mock AuthNotifier
class MockAuthNotifier extends AuthNotifier {
  @override
  Future<User?> build() async {
    return null; // Unauthenticated
  }
}

void main() {
  setUp(() {
    Animate.restartOnHotReload = false;
  });

  testWidgets('LoginScreen has accessible social buttons and password toggle', (WidgetTester tester) async {
    // Resize for desktop to ensure all widgets are laid out without scrolling issues if needed,
    // though LoginScreen is responsive.
    tester.view.physicalSize = const Size(1200, 800);
    tester.view.devicePixelRatio = 1.0;

    // Build the widget
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authProvider.overrideWith(() => MockAuthNotifier()),
        ],
        child: MaterialApp(
          home: MediaQuery(
            data: const MediaQueryData(
              textScaler: TextScaler.linear(0.5), // Reduce text scale to prevent overflow in test
              size: Size(1200, 800),
            ),
            child: const LoginScreen(),
          ),
        ),
      ),
    );

    // Pump and settle to let animations finish
    await tester.pumpAndSettle();

    // 1. Check Password Visibility Toggle Tooltip
    // Initially obscured, so should show "Show password"
    expect(find.byTooltip('Show password'), findsOneWidget, reason: 'Password toggle should have tooltip "Show password"');

    // 2. Check Social Buttons Accessibility
    // Google button
    final googleButton = find.byTooltip('Google');
    expect(googleButton, findsOneWidget, reason: 'Google button should have tooltip');

    // Check Semantics
    // Note: Tooltip typically wraps the child in Semantics with label.
    // If we add explicit Semantics(button: true), we need to check merged semantics.
    expect(tester.getSemantics(googleButton), matchesSemantics(
      label: 'Google',
      isButton: true,
      hasTapAction: true,
      isFocusable: true,
      hasFocusAction: true,
    ));

    // Apple button
    final appleButton = find.byTooltip('Apple');
    expect(appleButton, findsOneWidget, reason: 'Apple button should have tooltip');
    expect(tester.getSemantics(appleButton), matchesSemantics(
      label: 'Apple',
      isButton: true,
      hasTapAction: true,
      isFocusable: true,
      hasFocusAction: true,
    ));

    // Facebook button
    final facebookButton = find.byTooltip('Facebook');
    expect(facebookButton, findsOneWidget, reason: 'Facebook button should have tooltip');
    expect(tester.getSemantics(facebookButton), matchesSemantics(
      label: 'Facebook',
      isButton: true,
      hasTapAction: true,
      isFocusable: true,
      hasFocusAction: true,
    ));

    // Clean up
    addTearDown(tester.view.resetPhysicalSize);
  });
}
