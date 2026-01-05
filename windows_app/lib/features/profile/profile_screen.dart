import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:learning_hub/core/theme/app_colors.dart';
import 'package:learning_hub/core/providers/gamification_provider.dart';
import '../../core/providers/analytics_provider.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/services/certificate_service.dart';
import 'package:image_picker/image_picker.dart';
import '../gamification/domain/entities/achievement.dart';
import 'profile_edit_dialog.dart';

/// Profile screen with user info, stats, and settings
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final size = MediaQuery.of(context).size;
    final isDesktop = size.width >= 1024;

    final gamificationState = ref.watch(gamificationProvider);
    final analyticsState = ref.watch(analyticsProvider);
    final certificateCount = ref.watch(certificateCountProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => context.push('/settings'),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.symmetric(
          horizontal: isDesktop ? size.width * 0.2 : 16,
          vertical: 16,
        ),
        child: Column(
          children: [
            // Profile Header
            const _ProfileHeader(),
            const SizedBox(height: 24),

            // Stats Card
            _StatsCard(
              gamificationState: gamificationState,
              analyticsState: analyticsState,
            ),
            const SizedBox(height: 24),

            // Achievements
            _AchievementsSection(
                unlockedAchievements: gamificationState.unlockedAchievements),
            const SizedBox(height: 24),

            // Menu Items
            _MenuItem(
              icon: Icons.person_outline,
              title: 'Edit Profile',
              onTap: () {
                showDialog(
                  context: context,
                  builder: (context) => const EditProfileDialog(),
                );
              },
            ),
            _MenuItem(
              icon: Icons.workspace_premium_outlined,
              title: 'Certificates',
              badge: certificateCount > 0 ? '$certificateCount' : null,
              onTap: () => context.push('/certificates'),
            ),
            _MenuItem(
              icon: Icons.payment_outlined,
              title: 'Payment Methods',
              onTap: () {},
            ),
            _MenuItem(
              icon: Icons.card_membership_outlined,
              title: 'Subscription',
              subtitle: 'Free Plan',
              onTap: () {},
            ),
            _MenuItem(
              icon: Icons.notifications_outlined,
              title: 'Notifications',
              onTap: () => context.push('/notifications'),
            ),
            _MenuItem(
              icon: Icons.help_outline,
              title: 'Help & Support',
              onTap: () {},
            ),
            _MenuItem(
              icon: Icons.privacy_tip_outlined,
              title: 'Privacy Policy',
              onTap: () {},
            ),
            const SizedBox(height: 16),

            // Logout Button
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                icon: const Icon(Icons.logout, color: AppColors.error),
                label: const Text('Sign Out',
                    style: TextStyle(color: AppColors.error)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppColors.error),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                onPressed: () {
                  showDialog(
                    context: context,
                    builder: (context) => AlertDialog(
                      title: const Text('Sign Out'),
                      content: const Text('Are you sure you want to sign out?'),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('Cancel'),
                        ),
                        TextButton(
                          onPressed: () async {
                            Navigator.pop(context);
                            // Call auth provider logout
                            await ref.read(authProvider.notifier).logout();
                            if (context.mounted) {
                              context.go('/login');
                            }
                          },
                          child: const Text('Sign Out',
                              style: TextStyle(color: AppColors.error)),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 32),

            // App Version
            Text(
              'LearningHub v1.0.0',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Profile header with avatar and name
class _ProfileHeader extends ConsumerWidget {
  const _ProfileHeader();

  Future<void> _pickImage(BuildContext context, WidgetRef ref) async {
    final picker = ImagePicker();
    final icon = await picker.pickImage(source: ImageSource.gallery);

    if (icon != null) {
      // In a real app, upload this file to storage -> get URL -> update profile
      // For now, we'll mock it or if on Web/Desktop, handle as bytes
      // Since backend is mocked, we can't upload.
      // We'll show a snackbar saying it's ready for upload.
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Profile picture upload (mock) successful!')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final currentUser = ref.watch(currentUserProvider);
    final userName = currentUser?.displayName ?? 'User';
    final userEmail = currentUser?.email ?? 'user@example.com';
    final avatarUrl =
        currentUser?.avatarUrl ?? 'https://i.pravatar.cc/200?u=user';
    final isPremium = currentUser?.role != null;

    return Column(
      children: [
        // Avatar with edit button
        Stack(
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: AppColors.primary,
                  width: 3,
                ),
              ),
              child: CircleAvatar(
                radius: 46,
                backgroundImage: NetworkImage(avatarUrl),
              ),
            ),
            Positioned(
              bottom: 0,
              right: 0,
              child: InkWell(
                onTap: () => _pickImage(context, ref),
                child: Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: theme.colorScheme.surface,
                      width: 2,
                    ),
                  ),
                  child: const Icon(
                    Icons.camera_alt,
                    size: 16,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Name - now using real user data
        Text(
          userName,
          style: theme.textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 4),

        // Email - now using real user data
        Text(
          userEmail,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurfaceVariant, // Fixed null ref
          ),
        ),
        const SizedBox(height: 8),

        // Member badge
        if (isPremium)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.star, size: 14, color: AppColors.primary),
                const SizedBox(width: 4),
                Text(
                  'Premium Member',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

/// Learning stats card
class _StatsCard extends StatelessWidget {
  final GamificationState gamificationState;
  final AnalyticsState analyticsState;

  const _StatsCard({
    required this.gamificationState,
    required this.analyticsState,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Learning Statistics',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                    child: _StatItem(
                        value: '${analyticsState.completedCourses}',
                        label: 'Courses\nCompleted',
                        icon: Icons.check_circle_outline,
                        delay: 100)),
                Expanded(
                    child: _StatItem(
                        value: analyticsState.formattedTotalTime,
                        label: 'Total\nLearning',
                        icon: Icons.timer_outlined,
                        delay: 200)),
                Expanded(
                    child: _StatItem(
                        value: '${gamificationState.streak}',
                        label: 'Day\nStreak',
                        icon: Icons.local_fire_department,
                        delay: 300)),
                Expanded(
                    child: _StatItem(
                        value: '${gamificationState.totalXP}',
                        label: 'Total\nXP',
                        icon: Icons.star_outline,
                        delay: 400)),
              ],
            ),
          ],
        ),
      ),
    )
        .animate()
        .slideY(begin: 0.2, end: 0, duration: 400.ms, curve: Curves.easeOut);
  }
}

class _StatItem extends StatelessWidget {
  final String value;
  final String label;
  final IconData icon;
  final int delay;

  const _StatItem({
    required this.value,
    required this.label,
    required this.icon,
    this.delay = 0,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: AppColors.primary),
        ),
        const SizedBox(height: 8),
        Text(
          value,
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: theme.textTheme.labelSmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    )
        .animate()
        .scale(duration: 400.ms, delay: delay.ms, curve: Curves.easeOutBack);
  }
}

/// Achievements section
class _AchievementsSection extends StatelessWidget {
  final List<Achievement> unlockedAchievements;

  const _AchievementsSection({required this.unlockedAchievements});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    // Show last 4 or placeholders
    final displayList = unlockedAchievements.take(4).toList();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Achievements',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                TextButton(
                  onPressed: () => context.push('/achievements'),
                  child: const Text('See All'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (displayList.isEmpty)
              const Center(child: Text('No achievements yet. Keep learning!'))
            else
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: displayList
                    .map((a) => _AchievementBadge(achievement: a))
                    .toList(),
              ),
          ],
        ),
      ),
    );
  }
}

