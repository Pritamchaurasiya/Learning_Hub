import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:learning_hub/core/services/notification_service.dart';
import 'package:learning_hub/core/theme/app_colors.dart';
import 'package:learning_hub/shared/widgets/empty_state_view.dart';

/// Notifications screen with categorized notifications
class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() =>
      _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(notificationProvider);
    final notifications = state.notifications;
    final unreadCount = state.unreadCount;

    // Filter categories
    final courses = notifications
        .where((n) =>
            n.type == NotificationType.courseUpdate ||
            n.type == NotificationType.newCourse ||
            n.type == NotificationType.liveClassStarting)
        .toList();

    final social = notifications
        .where((n) =>
            n.type == NotificationType.discussionReply ||
            n.type == NotificationType.achievementUnlocked ||
            n.type == NotificationType.goalCompleted)
        .toList();

    final system = notifications
        .where((n) =>
            n.type == NotificationType.system ||
            n.type == NotificationType.streakWarning ||
            n.type == NotificationType.studyReminder)
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          if (unreadCount > 0)
            TextButton(
              onPressed: () =>
                  ref.read(notificationProvider.notifier).markAllAsRead(),
              child: const Text('Mark all read'),
            ),
          PopupMenuButton(
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'settings',
                child: Row(
                  children: [
                    Icon(Icons.settings),
                    SizedBox(width: 8),
                    Text('Notification settings'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'clear',
                child: Row(
                  children: [
                    Icon(Icons.delete_sweep),
                    SizedBox(width: 8),
                    Text('Clear all'),
                  ],
                ),
              ),
            ],
            onSelected: (value) {
              if (value == 'settings') {
                context.push('/settings');
              } else if (value == 'clear') {
                ref.read(notificationProvider.notifier).clearAll();
              }
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('All'),
                  if (unreadCount > 0) ...[
                    const SizedBox(width: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.error,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        unreadCount.toString(),
                        style:
                            const TextStyle(color: Colors.white, fontSize: 10),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const Tab(text: 'Courses'),
            const Tab(text: 'Social'),
            const Tab(text: 'System'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _NotificationList(
            notifications: notifications,
            onTap: (n) {
              ref.read(notificationProvider.notifier).markAsRead(n.id);
              if (n.actionRoute != null) {
                context.push(n.actionRoute!);
              }
            },
            onDismiss: (n) {
              ref.read(notificationProvider.notifier).delete(n.id);
            },
          ),
          _NotificationList(
            notifications: courses,
            onTap: (n) {
              ref.read(notificationProvider.notifier).markAsRead(n.id);
              if (n.actionRoute != null) {
                context.push(n.actionRoute!);
              }
            },
            onDismiss: (n) {
              ref.read(notificationProvider.notifier).delete(n.id);
            },
          ),
          _NotificationList(
            notifications: social,
            onTap: (n) {
              ref.read(notificationProvider.notifier).markAsRead(n.id);
              if (n.actionRoute != null) {
                context.push(n.actionRoute!);
              }
            },
            onDismiss: (n) {
              ref.read(notificationProvider.notifier).delete(n.id);
            },
          ),
          _NotificationList(
            notifications: system,
            onTap: (n) {
              ref.read(notificationProvider.notifier).markAsRead(n.id);
              if (n.actionRoute != null) {
                context.push(n.actionRoute!);
              }
            },
            onDismiss: (n) {
              ref.read(notificationProvider.notifier).delete(n.id);
            },
          ),
        ],
      ),
    );
  }
}

class _NotificationList extends StatelessWidget {
  final List<AppNotification> notifications;
  final void Function(AppNotification) onTap;
  final void Function(AppNotification) onDismiss;

  const _NotificationList({
    required this.notifications,
    required this.onTap,
    required this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    if (notifications.isEmpty) {
      return EmptyStateView.noNotifications();
    }

    return ListView.builder(
      itemCount: notifications.length,
      itemBuilder: (context, index) {
        final notification = notifications[index];
        return Dismissible(
          key: Key(notification.id),
          direction: DismissDirection.endToStart,
          background: Container(
            alignment: Alignment.centerRight,
            padding: const EdgeInsets.only(right: 20),
            color: AppColors.error,
            child: const Icon(Icons.delete, color: Colors.white),
          ),
          onDismissed: (_) => onDismiss(notification),
          child: _NotificationTile(
            notification: notification,
            onTap: () => onTap(notification),
          ),
        );
      },
    );
  }
}

class _NotificationTile extends StatelessWidget {
  final AppNotification notification;
  final VoidCallback onTap;

  const _NotificationTile({
    required this.notification,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        color: notification.isRead
            ? null
            : AppColors.primary.withValues(alpha: 0.05),
        border: Border(
          bottom: BorderSide(color: theme.dividerColor),
        ),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: _NotificationIcon(type: notification.type),
        title: Row(
          children: [
            Expanded(
              child: Text(
                notification.title,
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight:
                      notification.isRead ? FontWeight.normal : FontWeight.bold,
                ),
              ),
            ),
            if (!notification.isRead)
              Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                ),
              ),
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(
              notification.body,
              style: theme.textTheme.bodySmall,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 4),
            Text(
              _formatTime(notification.createdAt),
              style: theme.textTheme.labelSmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
        onTap: onTap,
      ),
    );
  }

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final diff = now.difference(time);

    if (diff.inMinutes < 60) {
      return '${diff.inMinutes}m ago';
    } else if (diff.inHours < 24) {
      return '${diff.inHours}h ago';
    } else if (diff.inDays < 7) {
      return '${diff.inDays}d ago';
    } else {
      return DateFormat('dd/MM/yyyy').format(time);
    }
  }
}

class _NotificationIcon extends StatelessWidget {
  final NotificationType type;

  const _NotificationIcon({required this.type});

  @override
  Widget build(BuildContext context) {
    IconData icon;
    Color color;

    switch (type) {
      case NotificationType.courseUpdate:
      case NotificationType.newCourse:
        icon = Icons.play_circle;
        color = AppColors.primary;
        break;
      case NotificationType.liveClassStarting:
        icon = Icons.live_tv;
        color = AppColors.error;
        break;
      case NotificationType.achievementUnlocked:
      case NotificationType.goalCompleted:
        icon = Icons.emoji_events;
        color = AppColors.gold;
        break;
      case NotificationType.studyReminder:
      case NotificationType.streakWarning:
        icon = Icons.alarm;
        color = AppColors.warning;
        break;
      case NotificationType.discussionReply:
        icon = Icons.chat_bubble;
        color = AppColors.info;
        break;
      case NotificationType.system:
        icon = Icons.info;
        color = AppColors.tertiary;
        break;
    }

    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(icon, color: color),
    );
  }
}
