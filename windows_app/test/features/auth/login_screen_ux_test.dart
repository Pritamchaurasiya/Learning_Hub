import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:learning_hub/features/auth/login_screen.dart';
import 'package:learning_hub/core/providers/auth_provider.dart';
import 'package:learning_hub/data/models/user_model.dart';
import 'package:flutter_animate/flutter_animate.dart';

// Mock AuthNotifier to avoid real backend calls
class MockAuthNotifier extends AuthNotifier {
  @override
  Future<User?> build() async {
    return null; // Initial state: not logged in
  }
}

void main() {
  setUp(() {
    // Disable animations for testing to avoid flakiness and pumpAndSettle timeouts
    Animate.restartOnHotReload = false;
  });

  testWidgets('LoginScreen UX accessibility checks', (WidgetTester tester) async {
    // Set a large enough surface size to avoid overflow errors in constraints
    tester.view.physicalSize = const Size(1200, 800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authProvider.overrideWith(() => MockAuthNotifier()),
        ],
        child: const MaterialApp(
          home: MediaQuery(
            data: MediaQueryData(
              textScaler: TextScaler.linear(0.5), // Shrink text to avoid overflow in test env
              size: Size(1200, 800), // Ensure media query size matches view
            ),
            child: LoginScreen(),
          ),
        ),
      ),
    );

    // Wait for initial animations (fadeIn, etc.) to complete
    await tester.pumpAndSettle();

    // 1. Check for AutofillHints on Email Field
    final emailFieldFinder = find.widgetWithText(TextFormField, 'Email');
    expect(emailFieldFinder, findsOneWidget, reason: 'Email field should exist');

    // Find the TextField descendant which holds the autofillHints
    final emailTextFieldFinder = find.descendant(of: emailFieldFinder, matching: find.byType(TextField));
    expect(emailTextFieldFinder, findsOneWidget);
    final TextField emailTextField = tester.widget(emailTextFieldFinder);

    expect(
      emailTextField.autofillHints,
      contains(AutofillHints.email),
      reason: "Email field should have AutofillHints.email"
    );

    // 2. Check for AutofillHints on Password Field
    final passwordFieldFinder = find.widgetWithText(TextFormField, 'Password');
    expect(passwordFieldFinder, findsOneWidget, reason: 'Password field should exist');

    final passwordTextFieldFinder = find.descendant(of: passwordFieldFinder, matching: find.byType(TextField));
    final TextField passwordTextField = tester.widget(passwordTextFieldFinder);

    expect(
      passwordTextField.autofillHints,
      contains(AutofillHints.password),
      reason: "Password field should have AutofillHints.password"
    );

    // 3. Check for Social Button Tooltips & Semantics
    // We expect the Google button to have a tooltip and semantic label "Google"
    final googleIconFinder = find.byIcon(Icons.g_mobiledata);
    expect(googleIconFinder, findsOneWidget, reason: 'Google icon should exist');

    final googleTooltipFinder = find.ancestor(
      of: googleIconFinder,
      matching: find.byType(Tooltip)
    );
    expect(googleTooltipFinder, findsOneWidget, reason: "Social button should be wrapped in a Tooltip");

    final Tooltip googleTooltip = tester.widget(googleTooltipFinder);
    expect(googleTooltip.message, 'Google', reason: "Tooltip message should be 'Google'");

    // Check Semantics
    // We look for a Semantics widget with label 'Google' and button: true
    final googleSemantics = find.byWidgetPredicate((widget) {
      if (widget is Semantics) {
        return widget.properties.label == 'Google' && widget.properties.button == true;
      }
      return false;
    });
    // Note: If Semantics is wrapped deeply, this predicate might need to be adjusted or we can use find.bySemanticsLabel if available/reliable.
    // However, finding the specific widget in the tree is safer for unit testing structure.
    expect(googleSemantics, findsOneWidget, reason: "Social button should have Semantics with label 'Google'");

    // 4. Check Password Visibility Toggle Tooltip
    // Initially password is obscure, so icon is visibility_outlined (open eye)
    final visibilityIconFinder = find.byIcon(Icons.visibility_outlined);
    expect(visibilityIconFinder, findsOneWidget, reason: 'Visibility icon should exist');

    final visibilityButtonFinder = find.ancestor(of: visibilityIconFinder, matching: find.byType(IconButton));
    expect(visibilityButtonFinder, findsOneWidget);

    final IconButton visibilityButton = tester.widget(visibilityButtonFinder);
    expect(visibilityButton.tooltip, isNotNull, reason: "Password visibility button should have a tooltip");
    expect(visibilityButton.tooltip, 'Show password', reason: "Tooltip should match current state");
  });
}
