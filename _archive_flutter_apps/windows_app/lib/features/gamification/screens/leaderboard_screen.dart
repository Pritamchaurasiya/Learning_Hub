import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:confetti/confetti.dart';
import 'package:learning_hub/core/theme/app_colors.dart';
import 'package:learning_hub/core/providers/gamification_provider.dart';
import 'package:learning_hub/features/gamification/domain/entities/leaderboard_entry.dart';

/// Screen to display user leaderboard and current user's rank
class LeaderboardScreen extends ConsumerStatefulWidget {
  const LeaderboardScreen({super.key});

  @override
  ConsumerState<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends ConsumerState<LeaderboardScreen> {
  late ConfettiController _confettiController;

  @override
  void initState() {
    super.initState();
    _confettiController =
        ConfettiController(duration: const Duration(seconds: 3));
    // Refresh leaderboard on load
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(gamificationProvider.notifier).refreshLeaderboard();
    });
  }

  @override
  void dispose() {
    _confettiController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final gamificationState = ref.watch(gamificationProvider);

    // Trigger confetti when data loads and user is #1
    ref.listen(gamificationProvider, (previous, next) {
      if (next.leaderboard.isNotEmpty) {
        final first = next.leaderboard[0];
        if (first.isCurrentUser &&
            !next.isLoading &&
            _confettiController.state != ConfettiControllerState.playing) {
          _confettiController.play();
        }
      }
    });

    return Scaffold(
      appBar: AppBar(
        title: const Text('Leaderboard'),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.read(gamificationProvider.notifier).refreshLeaderboard();
            },
          ),
        ],
      ),
      extendBodyBehindAppBar: true,
      body: Stack(
        children: [
          // Background Gradient
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  AppColors.primary.withValues(alpha: 0.1),
                  theme.scaffoldBackgroundColor,
                ],
              ),
            ),
          ),

          SafeArea(
            child: gamificationState.isLoading
                ? const Center(child: CircularProgressIndicator())
                : gamificationState.leaderboard.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.leaderboard_outlined,
                                size: 64, color: Colors.grey),
                            const SizedBox(height: 16),
                            const Text(
                              'No leaderboard data available',
                              style:
                                  TextStyle(fontSize: 18, color: Colors.grey),
                            ),
                            const SizedBox(height: 8),
                            ElevatedButton(
                                onPressed: () {
                                  ref
                                      .read(gamificationProvider.notifier)
                                      .refreshLeaderboard();
                                },
                                child: const Text('Retry'))
                          ],
                        ),
                      )
                    : Center(
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 800),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              // Top 3 Podium
                              if (gamificationState.leaderboard.isNotEmpty)
                                _buildPodium(
                                    gamificationState.leaderboard, theme),

                              const SizedBox(height: 24),

                              // List of other players
                              Expanded(
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: theme.colorScheme.surface,
                                    borderRadius: const BorderRadius.vertical(
                                        top: Radius.circular(24)),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black
                                            .withValues(alpha: 0.05),
                                        blurRadius: 10,
                                        offset: const Offset(0, -5),
                                      ),
                                    ],
                                  ),
                                  child: ClipRRect(
                                    borderRadius: const BorderRadius.vertical(
                                        top: Radius.circular(24)),
                                    child: ListView.builder(
                                      padding: const EdgeInsets.all(16),
                                      itemCount:
                                          gamificationState.leaderboard.length >
                                                  3
                                              ? gamificationState
                                                      .leaderboard.length -
                                                  3
                                              : 0,
                                      itemBuilder: (context, index) {
                                        // Offset by 3 to skip podium
                                        final entry = gamificationState
                                            .leaderboard[index + 3];
                                        return _LeaderboardListItem(
                                                entry: entry)
                                            .animate()
                                            .fadeIn(
                                                delay: Duration(
                                                    milliseconds: 50 * index))
                                            .slideY(begin: 0.1, end: 0);
                                      },
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
          ),

          Align(
            alignment: Alignment.topCenter,
            child: ConfettiWidget(
              confettiController: _confettiController,
              blastDirectionality: BlastDirectionality.explosive,
              shouldLoop: false,
              colors: const [
                Colors.green,
                Colors.blue,
                Colors.pink,
                Colors.orange,
                Colors.purple
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPodium(List<LeaderboardEntry> entries, ThemeData theme) {
    if (entries.isEmpty) return const SizedBox.shrink();

    // Ensure we have at least 1, up to 3
    final first = entries[0];
    final second = entries.length > 1 ? entries[1] : null;
    final third = entries.length > 2 ? entries[2] : null;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // 2nd Place
          if (second != null)
            Expanded(
              child: _PodiumItem(
                entry: second,
                height: 140,
                color: Colors.grey.shade400,
                icon: Icons.filter_2,
                place: 2,
              ),
            ),
          // 1st Place (Center, larger)
          Expanded(
            flex: 2, // Give more space
            child: _PodiumItem(
              entry: first,
              height: 180,
              color: const Color(0xFFFFD700),
              icon: Icons.emoji_events,
              place: 1,
              isFirst: true,
            ),
          ),
          // 3rd Place
          if (third != null)
            Expanded(
              child: _PodiumItem(
                entry: third,
                height: 120,
                color: const Color(0xFFCD7F32),
                icon: Icons.filter_3,
                place: 3,
              ),
            ),
        ],
      ),
    );
  }
}

