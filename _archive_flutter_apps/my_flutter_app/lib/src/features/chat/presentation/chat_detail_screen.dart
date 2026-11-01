import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:my_flutter_app/src/features/chat/data/chat_repository.dart';
import 'package:my_flutter_app/src/features/chat/data/chat_service.dart';
import 'package:my_flutter_app/src/features/chat/domain/chat_model.dart';

final chatHistoryProvider =
    FutureProvider.family.autoDispose<List<ChatMessage>, String>((ref, id) {
  return ref.watch(chatRepositoryProvider).getMessages(id);
});

class ChatDetailScreen extends ConsumerStatefulWidget {
  const ChatDetailScreen({super.key, required this.conversationId});
  final String conversationId;

  @override
  ConsumerState<ChatDetailScreen> createState() => _ChatDetailScreenState();
}

class _ChatDetailScreenState extends ConsumerState<ChatDetailScreen> {
  final _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<ChatMessage> _realtimeMessages = [];

  @override
  void initState() {
    super.initState();
    // Connect to WebSocket
    ref.read(chatServiceProvider).connect(widget.conversationId);
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    ref.read(chatServiceProvider).disconnect();
    super.dispose();
  }

  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty) {
      return;
    }

    _messageController.clear();

    try {
      // Optimistic/WS send
      ref.read(chatServiceProvider).sendMessage(text);

      // Also send via HTTP for persistence guarantee/ack in this simple implementation
      // Ideally, WS persistence is enough, but as fallback:
      await ref
          .read(chatRepositoryProvider)
          .sendMessage(widget.conversationId, text);

      // Auto scroll to bottom
      if (_scrollController.hasClients) {
        await _scrollController.animateTo(
          0, // Reverse listview starts at 0
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    } on Exception catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Failed to send: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final historyAsync = ref.watch(chatHistoryProvider(widget.conversationId));
    final wsStream = ref.watch(chatServiceProvider).messageStream;

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: Text('Chat',
            style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF1E293B),
      ),
      body: Column(
        children: [
          Expanded(
            child: StreamBuilder<ChatMessage>(
              stream: wsStream,
              builder: (context, snapshot) {
                if (snapshot.hasData) {
                  final newMsg = snapshot.data!;

                  if (newMsg.isStreamChunk && _realtimeMessages.isNotEmpty) {
                    final lastMsg = _realtimeMessages.first;
                    // Check if last message was also an AI chunk or just an AI message
                    if (lastMsg.senderId == -1 && !lastMsg.isStreamEnd) {
                      // Combine content
                      _realtimeMessages[0] = ChatMessage(
                        id: lastMsg.id,
                        conversationId: lastMsg.conversationId,
                        senderId: lastMsg.senderId,
                        content: lastMsg.content + newMsg.content,
                        isRead: true,
                        isMe: false,
                        createdAt: lastMsg.createdAt,
                        isStreamChunk: true,
                      );
                    } else {
                      _realtimeMessages.insert(0, newMsg);
                    }
                  } else if (newMsg.isStreamEnd) {
                    // Finalize the message if we were building it
                    // Often stream_end contains the full response. If so, overwrite.
                    if (newMsg.content.isNotEmpty) {
                      if (_realtimeMessages.isNotEmpty &&
                          _realtimeMessages.first.senderId == -1) {
                        _realtimeMessages[0] =
                            newMsg; // Replace with final clean version
                      } else {
                        _realtimeMessages.insert(0, newMsg);
                      }
                    }
                  } else {
                    _realtimeMessages.insert(0, newMsg);
                  }
                }

                return historyAsync.when(
                  data: (history) {
                    // Combine history and realtime (dedup logic required in prod)
                    final allMessages = [..._realtimeMessages, ...history];

                    if (allMessages.isEmpty) {
                      return const Center(
                          child: Text('No messages yet',
                              style: TextStyle(color: Colors.grey)));
                    }

                    return ListView.builder(
                      controller: _scrollController,
                      reverse: true, // Start from bottom
                      padding: const EdgeInsets.all(16),
                      itemCount: allMessages.length,
                      itemBuilder: (context, index) {
                        final msg = allMessages[index];
                        return _MessageBubble(message: msg);
                      },
                    );
                  },
                  loading: () =>
                      const Center(child: CircularProgressIndicator()),
                  error: (e, s) => Center(
                      child: Text('Error loading history: $e',
                          style: const TextStyle(color: Colors.red))),
                );
              },
            ),
          ),
          _buildInputArea(),
        ],
      ),
    );
  }

  Widget _buildInputArea() {
    return Container(
      padding: const EdgeInsets.all(12),
      color: const Color(0xFF1E293B),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _messageController,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Type a message...',
                hintStyle: const TextStyle(color: Colors.grey),
                filled: true,
                fillColor: const Color(0xFF0F172A),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide.none,
                ),
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              ),
              onSubmitted: (_) => _sendMessage(),
            ),
          ),
          const SizedBox(width: 8),
          CircleAvatar(
            backgroundColor: Colors.tealAccent,
            child: IconButton(
              icon: const Icon(Icons.send, color: Colors.black),
              onPressed: _sendMessage,
            ),
          ),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message});
  final ChatMessage message;

  @override
  Widget build(BuildContext context) {
    final isMe = message.isMe;
    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        constraints:
            BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        decoration: BoxDecoration(
          color: isMe ? Colors.blueAccent : const Color(0xFF334155),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: isMe ? const Radius.circular(16) : Radius.zero,
            bottomRight: isMe ? Radius.zero : const Radius.circular(16),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              message.content,
              style: const TextStyle(color: Colors.white, fontSize: 15),
            ),
            const SizedBox(height: 4),
            Text(
              '${message.createdAt.hour}:${message.createdAt.minute.toString().padLeft(2, '0')}',
              style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.5), fontSize: 10),
            ),
          ],
        ),
      ),
    );
  }
}
