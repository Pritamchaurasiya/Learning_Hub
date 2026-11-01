import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/core/constants/api_constants.dart';
import 'package:my_flutter_app/src/core/network/api_client.dart';
import 'package:my_flutter_app/src/features/chat/domain/chat_model.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

final chatRepositoryProvider = Provider<ChatRepository>((ref) {
  return ChatRepository(ref.watch(apiClientProvider));
});

class ChatRepository {
  ChatRepository(this._apiClient);
  final ApiClient _apiClient;

  Future<List<Conversation>> getConversations() async {
    final response = await _apiClient.get(ApiConstants.conversations);
    final data = response.data;

    // Handle paginated response with null safety
    final results = _extractResults(data);

    return results
        .map((e) => Conversation.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<ChatMessage>> getMessages(String conversationId) async {
    final response = await _apiClient.get(
      ApiConstants.messages,
      queryParameters: {'conversation': conversationId},
    );
    final data = response.data;

    // Handle paginated response with null safety
    final results = _extractResults(data);

    return results
        .map((e) => ChatMessage.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Helper to extract results from paginated or plain list responses
  List<dynamic> _extractResults(dynamic data) {
    if (data is Map<String, dynamic>) {
      final results = data['results'];
      if (results is List) {
        return results;
      }
      return <dynamic>[];
    } else if (data is List) {
      return data;
    }
    return <dynamic>[];
  }

  Future<ChatMessage> sendMessage(String conversationId, String content) async {
    final response = await _apiClient.post(ApiConstants.messages, data: {
      'conversation': conversationId,
      'content': content,
    });
    final data = response.data;
    if (data is Map<String, dynamic>) {
      return ChatMessage.fromJson(data);
    }
    return ChatMessage.fromJson(<String, dynamic>{});
  }

  Future<Conversation> startConversation(int userId) async {
    final response =
        await _apiClient.post('${ApiConstants.conversations}start/', data: {
      'user_id': userId,
    });
    final data = response.data;
    if (data is Map<String, dynamic>) {
      return Conversation.fromJson(data);
    }
    return Conversation.fromJson(<String, dynamic>{});
  }

  /// WebSocket connection for real-time updates
  Stream<ChatMessage> connectToChat(String conversationId) {
    // In a real app, you'd probably want to manage the channel lifecycle more carefully
    // and potentially authenticate via headers or query params.
    // Assuming WS endpoint: ws://<host>/ws/chat/<conversationId>/

    // Determine scheme (ws or wss) based on ApiConstants or env
    final uri = Uri.parse(ApiConstants.baseUrl);
    final scheme = uri.scheme == 'https' ? 'wss' : 'ws';
    final host = uri.host;
    final port = uri.port;

    // Construct WS URL
    final wsUrl = Uri(
      scheme: scheme,
      host: host,
      port: port,
      path: '/ws/chat/$conversationId/',
    );

    // ignore: close_sinks
    final channel = WebSocketChannel.connect(wsUrl);

    return channel.stream.map((event) {
      final data = jsonDecode(event as String);
      return ChatMessage.fromJson(data as Map<String, dynamic>);
    });
  }
}
