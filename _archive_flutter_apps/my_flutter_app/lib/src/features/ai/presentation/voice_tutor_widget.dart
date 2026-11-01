import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/features/ai/presentation/voice_tutor_controller.dart';

class VoiceTutorWidget extends ConsumerWidget {
  const VoiceTutorWidget({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(voiceTutorControllerProvider);
    final controller = ref.read(voiceTutorControllerProvider.notifier);

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color:
            Theme.of(context).scaffoldBackgroundColor.withValues(alpha: 0.95),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            blurRadius: 20,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag Handle
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 24),

          // Status & Visualization
          SizedBox(
            height: 120,
            child: Center(
              child: _buildVisualizer(state.status, context),
            ),
          ),
          const SizedBox(height: 24),

          // Transcript / Output text
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 300),
            child: Text(
              _getStatusText(state),
              key: ValueKey(state.status),
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: state.status == VoiceTutorState.error
                        ? Colors.red
                        : Theme.of(context).textTheme.bodyLarge?.color,
                    fontWeight: FontWeight.w500,
                  ),
            ),
          ),
          const SizedBox(height: 32),

          // Controls
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              FloatingActionButton.large(
                onPressed: () {
                  if (state.status == VoiceTutorState.listening) {
                    controller.stopListening();
                  } else {
                    controller.startListening();
                  }
                },
                backgroundColor: state.status == VoiceTutorState.listening
                    ? Colors.redAccent
                    : Theme.of(context).primaryColor,
                child: Icon(
                  state.status == VoiceTutorState.listening
                      ? Icons.stop
                      : Icons.mic,
                  size: 32,
                  color: Colors.white,
                ),
              )
                  .animate(
                      target: state.status == VoiceTutorState.listening ? 1 : 0)
                  .scale(
                      end: const Offset(1.1, 1.1),
                      duration: 500.ms,
                      curve: Curves.easeInOut)
                  .then()
                  .scale(end: const Offset(1, 1), duration: 500.ms),
            ],
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  String _getStatusText(VoiceTutorStateData state) {
    switch (state.status) {
      case VoiceTutorState.listening:
        return state.textInput.isEmpty ? 'Listening...' : state.textInput;
      case VoiceTutorState.processing:
        return 'Thinking...';
      case VoiceTutorState.speaking:
        return state.textOutput; // Show AI response
      case VoiceTutorState.error:
        return state.errorMessage ?? 'Something went wrong';
      case VoiceTutorState.idle:
        return 'Tap the mic to ask anything';
    }
  }

  Widget _buildVisualizer(VoiceTutorState status, BuildContext context) {
    if (status == VoiceTutorState.listening) {
      // Pulse Animation
      return Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: List.generate(5, (index) {
          return Container(
            margin: const EdgeInsets.symmetric(horizontal: 4),
            width: 8,
            height: 40,
            decoration: BoxDecoration(
              color: Theme.of(context).primaryColor,
              borderRadius: BorderRadius.circular(4),
            ),
          ).animate(onPlay: (c) => c.repeat(reverse: true)).scaleY(
                begin: 0.2,
                end: 1.5,
                duration: Duration(milliseconds: 300 + (index * 100)),
                curve: Curves.easeInOut,
              );
        }),
      );
    } else if (status == VoiceTutorState.processing) {
      // Rotating loading
      return const CircularProgressIndicator();
    } else if (status == VoiceTutorState.speaking) {
      // Waveform for speaking
      return Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: List.generate(5, (index) {
          return Container(
            margin: const EdgeInsets.symmetric(horizontal: 4),
            width: 8,
            height: 40,
            decoration: BoxDecoration(
              color: Colors.greenAccent,
              borderRadius: BorderRadius.circular(4),
            ),
          ).animate(onPlay: (c) => c.repeat(reverse: true)).scaleY(
                begin: 0.5,
                end: 1.2,
                duration: Duration(milliseconds: 200 + (index * 50)),
              );
        }),
      );
    }

    // Idle State - Static Icon or Logo
    return Icon(Icons.record_voice_over,
        size: 64, color: Colors.grey.withValues(alpha: 0.3));
  }
}
