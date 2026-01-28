import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:learning_hub/features/auth/login_screen.dart';

void main() {
  testWidgets('LoginScreen has accessible social buttons and password toggle',
      (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: LoginScreen(),
        ),
      ),
    );

    // Allow animations to complete
    await tester.pumpAndSettle();

    // Verify that the social buttons have semantics.
    // The Semantics widget we added should make these findable by label.
    expect(find.bySemanticsLabel('Google'), findsOneWidget);
    expect(find.bySemanticsLabel('Apple'), findsOneWidget);
    expect(find.bySemanticsLabel('Facebook'), findsOneWidget);

    // Verify that tooltips exist for social buttons.
    expect(find.byTooltip('Google'), findsOneWidget);
    expect(find.byTooltip('Apple'), findsOneWidget);
    expect(find.byTooltip('Facebook'), findsOneWidget);

    // Verify password visibility toggle tooltip.
    // Initially obscured, so should show "Show password".
    // Note: The icon is Icons.visibility_outlined when obscured (to indicate "click to show" logic??)
    // Let's check the code:
    // icon: Icon(_obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined),
    // tooltip: _obscurePassword ? 'Show password' : 'Hide password',

    expect(find.byTooltip('Show password'), findsOneWidget);

    // Tap the toggle (the visibility icon).
    // We find by icon. Note that there are multiple icons, so we need to be specific or just find the one in the password field.
    // But since it's the only visibility_outlined icon on screen (if obscure is true), it should be fine.
    await tester.tap(find.byIcon(Icons.visibility_outlined));

    // Rebuild the widget after the state has changed.
    await tester.pump();

    // Now should be visible, so tooltip should be "Hide password".
    expect(find.byTooltip('Hide password'), findsOneWidget);
  });
}
