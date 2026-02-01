import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:learning_hub/core/providers/auth_provider.dart';
import 'package:learning_hub/data/models/user_model.dart';
import 'package:learning_hub/features/auth/login_screen.dart';
import 'package:learning_hub/features/auth/signup_screen.dart';

// Mock AuthNotifier
class MockAuthNotifier extends AuthNotifier {
  @override
  Future<User?> build() async {
    return null; // Not logged in
  }

  @override
  Future<bool> login(String email, String password) async {
    return true;
  }

  @override
  Future<bool> register({
    required String email,
    required String password,
    required String displayName,
  }) async {
    return true;
  }
}

void main() {
  // Helper to pump widget with proper environment to avoid overflows
  Future<void> pumpScreen(WidgetTester tester, Widget screen) async {
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
              textScaler: TextScaler.linear(0.8), // Reduce text size to prevent overflows in test
            ),
            child: screen,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  group('LoginScreen Accessibility Tests', () {
    testWidgets('Password visibility toggle has correct tooltip', (tester) async {
      await pumpScreen(tester, const LoginScreen());

      // Find the password toggle button (initially obscured -> eye icon)
      final visibilityIconFinder = find.byIcon(Icons.visibility_outlined);
      expect(visibilityIconFinder, findsOneWidget);

      // Check for the Tooltip widget wrapping the button or icon
      final tooltipFinder = find.byTooltip('Show password');
      expect(tooltipFinder, findsOneWidget, reason: 'Password toggle should have a tooltip');
    });

    testWidgets('Social buttons have semantic labels', (tester) async {
      await pumpScreen(tester, const LoginScreen());

      // Check for Google button semantics
      final googleButton = find.bySemanticsLabel('Sign in with Google');
      expect(googleButton, findsOneWidget, reason: 'Social buttons should have semantic labels');
    });

    testWidgets('Email field has autofill hints', (tester) async {
      await pumpScreen(tester, const LoginScreen());

      final emailFormField = find.ancestor(
        of: find.text('Email'),
        matching: find.byType(TextFormField),
      ).first;

      final textFieldFinder = find.descendant(
        of: emailFormField,
        matching: find.byType(TextField),
      );

      final textField = tester.widget<TextField>(textFieldFinder);

      expect(textField.autofillHints, contains(AutofillHints.email),
        reason: 'Email field should have AutofillHints.email');
    });
  });

  group('SignupScreen Accessibility Tests', () {
    testWidgets('Signup form has autofill hints and tooltips', (tester) async {
      await pumpScreen(tester, const SignupScreen());

      // Check Back Button Tooltip
      final backButtonTooltip = find.byTooltip('Go back');
      expect(backButtonTooltip, findsOneWidget, reason: 'Back button should have a tooltip');

      // Check Name Field Autofill
      final nameFormField = find.ancestor(
        of: find.text('Full Name'),
        matching: find.byType(TextFormField),
      ).first;

      final nameTextFieldFinder = find.descendant(
        of: nameFormField,
        matching: find.byType(TextField),
      );

      final nameTextField = tester.widget<TextField>(nameTextFieldFinder);

      expect(nameTextField.autofillHints, contains(AutofillHints.name),
        reason: 'Name field should have AutofillHints.name');
    });
  });
}
