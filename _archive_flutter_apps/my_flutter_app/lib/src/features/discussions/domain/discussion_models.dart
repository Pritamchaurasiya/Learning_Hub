/// Discussion thread and post models.
library;

class DiscussionThread {

  DiscussionThread({
    required this.id,
    required this.courseId,
    required this.title,
    required this.authorName,
    required this.authorAvatar,
    required this.content,
    required this.replyCount,
    required this.likeCount,
    required this.isResolved,
    required this.isPinned,
    required this.createdAt,
    required this.tags,
  });

  factory DiscussionThread.fromJson(Map<String, dynamic> json) {
    return DiscussionThread(
      id: json['id']?.toString() ?? '',
      courseId: json['course_id']?.toString() ?? '',
      title: json['title'] as String? ?? '',
      authorName: json['author_name'] as String? ?? 'Anonymous',
      authorAvatar: json['author_avatar'] as String? ?? '',
      content: json['content'] as String? ?? '',
      replyCount: json['reply_count'] as int? ?? 0,
      likeCount: json['like_count'] as int? ?? 0,
      isResolved: json['is_resolved'] as bool? ?? false,
      isPinned: json['is_pinned'] as bool? ?? false,
      createdAt: DateTime.tryParse(json['created_at'] as String? ?? '') ??
          DateTime.now(),
      tags:
          (json['tags'] as List<dynamic>?)?.map((e) => e as String).toList() ??
              [],
    );
  }
  final String id;
  final String courseId;
  final String title;
  final String authorName;
  final String authorAvatar;
  final String content;
  final int replyCount;
  final int likeCount;
  final bool isResolved;
  final bool isPinned;
  final DateTime createdAt;
  final List<String> tags;
}

class DiscussionReply {

  DiscussionReply({
    required this.id,
    required this.threadId,
    required this.authorName,
    required this.authorAvatar,
    required this.content,
    required this.likeCount,
    required this.isAcceptedAnswer,
    required this.isInstructorReply,
    required this.createdAt,
  });

  factory DiscussionReply.fromJson(Map<String, dynamic> json) {
    return DiscussionReply(
      id: json['id']?.toString() ?? '',
      threadId: json['thread_id']?.toString() ?? '',
      authorName: json['author_name'] as String? ?? 'Anonymous',
      authorAvatar: json['author_avatar'] as String? ?? '',
      content: json['content'] as String? ?? '',
      likeCount: json['like_count'] as int? ?? 0,
      isAcceptedAnswer: json['is_accepted_answer'] as bool? ?? false,
      isInstructorReply: json['is_instructor_reply'] as bool? ?? false,
      createdAt: DateTime.tryParse(json['created_at'] as String? ?? '') ??
          DateTime.now(),
    );
  }
  final String id;
  final String threadId;
  final String authorName;
  final String authorAvatar;
  final String content;
  final int likeCount;
  final bool isAcceptedAnswer;
  final bool isInstructorReply;
  final DateTime createdAt;
}
