class TutorProfile {

  const TutorProfile({
    required this.id,
    required this.userId,
    required this.name,
    required this.bio,
    required this.hourlyRate,
    required this.skills,
    required this.rating,
    required this.totalReviews,
    required this.isVerified,
  });

  factory TutorProfile.fromJson(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>? ?? {};
    final skillsRaw = json['skills']?.toString() ?? '';
    return TutorProfile(
      id: (json['id'] as int?) ?? 0,
      userId: user['id']?.toString() ?? '',
      name: '${user['first_name'] ?? ''} ${user['last_name'] ?? ''}'.trim(),
      bio: json['bio']?.toString() ?? '',
      hourlyRate:
          double.tryParse(json['hourly_rate']?.toString() ?? '0') ?? 0.0,
      skills: skillsRaw.isNotEmpty
          ? skillsRaw.split(',').map((e) => e.trim()).toList()
          : [],
      rating: (json['rating'] as num?)?.toDouble() ?? 0.0,
      totalReviews: (json['total_reviews'] as int?) ?? 0,
      isVerified: json['is_verified'] == true,
    );
  }
  final int id;
  final String userId;
  final String name;
  final String bio;
  final double hourlyRate;
  final List<String> skills;
  final double rating;
  final int totalReviews;
  final bool isVerified;
}

class Booking {

  const Booking({
    required this.id,
    required this.status,
    required this.startTime,
    required this.endTime,
    this.tutor,
    required this.meetingLink,
  });

  factory Booking.fromJson(Map<String, dynamic> json) {
    return Booking(
      id: (json['id'] as int?) ?? 0,
      status: json['status']?.toString() ?? 'pending',
      startTime: DateTime.tryParse(json['start_time']?.toString() ?? '') ??
          DateTime.now(),
      endTime: DateTime.tryParse(json['end_time']?.toString() ?? '') ??
          DateTime.now(),
      tutor: json['tutor_details'] != null
          ? TutorProfile.fromJson(json['tutor_details'] as Map<String, dynamic>)
          : null,
      meetingLink: json['meeting_link']?.toString() ?? '',
    );
  }
  final int id;
  final String status;
  final DateTime startTime;
  final DateTime endTime;
  final TutorProfile? tutor;
  final String meetingLink;
}
