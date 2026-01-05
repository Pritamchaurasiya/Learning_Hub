import 'package:dartz/dartz.dart';
import 'package:learning_hub/core/error/failures.dart';
import '../entities/user_entity.dart';

/// Abstract user repository - defines the contract for user operations.
/// This is part of the domain layer, implemented in the data layer.
abstract class UserRepository {
  /// Get current authenticated user
  Future<Either<Failure, UserEntity>> getCurrentUser();

  /// Login with email and password
  Future<Either<Failure, UserEntity>> login({
    required String email,
    required String password,
  });

  /// Register a new user
  Future<Either<Failure, UserEntity>> register({
    required String name,
    required String email,
    required String password,
  });

  /// Logout current user
  Future<Either<Failure, void>> logout();

  /// Update user profile
  Future<Either<Failure, UserEntity>> updateProfile({
    String? name,
    String? bio,
    String? avatarUrl,
    Map<String, dynamic>? preferences,
  });

  /// Request password reset
  Future<Either<Failure, void>> requestPasswordReset(String email);

  /// Reset password with token
  Future<Either<Failure, void>> resetPassword({
    required String token,
    required String newPassword,
  });

  /// Change password
  Future<Either<Failure, void>> changePassword({
    required String currentPassword,
    required String newPassword,
  });

  /// Check if user is logged in
  Future<Either<Failure, bool>> isLoggedIn();

  /// Get user stream for real-time updates
  Stream<UserEntity?> get userStream;

  /// Delete user account
  Future<Either<Failure, void>> deleteAccount(String password);
}
