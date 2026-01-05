// ignore_for_file: unused_result
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:my_flutter_app/src/features/gamification/domain/gamification_models.dart';
import 'package:my_flutter_app/src/features/gamification/presentation/gamification_controller.dart';
import 'package:my_flutter_app/src/features/gamification/presentation/widgets/gamification_widgets.dart';

class LeaderboardScreen extends ConsumerWidget {
  const LeaderboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final leaderboardAsync = ref.watch(leaderboardProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: Text(
          'Leaderboard',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
          ),
        ),
        child: Column(
          children: [
            // User Stats Section
            Consumer(
              builder: (context, ref, child) {
                final gameState = ref.watch(gamificationControllerProvider);
                return gameState.when(
                  data: (state) => Padding(
                    padding: const EdgeInsets.all(16),
                    child: XPBadgeWidget(
                      xp: state.xp ??
                          const UserXP(totalXp: 0, level: 1, weeklyXp: 0),
                      streak: state.streak,
                    ),
                  ),
                  loading: () => const SizedBox.shrink(),
                  error: (err, stack) => const SizedBox.shrink(),
                );
              },
            ),

            // Leaderboard List
            Expanded(
              child: leaderboardAsync.when(
                data: (players) => RefreshIndicator(
                  onRefresh: () async {
                    ref
                      ..refresh(leaderboardProvider)
                      ..refresh(gamificationControllerProvider);
                  },
                  child: ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    itemCount: players.length,
                    itemBuilder: (context, index) {
                      // Optimization: Cap animation delay to prevent long waits for items deep in the list
                      // using modulo ensures a staggering effect that resets every 10 items.
                      return LeaderboardTile(entry: players[index])
                          .animate(delay: (50 * (index % 10)).ms)
                          .slideX(begin: 0.2)
                          .fadeIn();
                    },
                  ),
                ),
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (err, stack) => Center(
                  child: Text(
                    'Error: $err',
                    style: const TextStyle(color: Colors.white),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
