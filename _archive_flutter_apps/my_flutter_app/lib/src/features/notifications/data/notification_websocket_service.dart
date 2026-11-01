import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/core/constants/api_constants.dart';
import 'package:my_flutter_app/src/core/network/token_manager.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

final notificationWebSocketServiceProvider =
    Provider<NotificationWebSocketService>((ref) {
  return NotificationWebSocketService(ref.watch(tokenManagerProvider));
});

final notificationStreamProvider =
    StreamProvider.autoDispose<Map<String, dynamic>>((ref) {
  return ref.watch(notificationWebSocketServiceProvider).events;
});

class NotificationWebSocketService {
  NotificationWebSocketService(this._tokenManager);
  final TokenManager _tokenManager;
  WebSocketChannel? _channel;
  final _eventController = StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get events => _eventController.stream;

  Future<void> connect() async {
    final token = await _tokenManager.getAccessToken();

    if (token == null) {
      return;
    }

    final wsUrl = '${ApiConstants.wsUrl}/ws/notifications/';

    // In production (docker), use localhost:80/ws/ (via nginx) -> ws://localhost/ws/notifications/
    // This logic might need adjustment depending on ApiConstants.baseUrl value.
    // Assuming ApiConstants.baseUrl is http://localhost:8000/api/v1/ or similar.

    try {
      debugPrint('Connecting to Notification WS: $wsUrl');
      _channel = WebSocketChannel.connect(Uri.parse(
          '$wsUrl?token=$token')); // Pass token if backend supports query param auth or use headers if supported by platform

      _channel!.stream.listen(
        (message) {
          try {
            final dynamic decoded = jsonDecode(message as String);
            if (decoded is Map<String, dynamic>) {
              _eventController.add(decoded);
            }
          } on Exception catch (e) {
            debugPrint('Error decoding WS message: $e');
          }
        },
        onError: (Object error) {
          debugPrint('Notification WS Error: $error');
          _reconnect();
        },
        onDone: () {
          debugPrint('Notification WS Closed');
          _reconnect();
        },
      );
    } on Exception catch (e) {
      debugPrint('Failed to connect to Notification WS: $e');
      _reconnect();
    }
  }

  void _reconnect() {
    Future.delayed(const Duration(seconds: 5), connect);
  }

  void disconnect() {
    _channel?.sink.close();
  }
}
