import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/ai_tutor_service.dart';

/// Chat message model
class ChatMessage {
  final String text;
  final bool isUser;
  final DateTime timestamp;
  final List<String>? sources;
  final bool isStreaming;
  final Map<String, dynamic>? codeExample;
  final List<String>? suggestedFollowUps;

  ChatMessage({
    required this.text,
    required this.isUser,
    required this.timestamp,
    this.sources,
    this.isStreaming = false,
    this.codeExample,
    this.suggestedFollowUps,
  });

  ChatMessage copyWith({
    String? text,
    bool? isUser,
    DateTime? timestamp,
    List<String>? sources,
    bool? isStreaming,
    Map<String, dynamic>? codeExample,
    List<String>? suggestedFollowUps,
  }) {
    return ChatMessage(
      text: text ?? this.text,
      isUser: isUser ?? this.isUser,
      timestamp: timestamp ?? this.timestamp,
      sources: sources ?? this.sources,
      isStreaming: isStreaming ?? this.isStreaming,
      codeExample: codeExample ?? this.codeExample,
      suggestedFollowUps: suggestedFollowUps ?? this.suggestedFollowUps,
    );
  }
}

/// AI Tutor state state
class AiTutorState {
  final List<ChatMessage> messages;
  final bool isTyping;
  final TutorPersona currentPersona;

  AiTutorState({
    required this.messages,
    this.isTyping = false,
    this.currentPersona = TutorPersona.socratic,
  });

  AiTutorState copyWith({
    List<ChatMessage>? messages,
    bool? isTyping,
    TutorPersona? currentPersona,
  }) {
    return AiTutorState(
      messages: messages ?? this.messages,
      isTyping: isTyping ?? this.isTyping,
      currentPersona: currentPersona ?? this.currentPersona,
    );
  }
}

/// AI Tutor Notifier
class AiTutorNotifier extends Notifier<AiTutorState> {
  final _service = AiTutorService.instance;

  @override
  AiTutorState build() {
    // Load history from service
    final history = _service.getConversationHistory();
    final messages = history.isEmpty
        ? [
            ChatMessage(
              text: '''Hi! I'm your AI Learning Assistant. 👋

I can help you with:
• Explaining complex concepts
• Answering questions about your lessons
• Providing examples and practice problems
• Summarizing content

How can I help you today?''',
              isUser: false,
              timestamp: DateTime.now(),
            ),
          ]
        : history.map((m) => _mapTutorMessageToChatMessage(m)).toList();

    return AiTutorState(
      messages: messages,
    );
  }

  ChatMessage _mapTutorMessageToChatMessage(TutorMessage msg) {
    return ChatMessage(
      text: msg.content,
      isUser: msg.role == 'user',
      timestamp: msg.timestamp,
      // Metadata mapping could be improved if TutorMessage stored more structure
      sources: msg.metadata?['sources'] as List<String>?,
      codeExample: msg.metadata?['codeExample'] as Map<String, dynamic>?,
    );
  }

  /// Change Persona
  void setPersona(TutorPersona persona) {
    _service.setPersona(persona);
    state = state.copyWith(currentPersona: persona);
  }

  /// Send message
  Future<void> sendMessage(String text, {Map<String, dynamic>? context}) async {
    if (text.trim().isEmpty) {
      return;
    }

    // Add user message
    state = state.copyWith(
      messages: [
        ...state.messages,
        ChatMessage(
          text: text,
          isUser: true,
          timestamp: DateTime.now(),
        ),
      ],
      isTyping: true,
    );

    try {
      // Stop typing indicator (streaming starts)
      state = state.copyWith(isTyping: false);

      // Add empty bot message
      var botMessage = ChatMessage(
        text: '',
        isUser: false,
        timestamp: DateTime.now(),
        isStreaming: true,
      );

      final botMessageIndex = state.messages.length;
      state = state.copyWith(
        messages: [...state.messages, botMessage],
      );

      final buffer = StringBuffer();

      // Use real streaming from service
      await for (final chunk
          in _service.streamGenerateResponse(text, context: context)) {
        // If it's a metadata-only chunk (empty message), just update sources
        if (chunk.message.isNotEmpty) {
          buffer.write(chunk.message);
        }

        botMessage = botMessage.copyWith(
          text: buffer.toString(),
          sources: chunk.sources,
          codeExample: chunk.codeExample,
          suggestedFollowUps: chunk.suggestedFollowUps,
        );

        final newMessages = List<ChatMessage>.from(state.messages);
        newMessages[botMessageIndex] = botMessage;

        state = state.copyWith(messages: newMessages);
      }

      // Finish streaming
      botMessage = botMessage.copyWith(isStreaming: false);
      final newMessages = List<ChatMessage>.from(state.messages);
      newMessages[botMessageIndex] = botMessage;
      state = state.copyWith(messages: newMessages);
    } catch (e) {
      state = state.copyWith(isTyping: false);
      state = state.copyWith(
        messages: [
          ...state.messages,
          ChatMessage(
            text: "I'm having trouble connecting right now. Please try again.",
            isUser: false,
            timestamp: DateTime.now(),
          ),
        ],
      );
    }
  }

  /// Clear chat history
  void clearChat() {
    _service.clearConversation();
    state = state.copyWith(
      messages: [
        ChatMessage(
          text: '''Chat history cleared. How can I help you now?''',
          isUser: false,
          timestamp: DateTime.now(),
        ),
      ],
      isTyping: false,
    );
  }
}

/// Provider
final aiTutorProvider = NotifierProvider<AiTutorNotifier, AiTutorState>(() {
  return AiTutorNotifier();
});
