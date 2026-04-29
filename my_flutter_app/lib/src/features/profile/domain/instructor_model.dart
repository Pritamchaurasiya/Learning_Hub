class Instructor {
  const Instructor({
    required this.id,
    required this.name,
    required this.title,
    required this.isTopRated,
    required this.coursesCount,
    required this.studentsCount,
    required this.rating,
    required this.bio,
    this.avatarUrl,
  });

  factory Instructor.fromJson(Map<String, dynamic> json) {
    return Instructor(
      id: json['id'] as String,
      name: json['name'] as String,
      title: json['title'] as String,
      isTopRated: json['is_top_rated'] as bool? ?? false,
      coursesCount: json['courses_count'] as int? ?? 0,
      studentsCount: json['students_count'] as String? ?? '0',
      rating: (json['rating'] as num?)?.toDouble() ?? 0.0,
      bio: json['bio'] as String? ?? '',
      avatarUrl: json['avatar_url'] as String?,
    );
  }

  final String id;
  final String name;
  final String title;
  final bool isTopRated;
  final int coursesCount;
  final String studentsCount;
  final double rating;
  final String bio;
  final String? avatarUrl;
}
