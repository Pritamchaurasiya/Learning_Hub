import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:learning_hub/core/providers/auth_provider.dart';
import 'package:learning_hub/data/models/user_model.dart';
import 'package:learning_hub/features/auth/login_screen.dart';

// Mock AuthNotifier
class MockAuthNotifier extends AuthNotifier {
  @override
  Future<User?> build() async {
    return null; // Initial state: not logged in
  }
}

void main() {
  testWidgets('LoginScreen accessibility test', (WidgetTester tester) async {
    // Set a large enough surface size to avoid layout overflows in the ConstrainedBox
    tester.view.physicalSize = const Size(1200, 800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authProvider.overrideWith(() => MockAuthNotifier()),
        ],
        child: const MaterialApp(
          home: MediaQuery(
            data: MediaQueryData(
              size: Size(1200, 800),
              textScaler: TextScaler.linear(0.5), // Reduce text scale to ensure fit
            ),
            child: LoginScreen(),
          ),
        ),
      ),
    );

    // Wait for animations to settle
    await tester.pumpAndSettle();

    // 1. Check for Social Login Buttons Accessibility
    // The Google button should have a semantic label "Google"
    // Currently, it's just an Icon inside an InkWell, so this should fail.
    final googleButtonFinder = find.byWidgetPredicate(
      (widget) => widget is Semantics && widget.properties.label == 'Google' && widget.properties.button == true,
    );
    expect(googleButtonFinder, findsOneWidget, reason: 'Google button should have semantic label \'Google\'');

    // 2. Check for Password Visibility Toggle Tooltip
    // Currently, the IconButton has no tooltip, so this should fail.
    final visibilityIconFinder = find.byIcon(Icons.visibility_outlined);
    final tooltipFinder = find.ancestor(
        of: visibilityIconFinder, matching: find.byType(Tooltip));

    expect(tooltipFinder, findsOneWidget, reason: 'Password visibility toggle should have a tooltip');

    final tooltip = tester.widget<Tooltip>(tooltipFinder);
    expect(tooltip.message, 'Show password', reason: 'Tooltip message should be \'Show password\'');

    // 3. Check for AutofillHints
    // Currently missing.
    final emailFieldFinder = find.ancestor(
        of: find.text('Email'), matching: find.byType(TextFormField));
    final passwordFieldFinder = find.ancestor(
        of: find.text('Password'), matching: find.byType(TextFormField));

    // We need to access the TextField inside the TextFormField to check autofillHints
    final emailTextField = find.descendant(of: emailFieldFinder, matching: find.byType(TextField));
    final passwordTextField = find.descendant(of: passwordFieldFinder, matching: find.byType(TextField));

    final emailWidget = tester.widget<TextField>(emailTextField);
    final passwordWidget = tester.widget<TextField>(passwordTextField);

    expect(emailWidget.autofillHints, contains(AutofillHints.email), reason: 'Email field should have email autofill hint');
    expect(passwordWidget.autofillHints, contains(AutofillHints.password), reason: 'Password field should have password autofill hint');
  });
}
