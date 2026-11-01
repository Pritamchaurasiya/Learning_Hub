/// Course model representing a learning course
class Course {
  final String id;
  final String title;
  final String slug;
  final String description;
  final String shortDescription;
  final String thumbnailUrl;
  final String? previewVideoUrl;
  final String instructorId;
  final String instructorName;
  final String instructorAvatar;
  final String category;
  final List<String> tags;
  final double rating;
  final int reviewCount;
  final int enrollmentCount;
  final int totalLessons;
  final Duration totalDuration;
  final CourseLevel level;
  final String language;
  final double price;
  final double? originalPrice;
  final bool isFree;
  final bool isPublished;
  final bool hasCertificate;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<CourseSection> sections;
  final List<String> requirements;
  final List<String> whatYouWillLearn;

  Course({
    required this.id,
    required this.title,
    required this.slug,
    required this.description,
    required this.shortDescription,
    required this.thumbnailUrl,
    this.previewVideoUrl,
    required this.instructorId,
    required this.instructorName,
    required this.instructorAvatar,
    required this.category,
    required this.tags,
    required this.rating,
    required this.reviewCount,
    required this.enrollmentCount,
    required this.totalLessons,
    required this.totalDuration,
    required this.level,
    required this.language,
    required this.price,
    this.originalPrice,
    required this.isFree,
    required this.isPublished,
    required this.hasCertificate,
    required this.createdAt,
    required this.updatedAt,
    required this.sections,
    required this.requirements,
    required this.whatYouWillLearn,
  });

  /// Get discount percentage if original price exists
  int? get discountPercentage {
    if (originalPrice != null && originalPrice! > price) {
      return ((originalPrice! - price) / originalPrice! * 100).round();
    }
    return null;
  }

  /// Get formatted duration string
  String get formattedDuration {
    final hours = totalDuration.inHours;
    final minutes = totalDuration.inMinutes % 60;

    if (hours > 0) {
      return '${hours}h ${minutes}m';
    }
    return '${minutes}m';
  }

  // ALIASES for service compatibility
  CourseLevel get difficulty => level;
  int get lessonsCount => totalLessons;
  int get enrolledStudents => enrollmentCount;

  /// Create from JSON
  factory Course.fromJson(Map<String, dynamic> json) {
    return Course(
      id: json['id'] as String,
      title: json['title'] as String,
      slug: json['slug'] as String,
      description: json['description'] as String,
      shortDescription: json['shortDescription'] as String,
      thumbnailUrl: json['thumbnailUrl'] as String,
      previewVideoUrl: json['previewVideoUrl'] as String?,
      instructorId: json['instructorId'] as String,
      instructorName: json['instructorName'] as String,
      instructorAvatar: json['instructorAvatar'] as String,
      category: json['category'] as String,
      tags: List<String>.from(json['tags'] as List),
      rating: (json['rating'] as num).toDouble(),
      reviewCount: json['reviewCount'] as int,
      enrollmentCount: json['enrollmentCount'] as int,
      totalLessons: json['totalLessons'] as int,
      totalDuration: Duration(seconds: json['totalDurationSeconds'] as int),
      level: CourseLevel.values.byName(json['level'] as String),
      language: json['language'] as String,
      price: (json['price'] as num).toDouble(),
      originalPrice: json['originalPrice'] != null
          ? (json['originalPrice'] as num).toDouble()
          : null,
      isFree: json['isFree'] as bool,
      isPublished: json['isPublished'] as bool,
      hasCertificate: json['hasCertificate'] as bool,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      sections: (json['sections'] as List)
          .map((e) => CourseSection.fromJson(e as Map<String, dynamic>))
          .toList(),
      requirements: List<String>.from(json['requirements'] as List),
      whatYouWillLearn: List<String>.from(json['whatYouWillLearn'] as List),
    );
  }

