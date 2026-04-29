import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:learning_hub/core/theme/app_colors.dart';
import 'package:learning_hub/core/utils/responsive.dart';
import 'quick_actions_fab.dart';
import 'connectivity_banner.dart';

/// Provider for tracking current navigation index
final bottomNavIndexProvider = StateProvider<int>((ref) => 0);

/// Main scaffold with bottom navigation for mobile and side navigation for desktop
class MainScaffold extends ConsumerWidget {
  final Widget child;

  const MainScaffold({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDesktop = Responsive.isDesktop(context);
    final isTablet = Responsive.isTablet(context);

    Widget scaffold;
    if (isDesktop) {
      scaffold = _DesktopScaffold(child: child);
    } else if (isTablet) {
      scaffold = _TabletScaffold(child: child);
    } else {
      scaffold = _MobileScaffold(child: child);
    }

    return Stack(
      children: [
        scaffold,
        const Positioned(
          top: 0,
          left: 0,
          right: 0,
          child: ConnectivityBanner(),
        ),
      ],
    );
  }
}

/// Mobile layout with bottom navigation bar
class _MobileScaffold extends ConsumerWidget {
  final Widget child;

  const _MobileScaffold({required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentIndex = ref.watch(bottomNavIndexProvider);

    return Scaffold(
      body: child,
      floatingActionButton: const QuickActionsFAB(),
      bottomNavigationBar: NavigationBar(
        selectedIndex: currentIndex,
        onDestinationSelected: (index) {
          ref.read(bottomNavIndexProvider.notifier).state = index;
          _navigateToIndex(context, index);
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.search_outlined),
            selectedIcon: Icon(Icons.search),
            label: 'Search',
          ),
          NavigationDestination(
            icon: Icon(Icons.play_circle_outline),
            selectedIcon: Icon(Icons.play_circle_filled),
            label: 'My Learning',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}

/// Tablet layout with navigation rail
class _TabletScaffold extends ConsumerWidget {
  final Widget child;

  const _TabletScaffold({required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentIndex = ref.watch(bottomNavIndexProvider);

    return Scaffold(
      body: Row(
        children: [
          NavigationRail(
            selectedIndex: currentIndex,
            onDestinationSelected: (index) {
              ref.read(bottomNavIndexProvider.notifier).state = index;
              _navigateToIndex(context, index);
            },
            labelType: NavigationRailLabelType.selected,
            leading: Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Image.asset(
                'assets/icons/logo.png',
                width: 40,
                height: 40,
                errorBuilder: (context, error, stackTrace) {
                  return Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      gradient: AppColors.primaryGradient,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      Icons.school,
                      color: Colors.white,
                      size: 24,
                    ),
                  );
                },
              ),
            ),
            destinations: const [
              NavigationRailDestination(
                icon: Icon(Icons.home_outlined),
                selectedIcon: Icon(Icons.home),
                label: Text('Home'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.search_outlined),
                selectedIcon: Icon(Icons.search),
                label: Text('Search'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.play_circle_outline),
                selectedIcon: Icon(Icons.play_circle_filled),
                label: Text('My Learning'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.person_outline),
                selectedIcon: Icon(Icons.person),
                label: Text('Profile'),
              ),
            ],
          ),
          const VerticalDivider(thickness: 1, width: 1),
          Expanded(child: child),
        ],
      ),
    );
  }
}

/// Desktop layout with full side navigation drawer
class _DesktopScaffold extends ConsumerWidget {
  final Widget child;

  const _DesktopScaffold({required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentIndex = ref.watch(bottomNavIndexProvider);
    final theme = Theme.of(context);

    return Scaffold(
      body: Row(
        children: [
          // Side Navigation Drawer
          Container(
            width: 280,
            decoration: BoxDecoration(
              color: theme.colorScheme.surface,
              border: Border(
                right: BorderSide(
                  color: theme.dividerColor,
                  width: 1,
                ),
              ),
            ),
            child: Column(
              children: [
                // Logo & Brand
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          gradient: AppColors.primaryGradient,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(
                          Icons.school,
                          color: Colors.white,
                          size: 26,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        'LearningHub',
                        style: theme.textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1),

                // Navigation Items
                Expanded(
                  child: ListView(
                    padding:
                        const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                    children: [
                      _DesktopNavItem(
                        icon: Icons.home_outlined,
                        selectedIcon: Icons.home,
                        label: 'Home',
                        isSelected: currentIndex == 0,
                        onTap: () {
                          ref.read(bottomNavIndexProvider.notifier).state = 0;
                          context.go('/');
                        },
                      ),
                      _DesktopNavItem(
                        icon: Icons.search_outlined,
                        selectedIcon: Icons.search,
                        label: 'Search Courses',
                        isSelected: currentIndex == 1,
                        onTap: () {
                          ref.read(bottomNavIndexProvider.notifier).state = 1;
                          context.go('/search');
                        },
                      ),
                      _DesktopNavItem(
                        icon: Icons.play_circle_outline,
                        selectedIcon: Icons.play_circle_filled,
                        label: 'My Learning',
                        isSelected: currentIndex == 2,
                        onTap: () {
                          ref.read(bottomNavIndexProvider.notifier).state = 2;
                          context.go('/library');
                        },
                      ),
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 16),
                        child: Divider(height: 1),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 8),
                        child: Text(
                          'Categories',
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      _DesktopNavItem(
                        icon: Icons.code,
                        label: 'Development',
                        color: AppColors.categoryDevelopment,
                        isSelected: false,
                        onTap: () => context.go('/search?category=development'),
                      ),
                      _DesktopNavItem(
                        icon: Icons.design_services,
                        label: 'Design',
                        color: AppColors.categoryDesign,
                        isSelected: false,
                        onTap: () => context.go('/search?category=design'),
                      ),
                      _DesktopNavItem(
                        icon: Icons.business,
                        label: 'Business',
                        color: AppColors.categoryBusiness,
                        isSelected: false,
                        onTap: () => context.go('/search?category=business'),
                      ),
                      _DesktopNavItem(
                        icon: Icons.psychology,
                        label: 'AI & ML',
                        color: AppColors.categoryAI,
                        isSelected: false,
                        onTap: () => context.go('/search?category=ai'),
                      ),
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 16),
                        child: Divider(height: 1),
                      ),
                      _DesktopNavItem(
                        icon: Icons.smart_toy_outlined,
                        selectedIcon: Icons.smart_toy,
                        label: 'AI Tutor',
                        isSelected: false,
                        onTap: () => context.go('/ai-tutor'),
                      ),
                      _DesktopNavItem(
                        icon: Icons.download_outlined,
                        selectedIcon: Icons.download,
                        label: 'Downloads',
                        isSelected: false,
                        onTap: () => context.go('/downloads'),
                      ),
                    ],
                  ),
                ),

                // User Profile Section
                const Divider(height: 1),
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: _DesktopNavItem(
                    icon: Icons.person_outline,
                    selectedIcon: Icons.person,
                    label: 'Profile',
                    isSelected: currentIndex == 3,
                    onTap: () {
                      ref.read(bottomNavIndexProvider.notifier).state = 3;
                      context.go('/profile');
                    },
                  ),
                ),
                Padding(
                  padding:
                      const EdgeInsets.only(left: 12, right: 12, bottom: 12),
                  child: _DesktopNavItem(
                    icon: Icons.settings_outlined,
                    selectedIcon: Icons.settings,
                    label: 'Settings',
                    isSelected: false,
                    onTap: () => context.go('/settings'),
                  ),
                ),
              ],
            ),
          ),

          // Main Content
          Expanded(child: child),
        ],
      ),
    );
  }
}

/// Desktop navigation item widget
class _DesktopNavItem extends StatelessWidget {
  final IconData icon;
  final IconData? selectedIcon;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;
  final Color? color;

  const _DesktopNavItem({
    required this.icon,
    this.selectedIcon,
    required this.label,
    required this.isSelected,
    required this.onTap,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final effectiveColor = color ??
        (isSelected
            ? theme.colorScheme.primary
            : theme.colorScheme.onSurfaceVariant);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Material(
        color: isSelected
            ? theme.colorScheme.primary.withValues(alpha: 0.1)
            : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                Icon(
                  isSelected ? (selectedIcon ?? icon) : icon,
                  color: effectiveColor,
                  size: 22,
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    label,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: isSelected
                          ? theme.colorScheme.primary
                          : theme.colorScheme.onSurface,
                      fontWeight:
                          isSelected ? FontWeight.w600 : FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Navigate to the appropriate route based on index
void _navigateToIndex(BuildContext context, int index) {
  switch (index) {
    case 0:
      context.go('/');
      break;
    case 1:
      context.go('/search');
      break;
    case 2:
      context.go('/library');
      break;
    case 3:
      context.go('/profile');
      break;
  }
}
