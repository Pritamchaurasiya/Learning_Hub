import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:my_flutter_app/src/features/ai/data/ai_repository.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;

class AITutorDrawer extends ConsumerStatefulWidget {
  const AITutorDrawer({super.key, required this.moduleFilename});
  final String moduleFilename;

  @override
  ConsumerState<AITutorDrawer> createState() => _AITutorDrawerState();
}

class _AITutorDrawerState extends ConsumerState<AITutorDrawer> {
  final TextEditingController _controller = TextEditingController();
  final List<ChatBubble> _messages = [];
  bool _isLoading = false;

  // Voice AI State
  late stt.SpeechToText _speech;
  late FlutterTts _flutterTts;
  bool _isListening = false;
  bool _isSpeaking = false;

  @override
  void initState() {
    super.initState();
    _speech = stt.SpeechToText();
    _flutterTts = FlutterTts();
    _initVoice();
  }

  Future<void> _initVoice() async {
    await _flutterTts.setLanguage('en-US');
    await _flutterTts.setPitch(1);

    _flutterTts.setCompletionHandler(() {
      if (mounted) {
        setState(() => _isSpeaking = false);
      }
    });
  }

  Future<void> _listen() async {
    if (!_isListening) {
      final available = await _speech.initialize(
        onStatus: (status) => debugPrint('STT Status: $status'),
        onError: (error) => debugPrint('STT Error: $error'),
      );
      if (available) {
        setState(() => _isListening = true);
        await _speech.listen(
          onResult: (result) {
            setState(() {
              _controller.text = result.recognizedWords;
            });
            if (result.finalResult) {
              setState(() => _isListening = false);
              _sendMessage(); // Auto-send when silence detected
            }
          },
        );
      }
    } else {
      setState(() => _isListening = false);
      await _speech.stop();
    }
  }

  Future<void> _speak(String text) async {
    if (_isSpeaking) {
      await _flutterTts.stop();
      if (mounted) {
        setState(() => _isSpeaking = false);
      }
    } else {
      if (mounted) {
        setState(() => _isSpeaking = true);
      }
      await _flutterTts.speak(text);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _flutterTts.stop();
    super.dispose();
  }

  Future<void> _sendMessage() async {
    final text = _controller.text.trim();
    if (text.isEmpty) {
      return;
    }

    setState(() {
      _messages.add(ChatBubble(text: text, isUser: true));
      _isLoading = true;
      // Add empty message for AI response
      _messages.add(const ChatBubble(text: '', isUser: false));
    });
    _controller.clear();

    final fullResponse = StringBuffer();

    try {
      final stream = ref
          .read(aiRepositoryProvider)
          .streamAskTutor(widget.moduleFilename, text);

      await for (final chunk in stream) {
        if (!mounted) {
          break;
        }

        fullResponse.write(chunk);
        if (mounted) {
          setState(() {
            // Update last message (AI response)
            _messages.last =
                ChatBubble(text: fullResponse.toString(), isUser: false);
          });
        }
      }

      // Auto-speak response when done
      await _speak(fullResponse.toString());
    } on Exception catch (_) {
      if (mounted) {
        setState(() {
          _messages.last = const ChatBubble(
              text: 'Error: Could not get answer from Tutor.', isUser: false);
        });
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.75,
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            blurRadius: 20,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: Column(
        children: [
          // Handle
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Container(
              width: 48,
              height: 5,
              decoration: BoxDecoration(
                color: Theme.of(context).disabledColor.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(3),
              ),
            ),
          ),
          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.purple.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.psychology, color: Colors.purple),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'AI Research Tutor',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    Text(
                      'Voice Active • ${widget.moduleFilename}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Theme.of(context).hintColor,
                          ),
                    ),
                  ],
                ),
                const Spacer(),
                IconButton(
                  icon: Icon(_isSpeaking
                      ? Icons.volume_up
                      : Icons.volume_off_outlined),
                  onPressed: () => _speak(_messages.isNotEmpty
                      ? _messages.last.text
                      : 'Hello! I am your research tutor.'),
                  tooltip: 'Read Aloud',
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          // Chat Area
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                return _messages[index];
              },
            ),
          ),
          if (_isLoading)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: LinearProgressIndicator(
                  borderRadius: BorderRadius.all(Radius.circular(4))),
            ),
          // Input Area
          Container(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(context).viewInsets.bottom + 16,
              left: 16,
              right: 16,
              top: 12,
            ),
            decoration: BoxDecoration(
              color: Theme.of(context).scaffoldBackgroundColor,
              border: Border(
                  top: BorderSide(color: Theme.of(context).dividerColor)),
            ),
            child: Row(
              children: [
                // Mic Button
                GestureDetector(
                  onLongPress: _listen, // Long press to hold? Or just tap.
                  onTap: _listen,
                  child: Container(
                    height: 50,
                    width: 50,
                    decoration: BoxDecoration(
                      color: _isListening
                          ? Colors.redAccent
                          : Theme.of(context).colorScheme.primaryContainer,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      _isListening ? Icons.mic : Icons.mic_none,
                      color: _isListening
                          ? Colors.white
                          : Theme.of(context).colorScheme.onPrimaryContainer,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _controller,
                    decoration: InputDecoration(
                      hintText: _isListening
                          ? 'Listening...'
                          : 'Ask about this module...',
                      filled: true,
                      fillColor:
                          Theme.of(context).inputDecorationTheme.fillColor ??
                              Colors.grey.withValues(alpha: 0.05),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(28),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 20, vertical: 14),
                    ),
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  onPressed: _isLoading ? null : _sendMessage,
                  icon: const Icon(Icons.send_rounded),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class ChatBubble extends StatelessWidget {
  const ChatBubble({super.key, required this.text, required this.isUser});
  final String text;
  final bool isUser;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
        decoration: BoxDecoration(
            color: isUser
                ? Theme.of(context).colorScheme.primary
                : Theme.of(context).colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(20).copyWith(
              bottomRight: isUser ? Radius.zero : null,
              bottomLeft: isUser ? null : Radius.zero,
            ),
            boxShadow: [
              if (!isUser)
                BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 4,
                    offset: const Offset(2, 2))
            ]),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              text,
              style: TextStyle(
                color: isUser
                    ? Theme.of(context).colorScheme.onPrimary
                    : Theme.of(context).colorScheme.onSurfaceVariant,
                fontSize: 15,
                height: 1.4,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