class _AchievementBadge extends StatelessWidget {
  final Achievement achievement;

  const _AchievementBadge({required this.achievement});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    // Parse icon string to IconData or use fallback
    // Since Achievement model has String icon (emoji), we render text
    // BUT the previous code used IconData. Let's adapt.
    // The Achievement model uses emojis currently.

    return Column(
      children: [
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.1),
            shape: BoxShape.circle,
            border: Border.all(
              color: AppColors.primary,
              width: 2,
            ),
          ),
          child: Center(
            child: Text(achievement.iconPath,
                style: const TextStyle(fontSize: 24)),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          achievement.title,
          style: theme.textTheme.labelSmall?.copyWith(
            color: theme.colorScheme.onSurface,
          ),
          textAlign: TextAlign.center,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }
}

/// Menu item widget
class _MenuItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final String? badge;
  final VoidCallback onTap;

  const _MenuItem({
    required this.icon,
    required this.title,
    this.subtitle,
    this.badge,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: theme.colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 20),
        ),
        title: Text(title),
        subtitle: subtitle != null ? Text(subtitle!) : null,
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (badge != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  badge!,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            const SizedBox(width: 8),
            const Icon(Icons.chevron_right),
          ],
        ),
        onTap: onTap,
      ),
    );
  }
}
