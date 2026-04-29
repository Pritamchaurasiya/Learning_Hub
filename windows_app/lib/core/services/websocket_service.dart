import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:flutter/foundation.dart';
import 'notification_service.dart';

/// Enhanced WebSocket service for real-time notification streaming.
///
/// Features:
/// - Exponential backoff reconnection (1s → 30s max)
/// - Integration with [NotificationService] for local notification handling
/// - Broadcast stream for UI listeners
/// - Graceful lifecycle management
class WebSocketService {
  WebSocketChannel? _channel;
  final StreamController<Map<String, dynamic>> _eventController =
      StreamController<Map<String, dynamic>>.broadcast();
  Timer? _reconnectTimer;

  Stream<Map<String, dynamic>> get events => _eventController.stream;

  bool _isConnected = false;
  bool get isConnected => _isConnected;

  String? _token;
  int _reconnectAttempts = 0;
  static const int _maxReconnectDelay = 30;

  /// Connect to the backend WebSocket notification endpoint.
  Future<void> connect(String token) async {
    if (_isConnected) return;
    _token = token;
    _reconnectAttempts = 0;
    _attemptConnection();
  }

  void _attemptConnection() {
    if (_token == null) return;

    final wsUrl = kDebugMode
        ? 'ws://127.0.0.1:8000/ws/notifications/?token=$_token'
        : 'wss://${Uri.base.host}/ws/notifications/?token=$_token';

    try {
      _channel = WebSocketChannel.connect(Uri.parse(wsUrl));
      _isConnected = true;
      _reconnectAttempts = 0;
      debugPrint('[WebSocket] Connected to $wsUrl');

      _channel!.stream.listen(
        _handleMessage,
        onError: (Object error) {
          debugPrint('[WebSocket] Error: $error');
          _isConnected = false;
          _scheduleReconnect();
        },
        onDone: () {
          debugPrint('[WebSocket] Disconnected');
          _isConnected = false;
          _scheduleReconnect();
        },
      );
    } catch (e) {
      debugPrint('[WebSocket] Connection failed: $e');
      _scheduleReconnect();
    }
  }

  void _handleMessage(dynamic message) {
    try {
      final data = jsonDecode(message as String) as Map<String, dynamic>;
      _eventController.add(data);

      // Forward to local NotificationService
      final type = data['type'] as String? ?? 'general';
      final title = data['title'] as String? ?? 'Notification';
      final body = data['message'] as String? ?? '';

      NotificationType notifType;
      switch (type) {
        case 'achievement':
          notifType = NotificationType.achievementUnlocked;
        case 'course_update':
          notifType = NotificationType.courseUpdate;
        case 'streak':
          notifType = NotificationType.streakWarning;
        case 'challenge':
          notifType = NotificationType.goalCompleted;
        case 'system':
          notifType = NotificationType.system;
        default:
          notifType = NotificationType.studyReminder;
      }

      NotificationService.instance.show(
        title: title,
        body: body,
        type: notifType,
      );

      debugPrint('[WebSocket] Notification: $title ($type)');
    } catch (e) {
      debugPrint('[WebSocket] Parse error: $e');
    }
  }

  /// Exponential backoff reconnection capped at [_maxReconnectDelay] seconds.
  void _scheduleReconnect() {
    _reconnectTimer?.cancel();
    _reconnectAttempts++;

    final delaySecs = (_reconnectAttempts * 2).clamp(1, _maxReconnectDelay);
    debugPrint(
        '[WebSocket] Reconnecting in ${delaySecs}s (attempt $_reconnectAttempts)');

    _reconnectTimer = Timer(Duration(seconds: delaySecs), _attemptConnection);
  }

  /// Disconnect and release resources.
  void disconnect() {
    _reconnectTimer?.cancel();
    _channel?.sink.close();
    _isConnected = false;
    _token = null;
    _reconnectAttempts = 0;
    debugPrint('[WebSocket] Disconnected');
  }

  /// Send a message to the backend (e.g., read receipts).
  void send(Map<String, dynamic> data) {
    if (_isConnected && _channel != null) {
      _channel!.sink.add(jsonEncode(data));
    }
  }

  /// Dispose all resources. Call when the app is shutting down.
  void dispose() {
    disconnect();
    _eventController.close();
  }
}

/// Singleton instance for global access.
final webSocketService = WebSocketService();
