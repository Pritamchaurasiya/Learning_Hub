import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/user_model.dart';
import '../services/user_service.dart';

/// Authentication state notifier - Delegates to UserService
class AuthNotifier extends AsyncNotifier<User?> {
  final UserService _userService = UserService.instance;

  @override
  Future<User?> build() async {
    // First check current user in memory
    final currentUser = _userService.currentUser;
    if (currentUser != null) {
      return currentUser;
    }

    // Try to refresh profile from server
    final user = await _userService.refreshProfile();
    if (user != null) {
      return user;
    } else {
      // If refresh fails (offline/no token), try to initialize from cache
      await _userService.initialize();
      final cachedUser = _userService.currentUser;
      if (cachedUser != null) {
        return cachedUser;
      } else {
        return null;
      }
    }
  }

  /// Login user
  Future<bool> login(String email, String password) async {
    state = const AsyncValue.loading();
    try {
      final result = await _userService.login(
        email: email,
        password: password,
      );

      if (result.success && result.user != null) {
        state = AsyncValue.data(result.user!);
        return true;
      } else {
        state = const AsyncValue.data(null);
        return false;
      }
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  /// Register new user
  Future<bool> register({
    required String email,
    required String password,
    required String displayName,
  }) async {
    state = const AsyncValue.loading();
    try {
      final result = await _userService.register(
        name: displayName,
        email: email,
        password: password,
      );

      if (result.success && result.user != null) {
        state = AsyncValue.data(result.user!);
        return true;
      } else {
        state = const AsyncValue.data(null);
        return false;
      }
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  /// Change password
  Future<bool> changePassword(
      String currentPassword, String newPassword) async {
    try {
      final result = await _userService.changePassword(
        currentPassword: currentPassword,
        newPassword: newPassword,
      );
      return result.success;
    } catch (e) {
      return false;
    }
  }

  /// Forgot password
  Future<bool> forgotPassword(String email) async {
    try {
      await _userService.forgotPassword(email);
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Verify email
  Future<bool> verifyEmail(String token) async {
    try {
      return await _userService.verifyEmail(token);
    } catch (e) {
      return false;
    }
  }

  /// Login with Biometrics
  Future<bool> loginWithBiometrics() async {
    state = const AsyncValue.loading();
    try {
      final result = await _userService.loginWithBiometrics();
      if (result.success && result.user != null) {
        state = AsyncValue.data(result.user!);
        return true;
      } else {
        state = const AsyncValue.data(null);
        return false;
      }
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  /// Logout user
  Future<void> logout() async {
    try {
      await _userService.logout();
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  /// Update user profile
  Future<bool> updateProfile({
    String? displayName,
    String? bio,
    String? avatarUrl,
  }) async {
    state = const AsyncValue.loading();
    try {
      final result = await _userService.updateProfile(
        displayName: displayName,
        photoUrl: avatarUrl,
        preferences: bio != null ? {'bio': bio} : null,
      );

      if (result.success && result.user != null) {
        state = AsyncValue.data(result.user!);
        return true;
      }
      // If update failed, revert to previous state or reload
      final currentUser = _userService.currentUser;
      state = AsyncValue.data(currentUser);
      return false;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  /// Check if user is authenticated
  bool get isAuthenticated => state.value != null;

  /// Get current user
  User? get currentUser => state.value;

  /// Check if user is admin
  bool get isAdmin => currentUser?.role == UserRole.admin;

  /// Check if user is instructor
  bool get isInstructor => currentUser?.role == UserRole.instructor;

  /// Check if user is student
  bool get isStudent => currentUser?.role == UserRole.student;
}

/// Authentication providers
final authProvider = AsyncNotifierProvider<AuthNotifier, User?>(() {
  return AuthNotifier();
});

/// Current user provider
final currentUserProvider = Provider<User?>((ref) {
  final authState = ref.watch(authProvider);
  return authState.value;
});

/// Authentication status provider
final isAuthenticatedProvider = Provider<bool>((ref) {
  final authState = ref.watch(authProvider);
  return authState.value != null;
});
