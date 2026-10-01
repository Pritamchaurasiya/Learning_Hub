import 'package:chewie/chewie.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:my_flutter_app/src/core/constants/api_constants.dart';
import 'package:my_flutter_app/src/features/ai/data/ai_repository.dart';
import 'package:my_flutter_app/src/features/analytics/data/analytics_repository.dart';
import 'package:my_flutter_app/src/features/courses/data/course_repository.dart';
import 'package:my_flutter_app/src/features/courses/data/notes_provider.dart';
import 'package:my_flutter_app/src/features/courses/domain/course_model.dart';
import 'package:my_flutter_app/src/features/courses/presentation/course_controller.dart';
import 'package:my_flutter_app/src/features/discussions/domain/discussion_models.dart';
import 'package:my_flutter_app/src/features/discussions/presentation/discussion_controller.dart';
import 'package:video_player/video_player.dart';

class LessonPlayerScreen extends ConsumerStatefulWidget {
  const LessonPlayerScreen({
    super.key,
    required this.course,
    this.initialLesson,
  });

  final Course course;
  final CourseLesson? initialLesson;

  @override
  ConsumerState<LessonPlayerScreen> createState() => _LessonPlayerScreenState();
}

class _LessonPlayerScreenState extends ConsumerState<LessonPlayerScreen>
    with SingleTickerProviderStateMixin {
  late VideoPlayerController _videoPlayerController;
  ChewieController? _chewieController;
  late TabController _tabController;

  bool _isInit = false;
  late CourseLesson _activeLesson;
  final _discussionController = TextEditingController();
  final Set<String> _completedLessonIds = {};

  String get _threadId => 'course_${widget.course.id}';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);

    _activeLesson = widget.initialLesson ?? _findFirstLesson(widget.course);
    _initializePlayer();
  }

  CourseLesson _findFirstLesson(Course course) {
    if (course.modules.isNotEmpty && course.modules.first.lessons.isNotEmpty) {
      return course.modules.first.lessons.first;
    }
    return CourseLesson(
      id: 'default',
      title: 'Introduction to ${course.title}',
      slug: 'intro',
      durationMinutes: 15,
      contentType: 'video',
      videoUrl: course.previewVideoUrl ?? course.hlsPlaylist,
    );
  }

  Future<void> _initializePlayer() async {
    setState(() => _isInit = false);
    _chewieController?.dispose();

    String rawUrl;
    if (_activeLesson.videoUrl != null && _activeLesson.videoUrl!.isNotEmpty) {
      rawUrl = _activeLesson.videoUrl!;
    } else if (widget.course.hlsPlaylist != null &&
        widget.course.hlsPlaylist!.isNotEmpty) {
      rawUrl = widget.course.hlsPlaylist!;
    } else if (widget.course.previewVideoUrl != null &&
        widget.course.previewVideoUrl!.isNotEmpty) {
      rawUrl = widget.course.previewVideoUrl!;
    } else {
      rawUrl =
          'https://flutter.github.io/assets-for-api-docs/assets/videos/butterfly.mp4';
    }

    final videoUrl = rawUrl.startsWith('http')
        ? rawUrl
        : '${ApiConstants.baseUrl}$rawUrl';

    try {
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

      var hasCompleted = false;
      _videoPlayerController.addListener(() {
        final pos = _videoPlayerController.value.position;
        final dur = _videoPlayerController.value.duration;

        if (!hasCompleted &&
            dur.inSeconds > 0 &&
            pos.inSeconds >= (dur.inSeconds * 0.9).toInt() &&
            !_videoPlayerController.value.isPlaying) {
          hasCompleted = true;
          _onLessonComplete();
        }
        if (pos < dur) {
          hasCompleted = false;
        }
      });
    } catch (_) {
      // Fallback placeholder if network video fails
    }

    if (mounted) {
      setState(() => _isInit = true);
    }
  }

  void _switchLesson(CourseLesson lesson) {
    if (_activeLesson.id == lesson.id) return;
    setState(() {
      _activeLesson = lesson;
    });
    _initializePlayer();
  }

  Future<void> _onLessonComplete() async {
    final lessonId = _activeLesson.id;
    if (_completedLessonIds.contains(lessonId)) return;

    setState(() {
      _completedLessonIds.add(lessonId);
    });

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.emoji_events, color: Colors.amber),
              const SizedBox(width: 8),
              Text(
                'Lesson Completed! +50 XP 🚀',
                style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
              ),
            ],
          ),
          backgroundColor: const Color(0xFF10B981),
          behavior: SnackBarBehavior.floating,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
    }

    // Call backend lesson completion endpoint
    await ref.read(courseRepositoryProvider).completeLesson(
          courseSlug: widget.course.slug,
          lessonId: lessonId,
        );

    ref.invalidate(courseProgressProvider(widget.course.slug));

    ref.read(analyticsRepositoryProvider).trackActivity(
      action: 'completed_lesson_video',
      contentType: 'course',
      objectId: int.tryParse(widget.course.id),
      metadata: {
        'course_slug': widget.course.slug,
        'lesson_id': lessonId,
        'lesson_title': _activeLesson.title,
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
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          widget.course.title,
          style: GoogleFonts.outfit(
            color: Colors.white,
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.check_circle_outline, color: Colors.white70),
            tooltip: 'Mark Complete',
            onPressed: _onLessonComplete,
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Video Player Container
            AspectRatio(
              aspectRatio: 16 / 9,
              child: _isInit && _chewieController != null
                  ? Chewie(controller: _chewieController!)
                  : Container(
                      color: Colors.black,
                      child: const Center(
                        child: CircularProgressIndicator(color: Color(0xFF3B82F6)),
                      ),
                    ),
            ),

            // Tab Navigation
            Container(
              color: const Color(0xFF1E293B),
              child: TabBar(
                controller: _tabController,
                labelColor: const Color(0xFF3B82F6),
                unselectedLabelColor: Colors.grey,
                indicatorColor: const Color(0xFF3B82F6),
                labelStyle: GoogleFonts.outfit(fontWeight: FontWeight.w600, fontSize: 13),
                tabs: const [
                  Tab(text: 'Curriculum'),
                  Tab(text: 'Overview'),
                  Tab(text: 'Notes'),
                  Tab(text: 'Discussion'),
                ],
              ),
            ),

            // Tab Content
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildCurriculumTab(),
                  _buildOverviewTab(),
                  _buildNotesTab(),
                  _buildDiscussionTab(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCurriculumTab() {
    final modules = widget.course.modules;

    if (modules.isEmpty) {
      return Center(
        child: Text(
          'Single Lesson Video',
          style: GoogleFonts.outfit(color: Colors.white70),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: modules.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, mIndex) {
        final module = modules[mIndex];
        return Container(
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.white10),
          ),
          child: ExpansionTile(
            initiallyExpanded: module.lessons.any((l) => l.id == _activeLesson.id) || mIndex == 0,
            leading: CircleAvatar(
              radius: 14,
              backgroundColor: const Color(0xFF3B82F6).withValues(alpha: 0.2),
              child: Text(
                '${mIndex + 1}',
                style: GoogleFonts.outfit(
                  color: const Color(0xFF3B82F6),
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ),
            title: Text(
              module.title,
              style: GoogleFonts.outfit(
                color: Colors.white,
                fontWeight: FontWeight.w600,
                fontSize: 14,
              ),
            ),
            subtitle: Text(
              '${module.lessons.length} lessons',
              style: GoogleFonts.outfit(color: Colors.white54, fontSize: 11),
            ),
            children: module.lessons.map((lesson) {
              final isActive = lesson.id == _activeLesson.id;
              final isDone = _completedLessonIds.contains(lesson.id) || lesson.isCompleted;

              return ListTile(
                onTap: () => _switchLesson(lesson),
                selected: isActive,
                selectedTileColor: const Color(0xFF3B82F6).withValues(alpha: 0.15),
                leading: Icon(
                  isDone
                      ? Icons.check_circle
                      : (lesson.isVideo ? Icons.play_circle : Icons.article),
                  color: isDone
                      ? const Color(0xFF10B981)
                      : (isActive ? const Color(0xFF3B82F6) : Colors.white54),
                  size: 20,
                ),
                title: Text(
                  lesson.title,
                  style: GoogleFonts.outfit(
                    color: isActive ? const Color(0xFF60A5FA) : Colors.white,
                    fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                    fontSize: 13,
                  ),
                ),
                trailing: Text(
                  lesson.formattedDuration,
                  style: GoogleFonts.outfit(
                    color: Colors.white38,
                    fontSize: 11,
                  ),
                ),
              );
            }).toList(),
          ),
        );
      },
    );
  }

  Widget _buildOverviewTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                _activeLesson.title,
                style: GoogleFonts.outfit(
                  color: Colors.white,
                  fontSize: 18,
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
                        Text('AI Summary', style: TextStyle(color: Colors.white)),
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
                              child: CircularProgressIndicator(),
                            ),
                          );
                        }
                        return Text(
                          snapshot.data ?? 'No summary available.',
                          style: const TextStyle(
                              color: Colors.white70, height: 1.5),
                        );
                      },
                    ),
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
            fontSize: 15,
            height: 1.5,
          ),
        ),
        const SizedBox(height: 24),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.white10),
          ),
          child: Row(
            children: [
              const Icon(Icons.quiz, color: Color(0xFF3B82F6), size: 28),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Ready for a Challenge?',
                      style: GoogleFonts.outfit(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                    Text(
                      'Take the module practice assessment.',
                      style: GoogleFonts.outfit(
                          color: Colors.white60, fontSize: 12),
                    ),
                  ],
                ),
              ),
              FilledButton.tonal(
                onPressed: () => context.push('/hub'),
                child: const Text('Start Quiz'),
              ),
            ],
          ),
        ),
      ],
    );
  }

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
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: _showAddNoteDialog,
                  icon: const Icon(Icons.add),
                  label: const Text('Add Note'),
                  style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF3B82F6)),
                ),
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
                  ),
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

  Widget _buildDiscussionTab() {
    final repliesAsync = ref.watch(discussionRepliesProvider(_threadId));

    return Column(
      children: [
        Expanded(
          child: repliesAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (err, _) => Center(
              child: Text(
                'No discussions yet. Be the first!',
                style: GoogleFonts.outfit(color: Colors.white38),
              ),
            ),
            data: (replies) {
              if (replies.isEmpty) {
                return Center(
                  child: Text(
                    'Start a conversation about this lesson',
                    style: GoogleFonts.outfit(color: Colors.white38),
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
                IconButton(
                  onPressed: _submitDiscussion,
                  icon: const Icon(Icons.send, color: Color(0xFF3B82F6)),
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
                  reply.authorName.isNotEmpty
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
            ],
          ),
          const SizedBox(height: 8),
          Text(
            reply.content,
            style: GoogleFonts.outfit(color: Colors.white70, fontSize: 14),
          ),
        ],
      ),
    );
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
