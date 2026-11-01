import 'dart:async';
import 'dart:convert';

import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:flutter/foundation.dart';
import 'notification_service.dart';

class WebSocketService {
  io.Socket? _socket;
  final StreamController<Map<String, dynamic>> _eventController =
      StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get events => _eventController.stream;

  bool _isConnected = false;
  bool get isConnected => _isConnected;

  int _reconnectAttempts = 0;
  static const int _maxReconnectDelay = 30;

  // In-memory token for WebSocket handshake (not persisted to localStorage)
  // Set by auth flow after successful login (see AuthProvider)
  String? _wsToken;
  
  void setWsToken(String? token) {
    _wsToken = token;
  }
  
  String? getWsToken() {
    return _wsToken;
  }

  void connect() {
    if (_isConnected) return;
    if (_wsToken == null) {
      debugPrint('[WebSocket] No token available, skipping connection');
      return;
    }
    _reconnectAttempts = 0;
    _attemptConnection(_wsToken!);
  }

  void _attemptConnection(String token) {
    const baseUrl = String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: 'http://localhost:5000',
    );

    try {
      _socket = io.io(
        baseUrl,
        io.OptionBuilder()
            .setTransports(['websocket'])
            // Use query param token (like React) instead of auth object
            // Backend validates token from query param for WebSocket handshake
            .setQuery({'token': token})
            .setTransports(['websocket'])
            .build(),
      );

      _socket!.onConnect((_) {
        _isConnected = true;
        _reconnectAttempts = 0;
        debugPrint('[WebSocket] Connected via Socket.IO');
      });

      _socket!.onAny((event, data) {
        // Handle both Map and String data (some servers send raw strings)
        if (data is Map<String, dynamic>) {
          _handleEvent(data);
        } else if (data is List) {
          for (final item in data) {
            if (item is Map<String, dynamic>) {
              _handleEvent(item);
            }
          }
        } else if (data is String) {
          // Try to parse JSON string
          try {
            final parsed = json.decode(data);
            if (parsed is Map<String, dynamic>) {
              _handleEvent(parsed);
            }
          } catch (_) {
            // Not JSON, ignore
          }
        }
      });

      _socket!.onConnectError((data) {
        debugPrint('[WebSocket] Connection error: $data');
        _isConnected = false;
        _scheduleReconnect();
      });

      _socket!.onDisconnect((_) {
        debugPrint('[WebSocket] Disconnected');
        _isConnected = false;
        _scheduleReconnect();
      });
    } catch (e) {
      debugPrint('[WebSocket] Connection failed: $e');
      _scheduleReconnect();
    }
  }

  void _handleEvent(Map<String, dynamic> data) {
    _eventController.add(data);

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

    debugPrint('[WebSocket] Event: $title ($type)');
  }

  void _scheduleReconnect() {
    _reconnectAttempts++;
    final delaySecs = (_reconnectAttempts * 2).clamp(1, _maxReconnectDelay);
    debugPrint(
        '[WebSocket] Reconnecting in ${delaySecs}s (attempt $_reconnectAttempts)');

    Future.delayed(Duration(seconds: delaySecs), () {
      final currentToken = _wsToken;
      if (currentToken != null) {
        _attemptConnection(currentToken);
      }
    });
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _isConnected = false;
    _reconnectAttempts = 0;
    debugPrint('[WebSocket] Disconnected');
  }

  void send(Map<String, dynamic> data) {
    if (_isConnected && _socket != null) {
      _socket!.emit('send-message', data);
    }
  }

  void dispose() {
    disconnect();
    _eventController.close();
  }
}

final webSocketService = WebSocketService();
