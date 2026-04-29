import 'package:chewie/chewie.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:my_flutter_app/src/core/constants/api_constants.dart';
import 'package:my_flutter_app/src/features/ai/data/ai_repository.dart';
import 'package:my_flutter_app/src/features/analytics/data/analytics_repository.dart';
import 'package:my_flutter_app/src/features/courses/data/notes_provider.dart';
import 'package:my_flutter_app/src/features/courses/domain/course_model.dart';
import 'package:my_flutter_app/src/features/discussions/domain/discussion_models.dart';
import 'package:my_flutter_app/src/features/discussions/presentation/discussion_controller.dart';
import 'package:video_player/video_player.dart';

class LessonPlayerScreen extends ConsumerStatefulWidget {
  const LessonPlayerScreen({super.key, required this.course});

  final Course course;

  @override
  ConsumerState<LessonPlayerScreen> createState() => _LessonPlayerScreenState();
}

class _LessonPlayerScreenState extends ConsumerState<LessonPlayerScreen>
    with SingleTickerProviderStateMixin {
  late VideoPlayerController _videoPlayerController;
  ChewieController? _chewieController;
  late TabController _tabController;

  bool _isInit = false;
  final _discussionController = TextEditingController();

  /// Discussion thread ID derived from the course (e.g. "course_123")
  String get _threadId => 'course_${widget.course.id}';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _initializePlayer();
  }

  Future<void> _initializePlayer() async {
    final videoUrl = widget.course.hlsPlaylist != null
        ? (widget.course.hlsPlaylist!.startsWith('http')
            ? widget.course.hlsPlaylist!
            : '${ApiConstants.baseUrl}${widget.course.hlsPlaylist}')
        : 'https://flutter.github.io/assets-for-api-docs/assets/videos/butterfly.mp4';

    _videoPlayerController =
        VideoPlayerController.networkUrl(Uri.parse(videoUrl));

    await _videoPlayerController.initialize();

    _chewieController = ChewieController(
      videoPlayerController: _videoPlayerController,
      autoPlay: true,
      aspectRatio: 16 / 9,
      errorBuilder: (context, errorMessage) {
        return Center(
          child: Text(
            errorMessage,
            style: const TextStyle(color: Colors.white),
          ),
        );
      },
    );

    // Track Progress - only trigger once per video completion
    var hasCompleted = false;
    _videoPlayerController.addListener(() {
      if (!hasCompleted &&
          _videoPlayerController.value.position >=
              _videoPlayerController.value.duration &&
          !_videoPlayerController.value.isPlaying) {
        hasCompleted = true;
        _onVideoComplete();
      }
      // Reset completion flag when video is seeked to a new position
      if (_videoPlayerController.value.position <
          _videoPlayerController.value.duration) {
        hasCompleted = false;
      }
    });

    if (mounted) {
      setState(() {
        _isInit = true;
      });
    }
  }

  void _onVideoComplete() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.emoji_events, color: Colors.amber),
            const SizedBox(width: 8),
            Text('Lesson Completed! +50 XP',
                style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
          ],
        ),
        backgroundColor: const Color(0xFF10B981),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
    ref.read(analyticsRepositoryProvider).trackActivity(
      action: 'completed_lesson_video',
      contentType: 'course',
      objectId: int.tryParse(widget.course.id),
      metadata: {
        'course_slug': widget.course.slug,
        'title': widget.course.title,
      },
    );
  }

  @override
  void dispose() {
    _videoPlayerController.dispose();
    _chewieController?.dispose();
    _tabController.dispose();
    _discussionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: SafeArea(
        child: Column(
          children: [
            // Video Player Area
            AspectRatio(
              aspectRatio: 16 / 9,
              child: _isInit && _chewieController != null
                  ? Chewie(controller: _chewieController!)
                  : Container(
                      color: Colors.black,
                      child: const Center(child: CircularProgressIndicator()),
                    ),
            ),

            // Course Info / Tabs
            Expanded(
              child: Column(
                children: [
                  Container(
                    color: const Color(0xFF1E293B),
                    child: TabBar(
                      controller: _tabController,
                      labelColor: const Color(0xFF3B82F6),
                      unselectedLabelColor: Colors.grey,
                      indicatorColor: const Color(0xFF3B82F6),
                      labelStyle:
                          GoogleFonts.outfit(fontWeight: FontWeight.w600),
                      tabs: const [
                        Tab(text: 'Transcript'),
                        Tab(text: 'Notes'),
                        Tab(text: 'Discussion'),
                      ],
                    ),
                  ),
                  Expanded(
                    child: TabBarView(
                      controller: _tabController,
                      children: [
                        _buildTranscriptTab(),
                        _buildNotesTab(),
                        _buildDiscussionTab(),
                      ],
                    ),
                  )
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTranscriptTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                'Introduction to ${widget.course.title}',
                style: GoogleFonts.outfit(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            IconButton(
              onPressed: () {
                showDialog<void>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    backgroundColor: const Color(0xFF1E293B),
                    title: const Row(
                      children: [
                        Icon(Icons.auto_awesome, color: Color(0xFF3B82F6)),
                        SizedBox(width: 8),
                        Text('AI Summary',
                            style: TextStyle(color: Colors.white)),
                      ],
                    ),
                    content: FutureBuilder<String>(
                        future: ref
                            .read(aiRepositoryProvider)
                            .summarizeCourse(widget.course.id),
                        builder: (context, snapshot) {
                          if (snapshot.connectionState ==
                              ConnectionState.waiting) {
                            return const SizedBox(
                              height: 100,
                              child: Center(
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    CircularProgressIndicator(),
                                    SizedBox(height: 16),
                                    Text('AI is analyzing the lesson...',
                                        style: TextStyle(color: Colors.grey)),
                                  ],
                                ),
                              ),
                            );
                          }
                          if (snapshot.hasError) {
                            return Text('Error: ${snapshot.error}',
                                style:
                                    const TextStyle(color: Colors.redAccent));
                          }
                          return Text(
                            snapshot.data ?? 'No summary available.',
                            style: const TextStyle(
                                color: Colors.white70, height: 1.5),
                          );
                        }),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(ctx),
                        child: const Text('Close'),
                      )
                    ],
                  ),
                );
              },
              icon: const Icon(Icons.summarize, color: Colors.white),
              tooltip: 'AI Summarize',
            ),
          ],
        ),
        const SizedBox(height: 12),
        Text(
          widget.course.description,
          style: GoogleFonts.outfit(
            color: Colors.white70,
            fontSize: 16,
            height: 1.6,
          ),
        ),
        const SizedBox(height: 24),
        Text(
          '00:15 - Core Concepts',
          style: GoogleFonts.outfit(
            color: const Color(0xFF3B82F6),
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'In this section we will explore the fundamental architecture...',
          style: GoogleFonts.outfit(color: Colors.grey),
        ),
      ],
    );
  }

  // ─── NOTES TAB: Persistent via SharedPreferences ───
  Widget _buildNotesTab() {
    final notesAsync = ref.watch(lessonNotesProvider(widget.course.id));

    return notesAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (err, _) => Center(
        child: Text('Error loading notes: $err',
            style: const TextStyle(color: Colors.redAccent)),
      ),
      data: (notes) {
        if (notes.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.edit_note, size: 64, color: Colors.grey[700])
                    .animate()
                    .fadeIn()
                    .scale(delay: 200.ms),
                const SizedBox(height: 16),
                Text(
                  'No notes yet',
                  style: GoogleFonts.outfit(color: Colors.grey),
                ),
                const SizedBox(height: 4),
                Text(
                  'Notes are saved locally and persist across sessions',
                  style:
                      GoogleFonts.outfit(color: Colors.grey[600], fontSize: 12),
                ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: _showAddNoteDialog,
                  icon: const Icon(Icons.add),
                  label: const Text('Add Note'),
                  style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF3B82F6)),
                ).animate().fadeIn(delay: 300.ms),
              ],
            ),
          );
        }

        return Stack(
          children: [
            ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
              itemCount: notes.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final note = notes[index];
                return Dismissible(
                  key: ValueKey(note.id),
                  direction: DismissDirection.endToStart,
                  background: Container(
                    alignment: Alignment.centerRight,
                    padding: const EdgeInsets.only(right: 20),
                    decoration: BoxDecoration(
                      color: Colors.redAccent,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.delete, color: Colors.white),
                  ),
                  onDismissed: (_) {
                    ref
                        .read(lessonNotesProvider(widget.course.id).notifier)
                        .deleteNote(note.id);
                  },
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white10),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.access_time,
                                size: 14, color: Colors.grey[500]),
                            const SizedBox(width: 6),
                            Text(
                              note.timestamp,
                              style: GoogleFonts.outfit(
                                fontSize: 11,
                                color: const Color(0xFF3B82F6),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const Spacer(),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFF10B981)
                                    .withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                'Saved',
                                style: GoogleFonts.outfit(
                                  fontSize: 9,
                                  color: const Color(0xFF10B981),
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          note.text,
                          style: GoogleFonts.outfit(
                            color: Colors.white70,
                            fontSize: 14,
                            height: 1.5,
                          ),
                        ),
                      ],
                    ),
                  ).animate().fadeIn(duration: 300.ms).slideX(begin: 0.05),
                );
              },
            ),
            Positioned(
              bottom: 16,
              right: 16,
              child: FloatingActionButton(
                mini: true,
                backgroundColor: const Color(0xFF3B82F6),
                onPressed: _showAddNoteDialog,
                child: const Icon(Icons.add, color: Colors.white),
              ),
            ),
          ],
        );
      },
    );
  }

  void _showAddNoteDialog() {
    final controller = TextEditingController();
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: Text('Add Note', style: GoogleFonts.outfit(color: Colors.white)),
        content: TextField(
          controller: controller,
          maxLines: 4,
          autofocus: true,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            hintText: 'Type your note...',
            hintStyle: TextStyle(color: Colors.grey[600]),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: Colors.white24),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: Colors.white24),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              if (controller.text.trim().isNotEmpty) {
                final pos =
                    _chewieController?.videoPlayerController.value.position;
                final minutes = pos != null
                    ? '${pos.inMinutes}:${(pos.inSeconds % 60).toString().padLeft(2, '0')}'
                    : 'Manual';
                ref
                    .read(lessonNotesProvider(widget.course.id).notifier)
                    .addNote(controller.text.trim(), minutes);
              }
              Navigator.pop(ctx);
            },
            style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF3B82F6)),
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  // ─── DISCUSSION TAB: Live API via discussionRepliesProvider ───
  Widget _buildDiscussionTab() {
    final repliesAsync = ref.watch(discussionRepliesProvider(_threadId));

    return Column(
      children: [
        Expanded(
          child: repliesAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (err, _) => Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.chat_bubble_outline,
                      size: 48, color: Colors.white24),
                  const SizedBox(height: 12),
                  Text(
                    'No discussions yet. Be the first!',
                    style: GoogleFonts.outfit(color: Colors.white38),
                  ),
                ],
              ),
            ),
            data: (replies) {
              if (replies.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.forum_outlined,
                          size: 48, color: Colors.white24),
                      const SizedBox(height: 12),
                      Text(
                        'Start a conversation about this lesson',
                        style: GoogleFonts.outfit(color: Colors.white38),
                      ),
                    ],
                  ),
                );
              }
              return ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: replies.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final reply = replies[index];
                  return _buildReplyBubble(reply);
                },
              );
            },
          ),
        ),
        // Input area
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            border: Border(
                top: BorderSide(color: Colors.white.withValues(alpha: 0.1))),
          ),
          child: SafeArea(
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _discussionController,
                    style: const TextStyle(color: Colors.white),
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _submitDiscussion(),
                    decoration: InputDecoration(
                      hintText: 'Add to discussion...',
                      hintStyle: TextStyle(color: Colors.grey[600]),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                      filled: true,
                      fillColor: const Color(0xFF0F172A),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 10),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF3B82F6), Color(0xFF2563EB)],
                    ),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF3B82F6).withValues(alpha: 0.4),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: IconButton(
                    onPressed: _submitDiscussion,
                    icon: const Icon(Icons.send, color: Colors.white, size: 18),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildReplyBubble(DiscussionReply reply) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 14,
                backgroundColor: const Color(0xFF3B82F6),
                child: Text(
                  (reply.authorName.isNotEmpty)
                      ? reply.authorName[0].toUpperCase()
                      : '?',
                  style: const TextStyle(color: Colors.white, fontSize: 12),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  reply.authorName,
                  style: GoogleFonts.outfit(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
              ),
              Text(
                _formatDate(reply.createdAt),
                style: GoogleFonts.outfit(color: Colors.grey, fontSize: 11),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            reply.content,
            style: GoogleFonts.outfit(
              color: Colors.white70,
              fontSize: 14,
              height: 1.4,
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms);
  }

  String _formatDate(DateTime? dt) {
    if (dt == null) {
      return '';
    }
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) {
      return 'Just now';
    }
    if (diff.inMinutes < 60) {
      return '${diff.inMinutes}m ago';
    }
    if (diff.inHours < 24) {
      return '${diff.inHours}h ago';
    }
    return '${diff.inDays}d ago';
  }

  void _submitDiscussion() {
    if (_discussionController.text.trim().isNotEmpty) {
      ref
          .read(discussionReplyControllerProvider.notifier)
          .submitReply(_threadId, _discussionController.text.trim());
      _discussionController.clear();
    }
  }
}
