import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:learning_hub/core/theme/app_colors.dart';

/// Live class screen with video stream and chat
class LiveClassScreen extends ConsumerStatefulWidget {
  final String classId;

  const LiveClassScreen({super.key, required this.classId});

  @override
  ConsumerState<LiveClassScreen> createState() => _LiveClassScreenState();
}

class _LiveClassScreenState extends ConsumerState<LiveClassScreen> {
  final _chatController = TextEditingController();
  final _chatScrollController = ScrollController();
  bool _isMuted = false;
  bool _isVideoOff = false;
  bool _isHandRaised = false;
  bool _showChat = true;

  final List<_ChatMessage> _chatMessages = [
    _ChatMessage(
        name: 'John D.', message: 'Great explanation! 👍', time: '2:30'),
    _ChatMessage(
        name: 'Sarah M.',
        message: 'Can you show that example again?',
        time: '2:31'),
    _ChatMessage(
        name: 'Instructor',
        message: 'Sure, let me go over it once more.',
        time: '2:32',
        isInstructor: true),
    _ChatMessage(
        name: 'Alex K.',
        message: 'This is so helpful, thank you!',
        time: '2:33'),
  ];

  @override
  void dispose() {
    _chatController.dispose();
    _chatScrollController.dispose();
    super.dispose();
  }

  void _sendMessage() {
    if (_chatController.text.trim().isEmpty) {
      return;
    }

    setState(() {
      _chatMessages.add(_ChatMessage(
        name: 'You',
        message: _chatController.text,
        time: '2:35',
        isMe: true,
      ));
      _chatController.clear();
    });

    _chatScrollController.animateTo(
      _chatScrollController.position.maxScrollExtent + 100,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOut,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final size = MediaQuery.of(context).size;
    final isDesktop = size.width >= 1024;

    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child:
            isDesktop ? _buildDesktopLayout(theme) : _buildMobileLayout(theme),
      ),
    );
  }

  Widget _buildMobileLayout(ThemeData theme) {
    return Column(
      children: [
        // Video area
        Expanded(
          flex: _showChat ? 1 : 2,
          child: _buildVideoArea(theme),
        ),

        // Chat panel
        if (_showChat)
          Expanded(
            flex: 1,
            child: Container(
              color: theme.colorScheme.surface,
              child: Column(
                children: [
                  // Chat header
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      border:
                          Border(bottom: BorderSide(color: theme.dividerColor)),
                    ),
                    child: Row(
                      children: [
                        const Text('Live Chat',
                            style: TextStyle(fontWeight: FontWeight.bold)),
                        const Spacer(),
                        Text(
                          '${_chatMessages.length} messages',
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),

                  // Messages
                  Expanded(child: _buildChatMessages(theme)),

                  // Input
                  _buildChatInput(theme),
                ],
              ),
            ),
          ),

        // Control bar
        _buildControlBar(theme),
      ],
    );
  }

  Widget _buildDesktopLayout(ThemeData theme) {
    return Row(
      children: [
        // Video area
        Expanded(
          flex: 3,
          child: Column(
            children: [
              Expanded(child: _buildVideoArea(theme)),
              _buildControlBar(theme),
            ],
          ),
        ),

        // Side panel
        if (_showChat)
          Container(
            width: 350,
            decoration: BoxDecoration(
              color: theme.colorScheme.surface,
              border: Border(left: BorderSide(color: theme.dividerColor)),
            ),
            child: Column(
              children: [
                // Tabs
                Container(
                  padding: const EdgeInsets.all(8),
                  child: Row(
                    children: [
                      Expanded(
                        child: _TabButton(
                          label: 'Chat',
                          isSelected: true,
                          onTap: () {},
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _TabButton(
                          label: 'Participants',
                          isSelected: false,
                          badge: '24',
                          onTap: () {},
                        ),
                      ),
                    ],
                  ),
                ),

                Expanded(child: _buildChatMessages(theme)),
                _buildChatInput(theme),
              ],
            ),
          ),
      ],
    );
  }

  Widget _buildVideoArea(ThemeData theme) {
    return Stack(
      children: [
        // Main video (instructor)
        Container(
          color: Colors.black87,
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.2),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.person,
                    size: 60,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Dr. Angela Yu',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Instructor',
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
        ),

        // Top bar
        Positioned(
          top: 0,
          left: 0,
          right: 0,
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Colors.black54, Colors.transparent],
              ),
            ),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.arrow_back, color: Colors.white),
                  onPressed: () => Navigator.pop(context),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Building Real-time Apps with Flutter',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: Colors.red,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Text(
                            'LIVE • 1:24:35',
                            style: TextStyle(
                              color: Colors.white70,
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(width: 12),
                          const Icon(Icons.visibility,
                              color: Colors.white70, size: 14),
                          const SizedBox(width: 4),
                          const Text(
                            '156 watching',
                            style: TextStyle(
                              color: Colors.white70,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: Icon(
                    _showChat ? Icons.chat : Icons.chat_bubble_outline,
                    color: Colors.white,
                  ),
                  onPressed: () => setState(() => _showChat = !_showChat),
                ),
              ],
            ),
          ),
        ),

        // Self video thumbnail
        Positioned(
          bottom: 16,
          right: 16,
          child: Container(
            width: 100,
            height: 130,
            decoration: BoxDecoration(
              color: Colors.black54,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.white24),
            ),
            child: Stack(
              children: [
                Center(
                  child: _isVideoOff
                      ? const Icon(Icons.videocam_off, color: Colors.white54)
                      : const Icon(Icons.person,
                          color: Colors.white54, size: 40),
                ),
                Positioned(
                  bottom: 4,
                  left: 0,
                  right: 0,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.black54,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          'You',
                          style: TextStyle(color: Colors.white, fontSize: 10),
                        ),
                      ),
                      if (_isMuted)
                        Container(
                          margin: const EdgeInsets.only(left: 4),
                          padding: const EdgeInsets.all(2),
                          decoration: BoxDecoration(
                            color: Colors.red,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Icon(Icons.mic_off,
                              color: Colors.white, size: 10),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildControlBar(ThemeData theme) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      color: Colors.black,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _ControlButton(
            icon: _isMuted ? Icons.mic_off : Icons.mic,
            label: _isMuted ? 'Unmute' : 'Mute',
            isActive: !_isMuted,
            onTap: () => setState(() => _isMuted = !_isMuted),
          ),
          _ControlButton(
            icon: _isVideoOff ? Icons.videocam_off : Icons.videocam,
            label: _isVideoOff ? 'Start Video' : 'Stop Video',
            isActive: !_isVideoOff,
            onTap: () => setState(() => _isVideoOff = !_isVideoOff),
          ),
          _ControlButton(
            icon: Icons.pan_tool,
            label: 'Raise Hand',
            isActive: _isHandRaised,
            activeColor: AppColors.warning,
            onTap: () => setState(() => _isHandRaised = !_isHandRaised),
          ),
          _ControlButton(
            icon: Icons.screen_share,
            label: 'Share',
            onTap: () {},
          ),
          _ControlButton(
            icon: Icons.call_end,
            label: 'Leave',
            isDestructive: true,
            onTap: () => Navigator.pop(context),
          ),
        ],
      ),
    );
  }

  Widget _buildChatMessages(ThemeData theme) {
    return ListView.builder(
      controller: _chatScrollController,
      padding: const EdgeInsets.all(12),
      itemCount: _chatMessages.length,
      itemBuilder: (context, index) {
        final msg = _chatMessages[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 16,
                backgroundColor: msg.isInstructor
                    ? AppColors.primary
                    : theme.colorScheme.surfaceContainerHighest,
                child: Text(
                  msg.name[0],
                  style: TextStyle(
                    color: msg.isInstructor ? Colors.white : null,
                    fontSize: 12,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          msg.name,
                          style: theme.textTheme.labelMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: msg.isInstructor ? AppColors.primary : null,
                          ),
                        ),
                        if (msg.isInstructor)
                          Container(
                            margin: const EdgeInsets.only(left: 4),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 4, vertical: 1),
                            decoration: BoxDecoration(
                              color: AppColors.primary,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text(
                              'HOST',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 8,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        const Spacer(),
                        Text(
                          msg.time,
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(msg.message, style: theme.textTheme.bodyMedium),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildChatInput(ThemeData theme) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: theme.dividerColor)),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _chatController,
              decoration: InputDecoration(
                hintText: 'Send a message...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(20),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.emoji_emotions_outlined),
                  onPressed: () {},
                ),
              ),
              onSubmitted: (_) => _sendMessage(),
            ),
          ),
          const SizedBox(width: 8),
          IconButton.filled(
            icon: const Icon(Icons.send),
            onPressed: _sendMessage,
          ),
        ],
      ),
    );
  }
}

