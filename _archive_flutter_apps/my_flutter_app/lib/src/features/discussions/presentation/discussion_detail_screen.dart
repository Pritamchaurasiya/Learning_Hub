import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:my_flutter_app/src/features/discussions/domain/discussion_models.dart';
import 'package:my_flutter_app/src/features/discussions/presentation/discussion_controller.dart';
import 'package:my_flutter_app/src/features/discussions/presentation/widgets/ai_summary_card.dart';

class DiscussionDetailScreen extends ConsumerStatefulWidget {
  const DiscussionDetailScreen({super.key, required this.thread});
  final DiscussionThread thread;

  @override
  ConsumerState<DiscussionDetailScreen> createState() =>
      _DiscussionDetailScreenState();
}

class _DiscussionDetailScreenState
    extends ConsumerState<DiscussionDetailScreen> {
  final TextEditingController _replyController = TextEditingController();

  @override
  void dispose() {
    _replyController.dispose();
    super.dispose();
  }

  void _submitReply() {
    final text = _replyController.text.trim();
    if (text.isEmpty) {
      return;
    }

    ref
        .read(discussionReplyControllerProvider.notifier)
        .submitReply(widget.thread.id, text);
    _replyController.clear();
    FocusScope.of(context).unfocus();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.search, color: Colors.white),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                    content: Text('Search within thread coming soon!')),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.more_vert, color: Colors.white),
            onPressed: () {
              showModalBottomSheet<void>(
                context: context,
                backgroundColor: const Color(0xFF1E293B),
                builder: (ctx) => SafeArea(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      ListTile(
                        leading: const Icon(Icons.share, color: Colors.white),
                        title: const Text('Share',
                            style: TextStyle(color: Colors.white)),
                        onTap: () => Navigator.pop(ctx),
                      ),
                      ListTile(
                        leading: const Icon(Icons.flag_outlined,
                            color: Colors.redAccent),
                        title: const Text('Report',
                            style: TextStyle(color: Colors.redAccent)),
                        onTap: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // 1. Thread Header
                _ThreadHeader(thread: widget.thread),
                const SizedBox(height: 24),

                // 2. AI Summary (Connected)
                Consumer(
                  builder: (context, ref, child) {
                    final summaryState = ref.watch(
                        discussionSummaryControllerProvider(widget.thread.id));

                    if (summaryState.isLoading) {
                      return Container(
                        height: 150,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                              color: const Color(0xFF7C3AED).withAlpha(50)),
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const CircularProgressIndicator(
                                color: Color(0xFF7C3AED)),
                            const SizedBox(height: 12),
                            Text('Analyzing discussion...',
                                style:
                                    GoogleFonts.outfit(color: Colors.white70)),
                          ],
                        ),
                      ).animate().fadeIn();
                    }

                    if (summaryState.error != null) {
                      return Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.red.withAlpha(20),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.red.withAlpha(50)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.error_outline,
                                color: Colors.redAccent),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                'Failed to generate summary: ${summaryState.error}',
                                style: GoogleFonts.outfit(color: Colors.white),
                              ),
                            ),
                          ],
                        ),
                      );
                    }

                    if (summaryState.data != null) {
                      final data = summaryState.data!;
                      return AiSummaryCard(
                        summary: data['summary'] as String? ??
                            'No summary available.',
                        keyTakeaways: (data['key_takeaways'] as List<dynamic>?)
                                ?.map((e) => e.toString())
                                .toList() ??
                            [],
                        relatedQuestion: data['related_question'] as String?,
                        onRelatedQuestionTap: () {
                          final question = data['related_question'] as String?;
                          if (question != null) {
                            context.push('/ai-chat',
                                extra: {'initialQuery': question});
                          } else {
                            context.push('/ai-chat');
                          }
                        },
                      ).animate().fadeIn().slideY(begin: 0.1);
                    }

                    // Initial State: Show Button
                    return Container(
                      width: double.infinity,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            const Color(0xFF7C3AED).withAlpha(40),
                            const Color(0xFF7C3AED).withAlpha(10),
                          ],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                            color: const Color(0xFF7C3AED).withAlpha(50)),
                      ),
                      child: InkWell(
                        onTap: () {
                          ref
                              .read(discussionSummaryControllerProvider(
                                      widget.thread.id)
                                  .notifier)
                              .generateSummary(widget.thread.id);
                        },
                        borderRadius: BorderRadius.circular(16),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.auto_awesome,
                                  color: Color(0xFFC4B5FD)),
                              const SizedBox(width: 12),
                              Text(
                                'Generate AI Summary',
                                style: GoogleFonts.outfit(
                                  color: const Color(0xFFC4B5FD),
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ).animate().fadeIn();
                  },
                ),

                const SizedBox(height: 24),

                // 3. Replies List
                Consumer(builder: (context, ref, child) {
                  final repliesAsync =
                      ref.watch(discussionRepliesProvider(widget.thread.id));
                  return repliesAsync.when(
                    data: (replies) {
                      if (replies.isEmpty) {
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 32),
                          child: Center(
                            child: Text('No replies yet',
                                style:
                                    GoogleFonts.outfit(color: Colors.white54)),
                          ),
                        );
                      }
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            children: [
                              Text(
                                '${replies.length} REPLIES',
                                style: GoogleFonts.outfit(
                                    color: Colors.grey,
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 1),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          ...replies.map((reply) => _ReplyCard(reply: reply)),
                        ],
                      );
                    },
                    loading: () => const Center(
                        child: Padding(
                      padding: EdgeInsets.all(24),
                      child: CircularProgressIndicator(),
                    )),
                    error: (e, st) => Center(
                        child: Text('Error: $e',
                            style: const TextStyle(color: Colors.redAccent))),
                  );
                }),
              ],
            ),
          ),

          // 5. Input Area
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              border:
                  Border(top: BorderSide(color: Colors.white.withAlpha(26))),
            ),
            child: SafeArea(
              child: Row(
                children: [
                  IconButton(
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                            content: Text('Attachments coming soon!')),
                      );
                    },
                    icon: const Icon(Icons.add_circle_outline,
                        color: Colors.grey),
                  ),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F172A),
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: TextField(
                        controller: _replyController,
                        style: const TextStyle(color: Colors.white),
                        decoration: InputDecoration(
                          hintText: 'Write a reply...',
                          hintStyle: GoogleFonts.outfit(color: Colors.grey),
                          border: InputBorder.none,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Consumer(builder: (context, ref, child) {
                    final replyState =
                        ref.watch(discussionReplyControllerProvider);
                    if (replyState.isLoading) {
                      return const Padding(
                        padding: EdgeInsets.all(8),
                        child: SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator()),
                      );
                    }
                    return IconButton(
                      onPressed: _submitReply,
                      style: IconButton.styleFrom(
                          backgroundColor: const Color(0xFF3B82F6)),
                      icon:
                          const Icon(Icons.send, color: Colors.white, size: 20),
                    );
                  }),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ThreadHeader extends StatelessWidget {
  const _ThreadHeader({required this.thread});
  final DiscussionThread thread;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Tags
        const Row(
          children: [
            _Tag(label: 'Python', color: Colors.blue),
            SizedBox(width: 8),
            _Tag(label: 'Recursion', color: Colors.purple),
            SizedBox(width: 8),
            _Tag(label: 'Optimization', color: Colors.orange),
          ],
        ),
        const SizedBox(height: 16),

        // Author Info
        Row(
          children: [
            const CircleAvatar(
              radius: 16,
              backgroundColor: Color(0xFF3B82F6),
              child: Text('A',
                  style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 12)),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Alice Chen',
                    style: GoogleFonts.outfit(
                        color: Colors.white, fontWeight: FontWeight.bold)),
                const Text('Student',
                    style: TextStyle(color: Colors.grey, fontSize: 12)),
              ],
            ),
            const Spacer(),
            Text('2h ago',
                style: GoogleFonts.outfit(color: Colors.grey, fontSize: 12)),
          ],
        ),
        const SizedBox(height: 16),

        // Title
        Text(
          thread.title,
          style: GoogleFonts.outfit(
              fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
        ),
        const SizedBox(height: 12),

        // Body
        Text(
          thread.content,
          style: GoogleFonts.outfit(
              fontSize: 16, color: Colors.white70, height: 1.6),
        ),

        // Code Block (Mock)
        Container(
          margin: const EdgeInsets.symmetric(vertical: 16),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.black38,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.white10),
          ),
          child: Text(
            '''def factorial(n):
    if n == 1: return 1
    else: return n * factorial(n-1)''',
            style:
                GoogleFonts.firaCode(color: Colors.greenAccent, fontSize: 14),
          ),
        ),

        // Stats Row
        Row(
          children: [
            const Icon(Icons.thumb_up, color: Colors.white38, size: 18),
            const SizedBox(width: 6),
            const Text('24', style: TextStyle(color: Colors.white38)),
            const SizedBox(width: 24),
            const Icon(Icons.thumb_down, color: Colors.white38, size: 18),
            const Spacer(),
            TextButton.icon(
              onPressed: () {
                context.push('/ai-chat', extra: {
                  'initialQuery':
                      "I'm looking at discussion thread '${thread.title}'. Can you explain more?"
                });
              },
              icon: const Icon(Icons.auto_awesome, size: 16),
              label: const Text('Ask AI'),
              style: TextButton.styleFrom(
                  foregroundColor: const Color(0xFF7C3AED)),
            )
          ],
        ),
      ],
    );
  }
}

