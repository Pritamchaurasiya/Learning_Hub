import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';

class VoiceAssistantWidget extends StatefulWidget {
  const VoiceAssistantWidget({super.key});

  @override
  State<VoiceAssistantWidget> createState() => _VoiceAssistantWidgetState();
}

class _VoiceAssistantWidgetState extends State<VoiceAssistantWidget> {
  final AudioRecorder _audioRecorder = AudioRecorder();
  bool _isRecording = false;
  bool _isProcessing = false;
  String _aiResponse = 'Tap the mic to ask a question...';

  Future<void> _startRecording() async {
    try {
      if (await _audioRecorder.hasPermission()) {
        final appDocumentsDir = await getApplicationDocumentsDirectory();
        final filePath = '${appDocumentsDir.path}/recording.m4a';

        await _audioRecorder.start(const RecordConfig(), path: filePath);
        setState(() => _isRecording = true);
      }
    } on Exception catch (_) {
      // Error handling without logging in production
    }
  }

  Future<void> _stopRecording() async {
    try {
      final filePath = await _audioRecorder.stop();
      setState(() {
        _isRecording = false;
        _isProcessing = true;
      });

      if (filePath != null) {
        await _sendAudioToBackend(filePath);
      }
      // ... rest of the code
    } on Exception catch (_) {
      // Error handling without logging in production
    }
  }

  Future<void> _sendAudioToBackend(String filePath) async {
    // TODO: Implement Dio upload
    setState(() => _aiResponse = 'Thinking...');
    // Mock for now
    await Future<void>.delayed(const Duration(seconds: 2));
    setState(() {
      _aiResponse = 'I heard you! (Backend integration pending)';
      _isProcessing = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: Colors.black87,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white24)),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(_aiResponse,
              style: GoogleFonts.inter(color: Colors.white, fontSize: 16)),
          const SizedBox(height: 20),
          GestureDetector(
            onLongPress: _startRecording,
            onLongPressUp: _stopRecording,
            child: CircleAvatar(
              radius: 30,
              backgroundColor: _isRecording
                  ? Colors.redAccent
                  : _isProcessing
                      ? Colors.orangeAccent
                      : Colors.blueAccent,
              child: _isProcessing
                  ? const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2,
                      ),
                    )
                  : Icon(_isRecording ? Icons.mic : Icons.mic_none,
                      color: Colors.white, size: 30),
            ),
          ),
          const SizedBox(height: 10),
          Text(
              _isProcessing
                  ? 'Processing...'
                  : _isRecording
                      ? 'Global Listening...'
                      : 'Hold to Speak',
              style: const TextStyle(color: Colors.white54, fontSize: 12)),
        ],
      ),
    );
  }
}
