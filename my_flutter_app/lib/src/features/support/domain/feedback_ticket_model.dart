class FeedbackTicket {
  const FeedbackTicket({
    required this.id,
    required this.category,
    required this.subject,
    required this.message,
    required this.isResolved,
    this.adminResponse = '',
    required this.createdAt,
    this.status = 'open',
    this.urgencyScore = 0,
    this.aiSuggestedResponse = '',
  });

  factory FeedbackTicket.fromJson(Map<String, dynamic> json) {
    return FeedbackTicket(
      id: json['id']?.toString() ?? '',
      category: json['category']?.toString() ?? 'general',
      subject: json['subject']?.toString() ?? '',
      message: json['message']?.toString() ?? '',
      isResolved: json['is_resolved'] == true ||
          json['status'] == 'resolved' ||
          json['status'] == 'closed',
      adminResponse: json['admin_response']?.toString() ?? '',
      createdAt: DateTime.tryParse(json['created_at']?.toString() ?? '') ??
          DateTime.now(),
      status: json['status']?.toString() ?? 'open',
      urgencyScore: int.tryParse(json['urgency_score']?.toString() ?? '0') ?? 0,
      aiSuggestedResponse: json['ai_suggested_response']?.toString() ?? '',
    );
  }
  final String id;
  final String
      category; // 'general', 'bug', 'content', 'billing', 'feature', 'other'
  final String subject;
  final String message;
  final bool isResolved;
  final String adminResponse;
  final DateTime createdAt;
  final String status; // 'open', 'in_progress', 'resolved', 'closed'
  final int urgencyScore;
  final String aiSuggestedResponse;

  Map<String, dynamic> toJson() {
    return {
      'category': category,
      'subject': subject,
      'message': message,
      // the API ignores read-only fields on POST, so keeping this slim
    };
  }
}
