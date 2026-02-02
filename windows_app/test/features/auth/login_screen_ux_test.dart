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
    return null; // Start as not logged in
  }
}

void main() {
  testWidgets('LoginScreen accessibility verification', (WidgetTester tester) async {
    // Disable animations for testing to speed up and avoid flakiness
    Animate.restartOnHotReload = false;

    // Use a constraint that allows the login screen to render nicely (it has a ConstrainedBox max 400)
    tester.view.physicalSize = const Size(1200, 800);
    tester.view.devicePixelRatio = 1.0;

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authProvider.overrideWith(() => MockAuthNotifier()),
        ],
        child: MaterialApp(
          home: MediaQuery(
            data: const MediaQueryData(
              textScaler: TextScaler.linear(0.5),
              size: Size(1200, 800),
            ),
            child: const LoginScreen(),
          ),
        ),
      ),
    );

    // Pump and settle to let animations (fade ins) complete
    await tester.pumpAndSettle();

    // 1. Verify Social Buttons exist
    expect(find.byIcon(Icons.g_mobiledata), findsOneWidget); // Google
    expect(find.byIcon(Icons.apple), findsOneWidget);       // Apple
    expect(find.byIcon(Icons.facebook), findsOneWidget);    // Facebook

    // 2. Check for Tooltips on Social Buttons
    // We expect to find Tooltips now (TDD style - this should fail first)
    final googleTooltipFinder = find.ancestor(
      of: find.byIcon(Icons.g_mobiledata),
      matching: find.byType(Tooltip),
    );
    expect(googleTooltipFinder, findsOneWidget, reason: "Google button should have a tooltip");

    // Verify the tooltip message matches the label (we can't easily check message without finding the widget)
    // But finding one is a good start.

    // 3. Find the visibility toggle (Icon)
    // The text field has 'Password' label
    final passwordFieldFinder = find.widgetWithText(TextFormField, 'Password');

    // Find the visibility icon inside it
    final visibilityIconFinder = find.descendant(
      of: passwordFieldFinder,
      matching: find.byIcon(Icons.visibility_outlined),
    );
    expect(visibilityIconFinder, findsOneWidget);

    // 4. Check for Tooltip on Visibility Toggle
    // We expect to find a Tooltip with "Show password"
    final showPasswordTooltipFinder = find.byWidgetPredicate((widget) {
      return widget is Tooltip && widget.message == 'Show password';
    });

    expect(showPasswordTooltipFinder, findsOneWidget, reason: "Password toggle should have 'Show password' tooltip");

    // Reset view
    addTearDown(tester.view.resetPhysicalSize);
  });
}
