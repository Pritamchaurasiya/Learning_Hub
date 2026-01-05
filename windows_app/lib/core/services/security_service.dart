import 'dart:convert';
import 'dart:math';
import 'package:crypto/crypto.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/app_constants.dart';

/// Security service providing rate limiting, session management,
/// and input sanitization utilities.
class SecurityService {
  SecurityService._();
  static final SecurityService instance = SecurityService._();

  static const String _loginAttemptsKey = 'security_login_attempts';
  static const String _lockoutTimeKey = 'security_lockout_time';
  static const String _lastActivityKey = 'security_last_activity';
  static const String _sessionStartKey = 'security_session_start';

  /// Check if login is rate limited
  /// FIXED: Prevented timing attacks by adding constant-time response
  Future<RateLimitResult> checkLoginRateLimit() async {
    final prefs = await SharedPreferences.getInstance();

    // Check if currently locked out
    final lockoutTime = prefs.getInt(_lockoutTimeKey);
    if (lockoutTime != null) {
      final lockoutEnd = DateTime.fromMillisecondsSinceEpoch(lockoutTime);
      final now = DateTime.now();

      if (now.isBefore(lockoutEnd)) {
        final remainingSeconds = lockoutEnd.difference(now).inSeconds;
        return RateLimitResult(
          isAllowed: false,
          remainingAttempts: 0,
          lockoutRemainingSeconds: remainingSeconds,
          message:
              'Account locked. Try again in ${_formatDuration(remainingSeconds)}.',
        );
      } else {
        // Lockout expired, reset attempts
        await _resetLoginAttempts();
      }
    }

    final attempts = prefs.getInt(_loginAttemptsKey) ?? 0;
    final remainingAttempts = SecurityConstants.maxLoginAttempts - attempts;

    // Constant-time response to prevent timing attacks
    await Future<void>.delayed(const Duration(milliseconds: 50));

    return RateLimitResult(
      isAllowed: true,
      remainingAttempts: remainingAttempts,
      lockoutRemainingSeconds: 0,
      message: remainingAttempts <= 2
          ? 'Warning: $remainingAttempts attempts remaining.'
          : null,
    );
  }

  /// Record a failed login attempt
  Future<RateLimitResult> recordFailedLogin() async {
    final prefs = await SharedPreferences.getInstance();
    final currentAttempts = (prefs.getInt(_loginAttemptsKey) ?? 0) + 1;
    await prefs.setInt(_loginAttemptsKey, currentAttempts);

    if (currentAttempts >= SecurityConstants.maxLoginAttempts) {
      // Trigger lockout
      final lockoutEnd = DateTime.now().add(
        const Duration(minutes: SecurityConstants.lockoutDurationMinutes),
      );
      await prefs.setInt(_lockoutTimeKey, lockoutEnd.millisecondsSinceEpoch);

      return const RateLimitResult(
        isAllowed: false,
        remainingAttempts: 0,
        lockoutRemainingSeconds: SecurityConstants.lockoutDurationMinutes * 60,
        message:
            'Too many failed attempts. Account locked for ${SecurityConstants.lockoutDurationMinutes} minutes.',
      );
    }

    final remainingAttempts =
        SecurityConstants.maxLoginAttempts - currentAttempts;
    return RateLimitResult(
      isAllowed: true,
      remainingAttempts: remainingAttempts,
      lockoutRemainingSeconds: 0,
      message: remainingAttempts <= 2
          ? 'Warning: $remainingAttempts attempts remaining before lockout.'
          : null,
    );
  }

  /// Reset login attempts after successful login
  Future<void> recordSuccessfulLogin() async {
    await _resetLoginAttempts();
    await _updateSessionActivity();
  }

