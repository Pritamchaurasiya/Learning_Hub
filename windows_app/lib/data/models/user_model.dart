/// User model representing platform users
class User {
  final String id;
  final String email;
  final String? phone;
  final String displayName;
  final String? firstName;
  final String? lastName;
  final String? avatarUrl;
  final String? bio;
  final UserRole role;
  final List<String> enrolledCourseIds;
  final List<String> completedCourseIds;
  final List<String> wishlistCourseIds;
  final UserPreferences preferences;
  final UserSubscription? subscription;
  final UserStats stats;
  final DateTime createdAt;
  final DateTime lastLoginAt;
  final bool isVerified;
  final bool isActive;

  User({
    required this.id,
    required this.email,
    this.phone,
    required this.displayName,
    this.firstName,
    this.lastName,
    this.avatarUrl,
    this.bio,
    required this.role,
    required this.enrolledCourseIds,
    required this.completedCourseIds,
    required this.wishlistCourseIds,
    required this.preferences,
    this.subscription,
    required this.stats,
    required this.createdAt,
    required this.lastLoginAt,
    required this.isVerified,
    required this.isActive,
  });

  /// Check if user has premium subscription
  bool get isPremium => subscription?.isActive ?? false;

  /// Get full name
  String get fullName {
    if (firstName != null && lastName != null) {
      return '$firstName $lastName';
    }
    return displayName;
  }

  /// Check if enrolled in a course
  bool isEnrolledIn(String courseId) => enrolledCourseIds.contains(courseId);

  /// Check if course is in wishlist
  bool isInWishlist(String courseId) => wishlistCourseIds.contains(courseId);

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      phone: json['phone'] as String?,
      displayName: (json['display_name'] as String?) ?? json['email'] as String,
      firstName: json['first_name'] as String?,
      lastName: json['last_name'] as String?,
      avatarUrl: json['avatar'] as String?,
      bio: json['bio'] as String?,
      role: UserRole.values.byName(json['role'] as String),
      enrolledCourseIds: json['enrolled_courses'] != null
          ? List<String>.from(json['enrolled_courses'] as List)
          : [],
      completedCourseIds: json['completed_courses'] != null
          ? List<String>.from(json['completed_courses'] as List)
          : [],
      wishlistCourseIds: json['wishlist_courses'] != null
          ? List<String>.from(json['wishlist_courses'] as List)
          : [],
      preferences: json['preferences'] != null
          ? UserPreferences.fromJson(
              json['preferences'] as Map<String, dynamic>)
          : UserPreferences.defaultPreferences(),
      subscription: json['subscription'] != null
          ? UserSubscription.fromJson(
              json['subscription'] as Map<String, dynamic>)
          : null,
      stats: json['stats'] != null
          ? UserStats.fromJson(json['stats'] as Map<String, dynamic>)
          : UserStats.empty(),
      createdAt: DateTime.parse(json['created_at'] as String),
      lastLoginAt: json['last_login_at'] != null
          ? DateTime.parse(json['last_login_at'] as String)
          : DateTime.now(),
      isVerified: json['is_verified'] as bool? ?? false,
      isActive: json['is_active'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'phone': phone,
      'displayName': displayName,
      'firstName': firstName,
      'lastName': lastName,
      'avatarUrl': avatarUrl,
      'bio': bio,
      'role': role.name,
      'enrolledCourseIds': enrolledCourseIds,
      'completedCourseIds': completedCourseIds,
      'wishlistCourseIds': wishlistCourseIds,
      'preferences': preferences.toJson(),
      'subscription': subscription?.toJson(),
      'stats': stats.toJson(),
      'createdAt': createdAt.toIso8601String(),
      'lastLoginAt': lastLoginAt.toIso8601String(),
      'isVerified': isVerified,
      'isActive': isActive,
    };
  }

  User copyWith({
    String? id,
    String? email,
    String? phone,
    String? displayName,
    String? firstName,
    String? lastName,
    String? avatarUrl,
    String? bio,
    UserRole? role,
    List<String>? enrolledCourseIds,
    List<String>? completedCourseIds,
    List<String>? wishlistCourseIds,
    UserPreferences? preferences,
    UserSubscription? subscription,
    UserStats? stats,
    DateTime? createdAt,
    DateTime? lastLoginAt,
    bool? isVerified,
    bool? isActive,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      displayName: displayName ?? this.displayName,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      bio: bio ?? this.bio,
      role: role ?? this.role,
      enrolledCourseIds: enrolledCourseIds ?? this.enrolledCourseIds,
      completedCourseIds: completedCourseIds ?? this.completedCourseIds,
      wishlistCourseIds: wishlistCourseIds ?? this.wishlistCourseIds,
      preferences: preferences ?? this.preferences,
      subscription: subscription ?? this.subscription,
      stats: stats ?? this.stats,
      createdAt: createdAt ?? this.createdAt,
      lastLoginAt: lastLoginAt ?? this.lastLoginAt,
      isVerified: isVerified ?? this.isVerified,
      isActive: isActive ?? this.isActive,
    );
  }
}

