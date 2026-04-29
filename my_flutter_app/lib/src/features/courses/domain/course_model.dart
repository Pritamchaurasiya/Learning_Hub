class Course {
  const Course({
    required this.id,
    required this.title,
    required this.slug,
    required this.description,
    required this.price,
    this.level,
    this.isPublished = false,
    this.instructorName,
    this.avgRating,
    this.enrollmentCount,
    this.thumbnailUrl,
    this.duration,
    this.categoryName,
    this.hlsPlaylist,
  });

  factory Course.fromJson(Map<String, dynamic> json) {
    return Course(
      id: json['id']?.toString() ?? '0',
      title: (json['title'] as String?) ?? 'Untitled Course',
      slug: (json['slug'] as String?) ?? '',
      description:
          (json['description'] as String?) ?? 'No description available',
      price: double.tryParse(json['price']?.toString() ?? '') ?? 0.0,
      level: json['level'] as String?,
      isPublished: json['is_published'] as bool? ?? false,
      instructorName: json['instructor_name'] as String?,
      avgRating: double.tryParse(json['avg_rating']?.toString() ?? ''),
      enrollmentCount: json['enrollment_count'] as int?,
      thumbnailUrl: json['thumbnail_url'] as String?,
      duration: json['duration'] as String?,
      categoryName: json['category_name'] as String?,
      hlsPlaylist: json['hls_playlist'] as String?,
    );
  }

  final String id;
  final String title;
  final String slug;
  final String description;
  final double price;
  final String? level;
  final bool isPublished;
  final String? instructorName;
  final double? avgRating;
  final int? enrollmentCount;
  final String? thumbnailUrl;
  final String? duration;
  final String? categoryName;
  final String? hlsPlaylist;

  // UI helper getters
  double get rating => avgRating ?? 0.0;
  int get totalStudents => enrollmentCount ?? 0;
}
