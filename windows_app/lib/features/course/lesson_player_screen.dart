import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart'; // For kIsWeb
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:learning_hub/core/theme/app_colors.dart';
import 'package:learning_hub/shared/widgets/video_player_widget.dart';
import 'package:learning_hub/core/providers/offline_provider.dart';
import 'package:learning_hub/core/services/offline_service.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'dart:async';
import '../../core/providers/backend_ai_provider.dart';
import 'package:learning_hub/core/services/api_client.dart';
import 'package:learning_hub/shared/widgets/app_feedback.dart';

/// Lesson player screen with video, transcript, and notes
class LessonPlayerScreen extends ConsumerStatefulWidget {
  final String courseId;
  final String lessonId;

  const LessonPlayerScreen({
    super.key,
    required this.courseId,
    required this.lessonId,
  });

  @override
  ConsumerState<LessonPlayerScreen> createState() => _LessonPlayerScreenState();
}

class _LessonPlayerScreenState extends ConsumerState<LessonPlayerScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isFullscreen = false;
  // ignore: unused_field - used in VideoPlayerWidget callback
  double _playbackSpeed = 1.0;
  double _savedPosition = 0.0;
  bool _isLoadingProgress = true;
  Timer? _saveDebouncer;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadProgress();
  }

  Future<void> _loadProgress() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final key = 'video_progress_${widget.lessonId}';
      if (mounted) {
        setState(() {
          _savedPosition = prefs.getDouble(key) ?? 0.0;
          _isLoadingProgress = false;
        });
      }
    } catch (e) {
      debugPrint('Error loading video progress: $e');
      if (mounted) setState(() => _isLoadingProgress = false);
    }
  }

  Future<void> _saveProgress(double position) async {
    if (_saveDebouncer?.isActive ?? false) {
      return;
    }

    _saveDebouncer = Timer(const Duration(seconds: 2), () async {
      try {
        // 1. Local Save
        final prefs = await SharedPreferences.getInstance();
        final key = 'video_progress_${widget.lessonId}';
        await prefs.setDouble(key, position);

        // 2. Cloud Sync
        // Only sync if user is online (Handled by ApiClient or separate check)
        // We use the new endpoint
        try {
          await ApiClient.instance.post<Map<String, dynamic>>(
            '/api/v1/courses/${widget.courseId}/update-progress/',
            data: {'lesson_id': widget.lessonId, 'seconds': position},
          );
        } catch (_) {
          // Silent fail for cloud sync (offline is fine)
        }
      } catch (e) {
        debugPrint('Error saving video progress: $e');
      }
    });
  }

  Future<void> _markLessonComplete() async {
    try {
      final apiClient = ApiClient.instance; // Use singleton

      // Assuming courseId is slug. If it's ID, backend needs to handle or we need slug.
      // We Post to /api/v1/courses/{slug}/complete-lesson/

      await apiClient.post<Map<String, dynamic>>(
        '/api/v1/courses/${widget.courseId}/complete-lesson/',
        data: {'lesson_id': widget.lessonId},
      );

      if (mounted) {
        AppFeedback.showSuccess(context, 'Lesson marked as complete! +50 XP');
        // Could also trigger a confetti animation here
      }
    } catch (e) {
      debugPrint('Error marking lesson complete: $e');
      if (mounted) {
        AppFeedback.showError(context, 'Failed to sync progress: $e');
      }
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _saveDebouncer?.cancel();
    super.dispose();
  }

  void _toggleFullscreen() {
    setState(() {
      _isFullscreen = !_isFullscreen;
      if (_isFullscreen) {
        if (!kIsWeb) {
          SystemChrome.setPreferredOrientations([
            DeviceOrientation.landscapeLeft,
            DeviceOrientation.landscapeRight,
          ]);
          SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersive);
        }
      } else {
        if (!kIsWeb) {
          SystemChrome.setPreferredOrientations([
            DeviceOrientation.portraitUp,
          ]);
          SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
        }
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final size = MediaQuery.of(context).size;
    final isDesktop = size.width >= 1024;
    final offlineState = ref.watch(offlineProvider);
    final isDownloaded = offlineState.downloadedIds.contains(widget.lessonId);

    // Determine video source
    String videoUrl =
        'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4';
    if (isDownloaded) {
      final localPath = OfflineService.instance.getLocalPath(widget.lessonId);
      if (localPath != null) {
        videoUrl = localPath;
      }
    }

    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: isDesktop
            ? _DesktopLayout(
                videoUrl: videoUrl,
                isFullscreen: _isFullscreen,
                onFullscreenToggle: _toggleFullscreen,
                playbackSpeed: _playbackSpeed,
                onSpeedChange: (speed) =>
                    setState(() => _playbackSpeed = speed),
                tabController: _tabController,
                courseId: widget.courseId,
                lessonId: widget.lessonId,
                theme: theme,
                initialPosition: _savedPosition,
                onPositionChanged: _saveProgress,
                isLoading: _isLoadingProgress,
                onComplete: _markLessonComplete,
              )
            : Column(
                children: [
                  // Video Player Section
                  // Video Player Section
                  if (_isLoadingProgress)
                    const AspectRatio(
                      aspectRatio: 16 / 9,
                      child: Center(child: CircularProgressIndicator()),
                    )
                  else
                    VideoPlayerWidget(
                      videoUrl: videoUrl,
                      isFullscreen: _isFullscreen,
                      onFullscreenToggle: _toggleFullscreen,
                      initialPosition: _savedPosition,
                      onPositionChanged: _saveProgress,
                      onSpeedChange: (speed) =>
                          setState(() => _playbackSpeed = speed),
                    ),

                  // Content Section (hidden in fullscreen)
                  if (!_isFullscreen)
                    Expanded(
                      child: Container(
                        color: theme.colorScheme.surface,
                        child: Column(
                          children: [
                            // Lesson Title
                            Padding(
                              padding: const EdgeInsets.all(16),
                              child: Row(
                                children: [
                                  IconButton(
                                    icon: const Icon(Icons.arrow_back),
                                    onPressed: () => context.pop(),
                                  ),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Lesson 12: State Management with Riverpod',
                                          style: theme.textTheme.titleMedium
                                              ?.copyWith(
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          'Complete Flutter Development Bootcamp',
                                          style: theme.textTheme.bodySmall
                                              ?.copyWith(
                                            color: theme
                                                .colorScheme.onSurfaceVariant,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.smart_toy_outlined),
                                    onPressed: () => context.push(
                                        '/ai-tutor?lessonId=${widget.lessonId}'),
                                    tooltip: 'Ask AI Tutor',
                                  ),
                                ],
                              ),
                            ),

                            // Offline Download Button
                            if (!kIsWeb && !isDownloaded)
                              Padding(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 16, vertical: 8),
                                child: SizedBox(
                                  width: double.infinity,
                                  child: ElevatedButton.icon(
                                    onPressed: () {
                                      ref
                                          .read(offlineProvider.notifier)
                                          .downloadResource(
                                              'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
                                              widget.lessonId,
                                              'video');
                                    },
                                    icon: const Icon(Icons.download),
                                    label: const Text(
                                        'Download for Offline Access'),
                                  ),
                                ),
                              ),

                            // Tab Bar
                            TabBar(
                              controller: _tabController,
                              tabs: const [
                                Tab(text: 'Transcript'),
                                Tab(text: 'Notes'),
                                Tab(text: 'Code'),
                                Tab(text: 'Discussion'),
                              ],
                            ),

                            // Tab Content
                            Expanded(
                              child: TabBarView(
                                controller: _tabController,
                                children: [
                                  _TranscriptTab(),
                                  _NotesTab(),
                                  _CodeTab(),
                                  _DiscussionTab(),
                                ],
                              ),
                            ),

                            // Navigation Bar
                            _LessonNavigationBar(
                              courseId: widget.courseId,
                              onPrevious: () {},
                              onNext: () {},
                              onComplete: _markLessonComplete,
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
      ),
    );
  }
}

/// Desktop Layout for Lesson Player (Side-by-Side)
class _DesktopLayout extends StatelessWidget {
  final String videoUrl;
  final bool isFullscreen;
  final VoidCallback onFullscreenToggle;
  final double playbackSpeed;
  final ValueChanged<double> onSpeedChange;
  final TabController tabController;
  final String courseId;
  final String lessonId;
  final ThemeData theme;
  final double initialPosition;
  final ValueChanged<double> onPositionChanged;
  final bool isLoading;
  final VoidCallback? onComplete;

  const _DesktopLayout({
    required this.videoUrl,
    required this.isFullscreen,
    required this.onFullscreenToggle,
    required this.playbackSpeed,
    required this.onSpeedChange,
    required this.tabController,
    required this.courseId,
    required this.lessonId,
    required this.theme,
    this.initialPosition = 0.0,
    required this.onPositionChanged,
    this.isLoading = false,
    this.onComplete,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        // Left Column: Video Player & Navigation
        Expanded(
          flex: 2,
          child: Column(
            children: [
              // Header
              Container(
                color: theme.colorScheme.surface,
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back),
                      onPressed: () => context.pop(),
                      tooltip: 'Back to Course',
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Lesson 12: State Management with Riverpod',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.smart_toy_outlined),
                      onPressed: () =>
                          context.push('/ai-tutor?lessonId=$lessonId'),
                      tooltip: 'Ask AI Tutor',
                    ),
                  ],
                ),
              ),

              // Video
              Expanded(
                child: Container(
                  color: Colors.black,
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 1200),
                      child: AspectRatio(
                        aspectRatio: 16 / 9,
                        child: isLoading
                            ? const Center(child: CircularProgressIndicator())
                            : VideoPlayerWidget(
                                videoUrl: videoUrl,
                                isFullscreen: isFullscreen,
                                onFullscreenToggle: onFullscreenToggle,
                                onSpeedChange: onSpeedChange,
                                initialPosition: initialPosition,
                                onPositionChanged: onPositionChanged,
                              ),
                      ),
                    ),
                  ),
                ),
              ),

              // Navigation Controls
              Container(
                color: theme.colorScheme.surface,
                padding: const EdgeInsets.all(16),
                child: _LessonNavigationBar(
                  courseId: courseId,
                  onPrevious: () {},
                  onNext: () {},
                  onComplete: onComplete,
                ),
              ),
            ],
          ),
        ),

        // Right Column: Tabs (Transcript, Notes, QA)
        Container(
          width: 400,
          decoration: BoxDecoration(
            color: theme.colorScheme.surface,
            border: Border(
              left: BorderSide(color: theme.dividerColor),
            ),
          ),
          child: Column(
            children: [
              TabBar(
                controller: tabController,
                tabs: const [
                  Tab(text: 'Transcript'),
                  Tab(text: 'Notes'),
                  Tab(text: 'Code'),
                  Tab(text: 'Discussion'),
                ],
              ),
              Expanded(
                child: TabBarView(
                  controller: tabController,
                  children: [
                    _TranscriptTab(),
                    _NotesTab(),
                    _CodeTab(),
                    _DiscussionTab(),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Video player section with custom controls
class _VideoPlayerSection extends StatefulWidget {
  final bool isFullscreen;
  final VoidCallback onToggleFullscreen;
  final double playbackSpeed;
  final ValueChanged<double> onSpeedChange;

  const _VideoPlayerSection({
    required this.isFullscreen,
    required this.onToggleFullscreen,
    required this.playbackSpeed,
    required this.onSpeedChange,
  });

  @override
  State<_VideoPlayerSection> createState() => _VideoPlayerSectionState();
}

class _VideoPlayerSectionState extends State<_VideoPlayerSection> {
  bool _isPlaying = false;
  double _currentPosition = 0.0;
  bool _showControls = true;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => setState(() => _showControls = !_showControls),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        height: widget.isFullscreen ? MediaQuery.of(context).size.height : 220,
        color: Colors.black,
        child: Stack(
          children: [
            // Placeholder for video
            Center(
              child: Container(
                color: Colors.black87,
                child: AspectRatio(
                  aspectRatio: 16 / 9,
                  child: Center(
                    child: Icon(
                      Icons.play_circle_outline,
                      size: 64,
                      color: Colors.white.withValues(alpha: 0.5),
                    ),
                  ),
                ),
              ),
            ),

            // Controls overlay
            if (_showControls)
              Positioned.fill(
                child: Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.black54,
                        Colors.transparent,
                        Colors.transparent,
                        Colors.black54,
                      ],
                      stops: [0.0, 0.2, 0.8, 1.0],
                    ),
                  ),
                  child: Column(
                    children: [
                      // Top bar
                      if (widget.isFullscreen)
                        Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            children: [
                              IconButton(
                                icon: const Icon(Icons.arrow_back,
                                    color: Colors.white),
                                onPressed: widget.onToggleFullscreen,
                              ),
                              const Spacer(),
                              IconButton(
                                icon: const Icon(Icons.settings,
                                    color: Colors.white),
                                onPressed: () => _showSettingsSheet(context),
                              ),
                            ],
                          ),
                        ),

                      const Spacer(),

                      // Center controls
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.replay_10,
                                color: Colors.white, size: 32),
                            onPressed: () {},
                          ),
                          const SizedBox(width: 24),
                          IconButton(
                            icon: Icon(
                              _isPlaying ? Icons.pause : Icons.play_arrow,
                              color: Colors.white,
                              size: 48,
                            ),
                            onPressed: () =>
                                setState(() => _isPlaying = !_isPlaying),
                          ),
                          const SizedBox(width: 24),
                          IconButton(
                            icon: const Icon(Icons.forward_10,
                                color: Colors.white, size: 32),
                            onPressed: () {},
                          ),
                        ],
                      ),

                      const Spacer(),

                      // Bottom bar
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          children: [
                            // Progress bar
                            Row(
                              children: [
                                const Text(
                                  '05:30',
                                  style: TextStyle(
                                      color: Colors.white, fontSize: 12),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: SliderTheme(
                                    data: const SliderThemeData(
                                      trackHeight: 4,
                                      thumbShape: RoundSliderThumbShape(
                                          enabledThumbRadius: 6),
                                      overlayShape: RoundSliderOverlayShape(
                                          overlayRadius: 12),
                                      activeTrackColor: AppColors.primary,
                                      inactiveTrackColor: Colors.white30,
                                      thumbColor: AppColors.primary,
                                    ),
                                    child: Slider(
                                      value: _currentPosition,
                                      onChanged: (value) => setState(
                                          () => _currentPosition = value),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                const Text(
                                  '15:30',
                                  style: TextStyle(
                                      color: Colors.white, fontSize: 12),
                                ),
                              ],
                            ),

                            const SizedBox(height: 8),

                            // Control buttons
                            Row(
                              children: [
                                // Speed button
                                TextButton(
                                  onPressed: () => _showSpeedSheet(context),
                                  child: Text(
                                    '${widget.playbackSpeed}x',
                                    style: const TextStyle(color: Colors.white),
                                  ),
                                ),
                                const Spacer(),
                                IconButton(
                                  icon: const Icon(Icons.subtitles,
                                      color: Colors.white),
                                  onPressed: () {},
                                ),
                                IconButton(
                                  icon: const Icon(Icons.picture_in_picture_alt,
                                      color: Colors.white),
                                  onPressed: () {},
                                ),
                                IconButton(
                                  icon: Icon(
                                    widget.isFullscreen
                                        ? Icons.fullscreen_exit
                                        : Icons.fullscreen,
                                    color: Colors.white,
                                  ),
                                  onPressed: widget.onToggleFullscreen,
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  void _showSettingsSheet(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.speed),
              title: const Text('Playback Speed'),
              trailing: Text('${widget.playbackSpeed}x'),
              onTap: () {
                Navigator.pop(context);
                _showSpeedSheet(context);
              },
            ),
            ListTile(
              leading: const Icon(Icons.high_quality),
              title: const Text('Quality'),
              trailing: const Text('Auto (720p)'),
              onTap: () {},
            ),
            ListTile(
              leading: const Icon(Icons.subtitles),
              title: const Text('Subtitles'),
              trailing: const Text('English'),
              onTap: () {},
            ),
          ],
        ),
      ),
    );
  }

  void _showSpeedSheet(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Playback Speed',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              children: [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((speed) {
                final isSelected = widget.playbackSpeed == speed;
                return ChoiceChip(
                  label: Text('${speed}x'),
                  selected: isSelected,
                  onSelected: (selected) {
                    widget.onSpeedChange(speed);
                    Navigator.pop(context);
                  },
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }
}

/// Transcript tab
class _TranscriptTab extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final transcriptLines = [
      _TranscriptLine(
          time: '0:00',
          text: 'Welcome to this lesson on State Management with Riverpod.'),
      _TranscriptLine(
          time: '0:15',
          text:
              'In this lesson, we\'ll learn how to manage application state effectively using Riverpod, a powerful and flexible state management solution for Flutter.'),
      _TranscriptLine(
          time: '0:35',
          text:
              'Riverpod is a complete rewrite of the Provider package, addressing many of its limitations while providing additional features.'),
      _TranscriptLine(
          time: '1:00',
          text:
              'Let\'s start by understanding the core concepts: providers, consumers, and notifiers.'),
      _TranscriptLine(
          time: '1:25',
          text:
              'A provider is a object that encapsulates a piece of state and allows listening to that state.'),
      _TranscriptLine(
          time: '1:50',
          text:
              'Unlike Provider, Riverpod is compile-safe and doesn\'t require a BuildContext to read providers.'),
    ];

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: transcriptLines.length,
      itemBuilder: (context, index) {
        final line = transcriptLines[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  line.time,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  line.text,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    height: 1.5,
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _TranscriptLine {
  final String time;
  final String text;

  _TranscriptLine({required this.time, required this.text});
}

/// Notes tab
class _NotesTab extends StatefulWidget {
  @override
  State<_NotesTab> createState() => _NotesTabState();
}

class _NotesTabState extends State<_NotesTab> {
  final _noteController = TextEditingController();
  List<_Note> _notes = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadNotes();
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _loadNotes() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final notesJson = prefs.getString('notes_demo_lesson') ?? '[]';
      final List<dynamic> decoded = jsonDecode(notesJson) as List<dynamic>;
      setState(() {
        _notes = decoded
            .map((json) => _Note.fromJson(json as Map<String, dynamic>))
            .toList();
        _isLoading = false;

        // Add default notes if empty (first time)
        if (_notes.isEmpty) {
          _notes = [
            _Note(time: '1:25', text: 'Provider encapsulates a piece of state'),
            _Note(
                time: '3:45',
                text: 'Remember: Use ref.watch for reactive rebuilds'),
          ];
          _saveNotes();
        }
      });
    } catch (e) {
      debugPrint('Error loading notes: $e');
      setState(() => _isLoading = false);
    }
  }

  Future<void> _saveNotes() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final encoded = jsonEncode(_notes.map((n) => n.toJson()).toList());
      await prefs.setString('notes_demo_lesson', encoded);
    } catch (e) {
      debugPrint('Error saving notes: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    return Column(
      children: [
        // Note input
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _noteController,
                  decoration: const InputDecoration(
                    hintText: 'Add a note at current timestamp...',
                    contentPadding:
                        EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  ),
                  onSubmitted: (_) => _addNote(),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filled(
                icon: const Icon(Icons.add),
                onPressed: _addNote,
              ),
            ],
          ),
        ),

        // Notes list
        Expanded(
          child: _notes.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.note_alt_outlined,
                        size: 48,
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'No notes yet',
                        style: theme.textTheme.titleMedium,
                      ),
                      Text(
                        'Add notes while watching the lesson',
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: _notes.length,
                  itemBuilder: (context, index) {
                    final note = _notes[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        leading: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.accent.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            note.time,
                            style: const TextStyle(
                              color: AppColors.accent,
                              fontWeight: FontWeight.w600,
                              fontSize: 12,
                            ),
                          ),
                        ),
                        title: Text(note.text),
                        trailing: IconButton(
                          icon: const Icon(Icons.delete_outline, size: 20),
                          onPressed: () {
                            setState(() {
                              _notes.removeAt(index);
                              _saveNotes();
                            });
                          },
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  void _addNote() {
    if (_noteController.text.isNotEmpty) {
      setState(() {
        _notes.add(_Note(time: '5:30', text: _noteController.text));
        _noteController.clear();
        _saveNotes();
      });
    }
  }
}

class _Note {
  final String time;
  final String text;

  _Note({required this.time, required this.text});

  Map<String, dynamic> toJson() => {
        'time': time,
        'text': text,
      };

  factory _Note.fromJson(Map<String, dynamic> json) {
    return _Note(
      time: json['time'] as String,
      text: json['text'] as String,
    );
  }
}

/// Discussion tab
class _DiscussionTab extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final discussions = [
      _Discussion(
        author: 'John D.',
        avatar: 'https://i.pravatar.cc/150?u=1',
        text: 'Great explanation! Can you also cover StateNotifier in detail?',
        timestamp: '2 hours ago',
        likes: 12,
        replies: 3,
      ),
      _Discussion(
        author: 'Sarah M.',
        avatar: 'https://i.pravatar.cc/150?u=2',
        text:
            'At 3:45, should we always use ref.watch or are there cases for ref.read?',
        timestamp: '5 hours ago',
        likes: 8,
        replies: 5,
      ),
    ];

    return Column(
      children: [
        // Ask question button
        Padding(
          padding: const EdgeInsets.all(16),
          child: SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              icon: const Icon(Icons.question_answer),
              label: const Text('Ask a Question'),
              onPressed: () {},
            ),
          ),
        ),

        // Discussions list
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: discussions.length,
            itemBuilder: (context, index) {
              final discussion = discussions[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          CircleAvatar(
                            radius: 16,
                            backgroundImage: NetworkImage(discussion.avatar),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            discussion.author,
                            style: theme.textTheme.titleSmall,
                          ),
                          const Spacer(),
                          Text(
                            discussion.timestamp,
                            style: theme.textTheme.labelSmall,
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(discussion.text),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          TextButton.icon(
                            icon: const Icon(Icons.thumb_up_outlined, size: 16),
                            label: Text('${discussion.likes}'),
                            onPressed: () {},
                          ),
                          TextButton.icon(
                            icon: const Icon(Icons.reply, size: 16),
                            label: Text('${discussion.replies} Replies'),
                            onPressed: () {},
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _Discussion {
  final String author;
  final String avatar;
  final String text;
  final String timestamp;
  final int likes;
  final int replies;

  _Discussion({
    required this.author,
    required this.avatar,
    required this.text,
    required this.timestamp,
    required this.likes,
    required this.replies,
  });
}

/// Lesson navigation bar
class _LessonNavigationBar extends StatelessWidget {
  final String courseId;
  final VoidCallback onPrevious;
  final VoidCallback onNext;
  final VoidCallback? onComplete;

  const _LessonNavigationBar({
    required this.courseId,
    required this.onPrevious,
    required this.onNext,
    this.onComplete,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        border: Border(
          top: BorderSide(color: theme.dividerColor),
        ),
      ),
      child: Row(
        children: [
          OutlinedButton.icon(
            icon: const Icon(Icons.arrow_back),
            label: const Text('Previous'),
            onPressed: onPrevious,
          ),
          const Spacer(),
          if (onComplete != null) ...[
            ElevatedButton.icon(
              icon: const Icon(Icons.check_circle_outline),
              label: const Text('Mark Complete'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green,
                foregroundColor: Colors.white,
              ),
              onPressed: onComplete,
            ),
            const SizedBox(width: 16),
          ],
          ElevatedButton.icon(
            icon: const Icon(Icons.arrow_forward),
            label: const Text('Next Lesson'),
            onPressed: onNext,
          ),
        ],
      ),
    );
  }
}

class _CodeTab extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    const codeSnippet = '''
final counterProvider = StateProvider<int>((ref) => 0);

class Counter extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(counterProvider);
    return Text('Count: \$count');
  }
}
''';

    return SelectionArea(
      contextMenuBuilder: (context, editableTextState) {
        return AdaptiveTextSelectionToolbar.buttonItems(
          anchors: editableTextState.contextMenuAnchors,
          buttonItems: [
            ...editableTextState.contextMenuButtonItems,
            /*
            ContextMenuButtonItem(
              onPressed: () {
                // TODO: Fix text extraction from SelectableRegionState
                // final selectedContent = editableTextState.getSelectedContent();
                // final selectedText = selectedContent?.plainText;
                
                // if (selectedText != null && selectedText.isNotEmpty) {
                //   _explainCode(context, ref, selectedText);
                // }
              },
              label: 'Explain Code',
            ),
            */
          ],
        );
      },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Example Code:',
              style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.grey[900],
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Text(
              codeSnippet,
              style: TextStyle(
                fontFamily: 'monospace',
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(height: 16),
          const Text(
              'Tip: Select any part of the code and click "Explain Code" in the context menu.',
              style: TextStyle(
                  color: Colors.grey,
                  fontSize: 12,
                  fontStyle: FontStyle.italic)),
        ],
      ),
    );
  }

  // ignore: unused_element
  Future<void> _explainCode(
      BuildContext context, WidgetRef ref, String code) async {
    // Show loading dialog
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => const Center(child: CircularProgressIndicator()),
    );

    try {
      final explanation =
          await ref.read(backendAiServiceProvider).explainCode(code);

      if (context.mounted) {
        Navigator.pop(context); // Close loading
        await showDialog<void>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('AI Explanation'),
            content: SingleChildScrollView(child: Text(explanation)),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Close'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        Navigator.pop(context);
        AppFeedback.showError(context, 'Error: $e');
      }
    }
  }
}
