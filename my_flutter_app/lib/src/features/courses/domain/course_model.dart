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
  });

  factory Course.fromJson(Map<String, dynamic> json) {
    return Course(
      id: json['id'] as int,
      title: json['title'] as String,
      slug: json['slug'] as String,
      description: json['description'] as String,
      price: double.tryParse(json['price'].toString()) ?? 0.0,
      level: json['level'] as String?,
      isPublished: json['is_published'] as bool? ?? false,
      instructorName: json['instructor_name'] as String?,
    );
  }
  final int id;
  final String title;
  final String slug;
  final String description;
  final double price;
  final String? level;
  final bool isPublished;
  final String? instructorName;
}
