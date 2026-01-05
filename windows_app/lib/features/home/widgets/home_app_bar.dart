import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:learning_hub/l10n/generated/app_localizations.dart';
import 'package:learning_hub/core/providers/auth_provider.dart';
import 'package:learning_hub/core/providers/theme_provider.dart';
import 'package:learning_hub/features/gamification/presentation/widgets/gamification_badge.dart';
import 'package:learning_hub/shared/widgets/app_logo.dart';

class HomeAppBar extends ConsumerWidget implements PreferredSizeWidget {
  const HomeAppBar({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final user = ref.watch(currentUserProvider);
    final isAuthenticated = user != null;

    return SliverAppBar(
      floating: true,
      snap: true,
      pinned: true,
      elevation: 0,
      backgroundColor: theme.scaffoldBackgroundColor.withValues(alpha: 0.8),
      surfaceTintColor: Colors.transparent,
      flexibleSpace: const FlexibleSpaceBar(
        background: SizedBox.shrink(), // for blur effect later
      ),
      title: FittedBox(
        fit: BoxFit.scaleDown,
        child: Row(
          children: [
            const AppLogo(),
            const SizedBox(width: 12),
            Text(
              AppLocalizations.of(context)!.appTitle,
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
                letterSpacing: -0.5,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(60),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          child: InkWell(
            onTap: () => context.push('/search'),
            borderRadius: BorderRadius.circular(12),
            child: Container(
              height: 48,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color:
                      theme.colorScheme.outlineVariant.withValues(alpha: 0.5),
                  width: 1,
                ),
              ),
              child: Row(
                children: [
                  Icon(Icons.search, color: theme.colorScheme.onSurfaceVariant),
                  const SizedBox(width: 12),
                  Text(
                    AppLocalizations.of(context)!.searchHint,
                    style: theme.textTheme.bodyLarge?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
      actions: [
        if (isAuthenticated)
          Row(
            children: [
              const GamificationBadge(),
              IconButton(
                icon: const Icon(Icons.notifications_outlined),
                onPressed: () => context.push('/notifications'),
              ),
              const SizedBox(width: 8),
              InkWell(
                onTap: () => context.push('/profile'),
                borderRadius: BorderRadius.circular(20),
                child: CircleAvatar(
                  radius: 16,
                  backgroundImage: user.avatarUrl != null
                      ? NetworkImage(user.avatarUrl!)
                      : null,
                  backgroundColor: theme.colorScheme.primary,
                  child: user.avatarUrl == null
                      ? Text(
                          user.displayName.isNotEmpty
                              ? user.displayName[0].toUpperCase()
                              : 'U',
                          style: TextStyle(
                            color: theme.colorScheme.onPrimary,
                            fontWeight: FontWeight.bold,
                          ),
                        )
                      : null,
                ),
              ),
              const SizedBox(width: 16),
              // Theme toggle button
              IconButton(
                icon: Icon(
                  theme.brightness == Brightness.dark
                      ? Icons.dark_mode
                      : Icons.light_mode,
                ),
                onPressed: () {
                  ref.read(themeModeProvider.notifier).toggleTheme();
                },
              ),
            ],
          )
        else
          Row(
            children: [
              TextButton(
                onPressed: () => context.push('/login'),
                child: Text(AppLocalizations.of(context)!.logIn),
              ),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: () => context.push('/signup'),
                child: Text(AppLocalizations.of(context)!.joinFree),
              ),
              const SizedBox(width: 16),
              // Theme toggle button for guests
              IconButton(
                icon: Icon(
                  theme.brightness == Brightness.dark
                      ? Icons.dark_mode
                      : Icons.light_mode,
                ),
                onPressed: () {
                  ref.read(themeModeProvider.notifier).toggleTheme();
                },
              ),
            ],
          ),
      ],
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(120);
}
