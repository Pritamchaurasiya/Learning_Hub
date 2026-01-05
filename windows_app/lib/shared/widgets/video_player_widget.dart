import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:video_player/video_player.dart';
import 'dart:async';
import 'package:universal_io/io.dart';
import 'package:learning_hub/core/theme/app_colors.dart';

/// Custom video player widget with controls
class VideoPlayerWidget extends StatefulWidget {
  final String? videoUrl;
  final double? aspectRatio;
  final bool isFullscreen;
  final VoidCallback? onFullscreenToggle;
  final ValueChanged<double>? onPositionChanged;
  final ValueChanged<double>? onSpeedChanged;
  final ValueChanged<double>? onSpeedChange;
  final double initialPosition;

  const VideoPlayerWidget({
    super.key,
    this.videoUrl,
    this.aspectRatio = 16 / 9,
    this.isFullscreen = false,
    this.onFullscreenToggle,
    this.onPositionChanged,
    this.onSpeedChanged,
    this.onSpeedChange,
    this.onCompleted,
    this.initialPosition = 0.0,
  });

  final VoidCallback? onCompleted;

  @override
  State<VideoPlayerWidget> createState() => _VideoPlayerWidgetState();
}

class _VideoPlayerWidgetState extends State<VideoPlayerWidget>
    with SingleTickerProviderStateMixin {
  VideoPlayerController? _controller;
  bool _isInitialized = false;
  bool _showControls = true;
  Timer? _hideControlsTimer;
  late AnimationController _animationController;
  // Local state for playback speed to avoid unnecessary stream lookups
  double _playbackSpeed = 1.0;
  double _volume = 1.0;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _initializeController();
  }

  @override
  void dispose() {
    _animationController.dispose();
    _hideControlsTimer?.cancel();
    _controller?.removeListener(_onVideoUpdate);
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _initializeController() async {
    if (widget.videoUrl == null) return;

    try {
      final uri = Uri.parse(widget.videoUrl!);
      final VideoPlayerController controller;

      if (kIsWeb || uri.scheme == 'http' || uri.scheme == 'https') {
        controller = VideoPlayerController.networkUrl(uri);
      } else {
        controller = VideoPlayerController.file(File(widget.videoUrl!));
      }

      await controller.initialize();
      controller.addListener(_onVideoUpdate);

      if (!mounted) return;

      setState(() {
        _controller = controller;
        _isInitialized = true;
      });

      if (widget.initialPosition > 0) {
        await controller
            .seekTo(Duration(seconds: widget.initialPosition.toInt()));
      }

      _startHideControlsTimer();
    } catch (e) {
      if (kDebugMode) {
        debugPrint('Error initializing video player: $e');
      }
    }
  }

  void _onVideoUpdate() {
    if (_controller == null || !_controller!.value.isInitialized) return;

    final value = _controller!.value;

    // Check completion
    if (value.position >= value.duration && value.duration.inSeconds > 0) {
      widget.onCompleted?.call();
    }

    widget.onPositionChanged?.call(value.position.inSeconds.toDouble());
  }

  void _startHideControlsTimer() {
    _hideControlsTimer?.cancel();
    _hideControlsTimer = Timer(const Duration(seconds: 3), () {
      if (mounted && _controller != null && _controller!.value.isPlaying) {
        setState(() => _showControls = false);
        _animationController.reverse();
      }
    });
  }

  void _toggleControls() {
    setState(() {
      _showControls = !_showControls;
      if (_showControls) {
        _animationController.forward();
        _startHideControlsTimer();
      } else {
        _animationController.reverse();
        _hideControlsTimer?.cancel();
      }
    });
  }

  void _togglePlayPause() async {
    if (_controller == null) return;

    if (_controller!.value.isPlaying) {
      await _controller!.pause();
      // Keep controls visible when paused
      _hideControlsTimer?.cancel();
    } else {
      await _controller!.play();
      _startHideControlsTimer();
    }
    // No setState needed, ValueListenableBuilder will handle icon update
  }

  void _seekTo(double seconds) async {
    if (_controller == null) return;
    await _controller!.seekTo(Duration(seconds: seconds.toInt()));
  }

  void _changePlaybackSpeed(double speed) async {
    if (_controller == null) return;
    await _controller!.setPlaybackSpeed(speed);
    setState(() => _playbackSpeed = speed); // Update local state for UI
    widget.onSpeedChanged?.call(speed);
    widget.onSpeedChange?.call(speed);
  }

  void _setVolume(double value) {
    setState(() {
      _volume = value;
    });
    _controller?.setVolume(value);
  }

  void _toggleMute() {
    _setVolume(_volume > 0 ? 0 : 1.0);
  }

  String _formatTime(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    final minutes = twoDigits(duration.inMinutes.remainder(60));
    final seconds = twoDigits(duration.inSeconds.remainder(60));
    return '$minutes:$seconds';
  }

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio:
          widget.aspectRatio ?? (_controller?.value.aspectRatio ?? 16 / 9),
      child: MouseRegion(
        onEnter: (_) {
          setState(() {
            _showControls = true;
            _animationController.forward();
          });
          _startHideControlsTimer();
        },
        onHover: (_) {
          if (!_showControls) {
            setState(() {
              _showControls = true;
              _animationController.forward();
            });
          }
          _startHideControlsTimer();
        },
        child: GestureDetector(
          onTap: _toggleControls,
          child: Stack(
            fit: StackFit.expand,
            children: [
              _buildVideoContent(),
              if (!_isInitialized && widget.videoUrl != null)
                const Center(child: CircularProgressIndicator()),
              if (_showControls && _isInitialized)
                AnimatedBuilder(
                  animation: _animationController,
                  builder: (context, child) => Opacity(
                    opacity: _animationController.value,
                    child: _buildControlsOverlay(),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildVideoContent() {
    if (!_isInitialized || _controller == null) {
      return Container(
        color: Colors.black87,
        child: const Center(
          child: Icon(Icons.videocam_off, color: Colors.white54, size: 64),
        ),
      );
    }
    return VideoPlayer(_controller!);
  }

  // Optimized controls overlay using ValueListenableBuilder
  Widget _buildControlsOverlay() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Colors.black54, Colors.transparent, Colors.black54],
          stops: [0.0, 0.5, 1.0],
        ),
      ),
      child: Column(
        children: [
          // Top Bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.arrow_back, color: Colors.white),
                  onPressed: widget.onFullscreenToggle,
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.settings, color: Colors.white),
                  onPressed: () => _showSettingsSheet(context),
                ),
              ],
            ),
          ),

          const Spacer(),

          // Center Play/Pause
          ValueListenableBuilder(
            valueListenable: _controller!,
            builder: (context, VideoPlayerValue value, child) {
              return Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconButton(
                    icon: const Icon(Icons.replay_10,
                        color: Colors.white, size: 32),
                    onPressed: () {
                      final pos = value.position.inSeconds;
                      _seekTo((pos - 10).toDouble());
                    },
                  ),
                  const SizedBox(width: 24),
                  IconButton(
                    icon: Icon(
                      value.isPlaying ? Icons.pause : Icons.play_arrow,
                      color: Colors.white,
                      size: 48,
                    ),
                    onPressed: _togglePlayPause,
                  ),
                  const SizedBox(width: 24),
                  IconButton(
                    icon: const Icon(Icons.forward_10,
                        color: Colors.white, size: 32),
                    onPressed: () {
                      final pos = value.position.inSeconds;
                      _seekTo((pos + 10).toDouble());
                    },
                  ),
                ],
              );
            },
          ),

          const Spacer(),

          // Bottom Bar (Progress)
          ValueListenableBuilder(
            valueListenable: _controller!,
            builder: (context, VideoPlayerValue value, child) {
              final position = value.position;
              final duration = value.duration;

              return Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Text(
                          _formatTime(position),
                          style: const TextStyle(
                              color: Colors.white, fontSize: 12),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: SliderTheme(
                            data: SliderTheme.of(context).copyWith(
                              activeTrackColor: AppColors.primary,
                              thumbColor: AppColors.primary,
                              trackHeight: 4,
                              thumbShape: const RoundSliderThumbShape(
                                  enabledThumbRadius: 6),
                            ),
                            child: Slider(
                              value: position.inSeconds
                                  .toDouble()
                                  .clamp(0.0, duration.inSeconds.toDouble()),
                              min: 0.0,
                              max: duration.inSeconds.toDouble(),
                              onChanged: (v) => _seekTo(v),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          _formatTime(duration),
                          style: const TextStyle(
                              color: Colors.white, fontSize: 12),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    // Check bottom row actions
                    Row(
                      children: [
                        TextButton(
                          onPressed: () => _showSpeedSheet(context),
                          child: Text('${_playbackSpeed}x',
                              style: const TextStyle(color: Colors.white)),
                        ),
                        const SizedBox(width: 16),
                        // Volume Control
                        Row(
                          children: [
                            IconButton(
                              icon: Icon(
                                _volume == 0
                                    ? Icons.volume_off
                                    : Icons.volume_up,
                                color: Colors.white,
                              ),
                              onPressed: _toggleMute,
                            ),
                            SizedBox(
                              width: 80,
                              child: SliderTheme(
                                data: SliderTheme.of(context).copyWith(
                                  activeTrackColor: Colors.white,
                                  thumbColor: Colors.white,
                                  thumbShape: const RoundSliderThumbShape(
                                      enabledThumbRadius: 6),
                                  trackHeight: 2,
                                ),
                                child: Slider(
                                  value: _volume,
                                  min: 0.0,
                                  max: 1.0,
                                  onChanged: _setVolume,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const Spacer(),
                        IconButton(
                          icon:
                              const Icon(Icons.fullscreen, color: Colors.white),
                          onPressed: widget.onFullscreenToggle,
                        ),
                      ],
                    )
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  void _showSettingsSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.speed),
              title: const Text('Playback Speed'),
              trailing: Text('${_playbackSpeed}x'),
              onTap: () {
                Navigator.pop(context);
                _showSpeedSheet(context);
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showSpeedSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Playback Speed',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              children: [0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((speed) {
                return ChoiceChip(
                  label: Text('${speed}x'),
                  selected: _playbackSpeed == speed,
                  onSelected: (selected) {
                    if (selected) {
                      _changePlaybackSpeed(speed);
                      Navigator.pop(context);
                    }
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
