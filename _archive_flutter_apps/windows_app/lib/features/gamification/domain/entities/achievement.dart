import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';

/// Achievement types for categorization
enum AchievementType {
  xpMilestone,
  streakMilestone,
  coursesCompleted,
  lessonsCompleted,
  quizzesPassed,
  certificatesEarned,
  special,
}

/// Rarity levels for achievements
enum AchievementRarity {
  common,
  uncommon,
  rare,
  epic,
  legendary;

  String get displayName {
    switch (this) {
      case AchievementRarity.common:
        return 'Common';
      case AchievementRarity.uncommon:
        return 'Uncommon';
      case AchievementRarity.rare:
        return 'Rare';
      case AchievementRarity.epic:
        return 'Epic';
      case AchievementRarity.legendary:
        return 'Legendary';
    }
  }

  Color get color {
    switch (this) {
      case AchievementRarity.common:
        return const Color(0xFF9E9E9E);
      case AchievementRarity.uncommon:
        return const Color(0xFF4CAF50);
      case AchievementRarity.rare:
        return const Color(0xFF2196F3);
      case AchievementRarity.epic:
        return const Color(0xFF9C27B0);
      case AchievementRarity.legendary:
        return const Color(0xFFFF9800);
    }
  }
}

class Achievement extends Equatable {
  final String id;
  final String title;
  final String description;
  final String iconPath; // Use this for Emoji or Asset path
  final AchievementType type;
  final AchievementRarity rarity;
  final int requirement;
  final int xpReward;
  final bool isUnlocked;
  final DateTime? unlockedAt;
  final double progress; // 0.0 to 1.0
  final bool isSecret;

  const Achievement({
    required this.id,
    required this.title,
    required this.description,
    required this.iconPath,
    required this.type,
    required this.rarity,
    required this.requirement,
    required this.xpReward,
    this.isUnlocked = false,
    this.unlockedAt,
    this.progress = 0.0,
    this.isSecret = false,
  });

  @override
  List<Object?> get props => [
        id,
        title,
        description,
        iconPath,
        type,
        rarity,
        requirement,
        xpReward,
        isUnlocked,
        unlockedAt,
        progress,
        isSecret,
      ];

