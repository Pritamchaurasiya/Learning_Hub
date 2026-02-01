import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:learning_hub/core/providers/auth_provider.dart';
import 'package:learning_hub/data/models/user_model.dart';
import 'package:learning_hub/features/auth/login_screen.dart';

// Mock AuthNotifier to avoid dependency on real UserService
class MockAuthNotifier extends AuthNotifier {
  @override
  Future<User?> build() async {
    return null; // Start unauthenticated
  }

  @override
  Future<bool> login(String email, String password) async {
    return true;
  }

  @override
  Future<bool> loginWithBiometrics() async {
    return true;
  }
}

void main() {
  testWidgets('LoginScreen UX elements have proper accessibility attributes',
      (WidgetTester tester) async {
    // Enable semantics
    final handle = tester.ensureSemantics();

    // Build the widget tree
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authProvider.overrideWith(() => MockAuthNotifier()),
        ],
        child: MaterialApp(
          home: Builder(
            builder: (context) {
              // Use a smaller text scale to avoid RenderFlex overflow in constrained 400px width
              return MediaQuery(
                data: MediaQuery.of(context).copyWith(
                  textScaler: const TextScaler.linear(0.5),
                  size: const Size(800, 600), // Explicit size
                ),
                child: const LoginScreen(),
              );
            },
          ),
        ),
      ),
    );

    // Allow animations to complete
    await tester.pumpAndSettle();

    // 1. Check Password Visibility Toggle Tooltip
    final passwordToggleFinder = find.widgetWithIcon(IconButton, Icons.visibility_outlined);
    expect(passwordToggleFinder, findsOneWidget, reason: "Password toggle button not found");

    final iconButton = tester.widget<IconButton>(passwordToggleFinder);

    // This expectation should fail initially
    expect(iconButton.tooltip, isNotNull, reason: "Password toggle should have a tooltip");
    expect(iconButton.tooltip, 'Show password');

    // Tap to toggle
    await tester.tap(passwordToggleFinder);
    await tester.pumpAndSettle();

    // Now icon should be visibility_off_outlined
    final passwordToggleOffFinder = find.widgetWithIcon(IconButton, Icons.visibility_off_outlined);
    expect(passwordToggleOffFinder, findsOneWidget);

    final iconButtonOff = tester.widget<IconButton>(passwordToggleOffFinder);
    expect(iconButtonOff.tooltip, 'Hide password');

    // 2. Check Social Buttons Accessibility
    final googleIconFinder = find.byIcon(Icons.g_mobiledata);
    expect(googleIconFinder, findsOneWidget);

    // Check for Tooltip on Google button
    final googleTooltipFinder = find.ancestor(
      of: googleIconFinder,
      matching: find.byType(Tooltip),
    );

    // This expectation should fail initially
    expect(googleTooltipFinder, findsOneWidget, reason: "Social button (Google) should have a Tooltip");
    final googleTooltip = tester.widget<Tooltip>(googleTooltipFinder);
    expect(googleTooltip.message, 'Google');

    // Check for Semantics on Google button
    // Find the InkWell which handles the interaction
    final googleButtonFinder = find.ancestor(
      of: googleIconFinder,
      matching: find.byType(InkWell),
    );
    expect(googleButtonFinder, findsOneWidget);

    // Verify semantics
    // Note: InkWell adds implicit semantics (isButton, hasTapAction, etc.)
    // We want to verify that our label 'Google' is merged into it.
    // The Tooltip widget also adds a 'tooltip' semantic property.
    expect(
      tester.getSemantics(googleButtonFinder),
      matchesSemantics(
        label: 'Google',
        tooltip: 'Google',
        isButton: true,
        hasTapAction: true,
        isFocusable: true,
        hasFocusAction: true,
      ),
      reason: "Social button should have correct semantics",
    );

    handle.dispose();
  });
}
