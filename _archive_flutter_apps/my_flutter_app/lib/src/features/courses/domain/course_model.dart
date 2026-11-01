import 'package:flutter/foundation.dart';

@immutable
class CourseLesson {
  const CourseLesson({
    required this.id,
    required this.title,
    required this.slug,
    this.contentType = 'video',
    this.textContent,
    this.videoUrl,
    this.durationMinutes = 0,
    this.order = 0,
    this.isPreview = false,
    this.isProOnly = false,
    this.isCompleted = false,
  });

  factory CourseLesson.fromJson(Map<String, dynamic> json) {
    return CourseLesson(
      id: json['id']?.toString() ?? '',
      title: (json['title'] as String?) ?? 'Untitled Lesson',
      slug: (json['slug'] as String?) ?? '',
      contentType: (json['content_type'] as String?) ?? 'video',
      textContent: json['text_content'] as String?,
      videoUrl: json['video_url'] as String?,
      durationMinutes: (json['duration_minutes'] as num?)?.toInt() ?? 0,
      order: (json['order'] as num?)?.toInt() ?? 0,
      isPreview: json['is_preview'] as bool? ?? false,
      isProOnly: json['is_pro_only'] as bool? ?? false,
      isCompleted: json['is_completed'] as bool? ?? false,
    );
  }

  final String id;
  final String title;
  final String slug;
  final String contentType;
  final String? textContent;
  final String? videoUrl;
  final int durationMinutes;
  final int order;
  final bool isPreview;
  final bool isProOnly;
  final bool isCompleted;

  bool get isVideo => contentType.toLowerCase() == 'video';
  bool get isQuiz => contentType.toLowerCase() == 'quiz';
  bool get isText => contentType.toLowerCase() == 'text';

  String get formattedDuration {
    if (durationMinutes <= 0) return '5 min';
    if (durationMinutes < 60) return '$durationMinutes min';
    final h = durationMinutes ~/ 60;
    final m = durationMinutes % 60;
    return m > 0 ? '${h}h ${m}m' : '${h}h';
  }

  CourseLesson copyWith({
    String? id,
    String? title,
    String? slug,
    String? contentType,
    String? textContent,
    String? videoUrl,
    int? durationMinutes,
    int? order,
    bool? isPreview,
    bool? isProOnly,
    bool? isCompleted,
  }) {
    return CourseLesson(
      id: id ?? this.id,
      title: title ?? this.title,
      slug: slug ?? this.slug,
      contentType: contentType ?? this.contentType,
      textContent: textContent ?? this.textContent,
      videoUrl: videoUrl ?? this.videoUrl,
      durationMinutes: durationMinutes ?? this.durationMinutes,
      order: order ?? this.order,
      isPreview: isPreview ?? this.isPreview,
      isProOnly: isProOnly ?? this.isProOnly,
      isCompleted: isCompleted ?? this.isCompleted,
    );
  }
}

@immutable
class CourseModule {
  const CourseModule({
    required this.id,
    required this.title,
    this.description = '',
    this.order = 0,
    this.lessons = const [],
  });

  factory CourseModule.fromJson(Map<String, dynamic> json) {
    final rawLessons = json['lessons'];
    final lessons = rawLessons is List
        ? rawLessons
            .map((l) => CourseLesson.fromJson(l as Map<String, dynamic>))
            .toList()
        : <CourseLesson>[];

    return CourseModule(
      id: json['id']?.toString() ?? '',
      title: (json['title'] as String?) ?? 'Module',
      description: (json['description'] as String?) ?? '',
      order: (json['order'] as num?)?.toInt() ?? 0,
      lessons: lessons,
    );
  }

  final String id;
  final String title;
  final String description;
  final int order;
  final List<CourseLesson> lessons;

  int get totalLessons => lessons.length;
  int get completedLessons => lessons.where((l) => l.isCompleted).length;
  int get totalDurationMinutes =>
      lessons.fold(0, (acc, l) => acc + l.durationMinutes);
}

@immutable
class CourseCategory {
  const CourseCategory({
    required this.id,
    required this.name,
    required this.slug,
    this.description,
    this.icon,
    this.courseCount = 0,
  });

  factory CourseCategory.fromJson(Map<String, dynamic> json) {
    return CourseCategory(
      id: json['id']?.toString() ?? '',
      name: (json['name'] as String?) ?? '',
      slug: (json['slug'] as String?) ?? '',
      description: json['description'] as String?,
      icon: json['icon'] as String?,
      courseCount: (json['course_count'] as num?)?.toInt() ?? 0,
    );
  }

