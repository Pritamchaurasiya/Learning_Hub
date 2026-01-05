import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class WebShell extends StatelessWidget {
  final Widget child;

  const WebShell({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    // If we are on mobile or small tablet, just return the child (standard mobile view)
    if (MediaQuery.of(context).size.width < 800) {
      return child;
    }

    final theme = Theme.of(context);
    final selectedIndex = _calculateSelectedIndex(context);

    // On larger screens (Desktop/Web), wrap in a shell with side navigation
    return Scaffold(
      body: Row(
        children: [
          // Premium Sidebar
          NavigationRail(
            backgroundColor: theme.colorScheme.surface,
            selectedIndex: selectedIndex,
            onDestinationSelected: (int index) => _onItemTapped(index, context),
            labelType: NavigationRailLabelType.all,
            groupAlignment: -0.8, // Align items to the top-ish
            leading: Padding(
              padding: const EdgeInsets.only(bottom: 24.0, top: 16.0),
              child: Column(
                children: [
                  // Placeholder Logo - Replace with actual asset if available
                  Icon(Icons.school_rounded,
                      size: 40, color: theme.colorScheme.primary),
                  const SizedBox(height: 8),
                  Text(
                    'Hub',
                    style: theme.textTheme.labelSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: theme.colorScheme.primary,
                      letterSpacing: 1.2,
                    ),
                  ),
                ],
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
                icon: Icon(Icons.school_outlined), // Changed to school
                selectedIcon: Icon(Icons.school),
                label: Text('My Learning'), // Changed from Library
              ),
              NavigationRailDestination(
                icon: Icon(Icons.person_outline),
                selectedIcon: Icon(Icons.person),
                label: Text('Profile'),
              ),
            ],
            trailing: Expanded(
              child: Align(
                alignment: Alignment.bottomCenter,
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 24.0),
                  child: IconButton(
                    icon: const Icon(Icons.settings_outlined),
                    tooltip: 'Settings',
                    onPressed: () {
                      // TODO: Navigate to settings
                    },
                  ),
                ),
              ),
            ),
          ),

          // Divider compatible with theme
          VerticalDivider(
            thickness: 1,
            width: 1,
            color: theme.colorScheme.outlineVariant.withValues(alpha: 0.2),
          ),

          // Main Content with "Card" look for depth
          Expanded(
            child: Container(
              color: theme.colorScheme
                  .surfaceContainerLowest, // Slightly different background
              child: Padding(
                padding: const EdgeInsets.only(left: 1, top: 1), // Tiny gap
                child: ClipRRect(
                  // No border radius on left to merge with rail, or add if "card" look desired
                  // Let's keep it clean
                  child: child,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  int _calculateSelectedIndex(BuildContext context) {
    // Robust URI parsing
    final String location = GoRouterState.of(context).uri.path;
    if (location.startsWith('/home')) return 0;
    if (location.startsWith('/search') || location.startsWith('/course')) {
      return 1;
    }
    if (location.startsWith('/learning-path') ||
        location.startsWith('/my-courses')) {
      return 2;
    }
    if (location.startsWith('/profile') || location.startsWith('/settings')) {
      return 3;
    }
    return 0;
  }

  void _onItemTapped(int index, BuildContext context) {
    switch (index) {
      case 0:
        context.go('/home');
        break;
      case 1:
        context.go('/search');
        break;
      case 2:
        context.go('/learning-path'); // Mapped to "My Learning" / Learning Path
        break;
      case 3:
        context.go('/profile');
        break;
    }
  }
}
