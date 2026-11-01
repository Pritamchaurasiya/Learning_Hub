import 'package:intl/intl.dart';

/// Live Class Model representing a scheduled live session
class LiveClassModel {
  final String id;
  final String title;
  final String instructorName;
  final DateTime scheduledTime;
  final String? description;
  final String? meetingUrl;

  const LiveClassModel({
    required this.id,
    required this.title,
    required this.instructorName,
    required this.scheduledTime,
    this.description,
    this.meetingUrl,
  });

  /// Get formatted schedule time string (e.g., "Today, 4:00 PM")
  String get formattedSchedule {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final tomorrow = today.add(const Duration(days: 1));
    final date =
        DateTime(scheduledTime.year, scheduledTime.month, scheduledTime.day);

    final timeStr = DateFormat('h:mm a').format(scheduledTime);

    if (date == today) {
      return 'Today, $timeStr';
    } else if (date == tomorrow) {
      return 'Tomorrow, $timeStr';
    } else {
      return '${DateFormat('MMM d').format(scheduledTime)}, $timeStr';
    }
  }

  factory LiveClassModel.fromJson(Map<String, dynamic> json) {
    return LiveClassModel(
      id: json['id'] as String,
      title: json['title'] as String,
      instructorName: json['instructorName'] as String,
      scheduledTime: DateTime.parse(json['scheduledTime'] as String),
      description: json['description'] as String?,
      meetingUrl: json['meetingUrl'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'instructorName': instructorName,
      'scheduledTime': scheduledTime.toIso8601String(),
      'description': description,
      'meetingUrl': meetingUrl,
    };
  }
}
