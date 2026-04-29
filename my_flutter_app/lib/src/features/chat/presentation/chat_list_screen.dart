import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:my_flutter_app/src/features/chat/data/chat_repository.dart';
import 'package:my_flutter_app/src/features/chat/domain/chat_model.dart';
import 'package:my_flutter_app/src/features/chat/presentation/chat_detail_screen.dart';

final conversationsProvider =
    FutureProvider.autoDispose<List<Conversation>>((ref) {
  return ref.watch(chatRepositoryProvider).getConversations();
});

class ChatListScreen extends ConsumerWidget {
  const ChatListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final conversationsAsync = ref.watch(conversationsProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: Text('Messages',
            style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: conversationsAsync.when(
        data: (conversations) {
          if (conversations.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.chat_bubble_outline,
                      color: Colors.grey, size: 64),
                  const SizedBox(height: 16),
                  Text('No conversations yet',
                      style: GoogleFonts.outfit(
                          color: Colors.white, fontSize: 18)),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () => ref.refresh(conversationsProvider.future),
            child: ListView.builder(
              itemCount: conversations.length,
              itemBuilder: (context, index) {
                final conversation = conversations[index];
                return ListTile(
                  leading: const CircleAvatar(
                      backgroundColor: Colors.tealAccent,
                      child: Icon(Icons.person, color: Colors.black)),
                  title: Text('Conversation ${conversation.id}',
                      style: GoogleFonts.outfit(
                          color: Colors.white, fontWeight: FontWeight.bold)),
                  subtitle: Text(
                    conversation.lastMessage?.content ?? 'No messages',
                    style: const TextStyle(color: Colors.grey),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  trailing: Text(
                    _formatTime(conversation.updatedAt),
                    style: const TextStyle(color: Colors.grey, fontSize: 12),
                  ),
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute<void>(
                        builder: (_) =>
                            ChatDetailScreen(conversationId: conversation.id),
                      ),
                    );
                  },
                );
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, s) => Center(
            child:
                Text('Error: $e', style: const TextStyle(color: Colors.red))),
      ),
    );
  }

  String _formatTime(DateTime date) {
    return '${date.hour}:${date.minute.toString().padLeft(2, '0')}';
  }
}
