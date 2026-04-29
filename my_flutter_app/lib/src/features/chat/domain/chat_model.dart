class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.content,
    required this.isRead,
    required this.isMe,
    required this.createdAt,
    this.isStreamChunk = false,
    this.isStreamEnd = false,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    // Handle standard chat message
    if (json['type'] == 'chat_message' || json['type'] == null) {
      return ChatMessage(
        id: json['id']?.toString() ?? '',
        conversationId: json['conversation']?.toString() ?? '',
        senderId: _parseSenderId(json),
        content:
            json['message']?.toString() ?? json['content']?.toString() ?? '',
        isRead: json['is_read'] == true,
        isMe: json['is_me'] == true,
        createdAt: DateTime.tryParse(json['created_at']?.toString() ??
                json['timestamp']?.toString() ??
                '') ??
            DateTime.now(),
      );
    }

    // Handle AI Streaming events
    else if (json['type'] == 'ai_stream_chunk') {
      return ChatMessage(
        id: 'stream',
        conversationId: '',
        senderId: -1, // AI Bot ID
        content: json['chunk']?.toString() ?? '',
        isRead: true,
        isMe: false,
        createdAt: DateTime.now(),
        isStreamChunk: true,
      );
    } else if (json['type'] == 'ai_stream_end') {
      return ChatMessage(
        id: 'stream_end',
        conversationId: '',
        senderId: -1,
        content: json['full_response']?.toString() ?? '',
        isRead: true,
        isMe: false,
        createdAt: DateTime.now(),
        isStreamEnd: true,
      );
    }

    // Fallback for unknown types (e.g. typing)
    return ChatMessage(
      id: 'unknown',
      conversationId: '',
      senderId: 0,
      content: '',
      isRead: true,
      isMe: false,
      createdAt: DateTime.now(),
    );
  }
  final String id;
  final String conversationId;
  final int senderId;
  final String content;
  final bool isRead;
  final bool isMe;
  final DateTime createdAt;
  final bool isStreamChunk;
  final bool isStreamEnd;

  static int _parseSenderId(Map<String, dynamic> json) {
    final senderId = json['sender_id'];
    if (senderId != null) {
      if (senderId is int) {
        return senderId;
      }
      return int.tryParse(senderId.toString()) ?? 0;
    }
    final senderMap = json['sender'];
    if (senderMap is Map<String, dynamic>) {
      final id = senderMap['id'];
      if (id is int) {
        return id;
      }
      if (id != null) {
        return int.tryParse(id.toString()) ?? 0;
      }
    }
    return 0;
  }
}

class Conversation {
  const Conversation({
    required this.id,
    required this.participants,
    this.lastMessage,
    required this.updatedAt,
  });

  factory Conversation.fromJson(Map<String, dynamic> json) {
    return Conversation(
      id: json['id']?.toString() ?? '',
      participants: (json['participants'] as List?) ?? [],
      lastMessage: json['last_message'] != null
          ? ChatMessage.fromJson(json['last_message'] as Map<String, dynamic>)
          : null,
      updatedAt: DateTime.tryParse(json['last_message_at']?.toString() ?? '') ??
          DateTime.now(),
    );
  }
  final String id;
  final List<dynamic> participants;
  final ChatMessage? lastMessage;
  final DateTime updatedAt;
}
