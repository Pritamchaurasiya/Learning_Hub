import 'dart:math';
import '../../core/constants/app_constants.dart';
import '../../core/services/security_service.dart';

/// Certificate model for course completion
class Certificate {
  final String id;
  final String courseId;
  final String courseTitle;
  final String recipientName;
  final String recipientEmail;
  final DateTime issuedAt;
  final DateTime expiresAt;
  final String verificationCode;
  final String? instructorName;
  final int? courseHours;
  final double? finalScore;

  const Certificate({
    required this.id,
    required this.courseId,
    required this.courseTitle,
    required this.recipientName,
    required this.recipientEmail,
    required this.issuedAt,
    required this.expiresAt,
    required this.verificationCode,
    this.instructorName,
    this.courseHours,
    this.finalScore,
  });

  /// Generate verification URL
  String get verificationUrl =>
      '${AppConfig.certificateVerifyUrl}/$verificationCode';

  /// Check if certificate is valid (not expired)
  bool get isValid => DateTime.now().isBefore(expiresAt);

  /// Formatted issue date
  String get formattedIssueDate {
    return '${issuedAt.day}/${issuedAt.month}/${issuedAt.year}';
  }

  /// Create a new certificate
  factory Certificate.create({
    required String courseId,
    required String courseTitle,
    required String recipientName,
    required String recipientEmail,
    String? instructorName,
    int? courseHours,
    double? finalScore,
  }) {
    final now = DateTime.now();
    final expiresAt =
        now.add(const Duration(days: CertificateConstants.validityYears * 365));

    return Certificate(
      id: _generateCertificateId(),
      courseId: courseId,
      courseTitle: courseTitle,
      recipientName: recipientName,
      recipientEmail: recipientEmail,
      issuedAt: now,
      expiresAt: expiresAt,
      verificationCode: _generateVerificationCode(),
      instructorName: instructorName,
      courseHours: courseHours,
      finalScore: finalScore,
    );
  }

  static String _generateCertificateId() {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final random = SecurityService.instance.generateSecureToken(length: 8);
    return 'CERT-$timestamp-$random';
  }

  static String _generateVerificationCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars
    final random = Random.secure();
    final buffer = StringBuffer();

    for (var i = 0; i < CertificateConstants.verificationCodeLength; i++) {
      if (i > 0 && i % 4 == 0) {
        buffer.write('-');
      }
      buffer.write(chars[random.nextInt(chars.length)]);
    }

    return buffer.toString();
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'courseId': courseId,
        'courseTitle': courseTitle,
        'recipientName': recipientName,
        'recipientEmail': recipientEmail,
        'issuedAt': issuedAt.toIso8601String(),
        'expiresAt': expiresAt.toIso8601String(),
        'verificationCode': verificationCode,
        'instructorName': instructorName,
        'courseHours': courseHours,
        'finalScore': finalScore,
      };

  factory Certificate.fromJson(Map<String, dynamic> json) {
    return Certificate(
      id: json['id'] as String,
      courseId: json['courseId'] as String,
      courseTitle: json['courseTitle'] as String,
      recipientName: json['recipientName'] as String,
      recipientEmail: json['recipientEmail'] as String,
      issuedAt: DateTime.parse(json['issuedAt'] as String),
      expiresAt: DateTime.parse(json['expiresAt'] as String),
      verificationCode: json['verificationCode'] as String,
      instructorName: json['instructorName'] as String?,
      courseHours: json['courseHours'] as int?,
      finalScore: json['finalScore'] as double?,
    );
  }

  Certificate copyWith({
    String? id,
    String? courseId,
    String? courseTitle,
    String? recipientName,
    String? recipientEmail,
    DateTime? issuedAt,
    DateTime? expiresAt,
    String? verificationCode,
    String? instructorName,
    int? courseHours,
    double? finalScore,
  }) {
    return Certificate(
      id: id ?? this.id,
      courseId: courseId ?? this.courseId,
      courseTitle: courseTitle ?? this.courseTitle,
      recipientName: recipientName ?? this.recipientName,
      recipientEmail: recipientEmail ?? this.recipientEmail,
      issuedAt: issuedAt ?? this.issuedAt,
      expiresAt: expiresAt ?? this.expiresAt,
      verificationCode: verificationCode ?? this.verificationCode,
      instructorName: instructorName ?? this.instructorName,
      courseHours: courseHours ?? this.courseHours,
      finalScore: finalScore ?? this.finalScore,
    );
  }
}
