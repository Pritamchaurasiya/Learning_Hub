/// Gamification domain models with null-safe JSON parsing
class UserXP {
  const UserXP({
    required this.totalXp,
    required this.level,
    required this.weeklyXp,
  });

  factory UserXP.fromJson(Map<String, dynamic> json) {
    return UserXP(
      totalXp: (json['total_xp'] as num?)?.toInt() ?? 0,
      level: (json['level'] as num?)?.toInt() ?? 1,
      weeklyXp: (json['weekly_xp'] as num?)?.toInt() ?? 0,
    );
  }

  /// Creates a default empty state
  static const empty = UserXP(totalXp: 0, level: 1, weeklyXp: 0);

  final int totalXp;
  final int level;
  final int weeklyXp;

  /// XP required for next level (simple formula: level * 100)
  int get xpForNextLevel => level * 100;

  /// Progress percentage to next level (0.0 to 1.0)
  double get levelProgress {
    final xpInCurrentLevel = totalXp % xpForNextLevel;
    return xpInCurrentLevel / xpForNextLevel;
  }
}

class Streak {
  const Streak({
    required this.currentStreak,
    required this.longestStreak,
    this.lastActivityDate,
  });

  factory Streak.fromJson(Map<String, dynamic> json) {
    return Streak(
      currentStreak: (json['current_streak'] as num?)?.toInt() ?? 0,
      longestStreak: (json['longest_streak'] as num?)?.toInt() ?? 0,
      lastActivityDate: json['last_activity_date'] != null
          ? DateTime.tryParse(json['last_activity_date'].toString())
          : null,
    );
  }

  /// Creates a default empty state
  static const empty = Streak(currentStreak: 0, longestStreak: 0);

  final int currentStreak;
  final int longestStreak;
  final DateTime? lastActivityDate;

  /// Whether the streak is still active (activity within last 24h)
  bool get isActive {
    if (lastActivityDate == null) {
      return false;
    }
    final now = DateTime.now();
    return now.difference(lastActivityDate!).inHours < 24;
  }
}

class GamificationBadge {
  const GamificationBadge({
    required this.id,
    required this.name,
    required this.description,
    this.icon,
    required this.xpReward,
  });

  factory GamificationBadge.fromJson(Map<String, dynamic> json) {
    return GamificationBadge(
      id: json['id']?.toString() ?? '',
      name: (json['name'] as String?) ?? 'Unknown Badge',
      description: (json['description'] as String?) ?? '',
      icon: json['icon'] as String?,
      xpReward: (json['xp_reward'] as num?)?.toInt() ?? 0,
    );
  }

  final String id;
  final String name;
  final String description;
  final String? icon;
  final int xpReward;
}

class UserBadge {
  const UserBadge({
    required this.badge,
    required this.earnedAt,
  });

  factory UserBadge.fromJson(Map<String, dynamic> json) {
    final badgeData = json['badge'];
    return UserBadge(
      badge: badgeData is Map<String, dynamic>
          ? GamificationBadge.fromJson(badgeData)
          : GamificationBadge.fromJson(<String, dynamic>{}),
      earnedAt: DateTime.tryParse(json['earned_at']?.toString() ?? '') ??
          DateTime.now(),
    );
  }

  final GamificationBadge badge;
  final DateTime earnedAt;
}
