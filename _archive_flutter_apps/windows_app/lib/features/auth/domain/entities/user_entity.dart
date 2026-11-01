import 'package:equatable/equatable.dart';

/// User entity - Core domain model for user.
/// This is the domain layer representation, independent of data sources.
class UserEntity extends Equatable {
  final String id;
  final String email;
  final String name;
  final String? avatarUrl;
  final String? bio;
  final DateTime? createdAt;
  final DateTime? lastLoginAt;
  final UserRole role;
  final UserLevel level;
  final int xp;
  final List<String> badges;
  final Map<String, dynamic>? preferences;

  const UserEntity({
    required this.id,
    required this.email,
    required this.name,
    this.avatarUrl,
    this.bio,
    this.createdAt,
    this.lastLoginAt,
    this.role = UserRole.student,
    this.level = UserLevel.beginner,
    this.xp = 0,
    this.badges = const [],
    this.preferences,
  });

  /// Check if user is premium
  bool get isPremium => role == UserRole.premium || role == UserRole.instructor;

  /// Check if user is instructor
  bool get isInstructor => role == UserRole.instructor;

  /// Get level progress percentage (0-1)
  double get levelProgress {
    final requirements = {
      UserLevel.beginner: 0,
      UserLevel.intermediate: 1000,
      UserLevel.advanced: 5000,
      UserLevel.expert: 15000,
      UserLevel.master: 50000,
    };

    final currentReq = requirements[level] ?? 0;
    final nextLevel =
        UserLevel.values.indexOf(level) < UserLevel.values.length - 1
            ? UserLevel.values[UserLevel.values.indexOf(level) + 1]
            : level;
    final nextReq = requirements[nextLevel] ?? currentReq;

    if (nextReq == currentReq) {
      return 1.0;
    }
    return (xp - currentReq) / (nextReq - currentReq);
  }

  UserEntity copyWith({
    String? id,
    String? email,
    String? name,
    String? avatarUrl,
    String? bio,
    DateTime? createdAt,
    DateTime? lastLoginAt,
    UserRole? role,
    UserLevel? level,
    int? xp,
    List<String>? badges,
    Map<String, dynamic>? preferences,
  }) {
    return UserEntity(
      id: id ?? this.id,
      email: email ?? this.email,
      name: name ?? this.name,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      bio: bio ?? this.bio,
      createdAt: createdAt ?? this.createdAt,
      lastLoginAt: lastLoginAt ?? this.lastLoginAt,
      role: role ?? this.role,
      level: level ?? this.level,
      xp: xp ?? this.xp,
      badges: badges ?? this.badges,
      preferences: preferences ?? this.preferences,
    );
  }

  @override
  List<Object?> get props => [
        id,
        email,
        name,
        avatarUrl,
        bio,
        createdAt,
        lastLoginAt,
        role,
        level,
        xp,
        badges,
        preferences,
      ];
}

/// User roles
enum UserRole {
  student,
  premium,
  instructor,
  admin,
}

/// User experience levels
enum UserLevel {
  beginner,
  intermediate,
  advanced,
  expert,
  master,
}
