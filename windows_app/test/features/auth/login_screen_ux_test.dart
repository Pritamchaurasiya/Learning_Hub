import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:learning_hub/features/auth/login_screen.dart';
import 'package:learning_hub/features/auth/signup_screen.dart';
import 'package:learning_hub/core/providers/auth_provider.dart';
import 'package:learning_hub/data/models/user_model.dart';

// Mock AuthNotifier
class MockAuthNotifier extends AuthNotifier {
  @override
  Future<User?> build() async {
    return null; // Unauthenticated state
  }
}

void main() {
  testWidgets('LoginScreen has accessible social buttons and password toggle', (WidgetTester tester) async {
    // Set surface size to avoid overflow on small screens in test environment
    tester.view.physicalSize = const Size(1200, 800);
    tester.view.devicePixelRatio = 1.0;

    // Pump widget
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authProvider.overrideWith(() => MockAuthNotifier()),
        ],
        child: const MaterialApp(
          home: MediaQuery(
            data: MediaQueryData(
              textScaler: TextScaler.linear(0.5),
              size: Size(800, 600),
            ),
            child: LoginScreen(),
          ),
        ),
      ),
    );

    // Wait for animations (fade-ins)
    await tester.pumpAndSettle();

    // 1. Check Google Button
    final googleIcon = find.byIcon(Icons.g_mobiledata);
    expect(googleIcon, findsOneWidget);

    // Verify Tooltip is present with message 'Google'
    final googleTooltip = find.ancestor(
      of: googleIcon,
      matching: find.byType(Tooltip),
    );
    expect(googleTooltip, findsOneWidget);
    final Tooltip googleTooltipWidget = tester.widget(googleTooltip);
    expect(googleTooltipWidget.message, 'Google');

    // 2. Check Apple Button
    final appleIcon = find.byIcon(Icons.apple);
    expect(appleIcon, findsOneWidget);

    final appleTooltip = find.ancestor(
      of: appleIcon,
      matching: find.byType(Tooltip),
    );
    expect(appleTooltip, findsOneWidget);
    final Tooltip appleTooltipWidget = tester.widget(appleTooltip);
    expect(appleTooltipWidget.message, 'Apple');

    // 3. Check Facebook Button
    final facebookIcon = find.byIcon(Icons.facebook);
    expect(facebookIcon, findsOneWidget);

    final facebookTooltip = find.ancestor(
      of: facebookIcon,
      matching: find.byType(Tooltip),
    );
    expect(facebookTooltip, findsOneWidget);
    final Tooltip facebookTooltipWidget = tester.widget(facebookTooltip);
    expect(facebookTooltipWidget.message, 'Facebook');

    // 4. Check Password Visibility Toggle
    // The password field uses Icons.visibility_outlined when obscured (default)
    final eyeIcon = find.byIcon(Icons.visibility_outlined);
    expect(eyeIcon, findsOneWidget);

    final eyeTooltip = find.ancestor(
      of: eyeIcon,
      matching: find.byType(Tooltip),
    );
    expect(eyeTooltip, findsOneWidget);
    final Tooltip eyeTooltipWidget = tester.widget(eyeTooltip);
    expect(eyeTooltipWidget.message, 'Show password');

    // Tap to toggle
    await tester.tap(eyeIcon);
    await tester.pumpAndSettle();

    // Now it should be visible, so we look for Icons.visibility_off_outlined
    final crossedEyeIcon = find.byIcon(Icons.visibility_off_outlined);
    expect(crossedEyeIcon, findsOneWidget);

    final crossedEyeTooltip = find.ancestor(
      of: crossedEyeIcon,
      matching: find.byType(Tooltip),
    );
    expect(crossedEyeTooltip, findsOneWidget);
    final Tooltip crossedEyeTooltipWidget = tester.widget(crossedEyeTooltip);
    expect(crossedEyeTooltipWidget.message, 'Hide password');

    // Reset view size
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
  });

  testWidgets('SignupScreen has accessible password toggles', (WidgetTester tester) async {
    // Pump widget
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authProvider.overrideWith(() => MockAuthNotifier()),
        ],
        child: const MaterialApp(
          home: MediaQuery(
            data: MediaQueryData(
              textScaler: TextScaler.linear(0.5),
              size: Size(800, 600),
            ),
            child: SignupScreen(),
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Check for password fields
    // There are two password fields (Password and Confirm Password)
    // Default: both obscured, so we look for visibility_outlined
    final visibilityIcons = find.byIcon(Icons.visibility_outlined);
    expect(visibilityIcons, findsNWidgets(2));

    // Check tooltips
    final tooltipFinders = find.ancestor(
      of: visibilityIcons,
      matching: find.byType(Tooltip),
    );
    expect(tooltipFinders, findsNWidgets(2));

    final tooltipWidgets = tester.widgetList<Tooltip>(tooltipFinders);
    for (final tooltip in tooltipWidgets) {
      expect(tooltip.message, 'Show password');
    }
  });
}
