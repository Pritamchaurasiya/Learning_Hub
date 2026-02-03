import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:learning_hub/core/providers/auth_provider.dart';
import 'package:learning_hub/data/models/user_model.dart';
import 'package:learning_hub/features/auth/login_screen.dart';
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
    // Disable animations for testing
    Animate.restartOnHotReload = false;
  });

  testWidgets('LoginScreen social buttons have semantic labels and tooltips', (WidgetTester tester) async {
    // Set a large enough surface to avoid overflow
    tester.view.physicalSize = const Size(1200, 800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authProvider.overrideWith(() => MockAuthNotifier()),
        ],
        child: MediaQuery(
          data: const MediaQueryData(textScaler: TextScaler.linear(0.5)),
          child: const MaterialApp(
            home: LoginScreen(),
          ),
        ),
      ),
    );

    // Pump and settle to let animations finish
    await tester.pumpAndSettle();

    // Find the Google button (using its icon)
    final googleIconFinder = find.byIcon(Icons.g_mobiledata);
    expect(googleIconFinder, findsOneWidget);

    // --- CHECK FOR TOOLTIP ---
    // Try to find a Tooltip ancestor
    final googleTooltipFinder = find.ancestor(
      of: googleIconFinder,
      matching: find.byType(Tooltip),
    );

    expect(googleTooltipFinder, findsOneWidget,
        reason: 'Social button should have a Tooltip');
    final tooltip = tester.widget<Tooltip>(googleTooltipFinder.first);
    expect(tooltip.message, 'Google');

    // --- CHECK FOR SEMANTICS ---
    final semanticsFinder = find.ancestor(
      of: googleIconFinder,
      matching: find.byWidgetPredicate((widget) =>
          widget is Semantics &&
          widget.properties.label == 'Google' &&
          widget.properties.button == true),
    );
    expect(semanticsFinder, findsOneWidget,
        reason: 'Social button should have Semantics with label Google and button: true');
  });

  testWidgets('LoginScreen password visibility toggle has semantic tooltip', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1200, 800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authProvider.overrideWith(() => MockAuthNotifier()),
        ],
        child: MediaQuery(
          data: const MediaQueryData(textScaler: TextScaler.linear(0.5)),
          child: const MaterialApp(
            home: LoginScreen(),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final toggleButtonFinder = find.byType(IconButton).last; // It's in the suffixIcon

    // Check if IconButton has tooltip
    final iconButton = tester.widget<IconButton>(toggleButtonFinder);

    expect(iconButton.tooltip, 'Show password');

    // Tap to toggle
    await tester.tap(toggleButtonFinder);
    await tester.pumpAndSettle();

    final iconButtonToggled = tester.widget<IconButton>(toggleButtonFinder);
    expect(iconButtonToggled.tooltip, 'Hide password');
  });
}
