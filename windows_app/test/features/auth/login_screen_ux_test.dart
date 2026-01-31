import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:learning_hub/core/providers/auth_provider.dart';
import 'package:learning_hub/data/models/user_model.dart';
import 'package:learning_hub/features/auth/login_screen.dart';
import 'package:mocktail/mocktail.dart';

// Mock AuthNotifier
class MockAuthNotifier extends AuthNotifier {
  @override
  Future<User?> build() async {
    return null; // Initial state: not logged in
  }
}

void main() {
  group('LoginScreen UX/A11y Tests', () {
    late MockAuthNotifier mockAuthNotifier;

    setUp(() {
      mockAuthNotifier = MockAuthNotifier();
    });

    testWidgets('Social buttons should have tooltips and semantics',
        (tester) async {
      // Set a large surface size to prevent overflow errors
      tester.view.physicalSize = const Size(1200, 800);
      tester.view.devicePixelRatio = 1.0;

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authProvider.overrideWith(() => mockAuthNotifier),
          ],
          child: MediaQuery(
            data: const MediaQueryData(
              textScaler: TextScaler.linear(0.5),
            ),
            child: const MaterialApp(
              home: LoginScreen(),
            ),
          ),
        ),
      );

      // Wait for animations
      await tester.pumpAndSettle();

      // Check for Google button tooltip
      final googleIcon = find.byIcon(Icons.g_mobiledata);
      expect(googleIcon, findsOneWidget);

      final googleTooltip = find.ancestor(
        of: googleIcon,
        matching: find.byType(Tooltip),
      );

      expect(googleTooltip, findsOneWidget,
          reason: 'Google button should have a tooltip');

      // Verify Semantics
      // We look for a Semantics widget that is an ancestor of the icon
      final googleSemantics = find.ancestor(
        of: googleIcon,
        matching: find.byType(Semantics),
      );

      // Note: There might be multiple semantics, we want the one with the label
      // But for now, let's just try to find ANY semantics wrapper that claims to be a button with label 'Google'

      // Easier way: verify that there is a semantics node with the expected properties in the tree
      expect(
        tester.getSemantics(googleSemantics.first),
        matchesSemantics(
          label: 'Google',
          isButton: true,
          hasTapAction: true,
          isFocusable: true,
          hasFocusAction: true,
          tooltip: 'Google',
        ),
        reason:
            'Google button should have Semantics with label "Google" and be a button',
      );

      // Check Password toggle tooltip
      final visibilityIcon = find.byIcon(Icons
          .visibility_outlined); // Default state is obscured (Show Password icon)
      expect(visibilityIcon, findsOneWidget);

      final visibilityTooltip = find.ancestor(
        of: visibilityIcon,
        matching: find.byType(Tooltip),
      );
      expect(visibilityTooltip, findsOneWidget,
          reason: 'Password toggle should have a tooltip');

      // Verify tooltip message
      final tooltipWidget = tester.widget<Tooltip>(visibilityTooltip);
      expect(tooltipWidget.message, 'Show password');
    });
  });
}
