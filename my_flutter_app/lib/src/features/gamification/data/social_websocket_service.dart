import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/core/constants/api_constants.dart';
import 'package:my_flutter_app/src/features/auth/data/auth_repository.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

/// Service to handle Real-Time Gamification updates via WebSockets.
class SocialWebsocketService {
  SocialWebsocketService(this._ref);
  final Ref _ref;

  WebSocketChannel? _channel;
  final _eventController = StreamController<Map<String, dynamic>>.broadcast();
  bool _isConnected = false;

  Stream<Map<String, dynamic>> get events => _eventController.stream;

  Future<void> connect() async {
    // Prevent multiple connections
    if (_isConnected) {
      return;
    }
    _isConnected = true;
    final authRepo = _ref.read(authRepositoryProvider);
    final token = await authRepo.getAccessToken();

    if (token == null) {
      debugPrint('WebSocket: No token available, skipping connection.');
      return;
    }

    try {
      // Create WebSocket URL with Auth Token (or use Cookie based auth if configured)
      // Note: Standard approach for Channels is sometimes via query param or header
      // Here assuming we pass it in query param for simplicity (?token=...)
      // or headers if platform supports it (Dart IO does, Web sometimes strictly blocks headers)

      // Construct WS URL
      // Use ApiConstants.baseUrl but replace http with ws
      // Example: http://127.0.0.1:8000/api/v1 -> ws://127.0.0.1:8000/ws/social/
      final wsUrl = _getWsUrl();
      debugPrint('WebSocket: Connecting to $wsUrl');

      _channel = WebSocketChannel.connect(
        Uri.parse('$wsUrl?token=$token'), // Simple JWT Auth via Query Param
      );

      _channel!.stream.listen(
        (dynamic message) {
          debugPrint('WebSocket: Received $message');
          try {
            final messageStr = message.toString();
            final data = jsonDecode(messageStr);
            // Verify if it's social_message format
            // The backend sends: {"type": "social_message", "data": {...}}
            // OR direct data depending on Consumer implementation.
            // Our Consumer sends raw JSON dump of event['data'].

            if (data is Map<String, dynamic>) {
              _eventController.add(data);
            }
          } on FormatException catch (e) {
            debugPrint('WebSocket: JSON Parse Error - $e');
          }
        },
        onError: (Object error) {
          debugPrint('WebSocket: Error - $error');
          _reconnect();
        },
        onDone: () {
          debugPrint('WebSocket: Closed');
          // _reconnect(); // Optional auto-reconnect strategy
        },
      );
    } on Exception catch (e) {
      debugPrint('WebSocket: Connection failed - $e');
    }
  }

  void disconnect() {
    _channel?.sink.close();
    _channel = null;
    _isConnected = false;
  }

  void _reconnect() {
    Future.delayed(const Duration(seconds: 5), () {
      debugPrint('WebSocket: Attempting reconnect...');
      connect();
    });
  }

  String _getWsUrl() {
    // Dynamically uses the correct environment WS URL
    return '${ApiConstants.wsUrl}/ws/social/';
  }
}

final socialWebsocketServiceProvider = Provider<SocialWebsocketService>((ref) {
  return SocialWebsocketService(ref);
});

// Stream provider for UI to watch
final socialEventsProvider = StreamProvider<Map<String, dynamic>>((ref) {
  final service = ref.watch(socialWebsocketServiceProvider)
    ..connect(); // Ensure connection is started
  // Return stream
  return service.events;
});
