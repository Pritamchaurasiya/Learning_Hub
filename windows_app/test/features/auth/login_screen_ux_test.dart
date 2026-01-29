import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:learning_hub/features/auth/login_screen.dart';
import 'package:learning_hub/core/providers/auth_provider.dart';
import 'package:learning_hub/data/models/user_model.dart';

// Mock AuthNotifier
class MockAuthNotifier extends AuthNotifier {
  @override
  Future<User?> build() async {
    return null; // Not logged in
  }

  @override
  Future<bool> login(String email, String password) async {
    return false;
  }

  @override
  Future<bool> loginWithBiometrics() async {
    return false;
  }
}

void main() {
  testWidgets('LoginScreen has accessible social buttons and password toggle', (WidgetTester tester) async {
    // Set a large enough surface to avoid overflow errors
    tester.view.physicalSize = const Size(1200, 2000); // Taller to ensure everything fits
    tester.view.devicePixelRatio = 1.0;

    // Wrap in MediaQuery to avoid overflow in constrained boxes if needed,
    // but setting physicalSize is usually enough.

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authProvider.overrideWith(() => MockAuthNotifier()),
        ],
        child: MaterialApp(
          home: MediaQuery(
             data: const MediaQueryData(
               size: Size(1200, 2000),
               textScaler: TextScaler.linear(0.5) // Scale down text to avoid overflow
             ),
             child: const LoginScreen()
          ),
        ),
      ),
    );

    // Pump to allow animations to start/settle
    // LoginScreen uses flutter_animate, so we need to pump enough time
    await tester.pumpAndSettle();

    // The test expects these tooltips to exist.

    // Check for Google Tooltip
    expect(find.byTooltip('Google'), findsOneWidget, reason: 'Google button should have a tooltip');

    // Check for Apple Tooltip
    expect(find.byTooltip('Apple'), findsOneWidget, reason: 'Apple button should have a tooltip');

    // Check for Facebook Tooltip
    expect(find.byTooltip('Facebook'), findsOneWidget, reason: 'Facebook button should have a tooltip');

    // Check for Password Visibility Toggle Tooltip
    // Default state is obscured, so we expect "Show password"
    expect(find.byTooltip('Show password'), findsOneWidget, reason: 'Password toggle should have a tooltip');

    addTearDown(() {
      tester.view.resetPhysicalSize();
    });
  });
}
