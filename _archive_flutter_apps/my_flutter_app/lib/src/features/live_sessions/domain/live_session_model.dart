/// Domain model for Live Session
class LiveSession {

  LiveSession({
    required this.id,
    required this.title,
    required this.description,
    this.courseId,
    required this.hostName,
    required this.scheduledTime,
    required this.durationMinutes,
    this.meetingUrl,
    required this.status,
    this.thumbnail,
    required this.attendeeCount,
    required this.isAttending,
  });

  factory LiveSession.fromJson(Map<String, dynamic> json) {
    return LiveSession(
      id: json['id'] as int,
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      courseId: json['course'] as int?,
      hostName:
          (json['host'] as Map<String, dynamic>?)?['full_name'] as String? ??
              'Unknown',
      scheduledTime: DateTime.parse(json['scheduled_time'] as String),
      durationMinutes: json['duration_minutes'] as int? ?? 60,
      meetingUrl: json['meeting_url'] as String?,
      status: json['status'] as String? ?? 'scheduled',
      thumbnail: json['thumbnail'] as String?,
      attendeeCount: json['attendee_count'] as int? ?? 0,
      isAttending: json['is_attending'] as bool? ?? false,
    );
  }
  final int id;
  final String title;
  final String description;
  final int? courseId;
  final String hostName;
  final DateTime scheduledTime;
  final int durationMinutes;
  final String? meetingUrl;
  final String status;
  final String? thumbnail;
  final int attendeeCount;
  final bool isAttending;

  bool get isLive => status == 'live';
  bool get isUpcoming => status == 'scheduled';
  bool get hasEnded => status == 'ended';
}
