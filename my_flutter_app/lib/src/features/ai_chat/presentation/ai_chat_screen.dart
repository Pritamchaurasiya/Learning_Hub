import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
class AiMessage {
  AiMessage({required this.text, required this.isUser, DateTime? timestamp})
      : timestamp = timestamp ?? DateTime.now();
  final String text;
  final bool isUser;
  final DateTime timestamp;
}

class AiChatState {
  AiChatState({this.messages = const [], this.isTyping = false});
  final List<AiMessage> messages;
  final bool isTyping;

  AiChatState copyWith({List<AiMessage>? messages, bool? isTyping}) {
    return AiChatState(
      messages: messages ?? this.messages,
      isTyping: isTyping ?? this.isTyping,
    );
  }
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------
class AiChatController extends StateNotifier<AiChatState> {
  AiChatController()
      : super(AiChatState(messages: [
          AiMessage(
            text: "Hello! I'm your AI Study Assistant. "
                'Ask me anything about your courses, DSA concepts, or study tips.',
            isUser: false,
          ),
        ]));

  Future<void> sendMessage(String text) async {
    if (text.trim().isEmpty) {
      return;
    }

    // Add user message
    state = state.copyWith(
      messages: [...state.messages, AiMessage(text: text, isUser: true)],
      isTyping: true,
    );

    // Simulate AI thinking (replace with real API later)
    await Future<void>.delayed(const Duration(milliseconds: 1200));

    final reply = _generateLocalReply(text);
    state = state.copyWith(
      messages: [...state.messages, AiMessage(text: reply, isUser: false)],
      isTyping: false,
    );
  }

  String _generateLocalReply(String query) {
    final q = query.toLowerCase();
    if (q.contains('dsa') ||
        q.contains('algorithm') ||
        q.contains('data structure')) {
      return '📊 Great question about DSA! I recommend starting with arrays '
          'and linked lists, then progressing to trees and graphs. '
          'Check out the DSA Visualizer in the app for interactive learning.';
    }
    if (q.contains('course') || q.contains('learn') || q.contains('study')) {
      return '📚 For effective learning, try the Pomodoro technique – '
          '25 minutes of focused study followed by a 5-minute break. '
          'Your dashboard tracks your study streak!';
    }
    if (q.contains('help') || q.contains('how')) {
      return '🤖 I can help you with:\n• Course recommendations\n'
          '• DSA concept explanations\n• Study planning tips\n'
          '• Understanding complex topics\nJust ask away!';
    }
    return "💡 That's an interesting question! While I'm currently in local "
        'mode, I can help with course navigation, DSA concepts, and study '
        'strategies. Try asking about a specific topic!';
  }
}

final aiChatControllerProvider =
    StateNotifierProvider<AiChatController, AiChatState>((ref) {
  return AiChatController();
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
class AiChatScreen extends ConsumerStatefulWidget {
  const AiChatScreen({super.key});

  @override
  ConsumerState<AiChatScreen> createState() => _AiChatScreenState();
}

class _AiChatScreenState extends ConsumerState<AiChatScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _sendMessage() {
    final text = _controller.text;
    if (text.trim().isEmpty) {
      return;
    }
    ref.read(aiChatControllerProvider.notifier).sendMessage(text);
    _controller.clear();
    _scrollToBottom();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent + 80,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final chatState = ref.watch(aiChatControllerProvider);

    // Auto-scroll when messages change
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.jumpTo(_scrollController.position.maxScrollExtent);
      }
    });

