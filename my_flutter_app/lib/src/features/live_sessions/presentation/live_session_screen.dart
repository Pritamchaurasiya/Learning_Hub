import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:my_flutter_app/src/features/live_sessions/presentation/live_session_controller.dart';

class LiveSessionScreen extends ConsumerWidget {
  const LiveSessionScreen({super.key, required this.sessionId});
  final String sessionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(liveSessionControllerProvider(sessionId));

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
        title: Text('Live Quiz',
            style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        centerTitle: true,
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFF59E0B), Color(0xFFEF4444)],
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFFF59E0B).withValues(alpha: 0.4),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.emoji_events, size: 16, color: Colors.white),
                const SizedBox(width: 6),
                Text(
                  '${state.score} pts',
                  style: GoogleFonts.outfit(
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 500),
          transitionBuilder: (child, animation) {
            return FadeTransition(
              opacity: animation,
              child: SlideTransition(
                position: Tween<Offset>(
                  begin: const Offset(0, 0.05),
                  end: Offset.zero,
                ).animate(animation),
                child: child,
              ),
            );
          },
          child: _buildBody(state, context, ref),
        ),
      ),
    );
  }

  Widget _buildBody(GameState state, BuildContext context, WidgetRef ref) {
    switch (state.phase) {
      case GamePhase.lobby:
        return Center(
          key: const ValueKey('lobby'),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF3B82F6).withValues(alpha: 0.2),
                      blurRadius: 30,
                    ),
                  ],
                ),
                child: const CircularProgressIndicator(
                  color: Color(0xFF3B82F6),
                  strokeWidth: 3,
                ),
              )
                  .animate(onPlay: (c) => c.repeat())
                  .shimmer(duration: 2.seconds, color: const Color(0xFF3B82F6)),
              const SizedBox(height: 32),
              Text(
                'Waiting for Host',
                style: GoogleFonts.outfit(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ).animate().fadeIn(delay: 300.ms),
              const SizedBox(height: 8),
              Text(
                'The quiz will begin shortly...',
                style: GoogleFonts.outfit(
                  fontSize: 14,
                  color: Colors.white54,
                ),
              ).animate().fadeIn(delay: 500.ms),
              const SizedBox(height: 32),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                      color: const Color(0xFF10B981).withValues(alpha: 0.3)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: Color(0xFF10B981),
                        shape: BoxShape.circle,
                      ),
                    )
                        .animate(onPlay: (c) => c.repeat())
                        .fadeIn()
                        .then()
                        .fadeOut(),
                    const SizedBox(width: 8),
                    Text('Connected',
                        style: GoogleFonts.outfit(
                            color: const Color(0xFF10B981), fontSize: 13)),
                  ],
                ),
              ).animate().fadeIn(delay: 700.ms),
            ],
          ),
        );

      case GamePhase.question:
        final q = state.currentQuestion!;
        final options = (q['options'] as List<dynamic>?) ?? [];
        return Padding(
          key: const ValueKey('question'),
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Question card
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white10),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF3B82F6).withValues(alpha: 0.1),
                      blurRadius: 20,
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFF3B82F6).withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        'QUESTION',
                        style: GoogleFonts.outfit(
                            fontSize: 11,
                            color: const Color(0xFF3B82F6),
                            fontWeight: FontWeight.w600,
                            letterSpacing: 1.2),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      q['text']?.toString() ?? 'Unknown Question',
                      style: GoogleFonts.outfit(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        height: 1.4,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ).animate().fadeIn().scale(begin: const Offset(0.95, 0.95)),
              const SizedBox(height: 28),
              // Answer options
              ...options.asMap().entries.map((entry) {
                final idx = entry.key;
                final opt = entry.value;
                final colors = [
                  const Color(0xFF3B82F6),
                  const Color(0xFF10B981),
                  const Color(0xFFF59E0B),
                  const Color(0xFFEF4444),
                ];
                final color = colors[idx % colors.length];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () {
                        ref
                            .read(liveSessionControllerProvider(sessionId)
                                .notifier)
                            .submitAnswer(opt.toString());
                      },
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(16),
                          border:
                              Border.all(color: color.withValues(alpha: 0.3)),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                color: color.withValues(alpha: 0.2),
                                shape: BoxShape.circle,
                              ),
                              child: Center(
                                child: Text(
                                  String.fromCharCode(65 + idx),
                                  style: GoogleFonts.outfit(
                                    fontWeight: FontWeight.bold,
                                    color: color,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Text(
                                opt.toString(),
                                style: GoogleFonts.outfit(
                                  fontSize: 16,
                                  color: Colors.white,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ).animate().fadeIn(delay: (150 * idx).ms).slideX(begin: 0.08);
              }),
            ],
          ),
        );

      case GamePhase.leaderboard:
        return Padding(
          key: const ValueKey('leaderboard'),
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              const SizedBox(height: 16),
              Text('🏆 Leaderboard',
                      style: GoogleFonts.outfit(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Colors.white))
                  .animate()
                  .fadeIn()
                  .scale(),
              const SizedBox(height: 24),
              Expanded(
                child: ListView.separated(
                  itemCount: state.leaderboard.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final entry =
                        state.leaderboard[index] as Map<String, dynamic>;
                    final isTop3 = index < 3;
                    final medals = ['🥇', '🥈', '🥉'];
                    return Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isTop3
                              ? const Color(0xFFF59E0B).withValues(alpha: 0.3)
                              : Colors.white10,
                        ),
                      ),
                      child: Row(
                        children: [
                          Text(
                            isTop3 ? medals[index] : '#${index + 1}',
                            style: GoogleFonts.outfit(
                                fontSize: isTop3 ? 24 : 16,
                                color: Colors.white54),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Text(
                              (entry['username'] as String?) ?? 'User',
                              style: GoogleFonts.outfit(
                                color: Colors.white,
                                fontWeight:
                                    isTop3 ? FontWeight.bold : FontWeight.w500,
                                fontSize: isTop3 ? 16 : 14,
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: isTop3
                                  ? const Color(0xFFF59E0B)
                                      .withValues(alpha: 0.15)
                                  : Colors.white10,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '${entry['score'] as int? ?? 0} pts',
                              style: GoogleFonts.outfit(
                                fontWeight: FontWeight.bold,
                                color: isTop3
                                    ? const Color(0xFFF59E0B)
                                    : Colors.white54,
                              ),
                            ),
                          ),
                        ],
                      ),
                    )
                        .animate()
                        .fadeIn(delay: (100 * index).ms)
                        .slideX(begin: 0.05);
                  },
                ),
              ),
            ],
          ),
        );

      default:
        return Center(
          key: const ValueKey('loading'),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const CircularProgressIndicator(color: Color(0xFF3B82F6)),
              const SizedBox(height: 16),
              Text('Loading...',
                  style: GoogleFonts.outfit(color: Colors.white54)),
            ],
          ),
        );
    }
  }
}