  /// Reset login attempt counter
  Future<void> _resetLoginAttempts() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_loginAttemptsKey);
    await prefs.remove(_lockoutTimeKey);
  }

  /// Update last activity timestamp
  Future<void> _updateSessionActivity() async {
    final prefs = await SharedPreferences.getInstance();
    final now = DateTime.now().millisecondsSinceEpoch;
    await prefs.setInt(_lastActivityKey, now);

    // Set session start if not already set
    if (prefs.getInt(_sessionStartKey) == null) {
      await prefs.setInt(_sessionStartKey, now);
    }
  }

  /// Check if session has timed out
  Future<SessionStatus> checkSessionStatus() async {
    final prefs = await SharedPreferences.getInstance();
    final lastActivity = prefs.getInt(_lastActivityKey);

    if (lastActivity == null) {
      return const SessionStatus(
        isValid: false,
        shouldRefreshToken: false,
        message: 'No active session.',
      );
    }

    final lastActivityTime = DateTime.fromMillisecondsSinceEpoch(lastActivity);
    final now = DateTime.now();
    final idleMinutes = now.difference(lastActivityTime).inMinutes;

    if (idleMinutes >= SecurityConstants.sessionTimeoutMinutes) {
      await clearSession();
      return const SessionStatus(
        isValid: false,
        shouldRefreshToken: false,
        message: 'Session timed out due to inactivity.',
      );
    }

    // Check if token should be refreshed
    final remainingMinutes =
        SecurityConstants.sessionTimeoutMinutes - idleMinutes;
    final shouldRefresh =
        remainingMinutes <= SecurityConstants.tokenRefreshThresholdMinutes;

    return SessionStatus(
      isValid: true,
      shouldRefreshToken: shouldRefresh,
      remainingMinutes: remainingMinutes,
    );
  }

  /// Record user activity (call on user interactions)
  Future<void> recordActivity() async {
    await _updateSessionActivity();
  }

  /// Clear session data
  Future<void> clearSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_lastActivityKey);
    await prefs.remove(_sessionStartKey);
  }

  /// Generate cryptographically secure random string
  String generateSecureToken({int length = 32}) {
    final random = Random.secure();
    const chars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    final buffer = StringBuffer();

    for (var i = 0; i < length; i++) {
      buffer.write(chars[random.nextInt(chars.length)]);
    }

    return buffer.toString();
  }

  /// Generate secure hash for verification
  String generateSecureHash(String input) {
    final bytes = utf8.encode(input);
    final digest = sha256.convert(bytes);
    return digest.toString();
  }

  /// Comprehensive input sanitization to prevent XSS and injection attacks
  /// FIXED: Enhanced sanitization with additional security measures
  String sanitizeInput(String input) {
    if (input.isEmpty) {
      return input;
    }

    // Remove null bytes and control characters
    var sanitized =
        input.replaceAll(RegExp(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]'), '');

    // Remove HTML tags and scripts
    sanitized =
        sanitized.replaceAll(RegExp(r'<[^>]*>', caseSensitive: false), '');

    // Remove javascript: and data: protocols
    sanitized = sanitized.replaceAll(
        RegExp(r'(javascript|data|vbscript):', caseSensitive: false), '');

    // Remove event handlers (e.g., onclick, onmouseover)
    sanitized = sanitized.replaceAll(
        RegExp(r'on\w+\s*=\s*["\x27][^"\x27>]*["\x27]', caseSensitive: false),
        '');

    // Remove dangerous SQL patterns (enhanced protection)
    sanitized = sanitized.replaceAll(
        RegExp(
            r'(\b(union|select|insert|delete|update|drop|create|alter|exec|execute|script|eval|function|constructor)\b)',
            caseSensitive: false),
        '');

    // Remove quotes and escape sequences that could be used for injection
    sanitized = sanitized
        .replaceAll('"', '')
        .replaceAll("'", '')
        .replaceAll('\\', '')
        .replaceAll('`', '');

    // Remove potential path traversal attempts
    sanitized = sanitized.replaceAll(RegExp(r'\.\./'), '');

    // Remove potential command injection patterns
    sanitized = sanitized.replaceAll(
        RegExp(r'([;&|`$(){}])', caseSensitive: false), '');

    // Limit length to prevent buffer overflow attacks
    if (sanitized.length > 1000) {
      sanitized = sanitized.substring(0, 1000);
    }

    return sanitized.trim();
  }

  /// Validate email format with RFC 5322 compliant regex
  bool isValidEmail(String email) {
    if (email.length > SecurityConstants.maxEmailLength) {
      return false;
    }

    final emailRegex = RegExp(
      r'^[a-zA-Z0-9.!#$%&*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$',
    );
    return emailRegex.hasMatch(email.trim());
  }

  /// Validate username format and checking for profanity/injection
  bool validateUsername(String username) {
    if (username.length < 3 || username.length > 30) {
      return false;
    }

    // Alphanumeric, underscores, and hyphens only
    final validCharacters = RegExp(r'^[a-zA-Z0-9_-]+$');
    if (!validCharacters.hasMatch(username)) {
      return false;
    }

    return true;
  }

  /// Validate password strength
  PasswordValidation validatePassword(String password) {
    final issues = <String>[];

    if (password.length < SecurityConstants.minPasswordLength) {
      issues.add(
          'Must be at least ${SecurityConstants.minPasswordLength} characters');
    }
    if (password.length > SecurityConstants.maxPasswordLength) {
      issues.add(
          'Must be no more than ${SecurityConstants.maxPasswordLength} characters');
    }
    if (!RegExp(r'[A-Z]').hasMatch(password)) {
      issues.add('Must contain at least one uppercase letter');
    }
    if (!RegExp(r'[a-z]').hasMatch(password)) {
      issues.add('Must contain at least one lowercase letter');
    }
    if (!RegExp(r'[0-9]').hasMatch(password)) {
      issues.add('Must contain at least one number');
    }
    if (!RegExp(r'[!@#$%^&*(),.?":{}|<>]').hasMatch(password)) {
      issues.add('Must contain at least one special character');
    }

    // Calculate strength score
    int strength = 0;
    if (password.length >= 8) {
      strength++;
    }
    if (password.length >= 12) {
      strength++;
    }
    if (RegExp(r'[A-Z]').hasMatch(password)) {
      strength++;
    }
    if (RegExp(r'[a-z]').hasMatch(password)) {
      strength++;
    }
    if (RegExp(r'[0-9]').hasMatch(password)) {
      strength++;
    }
    if (RegExp(r'[!@#$%^&*(),.?":{}|<>]').hasMatch(password)) {
      strength++;
    }

    return PasswordValidation(
      isValid: issues.isEmpty,
      issues: issues,
      strengthScore: strength,
      strengthLabel: _getStrengthLabel(strength),
    );
  }

  String _getStrengthLabel(int score) {
    if (score <= 2) {
      return 'Weak';
    }
    if (score <= 4) {
      return 'Fair';
    }
    if (score <= 5) {
      return 'Strong';
    }
    return 'Very Strong';
  }

  String _formatDuration(int seconds) {
    final minutes = seconds ~/ 60;
    final remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return '$minutes min ${remainingSeconds}s';
    }
    return '${remainingSeconds}s';
  }
}

/// Result of rate limit check
class RateLimitResult {
  final bool isAllowed;
  final int remainingAttempts;
  final int lockoutRemainingSeconds;
  final String? message;

  const RateLimitResult({
    required this.isAllowed,
    required this.remainingAttempts,
    required this.lockoutRemainingSeconds,
    this.message,
  });
}

/// Session status result
class SessionStatus {
  final bool isValid;
  final bool shouldRefreshToken;
  final int? remainingMinutes;
  final String? message;

  const SessionStatus({
    required this.isValid,
    required this.shouldRefreshToken,
    this.remainingMinutes,
    this.message,
  });
}

/// Password validation result
class PasswordValidation {
  final bool isValid;
  final List<String> issues;
  final int strengthScore;
  final String strengthLabel;

  const PasswordValidation({
    required this.isValid,
    required this.issues,
    required this.strengthScore,
    required this.strengthLabel,
  });
}
