import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/core/constants/api_constants.dart';
import 'package:my_flutter_app/src/core/network/api_client.dart';
import 'package:my_flutter_app/src/features/notifications/domain/notification_model.dart';

/// Repository for notification operations.
class NotificationRepository {
  NotificationRepository(this._api);
  final ApiClient _api;

  /// Fetch paginated notifications for the current user.
  Future<List<NotificationItem>> getNotifications({int page = 1}) async {
    try {
      final response = await _api.get(ApiConstants.notifications,
          queryParameters: {'page': page.toString()});
      final dynamic data = response.data;
      final results = (data is Map && data.containsKey('results'))
          ? data['results'] as List<dynamic>
          : (data is List ? data : <NotificationItem>[]);
      return results
          .map(
              (json) => NotificationItem.fromJson(json as Map<String, dynamic>))
          .toList();
    } on Exception {
      // Return empty list on failure — let the UI show its empty state honestly
      return [];
    }
  }

  /// Mark notification(s) as read.
  Future<void> markAsRead(List<String> ids) async {
    try {
      await _api
          .post('/notifications/mark-read/', data: {'notification_ids': ids});
    } on Exception {
      // Silently fail - will sync on next fetch
    }
  }

  /// Mark all notifications as read.
  Future<void> markAllAsRead() async {
    try {
      await _api.post('/notifications/mark-read/');
    } on Exception {
      // Silently fail
    }
  }

  /// Get unread count.
  Future<int> getUnreadCount() async {
    try {
      final response = await _api.get('/notifications/unread-count/');
      return response.data?['count'] as int? ?? 0;
    } on Exception {
      return 0;
    }
  }

  /// Delete a notification.
  Future<void> deleteNotification(String id) async {
    try {
      await _api.delete('/notifications/$id/');
    } on Exception {
      // Silently fail
    }
  }
}

/// Provider for notification repository.
final notificationRepositoryProvider = Provider<NotificationRepository>((ref) {
  return NotificationRepository(ref.read(apiClientProvider));
});

/// Provider for notifications list.
final notificationsProvider =
    FutureProvider<List<NotificationItem>>((ref) async {
  return ref.read(notificationRepositoryProvider).getNotifications();
});

/// Provider for unread count.
final unreadNotificationCountProvider = FutureProvider<int>((ref) async {
  return ref.read(notificationRepositoryProvider).getUnreadCount();
});
