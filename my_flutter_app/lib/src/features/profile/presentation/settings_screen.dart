import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:my_flutter_app/src/features/auth/presentation/auth_controller.dart';
import 'package:my_flutter_app/src/features/gamification/presentation/gamification_controller.dart';
import 'package:my_flutter_app/src/features/profile/data/settings_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final user = ref.watch(authControllerProvider).asData?.value;
    final settingsAsync = ref.watch(settingsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 8),
        children: [
          // Account Section
          _buildSectionHeader('Account', theme),
          ListTile(
            leading: const Icon(Icons.person_outline),
            title: const Text('Edit Profile'),
            subtitle: Text(user?.email ?? 'Update your information'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Navigate to your profile to update details'),
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.security),
            title: const Text('Password & Security'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text(
                      'Use your account provider to manage security settings'),
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
          ),

          const Divider(height: 32),

          // Preferences Section
          _buildSectionHeader('Preferences', theme),
          settingsAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (err, _) => Center(child: Text('Error: $err')),
            data: (settings) => Column(
              children: [
                SwitchListTile(
                  secondary: const Icon(Icons.notifications_outlined),
                  title: const Text('Push Notifications'),
                  subtitle: const Text('Receive course updates and reminders'),
                  value: settings.notificationsEnabled,
                  onChanged: (value) {
                    ref
                        .read(settingsProvider.notifier)
                        .toggleNotifications(value: value);
                  },
                ),
                SwitchListTile(
                  secondary: const Icon(Icons.dark_mode_outlined),
                  title: const Text('Dark Mode'),
                  subtitle: const Text('Toggle app appearance'),
                  value: settings.isDarkMode,
                  onChanged: (value) {
                    ref
                        .read(settingsProvider.notifier)
                        .toggleDarkMode(value: value);
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.language),
                  title: const Text('Language'),
                  subtitle: Text(settings.language),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () {
                    // Could show a bottom sheet here
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                          content:
                              Text('Language selection locked to English')),
                    );
                  },
                ),
              ],
            ),
          ),

          const Divider(height: 32),

          // About Section
          _buildSectionHeader('About', theme),
          ListTile(
            leading: const Icon(Icons.help_outline),
            title: const Text('Help & Support'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              // Usually routes to a webview or support screen
            },
          ),
          ListTile(
            leading: const Icon(Icons.info_outline),
            title: const Text('Terms of Service & Privacy Policy'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {},
          ),
          const ListTile(
            leading: Icon(Icons.adb),
            title: Text('App Version'),
            subtitle: Text('1.0.0 (Build 34)'),
          ),

          const SizedBox(height: 24),

          // Logout Button
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: OutlinedButton.icon(
              onPressed: () async {
                final confirm = await showDialog<bool>(
                  context: context,
                  builder: (context) => AlertDialog(
                    title: const Text('Sign Out'),
                    content: const Text('Are you sure you want to sign out?'),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(context, false),
                        child: const Text('Cancel'),
                      ),
                      FilledButton(
                        onPressed: () => Navigator.pop(context, true),
                        style: FilledButton.styleFrom(
                          backgroundColor: theme.colorScheme.error,
                          foregroundColor: theme.colorScheme.onError,
                        ),
                        child: const Text('Sign Out'),
                      ),
                    ],
                  ),
                );

                if ((confirm ?? false) && context.mounted) {
                  await ref.read(authControllerProvider.notifier).logout();
                  // Reset game state on logout
                  ref.invalidate(gamificationControllerProvider);
                  if (context.mounted) {
                    context.go('/login');
                  }
                }
              },
              icon: Icon(Icons.logout, color: theme.colorScheme.error),
              label: Text(
                'Sign Out',
                style: TextStyle(color: theme.colorScheme.error),
              ),
              style: OutlinedButton.styleFrom(
                side: BorderSide(color: theme.colorScheme.error),
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Text(
        title,
        style: theme.textTheme.titleSmall?.copyWith(
          color: theme.colorScheme.primary,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
