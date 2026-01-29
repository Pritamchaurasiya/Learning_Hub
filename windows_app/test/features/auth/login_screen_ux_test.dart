import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:learning_hub/features/auth/login_screen.dart';
import 'package:learning_hub/core/providers/auth_provider.dart';
import 'package:learning_hub/data/models/user_model.dart';
import 'package:flutter/services.dart';

// Mock AuthNotifier to bypass backend calls
class MockAuthNotifier extends AuthNotifier {
  @override
  Future<User?> build() async {
    return null; // Unauthenticated
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('LoginScreen has accessible social buttons, password toggle, and autofill', (WidgetTester tester) async {
    // Set a large enough surface for the layout
    tester.view.physicalSize = const Size(1080, 1920);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authProvider.overrideWith(() => MockAuthNotifier()),
        ],
        child: MaterialApp(
          home: MediaQuery(
            data: const MediaQueryData(textScaler: TextScaler.linear(0.5)),
            child: const LoginScreen(),
          ),
        ),
      ),
    );

    // Allow animations to complete (LoginScreen has fade-ins)
    await tester.pumpAndSettle();

    // 1. Verify Social Buttons have Tooltips and Semantics
    // We expect to find a Tooltip with message "Google"
    expect(
      find.byTooltip('Google'),
      findsOneWidget,
      reason: 'Google button should have a Tooltip with message "Google"',
    );

    // We expect to find Semantics with label "Google" and button: true
    expect(
      find.byWidgetPredicate((widget) {
        if (widget is Semantics) {
          return widget.properties.label == 'Google' && widget.properties.button == true;
        }
        return false;
      }),
      findsOneWidget,
      reason: 'Google button should have Semantics(label: "Google", button: true)',
    );

    // 2. Verify Password Visibility Toggle has Tooltip
    // Initial state is obscured, so tooltip should be 'Show password'
    // The toggle is an IconButton inside the password field
    expect(
      find.byWidgetPredicate((widget) => widget is IconButton && widget.tooltip == 'Show password'),
      findsOneWidget,
      reason: 'Password toggle should have "Show password" tooltip when obscured',
    );

    // 3. Verify Autofill Hints
    // Find TextFields (underlying widget of TextFormField)
    final textFields = find.byType(TextField);
    expect(textFields, findsNWidgets(2));

    // First field is Email
    final emailField = tester.widget<TextField>(textFields.first);
    expect(
      emailField.autofillHints,
      contains(AutofillHints.email),
      reason: 'Email field should have AutofillHints.email',
    );

    // Second field is Password
    final passwordField = tester.widget<TextField>(textFields.last);
    expect(
      passwordField.autofillHints,
      contains(AutofillHints.password),
      reason: 'Password field should have AutofillHints.password',
    );
  });
}
