import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:learning_hub/core/theme/app_colors.dart';
import 'package:learning_hub/core/providers/theme_provider.dart';
import 'package:learning_hub/core/providers/biometric_provider.dart';
import 'package:learning_hub/core/providers/offline_provider.dart';
import 'package:learning_hub/core/providers/settings_provider.dart';
import 'package:learning_hub/core/providers/auth_provider.dart';
import 'package:learning_hub/core/services/offline_service.dart';
import 'package:go_router/go_router.dart';
import 'package:learning_hub/shared/widgets/app_feedback.dart';
import 'package:package_info_plus/package_info_plus.dart';

/// Settings screen with app preferences and account settings
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    final biometricState = ref.watch(biometricProvider);
    final offlineState = ref.watch(offlineProvider);
    final settings = ref.watch(appSettingsProvider);
    final settingsNotifier = ref.read(appSettingsProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Account Section
          const _SectionHeader(title: 'Account'),
          _SettingsTile(
            icon: Icons.person_outline,
            title: 'Edit Profile',
            subtitle: 'Update your personal information',
            onTap: () {},
          ),
          _SettingsTile(
            icon: Icons.lock_outline,
            title: 'Change Password',
            subtitle: 'Update your password',
            onTap: () {},
          ),
          _SettingsTile(
            icon: Icons.email_outlined,
            title: 'Email Preferences',
            subtitle: 'Manage email notifications',
            onTap: () {},
          ),
          const Divider(height: 32),

          // Appearance Section
          const _SectionHeader(title: 'Appearance'),
          _SettingsTile(
            icon: Icons.dark_mode_outlined,
            title: 'Theme',
            subtitle: _getThemeName(themeMode),
            onTap: () => _showThemeDialog(context, ref, themeMode),
          ),
          _SettingsTile(
            icon: Icons.text_fields,
            title: 'Text Size',
            subtitle: 'Medium',
            onTap: () {},
          ),
          const Divider(height: 32),

          // Learning Preferences
          const _SectionHeader(title: 'Learning'),
          _SwitchTile(
            icon: Icons.download_outlined,
            title: 'Auto-download',
            subtitle: 'Download lessons on Wi-Fi',
            value: settings.autoDownload,
            onChanged: settingsNotifier.setAutoDownload,
          ),
          _SwitchTile(
            icon: Icons.play_circle_outline,
            title: 'Autoplay',
            subtitle: 'Play next lesson automatically',
            value: settings.autoplay,
            onChanged: settingsNotifier.setAutoplay,
          ),
          _SettingsTile(
            icon: Icons.speed,
            title: 'Default Playback Speed',
            subtitle: '${settings.playbackSpeed}x',
            onTap: () =>
                _showPlaybackSpeedDialog(context, ref, settings.playbackSpeed),
          ),
          _SettingsTile(
            icon: Icons.subtitles_outlined,
            title: 'Subtitles',
            subtitle: settings.subtitleLanguage,
            onTap: () {},
          ),
          _SettingsTile(
            icon: Icons.high_quality,
            title: 'Video Quality',
            subtitle: '${settings.videoQuality} (recommended)',
            onTap: () {},
          ),
          const Divider(height: 32),

          // Notifications
          const _SectionHeader(title: 'Notifications'),
          _SwitchTile(
            icon: Icons.notifications_outlined,
            title: 'Push Notifications',
            subtitle: 'Receive push notifications',
            value: settings.pushNotifications,
            onChanged: settingsNotifier.setPushNotifications,
          ),
          _SwitchTile(
            icon: Icons.local_fire_department,
            title: 'Streak Reminders',
            subtitle: 'Daily learning reminders',
            value: settings.streakReminders,
            onChanged: settingsNotifier.setStreakReminders,
          ),
          _SwitchTile(
            icon: Icons.campaign_outlined,
            title: 'Promotions',
            subtitle: 'Receive promotional offers',
            value: settings.promotions,
            onChanged: settingsNotifier.setPromotions,
          ),
          const Divider(height: 32),

          // Privacy & Security
          const _SectionHeader(title: 'Privacy & Security'),
          _SwitchTile(
            icon: Icons.analytics_outlined,
            title: 'Analytics',
            subtitle: 'Help improve the app',
            value: settings.analyticsEnabled,
            onChanged: settingsNotifier.setAnalyticsEnabled,
          ),
          _SettingsTile(
            icon: Icons.fingerprint,
            title: 'Biometric Authentication',
            subtitle: biometricState.isAvailable
                ? (biometricState.isEnabled ? 'Enabled' : 'Disabled')
                : 'Not available on this device',
            trailing: Switch(
              value: biometricState.isEnabled,
              onChanged: biometricState.isAvailable
                  ? (val) =>
                      ref.read(biometricProvider.notifier).toggleBiometrics(val)
                  : null,
            ),
            onTap: () {},
          ),
          _SettingsTile(
            icon: Icons.devices_outlined,
            title: 'Manage Devices',
            subtitle: '3 active devices',
            onTap: () {},
          ),
          const Divider(height: 32),

          // Storage
          const _SectionHeader(title: 'Storage'),
          _SettingsTile(
            icon: Icons.storage_outlined,
            title: 'Downloaded Content',
            subtitle: '1.2 GB used',
            trailing: TextButton(
              onPressed: () {},
              child: const Text('Manage'),
            ),
          ),
          _SettingsTile(
            icon: Icons.delete_outline,
            title: 'Clear Cache',
            subtitle: '${offlineState.downloadedIds.length} items downloaded',
            onTap: () => _showClearCacheDialog(context, ref),
          ),
          const Divider(height: 32),

          // About
          const _SectionHeader(title: 'About'),
          _SettingsTile(
            icon: Icons.info_outline,
            title: 'App Version',
            subtitle: null, // Filled dynamically
            trailing: FutureBuilder<PackageInfo>(
              future: PackageInfo.fromPlatform(),
              builder: (context, snapshot) {
                if (snapshot.hasData) {
                  final info = snapshot.data!;
                  return Text(
                    '${info.version} (Build ${info.buildNumber})',
                    style: Theme.of(context).textTheme.bodySmall,
                  );
                }
                return Text(
                  '...',
                  style: Theme.of(context).textTheme.bodySmall,
                );
              },
            ),
          ),
          _SettingsTile(
            icon: Icons.description_outlined,
            title: 'Terms of Service',
            onTap: () {},
          ),
          _SettingsTile(
            icon: Icons.privacy_tip_outlined,
            title: 'Privacy Policy',
            onTap: () {},
          ),
          _SettingsTile(
            icon: Icons.code,
            title: 'Open Source Licenses',
            onTap: () => showLicensePage(
              context: context,
              applicationName: 'Learning Hub',
              applicationVersion: '1.0.0',
              applicationIcon: const Padding(
                padding: EdgeInsets.all(8),
                child: Icon(Icons.school, size: 48, color: AppColors.primary),
              ),
            ),
          ),
          const Divider(height: 32),

          // Danger Zone
          const _SectionHeader(title: 'Danger Zone'),
          _SettingsTile(
            icon: Icons.logout,
            title: 'Sign Out',
            iconColor: AppColors.warning,
            onTap: () => _showSignOutDialog(context, ref),
          ),
          _SettingsTile(
            icon: Icons.delete_forever,
            title: 'Delete Account',
            iconColor: AppColors.error,
            subtitle: 'Permanently delete your account and data',
            onTap: () => _showDeleteAccountDialog(context),
          ),
          const SizedBox(height: 32),

          // Developer / Features (Temporary for Access)
          const _SectionHeader(title: 'Features Preview'),
          _SettingsTile(
            icon: Icons.rate_review_outlined,
            title: 'Peer Reviews',
            subtitle: 'Review assignments',
            onTap: () => context.push('/peer-reviews'),
          ),
          _SettingsTile(
            icon: Icons.admin_panel_settings_outlined,
            title: 'Admin Dashboard',
            subtitle: 'Feature flags & Health',
            onTap: () => context.push('/admin'),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  String _getThemeName(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.light:
        return 'Light';
      case ThemeMode.dark:
        return 'Dark';
      case ThemeMode.system:
        return 'System';
    }
  }

  void _showSignOutDialog(BuildContext context, WidgetRef ref) {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sign Out'),
        content: const Text(
            'Are you sure you want to sign out? You will need to sign in again to access your account.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) {
                context.go('/login');
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.warning,
            ),
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }

  void _showPlaybackSpeedDialog(
      BuildContext context, WidgetRef ref, double current) {
    final speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Playback Speed'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: speeds.map((speed) {
            final isSelected = speed == current;
            return ListTile(
              leading: Icon(
                isSelected
                    ? Icons.radio_button_checked
                    : Icons.radio_button_unchecked,
                color:
                    isSelected ? Theme.of(context).colorScheme.primary : null,
              ),
              title: Text('${speed}x'),
              onTap: () {
                ref.read(appSettingsProvider.notifier).setPlaybackSpeed(speed);
                Navigator.pop(context);
              },
            );
          }).toList(),
        ),
      ),
    );
  }

  void _showThemeDialog(
      BuildContext context, WidgetRef ref, ThemeMode current) {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Choose Theme'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _ThemeOption(
              icon: Icons.light_mode,
              title: 'Light',
              isSelected: current == ThemeMode.light,
              onTap: () {
                ref
                    .read(themeModeProvider.notifier)
                    .setThemeMode(ThemeMode.light);
                Navigator.pop(context);
              },
            ),
            _ThemeOption(
              icon: Icons.dark_mode,
              title: 'Dark',
              isSelected: current == ThemeMode.dark,
              onTap: () {
                ref
                    .read(themeModeProvider.notifier)
                    .setThemeMode(ThemeMode.dark);
                Navigator.pop(context);
              },
            ),
            _ThemeOption(
              icon: Icons.settings_suggest,
              title: 'System',
              isSelected: current == ThemeMode.system,
              onTap: () {
                ref
                    .read(themeModeProvider.notifier)
                    .setThemeMode(ThemeMode.system);
                Navigator.pop(context);
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showClearCacheDialog(BuildContext context, WidgetRef ref) {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear Cache'),
        content: const Text(
            'This will clear 156 MB of cached data. Your downloaded lessons will not be affected.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              await OfflineService.instance.clearAll();
              // Force refresh provider (though clearAll clears box, provider needs update or init)
              // Ideally provider listens to service or we call a method on notifier
              // ref.read(offlineProvider.notifier).refresh(); // Assuming method exists or init

              if (context.mounted) {
                AppFeedback.showSuccess(context, 'Cache cleared successfully');
              }
            },
            child: const Text('Clear'),
          ),
        ],
      ),
    );
  }

  void _showDeleteAccountDialog(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Account'),
        content: const Text(
          'Are you sure you want to delete your account? This action cannot be undone. All your data, including courses and certificates, will be permanently deleted.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
            ),
            child: const Text('Delete Account'),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;

  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        title,
        style: Theme.of(context).textTheme.titleSmall?.copyWith(
              color: AppColors.primary,
              fontWeight: FontWeight.bold,
            ),
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final Color? iconColor;
  final Widget? trailing;
  final VoidCallback? onTap;

  const _SettingsTile({
    required this.icon,
    required this.title,
    this.subtitle,
    this.iconColor,
    this.trailing,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListTile(
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color:
              (iconColor ?? theme.colorScheme.primary).withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child:
            Icon(icon, color: iconColor ?? theme.colorScheme.primary, size: 20),
      ),
      title: Text(title),
      subtitle: subtitle != null ? Text(subtitle!) : null,
      trailing:
          trailing ?? (onTap != null ? const Icon(Icons.chevron_right) : null),
      onTap: onTap,
    );
  }
}

class _SwitchTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  const _SwitchTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListTile(
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: theme.colorScheme.primary.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: theme.colorScheme.primary, size: 20),
      ),
      title: Text(title),
      subtitle: Text(subtitle),
      trailing: Switch(
        value: value,
        onChanged: onChanged,
      ),
    );
  }
}

class _ThemeOption extends StatelessWidget {
  final IconData icon;
  final String title;
  final bool isSelected;
  final VoidCallback onTap;

  const _ThemeOption({
    required this.icon,
    required this.title,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListTile(
      leading: Icon(
        icon,
        color:
            isSelected ? AppColors.primary : theme.colorScheme.onSurfaceVariant,
      ),
      title: Text(title),
      trailing: isSelected
          ? const Icon(Icons.check_circle, color: AppColors.primary)
          : null,
      onTap: onTap,
    );
  }
}
