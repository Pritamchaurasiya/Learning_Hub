import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:learning_hub/core/providers/auth_provider.dart';
import 'package:learning_hub/features/auth/login_screen.dart';
import 'package:learning_hub/data/models/user_model.dart';

// Create a mock for AuthNotifier
class MockAuthNotifier extends AuthNotifier {
  @override
  Future<User?> build() async {
    return null; // Initial state: not logged in
  }
}

void main() {
  testWidgets('LoginScreen has accessible social buttons and password toggle', (tester) async {
    // Set a large enough screen size to avoid overflow errors in constraints
    tester.view.physicalSize = const Size(1024, 768);
    tester.view.devicePixelRatio = 1.0;

    // Setup
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authProvider.overrideWith(() => MockAuthNotifier()),
        ],
        child: MediaQuery(
          data: const MediaQueryData(textScaler: TextScaler.linear(0.5)),
          child: const MaterialApp(
            home: LoginScreen(),
          ),
        ),
      ),
    );

    // Allow animations to settle
    await tester.pumpAndSettle();

    // 1. Verify Social Buttons have Semantics and Tooltips
    // We expect 3 social buttons: Google, Apple, Facebook
    final socialLabels = ['Google', 'Apple', 'Facebook'];

    for (final label in socialLabels) {
      // Check for Tooltip
      expect(
        find.byTooltip(label),
        findsOneWidget,
        reason: 'Tooltip with message "$label" should exist',
      );

      // Check for Semantics
      expect(
        find.bySemanticsLabel(label),
        findsOneWidget,
        reason: 'Semantics with label "$label" should exist',
      );
    }

    // 2. Verify Password Toggle Tooltip
    // Initially password is obscured (eye icon). Tooltip should be "Show password"
    expect(
        find.byTooltip('Show password'),
        findsOneWidget,
        reason: 'Password toggle should have "Show password" tooltip when obscured'
    );

    // Tap the toggle
    await tester.tap(find.byIcon(Icons.visibility_outlined));
    await tester.pump();

    // Now password is visible (eye-off icon). Tooltip should be "Hide password"
    expect(
        find.byTooltip('Hide password'),
        findsOneWidget,
        reason: 'Password toggle should have "Hide password" tooltip when visible'
    );

    // Cleanup
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
  });
}
