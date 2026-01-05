class UserXP {

  const UserXP({
    required this.totalXp,
    required this.level,
    required this.weeklyXp,
  });

  factory UserXP.fromJson(Map<String, dynamic> json) {
    return UserXP(
      totalXp: json['total_xp'] as int,
      level: json['level'] as int,
      weeklyXp: json['weekly_xp'] as int,
    );
  }
  final int totalXp;
  final int level;
  final int weeklyXp;
}

class Streak {

  const Streak({
    required this.currentStreak,
    required this.longestStreak,
    this.lastActivityDate,
  });

  factory Streak.fromJson(Map<String, dynamic> json) {
    return Streak(
      currentStreak: json['current_streak'] as int,
      longestStreak: json['longest_streak'] as int,
      lastActivityDate: json['last_activity_date'] != null
          ? DateTime.parse(json['last_activity_date'] as String)
          : null,
    );
  }
  final int currentStreak;
  final int longestStreak;
  final DateTime? lastActivityDate;
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
      id: json['id'].toString(),
      name: json['name'] as String,
      description: json['description'] as String,
      icon: json['icon'] as String?,
      xpReward: json['xp_reward'] as int,
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
    return UserBadge(
      badge: GamificationBadge.fromJson(json['badge'] as Map<String, dynamic>),
      earnedAt: DateTime.parse(json['earned_at'] as String),
    );
  }
  final GamificationBadge badge;
  final DateTime earnedAt;
}
