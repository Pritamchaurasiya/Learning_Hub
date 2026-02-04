import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:learning_hub/features/auth/login_screen.dart';
import 'package:learning_hub/core/providers/auth_provider.dart';
import 'package:learning_hub/data/models/user_model.dart';
import 'package:flutter_animate/flutter_animate.dart';

// Mock AuthNotifier
class MockAuthNotifier extends AuthNotifier {
  @override
  Future<User?> build() async {
    return null; // Not logged in
  }
}

void main() {
  setUp(() {
     Animate.restartOnHotReload = false; // Disable animations for testing stability
  });

  testWidgets('LoginScreen UX accessibility checks', (WidgetTester tester) async {
    // Set a large enough surface to avoid overflow
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
              size: Size(1200, 800),
              textScaler: TextScaler.linear(0.5), // Reduce text size to prevent overflow in test
            ),
            child: const Scaffold(body: LoginScreen()),
          ),
        ),
      ),
    );

    // Wait for animations to complete
    await tester.pumpAndSettle();

    // 1. Check for AutofillHints on Email Field
    final emailField = find.widgetWithText(TextFormField, 'Email');
    expect(emailField, findsOneWidget, reason: 'Email field not found');

    final emailTextField = find.descendant(of: emailField, matching: find.byType(TextField));
    expect(emailTextField, findsOneWidget);
    final TextField emailTf = tester.widget(emailTextField);
    expect(emailTf.autofillHints, contains(AutofillHints.email), reason: "Email field should have email autofill hint");

    // 2. Check for AutofillHints on Password Field
    final passwordField = find.widgetWithText(TextFormField, 'Password');
    expect(passwordField, findsOneWidget, reason: 'Password field not found');

    final passwordTextField = find.descendant(of: passwordField, matching: find.byType(TextField));
    final TextField passwordTf = tester.widget(passwordTextField);
    expect(passwordTf.autofillHints, contains(AutofillHints.password), reason: "Password field should have password autofill hint");

    // 3. Check for Social Button Tooltips/Semantics
    final googleIcon = find.byIcon(Icons.g_mobiledata);
    expect(googleIcon, findsOneWidget, reason: 'Google icon not found');

    // Check if the ancestor Tooltip exists with correct message
    final googleTooltip = find.ancestor(of: googleIcon, matching: find.byType(Tooltip));
    expect(googleTooltip, findsOneWidget, reason: "Social buttons should have tooltips");
    expect((tester.widget(googleTooltip) as Tooltip).message, 'Google');

    // Check for Semantics label
    // We expect a Semantics widget with label 'Google' and button: true to be an ancestor of the icon
    // or wrapping the interactive area.
    final googleSemantics = find.ancestor(of: googleIcon, matching: find.byWidgetPredicate((widget) {
        if (widget is Semantics) {
             return widget.properties.label == 'Google' && widget.properties.button == true;
        }
        return false;
    }));
    expect(googleSemantics, findsOneWidget, reason: "Social buttons should have Semantics(label: 'Google', button: true)");


    // 4. Check Password Visibility Toggle Tooltip
    // Initially obscure is true, so icon is visibility_outlined (Show password)
    final visibilityIcon = find.byIcon(Icons.visibility_outlined);
    expect(visibilityIcon, findsOneWidget);

    final visibilityBtn = find.ancestor(of: visibilityIcon, matching: find.byType(IconButton));
    expect(visibilityBtn, findsOneWidget);
    expect((tester.widget(visibilityBtn) as IconButton).tooltip, 'Show password', reason: "Password visibility toggle should have tooltip 'Show password'");

    // Tap to toggle
    await tester.tap(visibilityBtn);
    await tester.pump();

    // Now obscure is false, icon is visibility_off_outlined (Hide password)
    final visibilityOffIcon = find.byIcon(Icons.visibility_off_outlined);
    expect(visibilityOffIcon, findsOneWidget);
    final visibilityOffBtn = find.ancestor(of: visibilityOffIcon, matching: find.byType(IconButton));
    expect((tester.widget(visibilityOffBtn) as IconButton).tooltip, 'Hide password', reason: "Password visibility toggle should have tooltip 'Hide password'");

    // Reset view size
    addTearDown(() => tester.view.resetPhysicalSize());
  });
}
