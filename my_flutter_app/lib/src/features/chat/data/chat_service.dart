import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/core/constants/api_constants.dart';
import 'package:my_flutter_app/src/core/network/token_manager.dart';
import 'package:my_flutter_app/src/features/chat/domain/chat_model.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

final chatServiceProvider = Provider<ChatService>((ref) {
  return ChatService(ref.watch(tokenManagerProvider));
});

class ChatService {
  ChatService(this._tokenManager);
  final TokenManager _tokenManager;
  String? _token;
  WebSocketChannel? _channel;

  Stream<ChatMessage>? get messageStream => _channel?.stream.map((event) {
        final data = jsonDecode(event as String) as Map<String, dynamic>;

        final type = data['type'] as String?;
        var senderId = 0;
        final rawSender = data['sender_id'];

        if (rawSender is int) {
          senderId = rawSender;
        } else if (rawSender == 'ai_bot') {
          senderId = -1;
        }

        if (type == 'ai_stream_chunk') {
          return ChatMessage(
            id: 'ws_${DateTime.now().millisecondsSinceEpoch}',
            conversationId: '',
            senderId: -1,
            content: (data['chunk'] as String?) ?? '',
            isRead: false,
            isMe: false,
            createdAt: DateTime.now(),
            isStreamChunk: true,
          );
        } else if (type == 'ai_stream_end') {
          return ChatMessage(
            id: 'ws_${DateTime.now().millisecondsSinceEpoch}',
            conversationId: '',
            senderId: -1,
            content: '', // End signal typically empty or full response
            isRead: false,
            isMe: false,
            createdAt: DateTime.now(),
            isStreamEnd: true, // Need to ensure model supports this
          );
        }

        return ChatMessage(
          id: 'ws_${DateTime.now().millisecondsSinceEpoch}',
          conversationId: '',
          senderId: senderId,
          content: (data['message'] as String?) ?? '',
          isRead: false,
          isMe: (data['is_me'] as bool?) ?? false,
          createdAt: DateTime.tryParse((data['timestamp'] as String?) ?? '') ??
              DateTime.now(),
        );
      });

  Future<void> connect(String conversationId) async {
    // 1. Fetch Token
    _token = await _tokenManager.getAccessToken();

    if (_token == null) {
      return;
    }

    // 2. Construct WS URL
    final wsBase = ApiConstants.wsUrl;
    // Android Emulator specific host mapping if needed, but ApiConstants should handle it
    final url = '$wsBase/chat/$conversationId/?token=$_token';

    _channel = WebSocketChannel.connect(Uri.parse(url));
  }

  void sendMessage(String message) {
    if (_channel != null) {
      // Check if it's an AI trigger
      if (message.toLowerCase().startsWith('/ask')) {
        // Special AI command payload if needed, or just standard message the backend interprets
        _channel!.sink.add(jsonEncode({
          'type': 'ask_ai',
          'message': message.replaceFirst('/ask', '').trim()
        }));
      } else {
        _channel!.sink.add(jsonEncode({'message': message}));
      }
    }
  }

  void disconnect() {
    _channel?.sink.close();
    _channel = null;
  }
}
