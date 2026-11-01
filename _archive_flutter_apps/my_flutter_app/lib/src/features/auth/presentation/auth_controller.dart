import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/features/auth/data/auth_repository.dart';
import 'package:my_flutter_app/src/features/auth/domain/user_model.dart';

final authControllerProvider =
    AsyncNotifierProvider<AuthController, User?>(AuthController.new);

class AuthController extends AsyncNotifier<User?> {
  @override
  FutureOr<User?> build() {
    return null; // Initial state: Not logged in
  }

  Future<void> login(String email, String password) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(
      () => ref.read(authRepositoryProvider).login(email, password),
    );
  }

  Future<void> register(String email, String username, String password) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(
      () =>
          ref.read(authRepositoryProvider).register(email, username, password),
    );
  }

  /// Login as a guest user without requiring API authentication.
  /// This allows users to explore the app before creating an account.
  Future<void> loginAsGuest() async {
    state = const AsyncValue.loading();
    // Create a local guest user - no API call needed
    const guestUser = User(
      id: 'guest-user',
      email: 'guest@learninghub.local',
      username: 'Guest',
      role: 'guest',
    );
    state = const AsyncValue.data(guestUser);
  }

  Future<void> logout() async {
    state = const AsyncValue.loading();
    await ref.read(authRepositoryProvider).logout();
    state = const AsyncValue.data(null);
  }
}
