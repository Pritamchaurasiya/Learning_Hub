import '../../domain/entities/achievement.dart';
import '../../domain/entities/leaderboard_entry.dart';

class AchievementModel extends Achievement {
  const AchievementModel({
    required super.id,
    required super.title,
    required super.description,
    required super.iconPath,
    required super.type,
    required super.rarity,
    required super.requirement,
    required super.xpReward,
    super.isUnlocked,
    super.unlockedAt,
    super.progress,
    super.isSecret,
  });

  factory AchievementModel.fromJson(Map<String, dynamic> json) {
    return AchievementModel(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      iconPath: (json['icon_path'] ?? json['icon'] ?? '') as String,
      type: _parseType(json['type'] as String?),
      rarity: _parseRarity(json['rarity'] as String?),
      requirement: (json['requirement'] ?? 1) as int,
      xpReward: (json['xp_reward'] ?? 0) as int,
      isUnlocked: (json['is_unlocked'] ?? false) as bool,
      unlockedAt: json['unlocked_at'] != null
          ? DateTime.tryParse(json['unlocked_at'] as String)
          : null,
      progress: (json['progress'] as num?)?.toDouble() ?? 0.0,
      isSecret: (json['is_secret'] ?? false) as bool,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'icon_path': iconPath,
      'type': type.name,
      'rarity': rarity.name,
      'requirement': requirement,
      'xp_reward': xpReward,
      'is_unlocked': isUnlocked,
      'unlocked_at': unlockedAt?.toIso8601String(),
      'progress': progress,
      'is_secret': isSecret,
    };
  }

  static AchievementType _parseType(String? typeStr) {
    if (typeStr == null) return AchievementType.special;
    try {
      return AchievementType.values.byName(typeStr);
    } catch (_) {
      return AchievementType.special;
    }
  }

  static AchievementRarity _parseRarity(String? rarityStr) {
    if (rarityStr == null) return AchievementRarity.common;
    try {
      return AchievementRarity.values.byName(rarityStr);
    } catch (_) {
      return AchievementRarity.common;
    }
  }
}

class LeaderboardEntryModel extends LeaderboardEntry {
  const LeaderboardEntryModel({
    required super.userId,
    required super.displayName,
    required super.avatarUrl,
    required super.xp,
    required super.rank,
    super.isCurrentUser,
  });

  factory LeaderboardEntryModel.fromJson(Map<String, dynamic> json) {
    return LeaderboardEntryModel(
      userId: json['user_id'] as String,
      displayName: json['display_name'] as String,
      avatarUrl: json['avatar_url'] as String,
      xp: json['xp'] as int,
      rank: json['rank'] as int,
      isCurrentUser: (json['is_current_user'] ?? false) as bool,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'user_id': userId,
      'display_name': displayName,
      'avatar_url': avatarUrl,
      'xp': xp,
      'rank': rank,
      'is_current_user': isCurrentUser,
    };
  }
}
