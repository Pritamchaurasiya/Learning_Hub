/// Notification model for frontend.
class NotificationItem {

  NotificationItem({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    required this.isRead,
    required this.createdAt,
    this.data,
  });

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    return NotificationItem(
      id: json['id']?.toString() ?? '',
      title: (json['title'] as String?) ?? '',
      message: (json['message'] as String?) ?? '',
      type: (json['type'] as String?) ?? 'system',
      isRead: (json['is_read'] as bool?) ?? false,
      createdAt: DateTime.tryParse((json['created_at'] as String?) ?? '') ??
          DateTime.now(),
      data: json['data'] as Map<String, dynamic>?,
    );
  }
  final String id;
  final String title;
  final String message;
  final String type;
  final bool isRead;
  final DateTime createdAt;
  final Map<String, dynamic>? data;

  /// Icon based on notification type.
  static String iconForType(String type) {
    switch (type) {
      case 'achievement':
        return '🏆';
      case 'level_up':
        return '⬆️';
      case 'enrollment':
        return '📚';
      case 'submission':
        return '✅';
      default:
        return '🔔';
    }
  }
}
