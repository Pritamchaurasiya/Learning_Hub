import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:my_flutter_app/src/features/gamification/domain/gamification_models.dart';

class XPBadgeWidget extends StatelessWidget {
  const XPBadgeWidget({
    super.key,
    required this.xp,
    this.streak,
  });
  final UserXP xp;
  final Streak? streak;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white24),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _StatItem(
            icon: Icons.auto_awesome,
            value: '${xp.totalXp} XP',
            color: Colors.amber,
          ),
          if (streak != null && streak!.currentStreak > 0) ...[
            const SizedBox(width: 16),
            _StatItem(
              icon: Icons.local_fire_department,
              value: '${streak!.currentStreak}',
              color: Colors.orange,
            ),
          ],
          const SizedBox(width: 16),
          _StatItem(
            icon: Icons.trending_up,
            value: 'Lvl ${xp.level}',
            color: Colors.blueAccent,
          ),
        ],
      ),
    ).animate().fadeIn().slideX(begin: 0.2);
  }
}

class _StatItem extends StatelessWidget {
  const _StatItem({
    required this.icon,
    required this.value,
    required this.color,
  });
  final IconData icon;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 20, color: color),
        const SizedBox(width: 4),
        Text(
          value,
          style: GoogleFonts.outfit(
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
      ],
    );
  }
}

class LeaderboardTile extends StatelessWidget {
  const LeaderboardTile({super.key, required this.entry});
  final Map<String, dynamic> entry;

  @override
  Widget build(BuildContext context) {
    final rank = entry['rank'] as int;
    final isTop3 = rank <= 3;

    final username = (entry['display_name'] ?? entry['username']).toString();
    final level = entry['level'];
    final xp = entry['total_xp'];

    return Semantics(
      label: 'Rank $rank, $username, Level $level, $xp XP',
      excludeSemantics: true,
      child: Card(
        margin: const EdgeInsets.only(bottom: 8),
        color: isTop3
            ? Colors.amber.withValues(alpha: 0.1)
            : Colors.white.withValues(alpha: 0.05),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: ListTile(
          leading: CircleAvatar(
            backgroundColor: _getRankColor(rank),
            child: Text(
              '$rank',
              style: const TextStyle(
                color: Colors.black87,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          title: Text(
            username,
            style: GoogleFonts.outfit(fontWeight: FontWeight.w600),
          ),
          subtitle: Text('Level $level'),
          trailing: Text(
            '$xp XP',
            style: GoogleFonts.outfit(
              fontWeight: FontWeight.bold,
              color: Colors.amber,
            ),
          ),
        ),
      ),
    );
  }

  Color _getRankColor(int rank) {
    switch (rank) {
      case 1:
        return Colors.amber;
      case 2:
        return const Color(0xFFC0C0C0); // Silver
      case 3:
        return const Color(0xFFCD7F32); // Bronze
      default:
        return Colors.white70;
    }
  }
}
