class InstructorStats {

  const InstructorStats({
    required this.totalCourses,
    required this.totalStudents,
    required this.totalRevenue,
    required this.avgRating,
  });

  factory InstructorStats.fromJson(Map<String, dynamic> json) {
    return InstructorStats(
      totalCourses: json['total_courses'] as int? ?? 0,
      totalStudents: json['total_students'] as int? ?? 0,
      totalRevenue: (json['total_revenue'] as num? ?? 0).toDouble(),
      avgRating: (json['avg_rating'] as num? ?? 0).toDouble(),
    );
  }
  final int totalCourses;
  final int totalStudents;
  final double totalRevenue;
  final double avgRating;
}

class DashboardCourse {

  const DashboardCourse({
    required this.id,
    required this.title,
    this.thumbnail,
    required this.students,
    required this.rating,
    required this.revenue,
  });

  factory DashboardCourse.fromJson(Map<String, dynamic> json) {
    return DashboardCourse(
      id: json['id']?.toString() ?? '',
      title: json['title'] as String? ?? '',
      thumbnail: json['thumbnail'] as String?,
      students: json['students'] as int? ?? 0,
      rating: (json['rating'] as num? ?? 0).toDouble(),
      revenue: (json['revenue'] as num? ?? 0).toDouble(),
    );
  }
  final String id;
  final String title;
  final String? thumbnail;
  final int students;
  final double rating;
  final double revenue;
}