/// User roles
enum UserRole {
  student,
  instructor,
  admin,
  superAdmin;

  String get displayName {
    switch (this) {
      case UserRole.student:
        return 'Student';
      case UserRole.instructor:
        return 'Instructor';
      case UserRole.admin:
        return 'Admin';
      case UserRole.superAdmin:
        return 'Super Admin';
    }
  }
}

/// User preferences for personalization
class UserPreferences {
  final List<String> interests;
  final List<String> goals;
  final String preferredLanguage;
  final bool emailNotifications;
  final bool pushNotifications;
  final bool autoPlayVideos;
  final double playbackSpeed;
  final bool downloadOnWifi;
  final VideoQuality videoQuality;
  final bool darkMode;

  UserPreferences({
    required this.interests,
    required this.goals,
    required this.preferredLanguage,
    required this.emailNotifications,
    required this.pushNotifications,
    required this.autoPlayVideos,
    required this.playbackSpeed,
    required this.downloadOnWifi,
    required this.videoQuality,
    required this.darkMode,
  });

  factory UserPreferences.fromJson(Map<String, dynamic> json) {
    return UserPreferences(
      interests: List<String>.from(json['interests'] as List),
      goals: List<String>.from(json['goals'] as List),
      preferredLanguage: json['preferredLanguage'] as String,
      emailNotifications: json['emailNotifications'] as bool,
      pushNotifications: json['pushNotifications'] as bool,
      autoPlayVideos: json['autoPlayVideos'] as bool,
      playbackSpeed: (json['playbackSpeed'] as num).toDouble(),
      downloadOnWifi: json['downloadOnWifi'] as bool,
      videoQuality: VideoQuality.values.byName(json['videoQuality'] as String),
      darkMode: json['darkMode'] as bool,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'interests': interests,
      'goals': goals,
      'preferredLanguage': preferredLanguage,
      'emailNotifications': emailNotifications,
      'pushNotifications': pushNotifications,
      'autoPlayVideos': autoPlayVideos,
      'playbackSpeed': playbackSpeed,
      'downloadOnWifi': downloadOnWifi,
      'videoQuality': videoQuality.name,
      'darkMode': darkMode,
    };
  }

  /// Default preferences
  factory UserPreferences.defaultPreferences() {
    return UserPreferences(
      interests: [],
      goals: [],
      preferredLanguage: 'en',
      emailNotifications: true,
      pushNotifications: true,
      autoPlayVideos: true,
      playbackSpeed: 1.0,
      downloadOnWifi: true,
      videoQuality: VideoQuality.auto,
      darkMode: false,
    );
  }
}

/// Video quality settings
enum VideoQuality {
  auto,
  low,
  medium,
  high,
  hd;

  String get displayName {
    switch (this) {
      case VideoQuality.auto:
        return 'Auto';
      case VideoQuality.low:
        return '360p';
      case VideoQuality.medium:
        return '480p';
      case VideoQuality.high:
        return '720p';
      case VideoQuality.hd:
        return '1080p';
    }
  }
}

/// User subscription details
class UserSubscription {
  final String id;
  final SubscriptionPlan plan;
  final DateTime startDate;
  final DateTime endDate;
  final bool isActive;
  final bool autoRenew;