class _TabButton extends StatelessWidget {
  final String label;
  final bool isSelected;
  final String? badge;
  final VoidCallback onTap;

  const _TabButton({
    required this.label,
    required this.isSelected,
    this.badge,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Material(
      color: isSelected
          ? AppColors.primary.withValues(alpha: 0.1)
          : Colors.transparent,
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                label,
                style: TextStyle(
                  color: isSelected
                      ? AppColors.primary
                      : theme.colorScheme.onSurfaceVariant,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                ),
              ),
              if (badge != null) ...[
                const SizedBox(width: 4),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    badge!,
                    style: const TextStyle(color: Colors.white, fontSize: 10),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _ControlButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isActive;
  final bool isDestructive;
  final Color? activeColor;
  final VoidCallback onTap;

  const _ControlButton({
    required this.icon,
    required this.label,
    this.isActive = true,
    this.isDestructive = false,
    this.activeColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    Color bgColor;
    Color iconColor;

    if (isDestructive) {
      bgColor = Colors.red;
      iconColor = Colors.white;
    } else if (!isActive) {
      bgColor = Colors.white24;
      iconColor = Colors.white;
    } else if (activeColor != null) {
      bgColor = activeColor!.withValues(alpha: 0.2);
      iconColor = activeColor!;
    } else {
      bgColor = Colors.white24;
      iconColor = Colors.white;
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Material(
          color: bgColor,
          shape: const CircleBorder(),
          child: InkWell(
            onTap: onTap,
            customBorder: const CircleBorder(),
            child: Container(
              width: 48,
              height: 48,
              alignment: Alignment.center,
              child: Icon(icon, color: iconColor),
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(color: Colors.white70, fontSize: 10),
        ),
      ],
    );
  }
}

class _ChatMessage {
  final String name;
  final String message;
  final String time;
  final bool isInstructor;
  final bool isMe;

  _ChatMessage({
    required this.name,
    required this.message,
    required this.time,
    this.isInstructor = false,
    this.isMe = false,
  });
}