  /// Convert to JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'slug': slug,
      'description': description,
      'shortDescription': shortDescription,
      'thumbnailUrl': thumbnailUrl,
      'previewVideoUrl': previewVideoUrl,
      'instructorId': instructorId,
      'instructorName': instructorName,
      'instructorAvatar': instructorAvatar,
      'category': category,
      'tags': tags,
      'rating': rating,
      'reviewCount': reviewCount,
      'enrollmentCount': enrollmentCount,
      'totalLessons': totalLessons,
      'totalDurationSeconds': totalDuration.inSeconds,
      'level': level.name,
      'language': language,
      'price': price,
      'originalPrice': originalPrice,
      'isFree': isFree,
      'isPublished': isPublished,
      'hasCertificate': hasCertificate,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'sections': sections.map((e) => e.toJson()).toList(),
      'requirements': requirements,
      'whatYouWillLearn': whatYouWillLearn,
    };
  }
}

/// Course difficulty level
enum CourseLevel {
  beginner,
  intermediate,
  advanced,
  expert;

  String get displayName {
    switch (this) {
      case CourseLevel.beginner:
        return 'Beginner';
      case CourseLevel.intermediate:
        return 'Intermediate';
      case CourseLevel.advanced:
        return 'Advanced';
      case CourseLevel.expert:
        return 'Expert';
    }
  }
}

/// Course section containing lessons
class CourseSection {
  final String id;
  final String title;
  final int order;
  final List<Lesson> lessons;

  CourseSection({
    required this.id,
    required this.title,
    required this.order,
    required this.lessons,
  });

  /// Total duration of section
  Duration get totalDuration {
    return lessons.fold(
      Duration.zero,
      (total, lesson) => total + lesson.duration,
    );
  }

  factory CourseSection.fromJson(Map<String, dynamic> json) {
    return CourseSection(
      id: json['id'] as String,
      title: json['title'] as String,
      order: json['order'] as int,
      lessons: (json['lessons'] as List)
          .map((e) => Lesson.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'order': order,
      'lessons': lessons.map((e) => e.toJson()).toList(),
    };
  }
}

/// Individual lesson within a course
class Lesson {
  final String id;
  final String title;
  final String description;
  final LessonType type;
  final Duration duration;
  final String? videoUrl;
  final String? transcriptPath;
  final String? articleContent;
  final String? resourceUrl;
  final bool isFree;
  final bool isPreview;
  final int order;

  Lesson({
    required this.id,
    required this.title,
    required this.description,
    required this.type,
    required this.duration,
    this.videoUrl,
    this.transcriptPath,
    this.articleContent,
    this.resourceUrl,
    required this.isFree,
    required this.isPreview,
    required this.order,
  });

  /// Get formatted duration string
  String get formattedDuration {
    final minutes = duration.inMinutes;
    final seconds = duration.inSeconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  factory Lesson.fromJson(Map<String, dynamic> json) {
    return Lesson(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      type: LessonType.values.byName(json['type'] as String),
      duration: Duration(seconds: json['durationSeconds'] as int),
      videoUrl: json['videoUrl'] as String?,
      transcriptPath: json['transcriptPath'] as String?,
      articleContent: json['articleContent'] as String?,
      resourceUrl: json['resourceUrl'] as String?,
      isFree: json['isFree'] as bool,
      isPreview: json['isPreview'] as bool,
      order: json['order'] as int,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'type': type.name,
      'durationSeconds': duration.inSeconds,
      'videoUrl': videoUrl,
      'transcriptPath': transcriptPath,
      'articleContent': articleContent,
      'resourceUrl': resourceUrl,
      'isFree': isFree,
      'isPreview': isPreview,
      'order': order,
    };
  }
}

/// Types of lessons
enum LessonType {
  video,
  article,
  quiz,
  assignment,
  live,
  resource;

  String get displayName {
    switch (this) {
      case LessonType.video:
        return 'Video';
      case LessonType.article:
        return 'Article';
      case LessonType.quiz:
        return 'Quiz';
      case LessonType.assignment:
        return 'Assignment';
      case LessonType.live:
        return 'Live Session';
      case LessonType.resource:
        return 'Resource';
    }
  }
}
