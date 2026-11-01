import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:my_flutter_app/src/features/ai/data/ai_repository.dart';
import 'package:speech_to_text/speech_to_text.dart';

enum VoiceTutorState { idle, listening, processing, speaking, error }

class VoiceTutorStateData {
  const VoiceTutorStateData({
    required this.status,
    this.textInput = '',
    this.textOutput = '',
    this.errorMessage,
  });

  final VoiceTutorState status;
  final String textInput;
  final String textOutput;
  final String? errorMessage;

  VoiceTutorStateData copyWith({
    VoiceTutorState? status,
    String? textInput,
    String? textOutput,
    String? errorMessage,
  }) {
    return VoiceTutorStateData(
      status: status ?? this.status,
      textInput: textInput ?? this.textInput,
      textOutput: textOutput ?? this.textOutput,
      errorMessage: errorMessage,
    );
  }
}

class VoiceTutorController extends AutoDisposeNotifier<VoiceTutorStateData> {
  late FlutterTts _flutterTts;
  late SpeechToText _speechToText;
  bool _isSttAvailable = false;

  @override
  VoiceTutorStateData build() {
    _initTts();
    _initStt();
    // Stop TTS when the provider is disposed
    ref.onDispose(() {
      _flutterTts.stop();
      _speechToText.cancel();
    });
    return const VoiceTutorStateData(status: VoiceTutorState.idle);
  }

  Future<void> _initTts() async {
    _flutterTts = FlutterTts();
    await _flutterTts.setLanguage('en-US');
    await _flutterTts.setPitch(1);
    await _flutterTts.setSpeechRate(0.5);
    _flutterTts.setCompletionHandler(() {
      state = state.copyWith(status: VoiceTutorState.idle);
    });
  }

  Future<void> _initStt() async {
    _speechToText = SpeechToText();
    try {
      _isSttAvailable = await _speechToText.initialize(
        onError: (e) => state = state.copyWith(
            status: VoiceTutorState.error, errorMessage: e.errorMsg),
      );
    } on Exception catch (e) {
      state = state.copyWith(
          status: VoiceTutorState.error, errorMessage: 'Mic init failed: $e');
    }
  }

  Future<void> startListening() async {
    if (!_isSttAvailable) {
      await _initStt();
      if (!_isSttAvailable) {
        state = state.copyWith(
            status: VoiceTutorState.error, errorMessage: 'Mic unavailable');
        return;
      }
    }

    state = state.copyWith(status: VoiceTutorState.listening, textInput: '');
    await _speechToText.listen(
      onResult: (result) {
        state = state.copyWith(textInput: result.recognizedWords);
        if (result.finalResult) {
          _processQuery(result.recognizedWords);
        }
      },
      listenFor: const Duration(seconds: 30),
      pauseFor: const Duration(seconds: 3),
      localeId: 'en_US',
    );
  }

  Future<void> stopListening() async {
    await _speechToText.stop();
    // If we have text, process it, otherwise go idle
    if (state.textInput.isNotEmpty &&
        state.status == VoiceTutorState.listening) {
      // logic handled by onResult finalResult usually, but manual stop works too
      if (state.status != VoiceTutorState.processing) {
        await _processQuery(state.textInput);
      }
    } else {
      state = state.copyWith(status: VoiceTutorState.idle);
    }
  }

  Future<void> _processQuery(String query) async {
    if (query.trim().isEmpty) {
      return;
    }

    state = state.copyWith(status: VoiceTutorState.processing);
    try {
      final repository = ref.read(aiRepositoryProvider);

      // Streaming Logic
      final fullAnswer = StringBuffer();

      final stream = repository.streamAskTutor('general_voice_chat', query);

      await for (final chunk in stream) {
        fullAnswer.write(chunk);
        state = state.copyWith(
          status: VoiceTutorState.speaking, // Processing/Speaking
          textOutput: fullAnswer.toString(),
        );
      }

      // Final Speak
      await _speak(fullAnswer.toString());
    } on Exception catch (e) {
      state = state.copyWith(
        status: VoiceTutorState.error,
        errorMessage: 'AI Processing failed: $e',
      );
    }
  }

  Future<void> _speak(String text) async {
    await _flutterTts.speak(text);
  }

  void reset() {
    _flutterTts.stop();
    _speechToText.stop();
    state = const VoiceTutorStateData(status: VoiceTutorState.idle);
  }
}

final voiceTutorControllerProvider =
    NotifierProvider.autoDispose<VoiceTutorController, VoiceTutorStateData>(
        VoiceTutorController.new);
