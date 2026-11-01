import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:my_flutter_app/src/core/constants/api_constants.dart';
import 'package:my_flutter_app/src/core/network/api_client.dart';
import 'package:my_flutter_app/src/core/utils/file_importer.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:record/record.dart';

class VoiceAssistantButton extends ConsumerStatefulWidget {
  const VoiceAssistantButton({super.key});

  @override
  ConsumerState<VoiceAssistantButton> createState() =>
      _VoiceAssistantButtonState();
}

class _VoiceAssistantButtonState extends ConsumerState<VoiceAssistantButton>
    with SingleTickerProviderStateMixin {
  final AudioRecorder _audioRecorder = AudioRecorder();
  late AnimationController _controller;
  bool _isRecording = false;
  bool _isProcessing = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 1),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    _audioRecorder.dispose();
    super.dispose();
  }

  Future<void> _startRecording() async {
    try {
      if (await Permission.microphone.request().isGranted) {
        var filePath = '';

        if (!kIsWeb) {
          final appDocumentsDir = await getApplicationDocumentsDirectory();
          filePath = '${appDocumentsDir.path}/recording.m4a';

          // Check/Delete existing
          final file = File(filePath);
          // ignore: avoid_slow_async_io
          if (await file.exists()) {
            // ignore: avoid_slow_async_io
            await file.delete();
          }
        }

        await _audioRecorder.start(const RecordConfig(), path: filePath);
        setState(() => _isRecording = true);
      }
    } on Exception catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Mic Error: $e')));
      }
    }
  }

  Future<void> _stopRecording() async {
    if (!_isRecording) {
      return;
    }

    try {
      final filePath = await _audioRecorder.stop();
      setState(() {
        _isRecording = false;
        _isProcessing = true;
      });

      if (filePath != null) {
        await _sendAudio(filePath);
      }
    } on Exception catch (e) {
      debugPrint('Error stopping: $e');
    } finally {
      if (mounted) {
        setState(() => _isProcessing = false);
      }
    }
  }

  Future<void> _sendAudio(String filePath) async {
    try {
      final apiClient = ref.read(apiClientProvider);

      FormData formData;

      if (kIsWeb) {
        // Fetch the blob data logic for web
        final blobResponse = await Dio().get<List<int>>(filePath,
            options: Options(responseType: ResponseType.bytes));
        formData = FormData.fromMap({
          'audio': MultipartFile.fromBytes(blobResponse.data ?? [],
              filename: 'voice.m4a'),
        });
      } else {
        formData = FormData.fromMap({
          'audio':
              await MultipartFile.fromFile(filePath, filename: 'voice.m4a'),
        });
      }

      final response = await apiClient.post(
        ApiConstants.aiVoiceTranscribe,
        data: formData,
      );

      if (response.data != null) {
        final data = response.data!['data'] as Map<String, dynamic>?;
        if (mounted && data != null) {
          _showResponseDialog(
            (data['transcription'] as String?) ?? '',
            (data['ai_response'] as String?) ?? '',
          );
        }
      }
    } on Exception catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('AI Error: $e')));
      }
    }
  }

  void _showResponseDialog(String userText, String aiText) {
    showModalBottomSheet<void>(
        context: context,
        backgroundColor: Colors.black87,
        shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
        builder: (ctx) => Container(
            padding: const EdgeInsets.all(20),
            child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('You said:',
                      style: GoogleFonts.inter(
                          color: Colors.white54, fontSize: 12)),
                  Text(userText,
                      style:
                          GoogleFonts.inter(color: Colors.white, fontSize: 16)),
                  const SizedBox(height: 20),
                  Text('AI Tutor:',
                      style: GoogleFonts.inter(
                          color: Colors.blueAccent, fontSize: 12)),
                  Text(aiText,
                      style: GoogleFonts.outfit(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold)),
                  const SizedBox(height: 20),
                ])));
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onLongPress: _startRecording,
      onLongPressUp: _stopRecording,
      child: AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            return Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                  color: _isRecording ? Colors.redAccent : Colors.indigoAccent,
                  shape: BoxShape.circle,
                  boxShadow: _isRecording
                      ? [
                          BoxShadow(
                              color: Colors.redAccent.withValues(alpha: 0.5),
                              blurRadius: 10 * _controller.value,
                              spreadRadius: 5 * _controller.value)
                        ]
                      : []),
              child: _isProcessing
                  ? const SizedBox(
                      width: 28,
                      height: 28,
                      child: CircularProgressIndicator(
                          color: Colors.white, strokeWidth: 2))
                  : const Icon(Icons.mic, color: Colors.white, size: 28),
            );
          }),
    );
  }
}
