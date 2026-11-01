import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:learning_hub/core/providers/auth_provider.dart';
import 'package:learning_hub/features/auth/login_screen.dart';
import 'package:learning_hub/data/models/user_model.dart';
import 'package:flutter_animate/flutter_animate.dart';

// Mock AuthNotifier
class MockAuthNotifier extends AuthNotifier {
  @override
  Future<User?> build() async {
    return null; // Not authenticated
  }

  @override
  Future<bool> login(String email, String password) async {
    return true;
  }
}

void main() {
  setUp(() {
     // Disable animations for testing to avoid flakiness
     Animate.restartOnHotReload = false;
  });

  testWidgets('LoginScreen has accessible social buttons and password toggle', (WidgetTester tester) async {
    // Arrange
    // We set a large surface size to ensure no overflow and desktop layout
    tester.view.physicalSize = const Size(1200, 800);
    tester.view.devicePixelRatio = 1.0;
    // Reset window size after test
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
              textScaler: TextScaler.linear(0.8),
            ),
            child: LoginScreen(),
          ),
        ),
      ),
    );

    // Wait for animations to complete
    await tester.pumpAndSettle();

    // Act & Assert - Social Buttons
    // These checks will fail initially because Tooltips are missing
    expect(find.byTooltip('Google'), findsOneWidget, reason: 'Google button should have a tooltip');
    expect(find.byTooltip('Apple'), findsOneWidget, reason: 'Apple button should have a tooltip');
    expect(find.byTooltip('Facebook'), findsOneWidget, reason: 'Facebook button should have a tooltip');

    // Act & Assert - Password Toggle
    final passwordFieldFinder = find.widgetWithText(TextFormField, 'Password');
    expect(passwordFieldFinder, findsOneWidget);

    // Find the suffix icon button
    final visibilityIconFinder = find.descendant(
      of: passwordFieldFinder,
      matching: find.byType(IconButton),
    );
    expect(visibilityIconFinder, findsOneWidget);

    // Verify it has "Show password" tooltip (default state is obscured)
    // The icon is visibility_outlined (eye open) which conventionally means "Show password"
    // when clicking it will reveal the password. Wait.
    // The code says:
    // icon: Icon(_obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined)
    // If obscured (default), icon is visibility_outlined (eye).
    // The tooltip should be "Show password".
    expect(find.byTooltip('Show password'), findsOneWidget, reason: 'Password toggle should have "Show password" tooltip');

    // Tap to toggle
    await tester.tap(visibilityIconFinder);
    await tester.pumpAndSettle();

    // Verify it has "Hide password" tooltip
    expect(find.byTooltip('Hide password'), findsOneWidget, reason: 'Password toggle should have "Hide password" tooltip');
  });
}