    return Scaffold(
      backgroundColor: const Color(0xFF0A0E21),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1A1F36),
        elevation: 0,
        title: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child:
                  const Icon(Icons.auto_awesome, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('AI Study Assistant',
                    style: GoogleFonts.outfit(
                        fontWeight: FontWeight.bold, fontSize: 16)),
                Text('Always here to help',
                    style: GoogleFonts.outfit(
                        color: Colors.grey.shade400, fontSize: 11)),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Colors.white70),
            tooltip: 'New Conversation',
            onPressed: () {
              // Reset the chat
              ref.invalidate(aiChatControllerProvider);
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Messages List
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              itemCount:
                  chatState.messages.length + (chatState.isTyping ? 1 : 0),
              itemBuilder: (context, index) {
                if (index == chatState.messages.length && chatState.isTyping) {
                  return _buildTypingIndicator();
                }
                final message = chatState.messages[index];
                return _MessageBubble(
                  message: message,
                  key: ValueKey('msg_$index'),
                )
                    .animate()
                    .fadeIn(duration: 300.ms)
                    .slideY(begin: 0.1, end: 0, duration: 300.ms);
              },
            ),
          ),

          // Quick Suggestion Chips
          if (chatState.messages.length <= 1)
            SizedBox(
              height: 40,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: [
                  _SuggestionChip(
                    label: '📚 Study Tips',
                    onTap: () =>
                        _sendSuggestion('What are the best study tips?'),
                  ),
                  _SuggestionChip(
                    label: '🧮 DSA Help',
                    onTap: () => _sendSuggestion('Explain common DSA concepts'),
                  ),
                  _SuggestionChip(
                    label: '🎯 Course Advice',
                    onTap: () => _sendSuggestion('Recommend me a course'),
                  ),
                  _SuggestionChip(
                    label: '❓ How to Use',
                    onTap: () => _sendSuggestion('How can you help me?'),
                  ),
                ],
              ),
            ),
          if (chatState.messages.length <= 1) const SizedBox(height: 8),

          // Input Bar
          Container(
            padding: const EdgeInsets.fromLTRB(12, 8, 8, 12),
            decoration: BoxDecoration(
              color: const Color(0xFF1A1F36),
              border: Border(
                  top: BorderSide(color: Colors.white.withValues(alpha: 0.05))),
            ),
            child: SafeArea(
              top: false,
              child: Row(
                children: [
                  Expanded(
                    child: Semantics(
                      label: 'Type your message',
                      child: TextField(
                        controller: _controller,
                        style: GoogleFonts.outfit(color: Colors.white),
                        decoration: InputDecoration(
                          hintText: 'Ask me anything...',
                          hintStyle:
                              GoogleFonts.outfit(color: Colors.grey.shade600),
                          filled: true,
                          fillColor: const Color(0xFF0F172A),
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 10),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(24),
                            borderSide: BorderSide.none,
                          ),
                        ),
                        onSubmitted: (_) => _sendMessage(),
                        textInputAction: TextInputAction.send,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Semantics(
                    label: 'Send message',
                    child: GestureDetector(
                      onTap: _sendMessage,
                      child: Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
                          ),
                          borderRadius: BorderRadius.circular(22),
                        ),
                        child: const Icon(Icons.send_rounded,
                            color: Colors.white, size: 20),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _sendSuggestion(String text) {
    ref.read(aiChatControllerProvider.notifier).sendMessage(text);
    _scrollToBottom();
  }

  Widget _buildTypingIndicator() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: List.generate(
                3,
                (i) => Container(
                  margin: const EdgeInsets.symmetric(horizontal: 2),
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade500,
                    shape: BoxShape.circle,
                  ),
                )
                    .animate(
                      onPlay: (c) => c.repeat(),
                    )
                    .fadeIn(
                        delay: Duration(milliseconds: i * 200),
                        duration: 600.ms)
                    .then()
                    .fadeOut(duration: 600.ms),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Widgets
// ---------------------------------------------------------------------------
class _MessageBubble extends StatelessWidget {
  const _MessageBubble({super.key, required this.message});
  final AiMessage message;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment:
            message.isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!message.isUser) ...[
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
                ),
                borderRadius: BorderRadius.circular(10),
              ),
              child:
                  const Icon(Icons.auto_awesome, color: Colors.white, size: 14),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: message.isUser
                    ? const Color(0xFF6366F1)
                    : const Color(0xFF1E293B),
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft:
                      message.isUser ? const Radius.circular(16) : Radius.zero,
                  bottomRight:
                      message.isUser ? Radius.zero : const Radius.circular(16),
                ),
              ),
              child: Text(
                message.text,
                style: GoogleFonts.outfit(
                  color: Colors.white,
                  fontSize: 14,
                  height: 1.5,
                ),
              ),
            ),
          ),
          if (message.isUser) const SizedBox(width: 8),
        ],
      ),
    );
  }
}

class _SuggestionChip extends StatelessWidget {
  const _SuggestionChip({required this.label, required this.onTap});
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ActionChip(
        label: Text(label,
            style: GoogleFonts.outfit(color: Colors.white70, fontSize: 12)),
        backgroundColor: const Color(0xFF1E293B),
        side: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        onPressed: onTap,
      ),
    );
  }
}
