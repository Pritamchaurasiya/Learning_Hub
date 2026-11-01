import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import '../../../../src/core/network/token_manager.dart';
import '../../../core/constants/api_constants.dart';

part 'dsa_ai_chat_service.g.dart';

@riverpod
class DsaAiChatService extends _$DsaAiChatService {
  WebSocketChannel? _channel;

  @override
  Stream<List<ChatMessage>> build(int submissionId) async* {
    await _connect(submissionId);

    if (_channel == null) {
      yield [];
      return;
    }

    ref.onDispose(() {
      _channel?.sink.close();
    });

    final history = <ChatMessage>[];

    yield* _channel!.stream.map((event) {
      try {
        final decoded = jsonDecode(event as String) as Map<String, dynamic>;
        if (decoded['type'] == 'ai_message') {
          history.add(ChatMessage(
            text: decoded['message'] as String,
            isAi: true,
            timestamp: DateTime.now(),
          ));
        }
      } on Exception catch (e) {
        debugPrint('Error decoding AI Chat message: $e');
      }
      return List<ChatMessage>.from(history);
    });
  }

  Future<void> _connect(int submissionId) async {
    final tokenManager = ref.watch(tokenManagerProvider);
    final token = await tokenManager.getAccessToken();
    if (token == null) {
      return;
    }

    final url = '${ApiConstants.wsUrl}/ws/dsa/chat/$submissionId/?token=$token';
    debugPrint('Connecting to AI Chat WebSocket: $url');
    _channel = WebSocketChannel.connect(Uri.parse(url));
  }

  void sendMessage(String text) {
    if (_channel != null) {
      _channel!.sink.add(jsonEncode({'message': text}));
      // We don't add to stream here yet, wait for reflection if needed or add optimistic update
      // For now, let's keep it simple.
    }
  }
}

class ChatMessage {
  ChatMessage(
      {required this.text, required this.isAi, required this.timestamp});
  final String text;
  final bool isAi;
  final DateTime timestamp;
}