  final String id;
  final String name;
  final String slug;
  final String? description;
  final String? icon;
  final int courseCount;
}

@immutable
class Course {
  const Course({
    required this.id,
    required this.title,
    required this.slug,
    required this.description,
    required this.price,
    this.shortDescription,
    this.level,
    this.difficulty = 'beginner',
    this.isPublished = false,
    this.isFeatured = false,
    this.isFree = false,
    this.isEnrolled = false,
    this.userProgress,
    this.instructorName,
    this.instructorId,
    this.instructorAvatar,
    this.avgRating,
    this.reviewCount = 0,
    this.enrollmentCount,
    this.thumbnailUrl,
    this.previewVideoUrl,
    this.duration,
    this.durationHours = 0,
    this.lessonsCount = 0,
    this.categoryName,
    this.categorySlug,
    this.hlsPlaylist,
    this.learningObjectives = const [],
    this.requirements = const [],
    this.modules = const [],
  });

  factory Course.fromJson(Map<String, dynamic> json) {
    // 1. Instructor parsing (handles object or flat string)
    String? instName;
    String? instId;
    String? instAvatar;
    if (json['instructor'] is Map<String, dynamic>) {
      final inst = json['instructor'] as Map<String, dynamic>;
      instName = (inst['display_name'] as String?) ??
          (inst['username'] as String?) ??
          (inst['name'] as String?);
      instId = inst['id']?.toString();
      instAvatar = inst['avatar'] as String?;
    } else {
      instName = json['instructor_name'] as String?;
      instId = json['instructor_id']?.toString();
    }

    // 2. Category parsing (handles object or flat string)
    String? catName;
    String? catSlug;
    if (json['category'] is Map<String, dynamic>) {
      final cat = json['category'] as Map<String, dynamic>;
      catName = cat['name'] as String?;
      catSlug = cat['slug'] as String?;
    } else {
      catName = json['category_name'] as String?;
      catSlug = json['category_slug'] as String?;
    }

    // 3. Modules parsing
    final rawModules = json['modules'];
    final modules = rawModules is List
        ? rawModules
            .map((m) => CourseModule.fromJson(m as Map<String, dynamic>))
            .toList()
        : <CourseModule>[];

    // 4. Learning objectives & Requirements parsing
    List<String> parseStringList(dynamic raw) {
      if (raw is List) {
        return raw.map((e) => e.toString()).where((e) => e.trim().isNotEmpty).toList();
      }
      return const [];
    }

    final rawPrice = json['price'];
    final parsedPrice = rawPrice is num
        ? rawPrice.toDouble()
        : double.tryParse(rawPrice?.toString() ?? '') ?? 0.0;

    final isFreeVal = json['is_free'] as bool? ?? (parsedPrice <= 0);

    final difficultyVal = (json['difficulty'] as String?) ??
        (json['level'] as String?) ??
        'beginner';

    return Course(
      id: json['id']?.toString() ?? '0',
      title: (json['title'] as String?) ?? 'Untitled Course',
      slug: (json['slug'] as String?) ?? '',
      description:
          (json['description'] as String?) ?? 'No description available',
      shortDescription: json['short_description'] as String?,
      price: parsedPrice,
      isFree: isFreeVal,
      level: difficultyVal.toUpperCase(),
      difficulty: difficultyVal.toLowerCase(),
      isPublished: json['is_published'] as bool? ?? false,
      isFeatured: json['is_featured'] as bool? ?? false,
      isEnrolled: json['is_enrolled'] as bool? ?? false,
      userProgress: (json['user_progress'] as num?)?.toDouble() ??
          (json['progress_percent'] as num?)?.toDouble(),
      instructorName: instName,
      instructorId: instId,
      instructorAvatar: instAvatar,
      avgRating: (json['avg_rating'] as num?)?.toDouble() ??
          double.tryParse(json['avg_rating']?.toString() ?? ''),
      reviewCount: (json['review_count'] as num?)?.toInt() ?? 0,
      enrollmentCount: (json['enrollment_count'] as num?)?.toInt() ??
          (json['student_count'] as num?)?.toInt(),
      thumbnailUrl: (json['thumbnail_url'] as String?) ??
          (json['thumbnail'] as String?),
      previewVideoUrl: (json['preview_video'] as String?) ??
          (json['preview_video_url'] as String?),
      duration: json['duration'] as String?,
      durationHours: (json['duration_hours'] as num?)?.toInt() ?? 0,
      lessonsCount: (json['lessons_count'] as num?)?.toInt() ?? 0,
      categoryName: catName,
      categorySlug: catSlug,
      hlsPlaylist: (json['hls_playlist'] as String?),
      learningObjectives: parseStringList(json['learning_objectives']),
      requirements: parseStringList(json['requirements']),
      modules: modules,
    );
  }

