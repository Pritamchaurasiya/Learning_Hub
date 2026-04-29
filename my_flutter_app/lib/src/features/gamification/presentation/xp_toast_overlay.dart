import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/features/gamification/data/social_websocket_service.dart';

class XPToastOverlay extends ConsumerStatefulWidget {
  const XPToastOverlay({super.key, required this.child});
  final Widget child;

  @override
  ConsumerState<XPToastOverlay> createState() => _XPToastOverlayState();
}

class _XPToastOverlayState extends ConsumerState<XPToastOverlay> {
  OverlayEntry? _overlayEntry;
  OverlayEntry? _confettiEntry;

  @override
  void dispose() {
    _overlayEntry?.remove();
    _confettiEntry?.remove();
    super.dispose();
  }

  void _showToast(int amount, String message) {
    _overlayEntry?.remove();
    _confettiEntry?.remove();

    // 1. Confetti Layer (Behind Toast)
    _confettiEntry = OverlayEntry(
      builder: (context) => Positioned.fill(
        child: IgnorePointer(
          child: Stack(
            children: List.generate(30, (index) {
              // Random positioning and delay for particle effect
              final alignX = (index % 10 - 5) * 0.2;
              return Align(
                alignment: Alignment(alignX, -1.2), // Start above screen
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: Colors.primaries[index % Colors.primaries.length],
                    shape: index.isEven ? BoxShape.circle : BoxShape.rectangle,
                  ),
                )
                    .animate()
                    .slideY(
                        begin: 0,
                        end: 5, // Fall down screen
                        duration: Duration(milliseconds: 1500 + (index * 50)),
                        curve: Curves.easeOutQuad)
                    .rotate(duration: 2.seconds)
                    .fadeOut(delay: 1.seconds),
              );
            }),
          ),
        ),
      ),
    );

    // 2. Toast Layer
    _overlayEntry = OverlayEntry(
      builder: (context) => Positioned(
        top: MediaQuery.of(context).padding.top + 16,
        left: 16,
        right: 16,
        child: Material(
          color: Colors.transparent,
          child: Align(
            alignment: Alignment.topCenter,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    const Color(0xFF2E3192).withValues(alpha: 0.95),
                    const Color(0xFF1BFFFF).withValues(alpha: 0.95),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF1BFFFF).withValues(alpha: 0.3),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                    spreadRadius: 2,
                  ),
                ],
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.2),
                  width: 1.5,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.auto_awesome,
                        color: Colors.white, size: 24),
                  )
                      .animate(onPlay: (controller) => controller.repeat())
                      .shimmer(duration: 2.seconds, color: Colors.amber)
                      .scale(
                          begin: const Offset(1, 1),
                          end: const Offset(1.2, 1.2),
                          duration: 500.ms),
                  const SizedBox(width: 16),
                  Flexible(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '+$amount XP GAINED!',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                            fontSize: 16,
                            letterSpacing: 1.2,
                            shadows: [
                              Shadow(
                                  color: Colors.black45,
                                  blurRadius: 2,
                                  offset: Offset(1, 1))
                            ],
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          message,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            height: 1.2,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            )
                .animate()
                .slideY(
                    begin: -1.5,
                    end: 0,
                    curve: Curves.elasticOut,
                    duration: 800.ms)
                .fade(duration: 400.ms)
                .then(delay: 3.seconds)
                .slideY(
                    begin: 0,
                    end: -1.5,
                    curve: Curves.easeInBack,
                    duration: 500.ms)
                .fade(begin: 1, end: 0),
          ),
        ),
      ),
    );

    Overlay.of(context).insert(_confettiEntry!);
    Overlay.of(context).insert(_overlayEntry!);
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(socialEventsProvider, (previous, next) {
      if (next.hasValue && next.value != null) {
        final data = next.value!;
        final type = data['type'];
        final payload = data['payload'] is Map<String, dynamic>
            ? data['payload']
            : <String, dynamic>{};

        if (type == 'xp_gained') {
          final payloadMap = payload as Map<String, dynamic>;
          final amount = (payloadMap['amount'] as num?)?.toInt() ?? 10;
          final reason = payloadMap['reason'] as String? ?? 'Keep it up!';
          _showToast(amount, reason);
        } else if (type == 'level_up') {
          final payloadMap = payload as Map<String, dynamic>;
          final level = (payloadMap['new_level'] as num?)?.toInt() ?? 2;
          _showToast(500, 'Reached Level $level!');
        } else if (type == 'badge_earned') {
          final payloadMap = payload as Map<String, dynamic>;
          final badgeName = payloadMap['badge_name'] as String? ?? 'New Badge';
          _showToast(100, 'Unlocked: $badgeName');
        }
      }
    });

    return widget.child;
  }
}
