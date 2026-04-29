import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:my_flutter_app/src/core/common_widgets/responsive_center.dart';
import 'package:my_flutter_app/src/core/theme/app_theme.dart';
import 'package:my_flutter_app/src/core/widgets/stats_badge.dart';
import 'package:my_flutter_app/src/features/auth/presentation/auth_controller.dart';
import 'package:my_flutter_app/src/features/courses/data/course_repository.dart';
import 'package:my_flutter_app/src/features/gamification/presentation/gamification_controller.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userAsync = ref.watch(authControllerProvider);

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        title: Text('My Profile',
            style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () => context.push('/settings'),
            tooltip: 'Settings',
          ),
        ],
      ),
      body: userAsync.when(
        data: (user) {
          if (user == null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.lock_outline, size: 64, color: Colors.grey),
                  const SizedBox(height: 16),
                  Text('Please log in to view profile',
                      style: GoogleFonts.outfit(fontSize: 18)),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: () => context.go('/login'),
                    child: const Text('Log In'),
                  ),
                ],
              ),
            );
          }

          final isGuest = user.role == 'guest';

          return ResponsiveCenter(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Guest Mode Banner
                if (isGuest)
                  Container(
                    margin: const EdgeInsets.only(bottom: 24),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppTheme.warningColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                          color: AppTheme.warningColor.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.info_outline,
                            color: AppTheme.warningColor),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Guest Mode',
                                style: GoogleFonts.outfit(
                                  fontWeight: FontWeight.bold,
                                  color: Colors.black87,
                                ),
                              ),
                              const SizedBox(height: 4),
                              const Text(
                                'Create an account to save progress.',
                                style: TextStyle(
                                    color: Colors.black54, fontSize: 13),
                              ),
                            ],
                          ),
                        ),
                        FilledButton(
                          onPressed: () => context.go('/register'),
                          style: FilledButton.styleFrom(
                            backgroundColor: AppTheme.warningColor,
                            foregroundColor: Colors.black,
                          ),
                          child: const Text('Sign Up'),
                        ),
                      ],
                    ),
                  ),

                // Profile Header
                Column(
                  children: [
                    Stack(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: Theme.of(context)
                                  .colorScheme
                                  .primary
                                  .withValues(alpha: 0.2),
                              width: 3,
                            ),
                          ),
                          child: CircleAvatar(
                            radius: 50,
                            backgroundColor:
                                Theme.of(context).colorScheme.primaryContainer,
                            child: Text(
                              user.username.isNotEmpty
                                  ? user.username[0].toUpperCase()
                                  : '?',
                              style: GoogleFonts.outfit(
                                fontSize: 40,
                                fontWeight: FontWeight.bold,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                            ),
                          ),
                        ),
                        if (isGuest)
                          Positioned(
                            bottom: 0,
                            right: 0,
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppTheme.warningColor,
                                borderRadius: BorderRadius.circular(12),
                                border:
                                    Border.all(color: Colors.white, width: 2),
                              ),
                              child: const Text('Guest',
                                  style: TextStyle(
                                      fontSize: 10,
                                      color: Colors.black,
                                      fontWeight: FontWeight.bold)),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      user.username,
                      style: GoogleFonts.outfit(
                          fontSize: 24, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      user.email,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            color: Theme.of(context).hintColor,
                          ),
                    ),
                    const SizedBox(height: 24),
                    OutlinedButton(
                      onPressed: () {
                        ref.read(authControllerProvider.notifier).logout();
                      },
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 32, vertical: 12),
                      ),
                      child: const Text('Log Out'),
                    ),
                  ],
                ),
                const SizedBox(height: 32),

                // Stats Grid
                Text('Overview',
                    style: GoogleFonts.outfit(
                        fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),

                Consumer(
                  builder: (context, ref, _) {
                    final gamification =
                        ref.watch(gamificationControllerProvider);
                    final enrolledCountAsync =
                        ref.watch(enrolledCoursesCountProvider);

                    return gamification.when(
                      data: (state) => GridView.count(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        crossAxisCount:
                            MediaQuery.of(context).size.width > 600 ? 4 : 2,
                        crossAxisSpacing: 16,
                        mainAxisSpacing: 16,
                        childAspectRatio: 1.4,
                        children: [
                          StatsBadge(
                            icon: Icons.book,
                            value: enrolledCountAsync.value?.toString() ?? '0',
                            label: 'Courses',
                          ),
                          StatsBadge(
                            icon: Icons.star,
                            value: '${state.xp?.totalXp ?? 0}',
                            label: 'XP Points',
                            iconColor: Colors.amber,
                          ),
                          StatsBadge(
                            icon: Icons.local_fire_department,
                            value: '${state.streak?.currentStreak ?? 0}',
                            label: 'Day Streak',
                            iconColor: Colors.orange,
                          ),
                          StatsBadge(
                            icon: Icons.leaderboard,
                            value: '#${state.xp?.level ?? 1}',
                            label: 'Level',
                            iconColor: Colors.purple,
                          ),
                        ],
                      ),
                      loading: () =>
                          const Center(child: CircularProgressIndicator()),
                      error: (_, __) => const SizedBox.shrink(),
                    );
                  },
                ),

                const SizedBox(height: 32),

                // Quick Actions
                Text('Quick Actions',
                    style: GoogleFonts.outfit(
                        fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                GridView.count(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount:
                      MediaQuery.of(context).size.width > 600 ? 4 : 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 2.2,
                  children: [
                    _QuickActionTile(
                      icon: Icons.school_outlined,
                      label: 'My Courses',
                      color: const Color(0xFF3B82F6),
                      onTap: () => context.push('/courses'),
                    ),
                    _QuickActionTile(
                      icon: Icons.bookmark_outline,
                      label: 'Bookmarks',
                      color: const Color(0xFF8B5CF6),
                      onTap: () => context.push('/downloads'),
                    ),
                    _QuickActionTile(
                      icon: Icons.verified_outlined,
                      label: 'Certificates',
                      color: const Color(0xFF10B981),
                      onTap: () => context.push('/learning-goals'),
                    ),
                    _QuickActionTile(
                      icon: Icons.support_agent_outlined,
                      label: 'Support',
                      color: const Color(0xFFF59E0B),
                      onTap: () => context.push('/support'),
                    ),
                  ],
                ),

                const SizedBox(height: 32),

                // Recent Activity
                Text('Recent Activity',
                    style: GoogleFonts.outfit(
                        fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                const _ActivityItem(
                  icon: Icons.play_circle_outline,
                  title: 'Continued "Flutter Masterclass"',
                  subtitle: 'Lesson 12 • 25 min ago',
                  color: Color(0xFF3B82F6),
                ),
                const SizedBox(height: 10),
                const _ActivityItem(
                  icon: Icons.check_circle_outline,
                  title: 'Completed Quiz: State Management',
                  subtitle: 'Score: 92% • 1h ago',
                  color: Color(0xFF10B981),
                ),
                const SizedBox(height: 10),
                const _ActivityItem(
                  icon: Icons.emoji_events_outlined,
                  title: 'Earned "Code Ninja" Badge',
                  subtitle: '+200 XP • 3h ago',
                  color: Colors.amber,
                ),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
      ),
    );
  }
}

class _QuickActionTile extends StatelessWidget {
  const _QuickActionTile({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: color.withValues(alpha: 0.1),
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(
            children: [
              Icon(icon, color: color, size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  label,
                  style: GoogleFonts.outfit(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ActivityItem extends StatelessWidget {
  const _ActivityItem({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
  });
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainer,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.outfit(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).hintColor,
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
