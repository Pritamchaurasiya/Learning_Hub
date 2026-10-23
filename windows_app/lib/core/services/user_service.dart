import 'dart:async';
import 'package:flutter/foundation.dart';
import '../../data/models/user_model.dart';
import 'api_client.dart';
import 'auth_service.dart';
import 'cache_manager.dart';
import 'package:learning_hub/core/services/biometric_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Authentication result
class AuthResult {
  final bool success;
  final String? token;
  final User? user;
  final String? error;

  const AuthResult({
    required this.success,
    this.token,
    this.user,
    this.error,
  });
}

/// User service for authentication and profile management
/// 
/// SECURITY: Uses httpOnly cookies for auth (same as React frontend).
/// Delegates to AuthService for cookie-based auth operations.
class UserService {
  static final UserService _instance = UserService._();
  static UserService get instance => _instance;

  final AuthService _authService = AuthService();
  final ApiClient _api = ApiClient.instance;
  final CacheManager _cache = CacheManager.instance;
  final BiometricService _biometric = BiometricService.instance;

  UserService._();

  /// Factory constructor for testing or custom instance
  factory UserService({
    AuthService? authService,
    ApiClient? api,
    CacheManager? cache,
    BiometricService? biometric,
  }) {
    return _instance;
  }

  User? _currentUser;
  final _userController = StreamController<User?>.broadcast();

  /// Stream of user changes
  Stream<User?> get userStream => _userController.stream;

  /// Current user
  User? get currentUser => _currentUser;

  /// Check if user is logged in
  Future<bool> get isLoggedIn async => await _authService.isAuthenticated();

  /// Login with email and password
  Future<AuthResult> login({
    required String email,
    required String password,
    bool rememberMe = true,
  }) async {
    final result = await _authService.signIn(email, password);

    if (result.isSuccess && result.data != null) {
      // Fetch full profile via /auth/me (cookies sent automatically)
      final user = await refreshProfile();

      return AuthResult(
        success: true,
        token: result.data!.token,
        user: user,
      );
    }

    return AuthResult(
      success: false,
      error: result.error ?? 'Login failed',
    );
  }

  /// Register a new user
  Future<AuthResult> register({
    required String name,
    required String email,
    required String password,
  }) async {
    final result = await _authService.signUp(email, password, name);
    return result;
  }

  /// Logout
  Future<void> logout() async {
    try {
      await _authService.signOut();

      // Clear local user data
      _currentUser = null;
      
      // Only add to stream if not closed
      if (!_userController.isClosed) {
        _userController.add(null);
      }

      // Clear cache
      await _cache.remove(CacheKeys.userProfile('current'));
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[UserService] Error during logout: $e');
      }
      // Ensure cleanup even on error
      _currentUser = null;
      if (!_userController.isClosed) {
        _userController.add(null);
      }
      rethrow;
    }
  }

  /// Refresh user profile
  Future<User?> refreshProfile() async {
    if (!await isLoggedIn) return null;

    final response = await _api.get<Map<String, dynamic>>('/auth/me');

    if (response.success && response.data != null) {
      final payload = response.data!;
      final data = payload.containsKey('data')
          ? payload['data'] as Map<String, dynamic>
          : payload;

      _currentUser = User.fromJson(data);
      _userController.add(_currentUser);

      // Update cache
      await _cache.set(
        CacheKeys.userProfile('current'),
        _currentUser,
        ttl: const Duration(hours: 24),
        encoder: (u) => u!.toJson(),
      );

      return _currentUser;
    }
    return null;
  }

  /// Update user profile
  Future<AuthResult> updateProfile({
    String? displayName,
    String? photoUrl,
    Map<String, dynamic>? preferences,
  }) async {
    final response = await _api.put<Map<String, dynamic>>(
      '/users/profile/',
      data: {
        if (displayName != null) 'display_name': displayName,
        // Backend UserProfileUpdateSerializer fields: display_name, bio, phone, preferences. Avatar is separate.
        if (preferences != null) 'preferences': preferences,
      },
    );

    if (response.success) {
      await refreshProfile();
      return AuthResult(success: true, user: _currentUser);
    }

    return AuthResult(
      success: false,
      error: response.message ?? 'Update failed',
    );
  }

  /// Change password
  Future<AuthResult> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    final response = await _api.post<dynamic>(
      '/auth/change-password/',
      data: {
        'current_password': currentPassword,
        'new_password': newPassword,
        'new_password_confirm': newPassword,
      },
    );

    return AuthResult(
      success: response.success,
      error: response.message,
    );
  }

  /// Forgot password
  Future<void> forgotPassword(String email) async {
    await _api.post<dynamic>(
      '/auth/password-reset/',
      data: {'email': email},
    );
  }

  /// Verify email
  Future<bool> verifyEmail(String code) async {
    final response = await _api.post<dynamic>(
      '/auth/verify-email',
      data: {'code': code},
    );
    return response.success;
  }

  /// Login with biometrics
  Future<AuthResult> loginWithBiometrics() async {
    if (!await _biometric.canCheckBiometrics) {
      return const AuthResult(
        success: false,
        error: 'Biometrics not available',
      );
    }

    final authenticated = await _biometric.authenticate(
      reason: 'Login to Learning Hub',
    );

    if (authenticated) {
      // Check if user is still authenticated via cookie
      if (await isLoggedIn) {
        final user = await refreshProfile();
        if (user != null) {
          return AuthResult(success: true, user: user);
        }
      }

      // If no active session, user needs to login with password first
      return const AuthResult(
          success: false,
          error: 'Session expired, please login with password first');
    }

    return const AuthResult(
      success: false,
      error: 'Biometric authentication failed',
    );
  }

  /// Initialize - load cached user if available
  Future<void> initialize() async {
    final prefs = await SharedPreferences.getInstance();
    final rememberMe = prefs.getBool('remember_me') ?? true;

    if (!rememberMe) {
      // If remember me is false, clear session on app start
      await logout();
      return;
    }

    if (await isLoggedIn) {
      // Try to load cached user first
      final cached = await _cache.get<User>(
        CacheKeys.userProfile('current'),
        decoder: (data) => User.fromJson(data as Map<String, dynamic>),
      );

      if (cached != null) {
        _currentUser = cached;
        _userController.add(_currentUser);
      }

      // Refresh in background
      unawaited(refreshProfile());
    }
  }

  /// Dispose - FIXED: Properly close stream controllers to prevent memory leaks
  void dispose() {
    if (!_userController.isClosed) {
      _userController.close();
      if (kDebugMode) {
        debugPrint('[UserService] Stream controller disposed');
      }
    }
  }
}