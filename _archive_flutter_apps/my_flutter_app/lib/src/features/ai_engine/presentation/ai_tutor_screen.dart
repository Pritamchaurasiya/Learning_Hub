import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:my_flutter_app/src/features/ai_engine/data/ai_repository.dart';
import 'package:my_flutter_app/src/features/ai_engine/presentation/widgets/ai_response_card.dart';
import 'package:my_flutter_app/src/features/ai_engine/presentation/widgets/code_simulation_card.dart';
import 'package:my_flutter_app/src/features/ai_engine/presentation/widgets/thinking_indicator.dart';

class AiTutorScreen extends ConsumerStatefulWidget {
  const AiTutorScreen({super.key, this.topic, this.contextFile});

  final String? topic;
  final String? contextFile;

  @override
  ConsumerState<AiTutorScreen> createState() => _AiTutorScreenState();
}

class _AiTutorScreenState extends ConsumerState<AiTutorScreen>
    with TickerProviderStateMixin {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FocusNode _focusNode = FocusNode();
  bool _isTyping = false;
  bool _isStreaming = false;
  late AnimationController _pulseController;

  late List<Map<String, dynamic>> _messages;

  // Quick suggestion chips for the user
  late List<String> _suggestions;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);

    // Dynamic welcome — no hardcoded history
    final topicLabel = widget.topic ?? 'any topic';
    _messages = [
      {
        'type': 'ai',
        'content':
            "👋 Welcome to **AI Tutor Mode**! I'm ready to help you learn about **$topicLabel**.\n\nYou can ask me to:\n• 🔍 Explain concepts step-by-step\n• 💻 Show code examples with visualizations\n• 🧠 Quiz you on what you've learned\n• 🗺️ Build a learning roadmap\n\nWhat would you like to explore?",
        'options': _getSmartSuggestions(),
      },
    ];

    _suggestions = _getSmartSuggestions();
  }

  List<String> _getSmartSuggestions() {
    final topic = widget.topic;
    if (topic != null) {
      return [
        'Explain $topic basics',
        'Show code example',
        'Quiz me on $topic',
      ];
    }
    return [
      'Explain Recursion',
      'System Design basics',
      'Data Structures roadmap',
    ];
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.sizeOf(context).width;
    final isDesktop = screenWidth > 800;

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: _buildAppBar(),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
          ),
        ),
        child: Column(
          children: [
            // Context chips bar
            _buildContextBar(),
            // Chat area
            Expanded(
              child: ListView.builder(
                controller: _scrollController,
                padding: EdgeInsets.symmetric(
                  horizontal: isDesktop ? screenWidth * 0.15 : 16,
                  vertical: 16,
                ),
                itemCount: _messages.length + (_isTyping ? 1 : 0),
                itemBuilder: (context, index) {
                  if (index == _messages.length && _isTyping) {
                    return const Align(
                      alignment: Alignment.centerLeft,
                      child: ThinkingIndicator(),
                    );
                  }
                  final msg = _messages[index];
                  final type = msg['type'] as String;

                  if (type == 'user') {
                    return _buildUserBubble(msg['content'] as String);
                  } else if (type == 'ai-visual') {
                    return CodeSimulationCard(
                      title: msg['title'] as String,
                      description: msg['description'] as String,
                      code: msg['code'] as String,
                    ).animate().fadeIn(duration: 600.ms).slideY(begin: 0.1);
                  } else {
                    return _buildAiMessage(msg, index);
                  }
                },
              ),
            ),
            // Quick suggestions (only show when not streaming)
            if (_suggestions.isNotEmpty && !_isStreaming) _buildSuggestionBar(),
            // Input area
            _buildInputArea(isDesktop, screenWidth),
          ],
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      elevation: 0,
      backgroundColor: const Color(0xFF0F172A),
      title: Row(
        children: [
          // Animated pulsing AI avatar
          AnimatedBuilder(
            animation: _pulseController,
            builder: (context, child) {
              return Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      const Color(0xFF7C3AED).withValues(
                          alpha: 0.3 + _pulseController.value * 0.2),
                      Colors.transparent,
                    ],
                  ),
                ),
                child: const Icon(Icons.auto_awesome,
                    color: Color(0xFF7C3AED), size: 20),
              );
            },
          ),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'AI Tutor',
                style: GoogleFonts.outfit(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              Row(
                children: [
                  Container(
                    width: 7,
                    height: 7,
                    decoration: BoxDecoration(
                      color:
                          _isStreaming ? Colors.amber : const Color(0xFF10B981),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: (_isStreaming
                                  ? Colors.amber
                                  : const Color(0xFF10B981))
                              .withValues(alpha: 0.6),
                          blurRadius: 6,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 5),
                  Text(
                    _isStreaming ? 'Thinking...' : 'Online',
                    style: GoogleFonts.outfit(
                      color:
                          _isStreaming ? Colors.amber : const Color(0xFF10B981),
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
      actions: [
        // Mode badge
        Container(
          margin: const EdgeInsets.only(right: 8),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF7C3AED), Color(0xFF6D28D9)],
            ),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF7C3AED).withValues(alpha: 0.4),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              const Icon(Icons.school, color: Colors.white, size: 14),
              const SizedBox(width: 6),
              Text(
                'Tutor Mode',
                style: GoogleFonts.outfit(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
        // Clear chat
        IconButton(
          onPressed: _clearChat,
          icon: const Icon(Icons.refresh, color: Colors.white54, size: 20),
          tooltip: 'New Chat',
        ),
      ],
    );
  }

  Widget _buildContextBar() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.03),
        border: Border(
          bottom: BorderSide(color: Colors.white.withValues(alpha: 0.05)),
        ),
      ),
      child: Row(
        children: [
          if (widget.topic != null) _buildContextChip(widget.topic!),
          if (widget.contextFile != null) ...[
            const SizedBox(width: 8),
            _buildContextChip(widget.contextFile!),
          ],
          if (widget.topic == null && widget.contextFile == null)
            _buildContextChip('General Mode'),
          const Spacer(),
          Text(
            '${_messages.where((m) => m['type'] == 'user').length} messages',
            style: GoogleFonts.outfit(
              color: Colors.white38,
              fontSize: 11,
            ),
          ),
          const SizedBox(width: 8),
          const Icon(Icons.history, size: 14, color: Colors.white38),
        ],
      ),
    );
  }

  Widget _buildContextChip(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: const Color(0xFF3B82F6).withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: const Color(0xFF3B82F6).withValues(alpha: 0.2),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.code, size: 12, color: Color(0xFF3B82F6)),
          const SizedBox(width: 4),
          Text(
            label,
            style: GoogleFonts.outfit(
              color: const Color(0xFF93C5FD),
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAiMessage(Map<String, dynamic> msg, int index) {
    final content = msg['content'] as String;
    final options = (msg['options'] as List<dynamic>?)?.cast<String>();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AiResponseCard(
          content: content,
        ).animate().fadeIn(duration: 400.ms),
        if (options != null && options.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 8, bottom: 8, left: 4),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: options.map(_buildOptionChip).toList(),
            ),
          ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.1),
      ],
    );
  }

  Widget _buildOptionChip(String label) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () {
          _controller.text = label;
          _sendMessage();
        },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: const Color(0xFF7C3AED).withValues(alpha: 0.4),
            ),
            color: const Color(0xFF7C3AED).withValues(alpha: 0.08),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.arrow_forward_ios,
                  size: 10, color: Color(0xFF7C3AED)),
              const SizedBox(width: 6),
              Text(
                label,
                style: GoogleFonts.outfit(
                  color: const Color(0xFFA78BFA),
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildUserBubble(String content) {
    return Align(
      alignment: Alignment.centerRight,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 8),
        padding: const EdgeInsets.all(16),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.7,
        ),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF3B82F6), Color(0xFF2563EB)],
          ),
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(20),
            topRight: Radius.circular(4),
            bottomLeft: Radius.circular(20),
            bottomRight: Radius.circular(20),
          ),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF3B82F6).withValues(alpha: 0.3),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Text(
          content,
          style: GoogleFonts.outfit(
            color: Colors.white,
            height: 1.5,
            fontSize: 14,
          ),
        ),
      ),
    ).animate().fadeIn().slideX(begin: 0.1);
  }

  Widget _buildSuggestionBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: _suggestions
              .map(
                (s) => Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ActionChip(
                    avatar: const Icon(Icons.lightbulb_outline,
                        size: 14, color: Color(0xFFF59E0B)),
                    label: Text(
                      s,
                      style: GoogleFonts.outfit(
                        fontSize: 12,
                        color: Colors.white70,
                      ),
                    ),
                    backgroundColor:
                        const Color(0xFFF59E0B).withValues(alpha: 0.08),
                    side: BorderSide(
                      color: const Color(0xFFF59E0B).withValues(alpha: 0.2),
                    ),
                    onPressed: () {
                      _controller.text = s;
                      _sendMessage();
                    },
                  ),
                ),
              )
              .toList(),
        ),
      ),
    ).animate().fadeIn();
  }

  Widget _buildInputArea(bool isDesktop, double screenWidth) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: isDesktop ? screenWidth * 0.15 : 16,
        vertical: 12,
      ),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        border: Border(
          top: BorderSide(color: Colors.white.withValues(alpha: 0.06)),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.3),
            blurRadius: 20,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: SafeArea(
        child: Row(
          children: [
            // Attachment button
            Container(
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(12),
              ),
              child: IconButton(
                onPressed: () {},
                icon: const Icon(Icons.add, color: Colors.white54),
                iconSize: 20,
              ),
            ),
            const SizedBox(width: 10),
            // Input field
            Expanded(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.08),
                  ),
                ),
                child: TextField(
                  controller: _controller,
                  focusNode: _focusNode,
                  style: GoogleFonts.outfit(color: Colors.white, fontSize: 14),
                  maxLines: null,
                  textInputAction: TextInputAction.send,
                  onSubmitted: (_) => _sendMessage(),
                  decoration: InputDecoration(
                    hintText: widget.topic != null
                        ? 'Ask about ${widget.topic}...'
                        : 'Ask anything...',
                    hintStyle:
                        GoogleFonts.outfit(color: Colors.white30, fontSize: 14),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            // Send button
            GestureDetector(
              onTap: _isStreaming ? null : _sendMessage,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  gradient: _isStreaming
                      ? null
                      : const LinearGradient(
                          colors: [Color(0xFF7C3AED), Color(0xFF6D28D9)],
                        ),
                  color: _isStreaming ? Colors.grey[700] : null,
                  shape: BoxShape.circle,
                  boxShadow: _isStreaming
                      ? null
                      : [
                          BoxShadow(
                            color:
                                const Color(0xFF7C3AED).withValues(alpha: 0.5),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          ),
                        ],
                ),
                child: Icon(
                  _isStreaming ? Icons.stop : Icons.arrow_upward,
                  color: Colors.white,
                  size: 20,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _clearChat() {
    setState(() {
      final topicLabel = widget.topic ?? 'any topic';
      _messages = [
        {
          'type': 'ai',
          'content':
              '🔄 Chat cleared! Ready for a fresh start on **$topicLabel**.\n\nWhat would you like to learn?',
          'options': _getSmartSuggestions(),
        }
      ];
      _suggestions = _getSmartSuggestions();
      _isStreaming = false;
      _isTyping = false;
    });
  }

  Future<void> _sendMessage() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _isStreaming) {
      return;
    }

    setState(() {
      _messages.add({'type': 'user', 'content': text});
      _controller.clear();
      _isTyping = true;
      _isStreaming = true;
      _suggestions = []; // Hide suggestions while streaming
    });

    _scrollToBottom();

    try {
      // Add empty AI message placeholder
      setState(() {
        _isTyping = false;
        _messages.add({'type': 'ai', 'content': ''});
      });

      final repo = ref.read(aiRepositoryProvider);
      final buffer = StringBuffer();

      // Stream response from backend
      await for (final chunk
          in repo.streamTutorAnswer(text, widget.contextFile ?? 'general.md')) {
        buffer.write(chunk);
        if (!mounted) {
          return;
        }
        setState(() {
          _messages[_messages.length - 1] = {
            'type': 'ai',
            'content': buffer.toString(),
          };
        });

        // Auto-scroll as content streams in
        if (_scrollController.hasClients &&
            _scrollController.position.maxScrollExtent -
                    _scrollController.offset <
                80) {
          _scrollController.jumpTo(_scrollController.position.maxScrollExtent);
        }
      }

      // After streaming is done, add follow-up suggestions
      if (mounted) {
        setState(() {
          _isStreaming = false;
          _suggestions = [
            'Explain more',
            'Show code example',
            'Quiz me',
          ];
        });
      }
    } on Exception catch (e) {
      if (!mounted) {
        return;
      }
      setState(() {
        _isStreaming = false;
        _messages.add({
          'type': 'ai',
          'content':
              '⚠️ **Error**: $e\n\nPlease check your connection and try again.',
        });
        _suggestions = ['Retry'];
      });
    }
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
}
