import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Notification types
enum NotificationType {
  studyReminder,
  courseUpdate,
  achievementUnlocked,
  discussionReply,
  streakWarning,
  goalCompleted,
  newCourse,
  liveClassStarting,
  system,
}

/// Notification priority
enum NotificationPriority { low, normal, high, urgent }

/// App notification model
class AppNotification {
  final String id;
  final NotificationType type;
  final String title;
  final String body;
  final DateTime createdAt;
  final bool isRead;
  final NotificationPriority priority;
  final Map<String, dynamic>? payload;
  final String? actionRoute;

  const AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.createdAt,
    this.isRead = false,
    this.priority = NotificationPriority.normal,
    this.payload,
    this.actionRoute,
  });

  AppNotification copyWith({bool? isRead}) {
    return AppNotification(
      id: id,
      type: type,
      title: title,
      body: body,
      createdAt: createdAt,
      isRead: isRead ?? this.isRead,
      priority: priority,
      payload: payload,
      actionRoute: actionRoute,
    );
  }

  String get timeAgo {
    final diff = DateTime.now().difference(createdAt);
    if (diff.inDays > 7) {
      return '${createdAt.day}/${createdAt.month}';
    }
    if (diff.inDays > 0) {
      return '${diff.inDays}d ago';
    }
    if (diff.inHours > 0) {
      return '${diff.inHours}h ago';
    }
    if (diff.inMinutes > 0) {
      return '${diff.inMinutes}m ago';
    }
    return 'Just now';
  }

  String get icon {
    switch (type) {
      case NotificationType.studyReminder:
        return '📚';
      case NotificationType.courseUpdate:
        return '🆕';
      case NotificationType.achievementUnlocked:
        return '🏆';
      case NotificationType.discussionReply:
        return '💬';
      case NotificationType.streakWarning:
        return '🔥';
      case NotificationType.goalCompleted:
        return '🎯';
      case NotificationType.newCourse:
        return '📖';
      case NotificationType.liveClassStarting:
        return '🎥';
      case NotificationType.system:
        return '⚙️';
    }
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type.index,
        'title': title,
        'body': body,
        'createdAt': createdAt.toIso8601String(),
        'isRead': isRead,
        'priority': priority.index,
        'payload': payload,
        'actionRoute': actionRoute,
      };

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id'] as String,
      type: NotificationType.values[json['type'] as int],
      title: json['title'] as String,
      body: json['body'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      isRead: json['isRead'] as bool? ?? false,
      priority: NotificationPriority.values[json['priority'] as int? ?? 1],
      payload: json['payload'] as Map<String, dynamic>?,
      actionRoute: json['actionRoute'] as String?,
    );
  }
}

/// Notification service for handling local notifications
class NotificationService {
  static final NotificationService _instance = NotificationService._();
  static NotificationService get instance => _instance;

  NotificationService._();

  static const String _notificationsKey = 'app_notifications';
  static const int _maxNotifications = 100;

  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  final List<AppNotification> _notifications = [];
  final _notificationController = StreamController<AppNotification>.broadcast();

  Stream<AppNotification> get onNotification => _notificationController.stream;

  Future<void> initialize() async {
    await _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    try {
      final json = await _secureStorage.read(key: _notificationsKey);
      if (json != null) {
        final list = jsonDecode(json) as List;
        _notifications.clear();
        _notifications.addAll(
          list.map((e) => AppNotification.fromJson(e as Map<String, dynamic>)),
        );
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('Failed to load notifications');
      }
    }
  }

  Future<void> _saveNotifications() async {
    try {
      final json = _notifications.map((n) => n.toJson()).toList();
      await _secureStorage.write(
          key: _notificationsKey, value: jsonEncode(json));
    } catch (e) {
      if (kDebugMode) {
        debugPrint('Failed to save notifications');
      }
    }
  }

  Future<void> show({
    required NotificationType type,
    required String title,
    required String body,
    NotificationPriority priority = NotificationPriority.normal,
    Map<String, dynamic>? payload,
    String? actionRoute,
  }) async {
    final notification = AppNotification(
      id: 'notif_${DateTime.now().millisecondsSinceEpoch}',
      type: type,
      title: title,
      body: body,
      createdAt: DateTime.now(),
      priority: priority,
      payload: payload,
      actionRoute: actionRoute,
    );

    _notifications.insert(0, notification);
    while (_notifications.length > _maxNotifications) {
      _notifications.removeLast();
    }

    await _saveNotifications();
    _notificationController.add(notification);
  }

  List<AppNotification> get all => List.unmodifiable(_notifications);
  List<AppNotification> get unread =>
      _notifications.where((n) => !n.isRead).toList();
  int get unreadCount => _notifications.where((n) => !n.isRead).length;

  Future<void> markAsRead(String id) async {
    final index = _notifications.indexWhere((n) => n.id == id);
    if (index >= 0) {
      _notifications[index] = _notifications[index].copyWith(isRead: true);
      await _saveNotifications();
    }
  }

  Future<void> markAllAsRead() async {
    for (var i = 0; i < _notifications.length; i++) {
      _notifications[i] = _notifications[i].copyWith(isRead: true);
    }
    await _saveNotifications();
  }

  Future<void> delete(String id) async {
    _notifications.removeWhere((n) => n.id == id);
    await _saveNotifications();
  }

  Future<void> clearAll() async {
    _notifications.clear();
    await _saveNotifications();
  }

  void dispose() {
    _notificationController.close();
  }
}

/// Notification state for Riverpod
class NotificationState {
  final List<AppNotification> notifications;
  final int unreadCount;

  const NotificationState({
    this.notifications = const [],
    this.unreadCount = 0,
  });

  NotificationState copyWith({
    List<AppNotification>? notifications,
    int? unreadCount,
  }) {
    return NotificationState(
      notifications: notifications ?? this.notifications,
      unreadCount: unreadCount ?? this.unreadCount,
    );
  }
}

/// Notification notifier
class NotificationNotifier extends StateNotifier<NotificationState> {
  NotificationNotifier() : super(const NotificationState()) {
    _initialize();
  }

  StreamSubscription<AppNotification>? _subscription;

  Future<void> _initialize() async {
    await NotificationService.instance.initialize();
    _refresh();
    _subscription = NotificationService.instance.onNotification.listen(
      (_) => _refresh(),
    );
  }

  void _refresh() {
    state = NotificationState(
      notifications: NotificationService.instance.all,
      unreadCount: NotificationService.instance.unreadCount,
    );
  }

  Future<void> markAsRead(String id) async {
    await NotificationService.instance.markAsRead(id);
    _refresh();
  }

  Future<void> markAllAsRead() async {
    await NotificationService.instance.markAllAsRead();
    _refresh();
  }

  Future<void> delete(String id) async {
    await NotificationService.instance.delete(id);
    _refresh();
  }

  Future<void> clearAll() async {
    await NotificationService.instance.clearAll();
    _refresh();
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}

/// Notification provider
final notificationProvider =
    StateNotifierProvider<NotificationNotifier, NotificationState>((ref) {
  return NotificationNotifier();
});

/// Unread count provider
final unreadNotificationCountProvider = Provider<int>((ref) {
  return ref.watch(notificationProvider).unreadCount;
});
