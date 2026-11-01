import 'package:equatable/equatable.dart';

class Note extends Equatable {
  final String id;
  final String courseId;
  final String? lessonId;
  final String content;
  final Duration? timestamp; // Video timestamp if applicable
  final DateTime createdAt;

  const Note({
    required this.id,
    required this.courseId,
    this.lessonId,
    required this.content,
    this.timestamp,
    required this.createdAt,
  });

  Note copyWith({
    String? content,
    Duration? timestamp,
  }) {
    return Note(
      id: id,
      courseId: courseId,
      lessonId: lessonId,
      content: content ?? this.content,
      timestamp: timestamp ?? this.timestamp,
      createdAt: createdAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'courseId': courseId,
      'lessonId': lessonId,
      'content': content,
      'timestamp': timestamp?.inMilliseconds,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  factory Note.fromJson(Map<String, dynamic> json) {
    return Note(
      id: json['id'] as String,
      courseId: json['courseId'] as String,
      lessonId: json['lessonId'] as String?,
      content: json['content'] as String,
      timestamp: json['timestamp'] != null
          ? Duration(milliseconds: json['timestamp'] as int)
          : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  @override
  List<Object?> get props =>
      [id, courseId, lessonId, content, timestamp, createdAt];
}
