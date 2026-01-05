import 'dart:async';

import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:my_flutter_app/src/app/app.dart';
import 'package:my_flutter_app/src/features/auth/data/auth_repository.dart';
import 'package:my_flutter_app/src/features/auth/domain/user_model.dart';
import 'package:my_flutter_app/src/features/auth/presentation/auth_controller.dart';
import 'package:shared_preferences/shared_preferences.dart';

class FakeAuthRepository implements AuthRepository {
  @override
  Future<User> login(String email, String password) async {
    throw UnimplementedError();
  }

  @override
  Future<User> register(String email, String username, String password) async {
    throw UnimplementedError();
  }

  @override
  Future<void> logout() async {}
}

class MockAuthController extends AuthController {
  @override
  FutureOr<User?> build() {
    return const User(
      id: '1',
      username: 'tester',
      email: 'test@test.com',
      role: 'student',
    );
  }
}

void main() {
  setUpAll(() {
    Animate.restartOnHotReload = true; // Just in case
  });

  testWidgets('App smoke test', (tester) async {
    Animate.defaultDuration = Duration.zero; // Disable animations for test
    SharedPreferences.setMockInitialValues({}); // Still good to have
    // Build our app and trigger a frame.
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(FakeAuthRepository()),
          authControllerProvider.overrideWith(MockAuthController.new),
        ],
        child: const MyApp(),
      ),
    );

    // Pump a few frames to handle initial state changes
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    // Verify that we start on the Landing Screen.
    expect(find.text('Learning Hub'), findsOneWidget);

    // Clear any remaining timers by pumping again
    await tester.pump(const Duration(seconds: 1));
  });
}
