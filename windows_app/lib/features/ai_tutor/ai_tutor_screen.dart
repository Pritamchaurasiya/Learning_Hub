import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';
import '../../core/theme/app_colors.dart';
import '../../core/providers/ai_tutor_provider.dart';
import '../../core/services/ai_tutor_service.dart';

class AiTutorScreen extends ConsumerStatefulWidget {
  final String? lessonId;

  const AiTutorScreen({super.key, this.lessonId});

  @override
  ConsumerState<AiTutorScreen> createState() => _AiTutorScreenState();
}

class _AiTutorScreenState extends ConsumerState<AiTutorScreen> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _isListening = false;

  void _toggleListening() {
    setState(() {
      _isListening = !_isListening;
    });

    if (_isListening) {
      // Simulate speech recognition result after delay
      Future.delayed(const Duration(seconds: 3), () {
        if (mounted && _isListening) {
          setState(() {
            _isListening = false;
            final questions = [
              'Explain the trade-offs between BLoC and Riverpod.',
              'How do we optimize Flutter rendering performance?',
              'What are the security implications of JWT storage?',
              'Generate a clean architecture folder structure.',
              'Debug this race condition in the authentication flow.',
            ];
            _controller.text = (questions..shuffle()).first;
          });
        }
      });
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _handleSend([String? text]) {
    final input = text ?? _controller.text.trim();
    if (input.isEmpty) {
      return;
    }

    HapticFeedback.selectionClick();

    _controller.clear();
    ref.read(aiTutorProvider.notifier).sendMessage(input, context: {
      'lessonId': widget.lessonId,
    });
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final state = ref.watch(aiTutorProvider);
    final messages = state.messages;
    final isTyping = state.isTyping;

    ref.listen(aiTutorProvider, (previous, next) {
      if (next.messages.length > (previous?.messages.length ?? 0) ||
          (next.messages.isNotEmpty && next.messages.last.isStreaming)) {
        // Scroll to bottom on new message or during streaming
        if (_scrollController.hasClients &&
            _scrollController.position.pixels >=
                _scrollController.position.maxScrollExtent - 100) {
          _scrollToBottom();
        }
      }
    });

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.psychology, color: AppColors.primary),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('AI Tutor',
                    style:
                        TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: AppColors.success,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      state.currentPersona.name.toUpperCase(),
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                        fontSize: 10,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
        actions: [
          PopupMenuButton<TutorPersona>(
            icon: const Icon(Icons.person_outline),
            tooltip: 'Change Persona',
            onSelected: (persona) {
              ref.read(aiTutorProvider.notifier).setPersona(persona);
            },
            itemBuilder: (context) => TutorPersona.values
                .map((p) => PopupMenuItem(
                      value: p,
                      child: Row(
                        children: [
                          Icon(
                              p == state.currentPersona
                                  ? Icons.radio_button_checked
                                  : Icons.radio_button_unchecked,
                              size: 18),
                          const SizedBox(width: 8),
                          Text(p.name.toUpperCase()),
                        ],
                      ),
                    ))
                .toList(),
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline),
            onPressed: () {
              // Clear chat logic if needed
            },
            tooltip: 'Clear Chat',
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(20),
              itemCount: messages.length + (isTyping ? 1 : 0),
              itemBuilder: (context, index) {
                if (index == messages.length) {
                  return const _TypingIndicator();
                }

                final msg = messages[index];
                return _MessageBubble(message: msg);
              },
            ),
          ),

          // Suggested Follow-ups (Chips)
          if (!isTyping &&
              messages.isNotEmpty &&
              messages.last.suggestedFollowUps?.isNotEmpty == true)
            Container(
              height: 50,
              margin: const EdgeInsets.only(bottom: 8),
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                scrollDirection: Axis.horizontal,
                itemCount: messages.last.suggestedFollowUps!.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final suggestion = messages.last.suggestedFollowUps![index];
                  return ActionChip(
                    label: Text(suggestion),
                    onPressed: () => _handleSend(suggestion),
                    backgroundColor: theme.colorScheme.primaryContainer
                        .withValues(alpha: 0.3),
                    labelStyle: TextStyle(color: theme.colorScheme.primary),
                    elevation: 0,
                    side: BorderSide.none,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20)),
                  );
                },
              ),
            ),

          // Input Area
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: theme.scaffoldBackgroundColor,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 10,
                  offset: const Offset(0, -5),
                ),
              ],
            ),
            child: SafeArea(
              child: Row(
                children: [
                  IconButton(
                    icon: Icon(_isListening ? Icons.mic : Icons.mic_none),
                    onPressed: _toggleListening,
                    color: _isListening
                        ? AppColors.accent
                        : theme.colorScheme.onSurfaceVariant,
                  ),
                  Expanded(
                    child: _isListening
                        ? Container(
                            height: 48,
                            alignment: Alignment.centerLeft,
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: Row(
                              children: [
                                const Text(
                                  'Listening...',
                                  style: TextStyle(
                                    color: AppColors.accent,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const Spacer(),
                                ...List.generate(
                                  5,
                                  (index) => Container(
                                    width: 4,
                                    height: 16 + (index % 3) * 8.0,
                                    margin: const EdgeInsets.symmetric(
                                        horizontal: 2),
                                    decoration: BoxDecoration(
                                      color: AppColors.accent,
                                      borderRadius: BorderRadius.circular(2),
                                    ),
                                  )
                                      .animate(
                                          onPlay: (c) =>
                                              c.repeat(reverse: true))
                                      .scaleY(
                                        begin: 0.5,
                                        end: 1.5,
                                        duration: (300 + index * 100).ms,
                                      ),
                                ),
                              ],
                            ),
                          )
                        : TextField(
                            controller: _controller,
                            decoration: InputDecoration(
                              hintText: 'Ask anything...',
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(24),
                                borderSide: BorderSide.none,
                              ),
                              filled: true,
                              fillColor:
                                  theme.colorScheme.surfaceContainerHighest,
                              contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 20, vertical: 12),
                            ),
                            textCapitalization: TextCapitalization.sentences,
                            onSubmitted: (_) => _handleSend(),
                          ),
                  ),
                  const SizedBox(width: 8),
                  if (!_isListening)
                    Container(
                      decoration: const BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                      ),
                      child: IconButton(
                        onPressed: () => _handleSend(),
                        icon: const Icon(Icons.arrow_upward),
                        color: Colors.white,
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
}

class _MessageBubble extends StatelessWidget {
  final ChatMessage message;

  const _MessageBubble({required this.message});

  /// Sanitize markdown content to prevent XSS attacks
  String _sanitizeMarkdownContent(String content) {
    // Remove potentially dangerous HTML tags and scripts
    String sanitized = content;

    // Remove script tags and javascript: URLs
    sanitized = sanitized.replaceAll(
        RegExp(r'<script[^>]*>.*?</script>',
            caseSensitive: false, multiLine: true),
        '');
    sanitized = sanitized.replaceAll(
        RegExp(r'javascript:', caseSensitive: false), 'blocked:');
    sanitized = sanitized.replaceAll(
        RegExp(r'on\w+\s*=', caseSensitive: false), 'blocked=');

    // Limit content length to prevent DoS
    if (sanitized.length > 10000) {
      sanitized =
          '${sanitized.substring(0, 10000)}\n\n[Content truncated for security]';
    }

    return sanitized;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isUser = message.isUser;

    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 20),
        padding: const EdgeInsets.all(16),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.85,
        ),
        decoration: BoxDecoration(
          color: isUser
              ? AppColors.primary
              : theme.colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(20),
            topRight: const Radius.circular(20),
            bottomLeft: Radius.circular(isUser ? 20 : 4),
            bottomRight: Radius.circular(isUser ? 4 : 20),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            MarkdownBody(
              data: _sanitizeMarkdownContent(message.text),
              selectable: true,
              styleSheet: MarkdownStyleSheet(
                p: theme.textTheme.bodyLarge?.copyWith(
                  color:
                      isUser ? Colors.white : theme.textTheme.bodyLarge?.color,
                  height: 1.5,
                ),
                code: TextStyle(
                  backgroundColor: isUser ? Colors.black12 : Colors.black12,
                  fontFamily: 'monospace',
                  fontSize: 12,
                ),
                strong: TextStyle(
                  fontWeight: FontWeight.bold,
                  color:
                      isUser ? Colors.white : theme.textTheme.bodyLarge?.color,
                ),
              ),
            ),

            // Code Example Block
            if (message.codeExample != null) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.black87,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          ((message.codeExample!['language'] as String?) ??
                                  'Code')
                              .toUpperCase(),
                          style:
                              const TextStyle(color: Colors.grey, fontSize: 10),
                        ),
                        const Icon(Icons.copy, color: Colors.grey, size: 14),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      (message.codeExample!['code'] as String?) ?? '',
                      style: const TextStyle(
                        color: Color(0xFFA9B7C6), // Darcula-like text
                        fontFamily: 'monospace',
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            ],

            if (message.sources != null && message.sources!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 4,
                runSpacing: 4,
                children: message.sources!
                    .map((s) => Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(s,
                              style: TextStyle(
                                fontSize: 10,
                                color: isUser ? Colors.white70 : Colors.black54,
                              )),
                        ))
                    .toList(),
              ),
            ],
          ],
        ),
      ),
    ).animate().slideY(
        begin: 0.1, end: 0, curve: Curves.easeOutQuad, duration: 200.ms);
  }
}

class _TypingIndicator extends StatelessWidget {
  const _TypingIndicator();

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(20),
            topRight: Radius.circular(20),
            bottomLeft: Radius.circular(4),
            bottomRight: Radius.circular(20),
          ),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _Dot(delay: 0),
            SizedBox(width: 4),
            _Dot(delay: 200),
            SizedBox(width: 4),
            _Dot(delay: 400),
          ],
        ),
      ),
    );
  }
}

class _Dot extends StatelessWidget {
  final int delay;
  const _Dot({required this.delay});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 8,
      height: 8,
      decoration: BoxDecoration(
        color: Theme.of(context)
            .colorScheme
            .onSurfaceVariant
            .withValues(alpha: 0.5),
        shape: BoxShape.circle,
      ),
    ).animate(onPlay: (c) => c.repeat(reverse: true)).scale(
        duration: 600.ms,
        delay: delay.ms,
        begin: const Offset(0.5, 0.5),
        end: const Offset(1.0, 1.0));
  }
}
