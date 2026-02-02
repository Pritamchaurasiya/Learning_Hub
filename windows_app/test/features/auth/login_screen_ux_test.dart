import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:learning_hub/features/auth/login_screen.dart';
import 'package:learning_hub/core/providers/auth_provider.dart';
import 'package:learning_hub/data/models/user_model.dart';

// Mock AuthNotifier to bypass backend calls
class MockAuthNotifier extends AuthNotifier {
  @override
  Future<User?> build() async {
    return null; // Unauthenticated initially
  }

  @override
  Future<bool> login(String email, String password) async {
    return true; // Simulate success
  }
}

void main() {
  testWidgets('LoginScreen UX and Accessibility Test', (WidgetTester tester) async {
    // Set a large enough screen size to avoid overflow errors in tests
    tester.view.physicalSize = const Size(1280, 800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    // Build the widget with the mocked provider
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authProvider.overrideWith(() => MockAuthNotifier()),
        ],
        child: const MaterialApp(
          home: MediaQuery(
            data: MediaQueryData(
              size: Size(1280, 800),
              textScaler: TextScaler.linear(0.8), // Reduce text scale to prevent overflow in test env
            ),
            child: LoginScreen(),
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // 1. Verify Social Buttons have Semantic Labels or Tooltips
    // Finding by Icon is easy, but we want to check accessibility.
    // The current implementation has no labels.
    // We expect to find Semantics with label "Sign in with Google" etc.

    // Check Google Button
    final googleIconFinder = find.byIcon(Icons.g_mobiledata);
    expect(googleIconFinder, findsOneWidget);

    // Verify Tooltip exists for Google Button
    final googleTooltipFinder = find.ancestor(
      of: googleIconFinder,
      matching: find.byType(Tooltip),
    );
    expect(googleTooltipFinder, findsOneWidget, reason: 'Google button should have a Tooltip');
    final googleTooltip = tester.widget<Tooltip>(googleTooltipFinder);
    expect(googleTooltip.message, contains('Google'));

    // 2. Verify Password Visibility Toggle has Tooltip
    // Initially obscure
    final visibilityIconFinder = find.byIcon(Icons.visibility_outlined);
    expect(visibilityIconFinder, findsOneWidget);

    // Check for Tooltip ancestor
    final tooltipFinder = find.ancestor(
      of: visibilityIconFinder,
      matching: find.byType(Tooltip),
    );

    // This should fail initially
    if (findsOneWidget.matches(tooltipFinder, <dynamic, dynamic>{})) {
         final tooltip = tester.widget<Tooltip>(tooltipFinder);
         expect(tooltip.message, equals('Show password'));
    } else {
        // If not found, we will assert it fails later, but for now let's just log or use expect
        expect(tooltipFinder, findsOneWidget, reason: 'Password visibility toggle should have a Tooltip');
    }

    // 3. Verify Autofill Hints
    // Find Email Field
    final emailFieldFinder = find.widgetWithText(TextFormField, 'Email');
    expect(emailFieldFinder, findsOneWidget);

    final emailTextField = tester.widget<TextField>(
      find.descendant(of: emailFieldFinder, matching: find.byType(TextField)),
    );

    expect(emailTextField.autofillHints, contains(AutofillHints.email), reason: 'Email field should have autofill hints');

    // Find Password Field
    final passwordFieldFinder = find.widgetWithText(TextFormField, 'Password');
    expect(passwordFieldFinder, findsOneWidget);

    final passwordTextField = tester.widget<TextField>(
      find.descendant(of: passwordFieldFinder, matching: find.byType(TextField)),
    );

    expect(passwordTextField.autofillHints, contains(AutofillHints.password), reason: 'Password field should have autofill hints');
  });
}