class _ReplyCard extends StatelessWidget {
  const _ReplyCard({required this.reply});
  final DiscussionReply reply;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        border: reply.isAcceptedAnswer
            ? Border.all(color: Colors.blue.withAlpha(128))
            : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (reply.authorAvatar.isNotEmpty)
                CircleAvatar(
                  radius: 14,
                  backgroundImage: NetworkImage(reply.authorAvatar),
                )
              else
                CircleAvatar(
                  radius: 14,
                  backgroundColor: Colors.indigoAccent,
                  child: Text(
                      reply.authorName.isNotEmpty
                          ? reply.authorName[0].toUpperCase()
                          : 'A',
                      style:
                          const TextStyle(fontSize: 12, color: Colors.white)),
                ),
              const SizedBox(width: 10),
              Text(reply.authorName,
                  style: GoogleFonts.outfit(
                      color: Colors.white, fontWeight: FontWeight.bold)),
              const SizedBox(width: 8),
              if (reply.isInstructorReply)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                      color: Colors.blue.withAlpha(51),
                      borderRadius: BorderRadius.circular(4)),
                  child: Text('Instructor',
                      style: GoogleFonts.outfit(
                          color: Colors.blue,
                          fontSize: 10,
                          fontWeight: FontWeight.bold)),
                ),
              const Spacer(),
              if (reply.isAcceptedAnswer)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                      color: Colors.blue,
                      borderRadius: BorderRadius.circular(12)),
                  child: Row(
                    children: [
                      const Icon(Icons.check, color: Colors.white, size: 12),
                      const SizedBox(width: 4),
                      Text('Helpful Answer',
                          style: GoogleFonts.outfit(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              const SizedBox(width: 8),
              Text('${reply.createdAt.day}/${reply.createdAt.month}',
                  style: const TextStyle(color: Colors.grey, fontSize: 12)),
            ],
          ),
          const SizedBox(height: 12),
          Text(reply.content,
              style: GoogleFonts.outfit(color: Colors.white70, height: 1.5)),
          const SizedBox(height: 12),
          Row(
            children: [
              Icon(Icons.thumb_up,
                  color: reply.isAcceptedAnswer ? Colors.blue : Colors.grey,
                  size: 16),
              const SizedBox(width: 4),
              Text('${reply.likeCount}',
                  style: TextStyle(
                      color: reply.isAcceptedAnswer ? Colors.blue : Colors.grey,
                      fontSize: 12)),
              const Spacer(),
              const Text('Reply',
                  style: TextStyle(color: Colors.grey, fontSize: 12)),
            ],
          ),
        ],
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  const _Tag({required this.label, required this.color});
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withAlpha(26),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withAlpha(77)),
      ),
      child: Text(
        label,
        style:
            TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold),
      ),
    );
  }
}
