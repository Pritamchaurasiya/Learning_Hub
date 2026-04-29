import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:my_flutter_app/src/features/analytics/data/analytics_repository.dart';
import 'package:my_flutter_app/src/features/courses/data/course_repository.dart';
import 'package:my_flutter_app/src/features/dashboard/presentation/widgets/learning_analytics_chart.dart';
import 'package:my_flutter_app/src/features/gamification/data/gamification_repository.dart';

class LearningGoalsScreen extends ConsumerWidget {
  const LearningGoalsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Watch required providers
    final gamificationStats = ref.watch(gamificationStatsProvider);
    final enrolledCoursesCount = ref.watch(enrolledCoursesCountProvider);
    final userAnalytics = ref.watch(userAnalyticsProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: Text(
          'My Learning Goals',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_active_outlined),
            onPressed: () => context.push('/notifications'),
          ),
          const SizedBox(width: 8),
          CircleAvatar(
            radius: 16,
            backgroundColor: const Color(0xFF3B82F6),
            child: Text(
              'U',
              style: GoogleFonts.outfit(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 12),
            ),
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 1. Streak Card (Hero Section)
                  gamificationStats.when(
                    data: (stats) {
                      final streak = ((stats['streak']
                                  as Map<String, dynamic>?)?['current'] as num?)
                              ?.toInt() ??
                          0;
                      final level = ((stats['xp']
                                  as Map<String, dynamic>?)?['level'] as num?)
                              ?.toInt() ??
                          1;
                      return _StreakCard(streak: streak, level: level)
                          .animate()
                          .fadeIn()
                          .slideY(begin: 0.1);
                    },
                    loading: () =>
                        const Center(child: CircularProgressIndicator()),
                    error: (e, st) => Center(child: Text('Error: $e')),
                  ),
                  const SizedBox(height: 16),

                  // 2. Quick Stat Grid
                  Row(
                    children: [
                      Expanded(
                          child: _QuickStatCard(
                              count: enrolledCoursesCount.maybeWhen(
                                  data: (count) => count.toString(),
                                  orElse: () => '-'),
                              label: 'Courses',
                              icon: Icons.school,
                              color: Colors.blueAccent)),
                      const SizedBox(width: 12),
                      Expanded(
                          child: _QuickStatCard(
                              count: userAnalytics.maybeWhen(
                                  data: (data) =>
                                      '${data.totalLearningHours.toStringAsFixed(1)}h',
                                  orElse: () => '-'),
                              label: 'Spent',
                              icon: Icons.timer,
                              color: Colors.purpleAccent)),
                      const SizedBox(width: 12),
                      Expanded(
                          child: _QuickStatCard(
                              count: gamificationStats.maybeWhen(
                                  data: (stats) =>
                                      (stats['badgeCount'] ?? 0).toString(),
                                  orElse: () => '-'),
                              label: 'Badges',
                              icon: Icons.verified,
                              color: Colors.greenAccent)),
                    ],
                  ).animate().fadeIn(delay: 100.ms).slideY(begin: 0.1),

                  const SizedBox(height: 24),

                  // 3. Activity Trends
                  Text('Activity Trends',
                      style: GoogleFonts.outfit(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.white)),
                  const SizedBox(height: 12),
                  const SizedBox(
                    height: 200,
                    child: LearningAnalyticsChart(),
                  ).animate().fadeIn(delay: 200.ms),

                  const SizedBox(height: 24),

                  // 4. Earned Badges
                  Text('Earned Badges',
                      style: GoogleFonts.outfit(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.white)),
                  const SizedBox(height: 12),
                  gamificationStats
                      .when(
                        data: (stats) {
                          final badges =
                              stats['badges'] as List<dynamic>? ?? [];
                          if (badges.isEmpty) {
                            return Container(
                              padding: const EdgeInsets.all(20),
                              decoration: BoxDecoration(
                                color: const Color(0xFF1E293B),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: Colors.white10),
                              ),
                              child: const Center(
                                child: Text(
                                    'Keep learning to earn your first badge!',
                                    style: TextStyle(color: Colors.white70)),
                              ),
                            );
                          }
                          return Column(
                            children: badges.map((badgeObj) {
                              final b =
                                  (badgeObj as Map<String, dynamic>)['badge']
                                      as Map<String, dynamic>;
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: _GoalCard(
                                  title:
                                      (b['name'] as String?) ?? 'Unknown Badge',
                                  priority: (b['description'] as String?) ?? '',
                                  progress: 1,
                                  icon: Icons.emoji_events,
                                  color: Colors.amber,
                                  badgeIcon: (b['icon'] as String?) ?? '🏅',
                                ),
                              );
                            }).toList(),
                          );
                        },
                        loading: () =>
                            const Center(child: CircularProgressIndicator()),
                        error: (e, st) =>
                            const Center(child: Text('Error loading badges')),
                      )
                      .animate()
                      .fadeIn(delay: 300.ms),

                  const SizedBox(height: 48),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StreakCard extends StatelessWidget {
  const _StreakCard({required this.streak, required this.level});
  final int streak;
  final int level;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white10),
        gradient: const LinearGradient(
          colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.local_fire_department,
                        color: Colors.orangeAccent),
                    const SizedBox(width: 8),
                    Text(
                      '$streak Day Streak!',
                      style: GoogleFonts.outfit(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.white),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  "You're on fire! Level $level achieved.",
                  style:
                      GoogleFonts.outfit(color: Colors.white70, fontSize: 13),
                ),
              ],
            ),
          ),
          // Circular Progress Indicator
          SizedBox(
            width: 60,
            height: 60,
            child: Stack(
              alignment: Alignment.center,
              children: [
                const CircularProgressIndicator(
                  value: 0.75,
                  strokeWidth: 6,
                  backgroundColor: Colors.white12,
                  valueColor: AlwaysStoppedAnimation(Colors.orangeAccent),
                ),
                Text(streak.toString(),
                    style: GoogleFonts.outfit(
                        fontWeight: FontWeight.bold, fontSize: 16)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _QuickStatCard extends StatelessWidget {
  const _QuickStatCard(
      {required this.count,
      required this.label,
      required this.icon,
      required this.color});
  final String count;
  final String label;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
                color: color.withAlpha(26), shape: BoxShape.circle),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(height: 12),
          Text(count,
              style: GoogleFonts.outfit(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Colors.white)),
          Text(label,
              style: GoogleFonts.outfit(color: Colors.white54, fontSize: 12)),
        ],
      ),
    );
  }
}

class _GoalCard extends StatelessWidget {
  const _GoalCard(
      {required this.title,
      required this.priority,
      required this.progress,
      required this.icon,
      required this.color,
      this.badgeIcon});
  final String title;
  final String priority;
  final double progress;
  final IconData icon;
  final Color color;
  final String? badgeIcon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white10),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
                color: color.withAlpha(26),
                borderRadius: BorderRadius.circular(12)),
            child: badgeIcon != null
                ? Text(badgeIcon!, style: const TextStyle(fontSize: 24))
                : Icon(icon, color: color, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: GoogleFonts.outfit(
                        fontWeight: FontWeight.bold, fontSize: 15)),
                const SizedBox(height: 4),
                Text(priority,
                    style: GoogleFonts.outfit(
                        color: Colors.white54, fontSize: 12)),
              ],
            ),
          ),
          const SizedBox(width: 12),
          const Icon(Icons.verified, color: Colors.greenAccent, size: 20),
        ],
      ),
    );
  }
}
