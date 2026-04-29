/// Domain model for Study Group
class StudyGroup {

  StudyGroup({
    required this.id,
    required this.name,
    required this.description,
    required this.topic,
    required this.creatorName,
    required this.maxMembers,
    required this.isPublic,
    required this.memberCount,
    required this.isMember,
    required this.createdAt,
  });

  factory StudyGroup.fromJson(Map<String, dynamic> json) {
    return StudyGroup(
      id: json['id'] as int,
      name: json['name'] as String? ?? '',
      description: json['description'] as String? ?? '',
      topic: json['topic'] as String? ?? '',
      creatorName:
          (json['creator'] as Map<String, dynamic>?)?['full_name'] as String? ??
              'Unknown',
      maxMembers: json['max_members'] as int? ?? 10,
      isPublic: json['is_public'] as bool? ?? true,
      memberCount: json['member_count'] as int? ?? 0,
      isMember: json['is_member'] as bool? ?? false,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
  final int id;
  final String name;
  final String description;
  final String topic;
  final String creatorName;
  final int maxMembers;
  final bool isPublic;
  final int memberCount;
  final bool isMember;
  final DateTime createdAt;

  bool get isFull => memberCount >= maxMembers;
}
