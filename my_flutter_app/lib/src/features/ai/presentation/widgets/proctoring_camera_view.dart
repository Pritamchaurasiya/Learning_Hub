import 'dart:async';

import 'package:camera/camera.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/core/network/api_client.dart';

// You might need to add camera: ^0.10.5 to pubspec.yaml

final proctoringProvider = StateProvider<bool>((ref) => false); // Is Flagged?

class ProctoringCameraView extends ConsumerStatefulWidget {
  const ProctoringCameraView({super.key});

  @override
  ConsumerState<ProctoringCameraView> createState() =>
      _ProctoringCameraViewState();
}

class _ProctoringCameraViewState extends ConsumerState<ProctoringCameraView> {
  CameraController? _controller;
  Timer? _timer;
  bool _isAnalyzing = false;
  String _statusMessage = 'Monitoring Active';

  @override
  void initState() {
    super.initState();
    _initCamera();
  }

  Future<void> _initCamera() async {
    final cameras = await availableCameras();
    // Get front camera
    final frontCam = cameras.firstWhere(
      (c) => c.lensDirection == CameraLensDirection.front,
      orElse: () => cameras.first,
    );

    _controller = CameraController(
      frontCam,
      ResolutionPreset.low, // Low res is fine for AI
      enableAudio: false,
    );

    await _controller!.initialize();
    if (mounted) {
      setState(() {});
      _startMonitoring();
    }
  }

  void _startMonitoring() {
    // Check every 15 seconds
    _timer = Timer.periodic(const Duration(seconds: 15), (timer) {
      _analyzeFrame();
    });
  }

  Future<void> _analyzeFrame() async {
    if (_controller == null ||
        !_controller!.value.isInitialized ||
        _isAnalyzing) {
      return;
    }

    _isAnalyzing = true;
    try {
      final image = await _controller!.takePicture();

      // Send to Backend
      final formData = FormData.fromMap({
        'image':
            await MultipartFile.fromFile(image.path, filename: 'frame.jpg'),
      });

      final response = await ref.read(apiClientProvider).post(
            '/ai/proctor/analyze/', // Ensure this matches URLs
            data: formData,
          );

      final data = response.data?['data'] as Map<String, dynamic>?;
      final flagged = (data?['flagged'] as bool?) ?? false;
      final reason = (data?['reason'] as String?) ?? 'Clear';

      if (mounted) {
        ref.read(proctoringProvider.notifier).state = flagged;
        setState(() {
          _statusMessage = flagged ? 'WARNING: $reason' : 'Exam Secure';
        });
      }
    } on Exception catch (e) {
      debugPrint('Proctor Error: $e');
    } finally {
      _isAnalyzing = false;
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_controller == null || !_controller!.value.isInitialized) {
      return const SizedBox(width: 100, height: 100, child: Placeholder());
    }

    final isFlagged = ref.watch(proctoringProvider);

    return Container(
      width: 150,
      height: 200,
      decoration: BoxDecoration(
        border: Border.all(
          color: isFlagged ? Colors.red : Colors.green,
          width: 4,
        ),
        borderRadius: BorderRadius.circular(12),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: Stack(
          alignment: Alignment.bottomCenter,
          children: [
            CameraPreview(_controller!),
            Container(
              width: double.infinity,
              color: isFlagged
                  ? Colors.red.withValues(alpha: 0.8)
                  : Colors.black54,
              padding: const EdgeInsets.all(4),
              child: Text(
                _statusMessage,
                style: const TextStyle(color: Colors.white, fontSize: 10),
                textAlign: TextAlign.center,
              ),
            )
          ],
        ),
      ),
    );
  }
}
