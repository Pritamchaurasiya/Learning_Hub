class Certificate {

  const Certificate({
    required this.id,
    required this.certificateCode,
    required this.courseTitle,
    required this.studentName,
    required this.issuedAt,
    this.fileUrl,
  });

  factory Certificate.fromJson(Map<String, dynamic> json) {
    return Certificate(
      id: json['id']?.toString() ?? '',
      certificateCode: json['certificate_code']?.toString() ?? '',
      courseTitle: json['course_title']?.toString() ?? 'Unknown Course',
      studentName: json['student_name']?.toString() ?? 'Student',
      issuedAt: DateTime.tryParse(json['issued_at']?.toString() ?? '') ??
          DateTime.now(),
      fileUrl: json['file']?.toString(),
    );
  }
  final String id;
  final String certificateCode;
  final String courseTitle;
  final String studentName;
  final DateTime issuedAt;
  final String? fileUrl;
}
