import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:learning_hub/core/providers/auth_provider.dart';
import 'package:learning_hub/features/auth/login_screen.dart';
import 'package:learning_hub/data/models/user_model.dart';
import 'package:mocktail/mocktail.dart';

// Mock AuthNotifier to bypass actual authentication logic
class MockAuthNotifier extends AuthNotifier {
  @override
  Future<User?> build() async {
    return null; // Start unauthenticated
  }

  @override
  Future<bool> login(String email, String password) async {
    // Mock login success for testing if needed
    return true;
  }
}

void main() {
  // Setup mocktail fallback values if needed
  setUpAll(() {
    registerFallbackValue(const AsyncValue<User?>.data(null));
  });

  testWidgets('Social buttons have tooltips and semantics', (WidgetTester tester) async {
    // Set a large enough surface size to prevent overflow errors
    tester.view.physicalSize = const Size(1200, 2000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    // Wrap with ProviderScope to inject mock auth provider
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authProvider.overrideWith(() => MockAuthNotifier()),
        ],
        child: const MediaQuery(
          data: MediaQueryData(size: Size(1200, 2000), textScaler: TextScaler.linear(0.5)),
          child: MaterialApp(
            home: LoginScreen(),
          ),
        ),
      ),
    );

    // Wait for animations to complete
    await tester.pumpAndSettle();

    // Verify Google button exists
    final googleIconFinder = find.byIcon(Icons.g_mobiledata);
    expect(googleIconFinder, findsOneWidget);

    // Find the Tooltip associated with the Google button
    final googleTooltipFinder = find.ancestor(
      of: googleIconFinder,
      matching: find.byType(Tooltip),
    );

    expect(googleTooltipFinder, findsOneWidget, reason: 'Social button should have a tooltip');
    final tooltip = tester.widget<Tooltip>(googleTooltipFinder);
    expect(tooltip.message, 'Google');
  });

  testWidgets('Password visibility toggle has dynamic tooltip', (WidgetTester tester) async {
    // Set a large enough surface size to prevent overflow errors
    tester.view.physicalSize = const Size(1200, 2000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authProvider.overrideWith(() => MockAuthNotifier()),
        ],
        child: const MediaQuery(
          data: MediaQueryData(size: Size(1200, 2000), textScaler: TextScaler.linear(0.5)),
          child: MaterialApp(
            home: LoginScreen(),
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Initial state: Password obscured, icon is visibility_outlined (eye open?)
    final visibilityIconFinder = find.byIcon(Icons.visibility_outlined);
    expect(visibilityIconFinder, findsOneWidget);

    // Find the IconButton
    final iconButtonFinder = find.ancestor(
      of: visibilityIconFinder,
      matching: find.byType(IconButton),
    );
    expect(iconButtonFinder, findsOneWidget);

    // Verify tooltip
    final iconButton = tester.widget<IconButton>(iconButtonFinder);

    expect(iconButton.tooltip, 'Show password', reason: 'Password toggle should have "Show password" tooltip when hidden');

    // Tap to toggle
    await tester.tap(iconButtonFinder);
    await tester.pumpAndSettle();

    // Verify icon changed to visibility_off_outlined
    final hiddenIconFinder = find.byIcon(Icons.visibility_off_outlined);
    expect(hiddenIconFinder, findsOneWidget);

    // Verify tooltip changed
    final hiddenIconButtonFinder = find.ancestor(
      of: hiddenIconFinder,
      matching: find.byType(IconButton),
    );
    final hiddenIconButton = tester.widget<IconButton>(hiddenIconButtonFinder);
    expect(hiddenIconButton.tooltip, 'Hide password', reason: 'Password toggle should have "Hide password" tooltip when visible');
  });
}