  /// All available achievements in the system
  static const List<Achievement> allAchievements = [
    // XP Milestones
    Achievement(
      id: 'xp_100',
      title: 'Getting Started',
      description: 'Earn your first 100 XP',
      iconPath: '⭐',
      type: AchievementType.xpMilestone,
      rarity: AchievementRarity.common,
      requirement: 100,
      xpReward: 10,
    ),
    Achievement(
      id: 'xp_500',
      title: 'Rising Star',
      description: 'Earn 500 XP',
      iconPath: '🌟',
      type: AchievementType.xpMilestone,
      rarity: AchievementRarity.uncommon,
      requirement: 500,
      xpReward: 25,
    ),
    Achievement(
      id: 'xp_1000',
      title: 'Knowledge Seeker',
      description: 'Earn 1,000 XP',
      iconPath: '🔥',
      type: AchievementType.xpMilestone,
      rarity: AchievementRarity.rare,
      requirement: 1000,
      xpReward: 50,
    ),
    Achievement(
      id: 'xp_5000',
      title: 'Scholar',
      description: 'Earn 5,000 XP',
      iconPath: '🎓',
      type: AchievementType.xpMilestone,
      rarity: AchievementRarity.epic,
      requirement: 5000,
      xpReward: 100,
    ),
    Achievement(
      id: 'xp_10000',
      title: 'Grandmaster',
      description: 'Earn 10,000 XP',
      iconPath: '👑',
      type: AchievementType.xpMilestone,
      rarity: AchievementRarity.legendary,
      requirement: 10000,
      xpReward: 200,
    ),

    // Streak Milestones
    Achievement(
      id: 'streak_3',
      title: 'Consistent',
      description: 'Maintain a 3-day learning streak',
      iconPath: '🔥',
      type: AchievementType.streakMilestone,
      rarity: AchievementRarity.common,
      requirement: 3,
      xpReward: 15,
    ),
    Achievement(
      id: 'streak_7',
      title: 'Week Warrior',
      description: 'Maintain a 7-day learning streak',
      iconPath: '💪',
      type: AchievementType.streakMilestone,
      rarity: AchievementRarity.uncommon,
      requirement: 7,
      xpReward: 30,
    ),
    Achievement(
      id: 'streak_30',
      title: 'Monthly Master',
      description: 'Maintain a 30-day learning streak',
      iconPath: '🏆',
      type: AchievementType.streakMilestone,
      rarity: AchievementRarity.rare,
      requirement: 30,
      xpReward: 100,
    ),
    Achievement(
      id: 'streak_100',
      title: 'Century',
      description: 'Maintain a 100-day learning streak',
      iconPath: '💎',
      type: AchievementType.streakMilestone,
      rarity: AchievementRarity.legendary,
      requirement: 100,
      xpReward: 500,
    ),

    // Courses Completed
    Achievement(
      id: 'course_1',
      title: 'First Course',
      description: 'Complete your first course',
      iconPath: '📚',
      type: AchievementType.coursesCompleted,
      rarity: AchievementRarity.common,
      requirement: 1,
      xpReward: 50,
    ),
    Achievement(
      id: 'course_5',
      title: 'Dedicated Learner',
      description: 'Complete 5 courses',
      iconPath: '📖',
      type: AchievementType.coursesCompleted,
      rarity: AchievementRarity.uncommon,
      requirement: 5,
      xpReward: 100,
    ),
    Achievement(
      id: 'course_10',
      title: 'Course Champion',
      description: 'Complete 10 courses',
      iconPath: '🎯',
      type: AchievementType.coursesCompleted,
      rarity: AchievementRarity.rare,
      requirement: 10,
      xpReward: 200,
    ),
    Achievement(
      id: 'course_25',
      title: 'Knowledge Collector',
      description: 'Complete 25 courses',
      iconPath: '🏅',
      type: AchievementType.coursesCompleted,
      rarity: AchievementRarity.epic,
      requirement: 25,
      xpReward: 500,
    ),

    // Lessons Completed
    Achievement(
      id: 'lesson_10',
      title: 'Active Learner',
      description: 'Complete 10 lessons',
      iconPath: '✅',
      type: AchievementType.lessonsCompleted,
      rarity: AchievementRarity.common,
      requirement: 10,
      xpReward: 20,
    ),
    Achievement(
      id: 'lesson_50',
      title: 'Eager Student',
      description: 'Complete 50 lessons',
      iconPath: '📝',
      type: AchievementType.lessonsCompleted,
      rarity: AchievementRarity.uncommon,
      requirement: 50,
      xpReward: 50,
    ),
    Achievement(
      id: 'lesson_100',
      title: 'Lesson Legend',
      description: 'Complete 100 lessons',
      iconPath: '🌠',
      type: AchievementType.lessonsCompleted,
      rarity: AchievementRarity.rare,
      requirement: 100,
      xpReward: 150,
    ),

    // Quizzes
    Achievement(
      id: 'quiz_perfect_1',
      title: 'Perfect Score',
      description: 'Get a perfect score on any quiz',
      iconPath: '💯',
      type: AchievementType.quizzesPassed,
      rarity: AchievementRarity.uncommon,
      requirement: 1,
      xpReward: 25,
    ),
    Achievement(
      id: 'quiz_10',
      title: 'Quiz Master',
      description: 'Pass 10 quizzes',
      iconPath: '🧠',
      type: AchievementType.quizzesPassed,
      rarity: AchievementRarity.rare,
      requirement: 10,
      xpReward: 75,
    ),

    // Certificates
    Achievement(
      id: 'cert_1',
      title: 'Certified',
      description: 'Earn your first certificate',
      iconPath: '📜',
      type: AchievementType.certificatesEarned,
      rarity: AchievementRarity.rare,
      requirement: 1,
      xpReward: 100,
    ),
    Achievement(
      id: 'cert_5',
      title: 'Credentialed',
      description: 'Earn 5 certificates',
      iconPath: '🎖️',
      type: AchievementType.certificatesEarned,
      rarity: AchievementRarity.epic,
      requirement: 5,
      xpReward: 250,
    ),

    // Special
    Achievement(
      id: 'early_bird',
      title: 'Early Bird',
      description: 'Complete a lesson before 6 AM',
      iconPath: '🌅',
      type: AchievementType.special,
      rarity: AchievementRarity.rare,
      requirement: 1,
      xpReward: 50,
      isSecret: true,
    ),
    Achievement(
      id: 'night_owl',
      title: 'Night Owl',
      description: 'Complete a lesson after midnight',
      iconPath: '🦉',
      type: AchievementType.special,
      rarity: AchievementRarity.rare,
      requirement: 1,
      xpReward: 50,
      isSecret: true,
    ),
    Achievement(
      id: 'speedrunner',
      title: 'Speed Learner',
      description: 'Complete 5 lessons in one day',
      iconPath: '⚡',
      type: AchievementType.special,
      rarity: AchievementRarity.epic,
      requirement: 5,
      xpReward: 75,
    ),
  ];
}