  final String id;
  final String title;
  final String slug;
  final String description;
  final String? shortDescription;
  final double price;
  final bool isFree;
  final String? level;
  final String difficulty;
  final bool isPublished;
  final bool isFeatured;
  final bool isEnrolled;
  final double? userProgress;
  final String? instructorName;
  final String? instructorId;
  final String? instructorAvatar;
  final double? avgRating;
  final int reviewCount;
  final int? enrollmentCount;
  final String? thumbnailUrl;
  final String? previewVideoUrl;
  final String? duration;
  final int durationHours;
  final int lessonsCount;
  final String? categoryName;
  final String? categorySlug;
  final String? hlsPlaylist;
  final List<String> learningObjectives;
  final List<String> requirements;
  final List<CourseModule> modules;

  // UI helper getters
  double get rating => avgRating ?? 4.8;
  int get totalStudents => enrollmentCount ?? 0;
  bool get hasCurriculum => modules.isNotEmpty;

  int get totalLessons {
    if (lessonsCount > 0) return lessonsCount;
    if (modules.isNotEmpty) {
      return modules.fold(0, (acc, m) => acc + m.lessons.length);
    }
    return 0;
  }

  String get formattedPrice {
    if (isFree || price <= 0) return 'Free';
    return '\$${price.toStringAsFixed(price.truncateToDouble() == price ? 0 : 2)}';
  }

  String get formattedDuration {
    if (durationHours > 0) return '${durationHours}h total';
    if (duration != null && duration!.isNotEmpty) return duration!;
    if (modules.isNotEmpty) {
      final totalMin =
          modules.fold(0, (acc, m) => acc + m.totalDurationMinutes);
      if (totalMin > 0) {
        final h = totalMin ~/ 60;
        return h > 0 ? '${h}h total' : '${totalMin}m total';
      }
    }
    return 'Self-paced';
  }

  Course copyWith({
    String? id,
    String? title,
    String? slug,
    String? description,
    String? shortDescription,
    double? price,
    bool? isFree,
    String? level,
    String? difficulty,
    bool? isPublished,
    bool? isFeatured,
    bool? isEnrolled,
    double? userProgress,
    String? instructorName,
    String? instructorId,
    String? instructorAvatar,
    double? avgRating,
    int? reviewCount,
    int? enrollmentCount,
    String? thumbnailUrl,
    String? previewVideoUrl,
    String? duration,
    int? durationHours,
    int? lessonsCount,
    String? categoryName,
    String? categorySlug,
    String? hlsPlaylist,
    List<String>? learningObjectives,
    List<String>? requirements,
    List<CourseModule>? modules,
  }) {
    return Course(
      id: id ?? this.id,
      title: title ?? this.title,
      slug: slug ?? this.slug,
      description: description ?? this.description,
      shortDescription: shortDescription ?? this.shortDescription,
      price: price ?? this.price,
      isFree: isFree ?? this.isFree,
      level: level ?? this.level,
      difficulty: difficulty ?? this.difficulty,
      isPublished: isPublished ?? this.isPublished,
      isFeatured: isFeatured ?? this.isFeatured,
      isEnrolled: isEnrolled ?? this.isEnrolled,
      userProgress: userProgress ?? this.userProgress,
      instructorName: instructorName ?? this.instructorName,
      instructorId: instructorId ?? this.instructorId,
      instructorAvatar: instructorAvatar ?? this.instructorAvatar,
      avgRating: avgRating ?? this.avgRating,
      reviewCount: reviewCount ?? this.reviewCount,
      enrollmentCount: enrollmentCount ?? this.enrollmentCount,
      thumbnailUrl: thumbnailUrl ?? this.thumbnailUrl,
      previewVideoUrl: previewVideoUrl ?? this.previewVideoUrl,
      duration: duration ?? this.duration,
      durationHours: durationHours ?? this.durationHours,
      lessonsCount: lessonsCount ?? this.lessonsCount,
      categoryName: categoryName ?? this.categoryName,
      categorySlug: categorySlug ?? this.categorySlug,
      hlsPlaylist: hlsPlaylist ?? this.hlsPlaylist,
      learningObjectives: learningObjectives ?? this.learningObjectives,
      requirements: requirements ?? this.requirements,
      modules: modules ?? this.modules,
    );
  }
}
