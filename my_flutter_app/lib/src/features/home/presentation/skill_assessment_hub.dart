import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:my_flutter_app/src/features/auth/presentation/auth_controller.dart';
import 'package:my_flutter_app/src/features/gamification/presentation/gamification_controller.dart';

/// Skill Assessment Hub - Dashboard screen based on Google Stitch design
class SkillAssessmentHub extends ConsumerWidget {
  const SkillAssessmentHub({super.key});

  static const Color primaryBlue = Color(0xFF4361EE);
  static const Color secondaryBlue = Color(0xFF3B82F6);
  static const Color accentOrange = Color(0xFFFF9500);
  static const Color bgGray = Color(0xFFF5F7FA);
  static const Color cardWhite = Colors.white;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authControllerProvider).value;
    final gamification = ref.watch(gamificationControllerProvider);
    final userName = user?.displayName ?? user?.username ?? 'Learner';

    return Scaffold(
      backgroundColor: bgGray,
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            // App Bar with search
            SliverToBoxAdapter(
              child: _buildHeader(context, userName, ref),
            ),
            // Category Chips
            SliverToBoxAdapter(
              child: _buildCategoryChips(),
            ),
            // Welcome Card
            SliverToBoxAdapter(
              child: _buildWelcomeCard(userName, gamification),
            ),
            // Performance Insight
            SliverToBoxAdapter(
              child: _buildPerformanceInsight(),
            ),
            // Mastery Path
            SliverToBoxAdapter(
              child: _buildMasteryPath(),
            ),
            // Quick Actions
            SliverToBoxAdapter(
              child: _buildQuickActions(context),
            ),
            const SliverToBoxAdapter(
              child: SizedBox(height: 100),
            ),
          ],
        ),
      ),
      bottomNavigationBar: _buildBottomNav(context),
    );
  }

  Widget _buildHeader(BuildContext context, String userName, WidgetRef ref) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.menu_rounded),
            onPressed: () {},
          ),
          Expanded(
            child: Container(
              height: 44,
              margin: const EdgeInsets.symmetric(horizontal: 8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(22),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 10,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: TextField(
                decoration: InputDecoration(
                  hintText: 'Search courses, tests...',
                  hintStyle: TextStyle(color: Colors.grey[400], fontSize: 14),
                  prefixIcon: Icon(Icons.search, color: Colors.grey[400]),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () {},
          ),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms);
  }

  Widget _buildCategoryChips() {
    final categories = [
      'Software Engineer',
      'Data Scientist',
      'UI/UX Designer',
      'DevOps',
    ];

    return SizedBox(
      height: 44,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: categories.length,
        itemBuilder: (context, index) {
          final isSelected = index == 0;
          return Container(
            margin: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              label: Text(categories[index]),
              selected: isSelected,
              onSelected: (_) {},
              backgroundColor: Colors.white,
              selectedColor: primaryBlue,
              labelStyle: TextStyle(
                color: isSelected ? Colors.white : Colors.grey[700],
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
            ),
          );
        },
      ),
    ).animate().slideX(begin: -0.1, duration: 400.ms);
  }

  Widget _buildWelcomeCard(
      String userName, AsyncValue<GamificationState> gamification) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [primaryBlue, secondaryBlue],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: primaryBlue.withValues(alpha: 0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: Colors.white.withValues(alpha: 0.2),
                child: Text(
                  userName[0].toUpperCase(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 20,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Welcome Back!',
                      style: GoogleFonts.outfit(
                        color: Colors.white70,
                        fontSize: 14,
                      ),
                    ),
                    Text(
                      userName,
                      style: GoogleFonts.outfit(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: accentOrange,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.local_fire_department,
                        color: Colors.white, size: 18),
                    const SizedBox(width: 4),
                    gamification.when(
                      data: (state) => Text(
                        '${state.streak ?? 0} Day',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      loading: () => const Text('--',
                          style: TextStyle(color: Colors.white)),
                      error: (_, __) => const Text('0',
                          style: TextStyle(color: Colors.white)),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          // Stats Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildStatItem(
                icon: Icons.assignment_turned_in,
                value: '12',
                label: 'Tests',
              ),
              Container(height: 40, width: 1, color: Colors.white24),
              _buildStatItem(
                icon: Icons.percent,
                value: '85%',
                label: 'Avg Score',
              ),
              Container(height: 40, width: 1, color: Colors.white24),
              gamification.when(
                data: (state) => _buildStatItem(
                  icon: Icons.workspace_premium,
                  value: 'Lv ${state.xp?.level ?? 1}',
                  label: '${state.xp?.totalXp ?? 0} XP',
                ),
                loading: () => _buildStatItem(
                  icon: Icons.workspace_premium,
                  value: '--',
                  label: 'XP',
                ),
                error: (_, __) => _buildStatItem(
                  icon: Icons.workspace_premium,
                  value: 'Lv 1',
                  label: '0 XP',
                ),
              ),
            ],
          ),
        ],
      ),
    ).animate().scale(
        begin: const Offset(0.95, 0.95),
        duration: 400.ms,
        curve: Curves.easeOut);
  }

  Widget _buildStatItem({
    required IconData icon,
    required String value,
    required String label,
  }) {
    return Column(
      children: [
        Icon(icon, color: Colors.white70, size: 20),
        const SizedBox(height: 4),
        Text(
          value,
          style: GoogleFonts.outfit(
            color: Colors.white,
            fontSize: 22,
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.7),
            fontSize: 12,
          ),
        ),
      ],
    );
  }

  Widget _buildPerformanceInsight() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardWhite,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.green.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.trending_up, color: Colors.green, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Performance Insight',
                  style: GoogleFonts.outfit(
                    fontWeight: FontWeight.w600,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Logic scores improved by 15% this week!',
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
          Icon(Icons.chevron_right, color: Colors.grey[400]),
        ],
      ),
    ).animate().fadeIn(delay: 200.ms, duration: 400.ms);
  }

  Widget _buildMasteryPath() {
    final modules = [
      {'name': 'Basics', 'completed': true},
      {'name': 'Logic', 'completed': true},
      {'name': 'Structures', 'completed': false},
      {'name': 'Algorithms', 'completed': false},
    ];

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: cardWhite,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Mastery Path',
                style: GoogleFonts.outfit(
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: primaryBlue.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text(
                  '50% Complete',
                  style: TextStyle(
                    color: primaryBlue,
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          // Stepper
          Row(
            children: modules.asMap().entries.map((entry) {
              final index = entry.key;
              final module = entry.value;
              final isLast = index == modules.length - 1;
              final completed = module['completed'] as bool? ?? false;

              return Expanded(
                child: Row(
                  children: [
                    Column(
                      children: [
                        Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            color: completed ? primaryBlue : Colors.grey[200],
                            shape: BoxShape.circle,
                          ),
                          child: completed
                              ? const Icon(Icons.check,
                                  color: Colors.white, size: 18)
                              : Center(
                                  child: Text(
                                    '${index + 1}',
                                    style: TextStyle(
                                      color: Colors.grey[500],
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          module['name'] as String? ?? '',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight:
                                completed ? FontWeight.w600 : FontWeight.normal,
                            color: completed ? primaryBlue : Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                    if (!isLast)
                      Expanded(
                        child: Container(
                          height: 2,
                          margin: const EdgeInsets.only(bottom: 24),
                          color: completed ? primaryBlue : Colors.grey[200],
                        ),
                      ),
                  ],
                ),
              );
            }).toList(),
          ),
        ],
      ),
    ).animate().fadeIn(delay: 300.ms, duration: 400.ms);
  }

  Widget _buildQuickActions(BuildContext context) {
    final actions = [
      {
        'icon': Icons.school,
        'label': 'Courses',
        'route': '/courses',
        'color': primaryBlue
      },
      {
        'icon': Icons.code,
        'label': 'DSA Lab',
        'route': '/dsa',
        'color': Colors.teal
      },
      {
        'icon': Icons.science,
        'label': 'Curriculum',
        'route': '/curriculum',
        'color': Colors.purple
      },
      {
        'icon': Icons.leaderboard,
        'label': 'Leaderboard',
        'route': '/leaderboard',
        'color': accentOrange
      },
    ];

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Quick Actions',
            style: GoogleFonts.outfit(
              fontWeight: FontWeight.bold,
              fontSize: 18,
            ),
          ),
          const SizedBox(height: 12),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 1.6,
            ),
            itemCount: actions.length,
            itemBuilder: (context, index) {
              final action = actions[index];
              return Material(
                color: cardWhite,
                borderRadius: BorderRadius.circular(16),
                child: InkWell(
                  onTap: () => context.go(action['route'] as String? ?? ''),
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: (action['color'] as Color? ?? primaryBlue)
                                .withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(
                            action['icon'] as IconData? ?? Icons.help,
                            color: action['color'] as Color? ?? primaryBlue,
                            size: 24,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          action['label'] as String? ?? '',
                          style: GoogleFonts.outfit(
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ).animate().scale(
                    begin: const Offset(0.9, 0.9),
                    delay: Duration(milliseconds: 100 * index),
                    duration: 300.ms,
                  );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildBottomNav(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 20,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildNavItem(Icons.home_rounded, 'Home', true, () {}),
              _buildNavItem(Icons.grid_view_rounded, 'Hub', false, () {}),
              // Center FAB
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [primaryBlue, secondaryBlue],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: primaryBlue.withValues(alpha: 0.4),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: IconButton(
                  icon: const Icon(Icons.add, color: Colors.white, size: 28),
                  onPressed: () {},
                ),
              ),
              _buildNavItem(Icons.menu_book_rounded, 'Courses', false,
                  () => context.go('/courses')),
              _buildNavItem(Icons.person_rounded, 'Profile', false,
                  () => context.go('/profile')),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(
      IconData icon, String label, bool isActive, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: isActive ? primaryBlue : Colors.grey[400],
              size: 24,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                color: isActive ? primaryBlue : Colors.grey[500],
                fontSize: 11,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
