import 'dart:async';
import '../../data/models/user_model.dart';
import 'api_client.dart';
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
class UserService {
  static final UserService _instance = UserService._();
  static UserService get instance => _instance;

  ApiClient api;
  final CacheManager _cache;
  final BiometricService _biometric;

  UserService._({
    ApiClient? api,
    CacheManager? cache,
    BiometricService? biometric,
  })  : api = api ?? ApiClient.instance,
        _cache = cache ?? CacheManager.instance,
        _biometric = biometric ?? BiometricService.instance;

  /// Factory constructor for testing or custom instance
  factory UserService({
    ApiClient? api,
    CacheManager? cache,
    BiometricService? biometric,
  }) {
    if (api != null || cache != null || biometric != null) {
      return UserService._(
        api: api,
        cache: cache,
        biometric: biometric,
      );
    }
    return _instance;
  }

  User? _currentUser;
  final _userController = StreamController<User?>.broadcast();

  /// Stream of user changes
  Stream<User?> get userStream => _userController.stream;

  /// Current user
  User? get currentUser => _currentUser;

  /// Check if user is logged in
  Future<bool> get isLoggedIn async => await api.hasToken;

  /// Login with email and password
  Future<AuthResult> login({
    required String email,
    required String password,
    bool rememberMe = true,
  }) async {
    final response = await api.post<Map<String, dynamic>>(
      '/auth/login',
      data: {
        'email': email,
        'password': password,
      },
    );

    if (response.success && response.data != null) {
      final payload = response.data!;
      // Handle optional envelope
      final data = payload.containsKey('data')
          ? payload['data'] as Map<String, dynamic>
          : payload;

      // Store tokens
      await api.setTokens(
        accessToken: data['accessToken'] as String,
        refreshToken: data['refreshToken'] as String,
      );

      // Save remember me preference
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('remember_me', rememberMe);

      // Parse user
      _currentUser = User.fromJson(data['user'] as Map<String, dynamic>);
      _userController.add(_currentUser);

      // Cache user data
      await _cache.set(
        CacheKeys.userProfile('current'),
        _currentUser,
        ttl: const Duration(hours: 24),
        encoder: (u) => u!.toJson(),
      );

      return AuthResult(
        success: true,
        token: data['accessToken'] as String,
        user: _currentUser,
      );
    }

    return AuthResult(
      success: false,
      error: response.message ?? 'Login failed',
    );
  }

  /// Register a new user
  Future<AuthResult> register({
    required String name,
    required String email,
    required String password,
  }) async {
    final response = await api.post<Map<String, dynamic>>(
      '/auth/register',
      data: {
        'name': name,
        'email': email,
        'password': password,
      },
    );

    if (response.success && response.data != null) {
      // Auto login after registration
      return login(email: email, password: password);
    }

    return AuthResult(
      success: false,
      error: response.message ?? 'Registration failed',
    );
  }

  /// Logout
  Future<void> logout() async {
    // Clear tokens
    await api.clearTokens();

    // Clear local user data
    _currentUser = null;
    _userController.add(null);

    // Clear cache
    await _cache.remove(CacheKeys.userProfile('current'));
  }

  /// Refresh user profile
  Future<User?> refreshProfile() async {
    if (!await isLoggedIn) return null;

    final response = await api.get<Map<String, dynamic>>('/user/profile');

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
    final response = await api.put<Map<String, dynamic>>(
      '/user/profile',
      data: {
        if (displayName != null) 'displayName': displayName,
        if (photoUrl != null) 'photoUrl': photoUrl,
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
    final response = await api.post<dynamic>(
      '/auth/change-password',
      data: {
        'currentPassword': currentPassword,
        'newPassword': newPassword,
      },
    );

    return AuthResult(
      success: response.success,
      error: response.message,
    );
  }

  /// Forgot password
  Future<void> forgotPassword(String email) async {
    await api.post<dynamic>(
      '/auth/forgot-password',
      data: {'email': email},
    );
  }

  /// Verify email
  Future<bool> verifyEmail(String code) async {
    final response = await api.post<dynamic>(
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
      // In a real app, you would retrieve stored credentials from secure storage
      // after biometric success. For now, we'll assume we can use a stored token exchange
      // or similar flow. Let's try to just refresh the profile if token already exists.

      if (await api.hasToken) {
        final user = await refreshProfile();
        if (user != null) {
          return AuthResult(success: true, user: user);
        }
      }

      // If no token but bio success, we need credentials.
      // This part depends on implementation. Returning error for now if strictly no token.
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

    if (await api.hasToken) {
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
    }
  }
}