class _PodiumItem extends StatelessWidget {
  final LeaderboardEntry entry;
  final double height;
  final Color color;
  final IconData icon;
  final int place;
  final bool isFirst;

  const _PodiumItem({
    required this.entry,
    required this.height,
    required this.color,
    required this.icon,
    required this.place,
    this.isFirst = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        // Avatar
        Stack(
          children: [
            Container(
              decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: color, width: 4),
                  boxShadow: [
                    if (isFirst)
                      BoxShadow(
                          color: color.withValues(alpha: 0.5), blurRadius: 20)
                  ]),
              child: CircleAvatar(
                radius: isFirst ? 40 : 30,
                backgroundImage: NetworkImage(entry.avatarUrl),
                onBackgroundImageError: (_, __) => {}, // Handle error
                child: entry.avatarUrl.isEmpty
                    ? Text(entry.displayName[0].toUpperCase())
                    : null,
              ),
            ),
            if (isFirst)
              Positioned(
                top: -10,
                right: -10,
                child: Icon(Icons.workspace_premium, color: color, size: 30)
                    .animate(onPlay: (loop) => loop.repeat(reverse: true))
                    .scale(
                        begin: const Offset(1, 1), end: const Offset(1.2, 1.2)),
              ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          entry.displayName,
          style: theme.textTheme.labelMedium
              ?.copyWith(fontWeight: FontWeight.bold),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        Text(
          '${entry.xp} XP',
          style: theme.textTheme.labelSmall
              ?.copyWith(color: theme.colorScheme.primary),
        ),
        const SizedBox(height: 8),
        // Pedestal
        Container(
          height: height,
          width: double.infinity,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.2),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            border: Border(
              top: BorderSide(color: color, width: 4),
              left: BorderSide(color: color.withValues(alpha: 0.5)),
              right: BorderSide(color: color.withValues(alpha: 0.5)),
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: color, size: 32),
              if (isFirst)
                Text('WINNER',
                    style: TextStyle(
                        color: color,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.5))
            ],
          ),
        ),
      ],
    ).animate().fadeIn().scale(alignment: Alignment.bottomCenter);
  }
}

class _LeaderboardListItem extends StatelessWidget {
  final LeaderboardEntry entry;

  const _LeaderboardListItem({required this.entry});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: entry.isCurrentUser
            ? AppColors.primary.withValues(alpha: 0.1)
            : theme.cardColor,
        borderRadius: BorderRadius.circular(12),
        border:
            entry.isCurrentUser ? Border.all(color: AppColors.primary) : null,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ListTile(
        leading: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 30,
              child: Text(
                '#${entry.rank}',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Colors.grey,
                ),
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(width: 8),
            CircleAvatar(
              backgroundImage: NetworkImage(entry.avatarUrl),
              onBackgroundImageError: (_, __) => {},
              child: entry.avatarUrl.isEmpty
                  ? Text(entry.displayName[0].toUpperCase())
                  : null,
            ),
          ],
        ),
        title: Text(
          entry.displayName,
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight:
                entry.isCurrentUser ? FontWeight.bold : FontWeight.normal,
          ),
        ),
        subtitle: entry.isCurrentUser
            ? const Text('You',
                style: TextStyle(color: AppColors.primary, fontSize: 10))
            : null,
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            '${entry.xp} XP',
            style: theme.textTheme.labelMedium?.copyWith(
              color: AppColors.primary,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}