  UserSubscription({
    required this.id,
    required this.plan,
    required this.startDate,
    required this.endDate,
    required this.isActive,
    required this.autoRenew,
  });

  /// Days remaining in subscription
  int get daysRemaining {
    final now = DateTime.now();
    if (endDate.isAfter(now)) {
      return endDate.difference(now).inDays;
    }
    return 0;
  }

  factory UserSubscription.fromJson(Map<String, dynamic> json) {
    return UserSubscription(
      id: json['id'] as String,
      plan: SubscriptionPlan.values.byName(json['plan'] as String),
      startDate: DateTime.parse(json['startDate'] as String),
      endDate: DateTime.parse(json['endDate'] as String),
      isActive: json['isActive'] as bool,
      autoRenew: json['autoRenew'] as bool,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'plan': plan.name,
      'startDate': startDate.toIso8601String(),
      'endDate': endDate.toIso8601String(),
      'isActive': isActive,
      'autoRenew': autoRenew,
    };
  }
}

/// Subscription plans
enum SubscriptionPlan {
  free,
  basic,
  premium,
  enterprise;

  String get displayName {
    switch (this) {
      case SubscriptionPlan.free:
        return 'Free';
      case SubscriptionPlan.basic:
        return 'Basic';
      case SubscriptionPlan.premium:
        return 'Premium';
      case SubscriptionPlan.enterprise:
        return 'Enterprise';
    }
  }
}

/// User learning statistics
class UserStats {
  final int totalCoursesEnrolled;
  final int totalCoursesCompleted;
  final int totalLessonsCompleted;
  final int totalQuizzesPassed;
  final int totalCertificates;
  final Duration totalLearningTime;
  final int currentStreak;
  final int longestStreak;
  final int totalPoints;
  final DateTime? lastLearningDate;

  UserStats({
    required this.totalCoursesEnrolled,
    required this.totalCoursesCompleted,
    required this.totalLessonsCompleted,
    required this.totalQuizzesPassed,
    required this.totalCertificates,
    required this.totalLearningTime,
    required this.currentStreak,
    required this.longestStreak,
    required this.totalPoints,
    this.lastLearningDate,
  });

  /// Get formatted learning time
  String get formattedLearningTime {
    final hours = totalLearningTime.inHours;
    final minutes = totalLearningTime.inMinutes % 60;
    return '${hours}h ${minutes}m';
  }

  factory UserStats.fromJson(Map<String, dynamic> json) {
    return UserStats(
      totalCoursesEnrolled: json['totalCoursesEnrolled'] as int,
      totalCoursesCompleted: json['totalCoursesCompleted'] as int,
      totalLessonsCompleted: json['totalLessonsCompleted'] as int,
      totalQuizzesPassed: json['totalQuizzesPassed'] as int,
      totalCertificates: json['totalCertificates'] as int,
      totalLearningTime:
          Duration(minutes: json['totalLearningTimeMinutes'] as int),
      currentStreak: json['currentStreak'] as int,
      longestStreak: json['longestStreak'] as int,
      totalPoints: json['totalPoints'] as int,
      lastLearningDate: json['lastLearningDate'] != null
          ? DateTime.parse(json['lastLearningDate'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'totalCoursesEnrolled': totalCoursesEnrolled,
      'totalCoursesCompleted': totalCoursesCompleted,
      'totalLessonsCompleted': totalLessonsCompleted,
      'totalQuizzesPassed': totalQuizzesPassed,
      'totalCertificates': totalCertificates,
      'totalLearningTimeMinutes': totalLearningTime.inMinutes,
      'currentStreak': currentStreak,
      'longestStreak': longestStreak,
      'totalPoints': totalPoints,
      'lastLearningDate': lastLearningDate?.toIso8601String(),
    };
  }

  /// Empty stats for new users
  factory UserStats.empty() {
    return UserStats(
      totalCoursesEnrolled: 0,
      totalCoursesCompleted: 0,
      totalLessonsCompleted: 0,
      totalQuizzesPassed: 0,
      totalCertificates: 0,
      totalLearningTime: Duration.zero,
      currentStreak: 0,
      longestStreak: 0,
      totalPoints: 0,
    );
  }
}
