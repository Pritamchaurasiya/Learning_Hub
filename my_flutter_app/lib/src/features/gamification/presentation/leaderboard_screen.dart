// ignore_for_file: unused_result
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:my_flutter_app/src/features/gamification/data/social_websocket_service.dart';
import 'package:my_flutter_app/src/features/gamification/domain/gamification_models.dart';
import 'package:my_flutter_app/src/features/gamification/presentation/gamification_controller.dart';
import 'package:my_flutter_app/src/features/gamification/presentation/widgets/celebration_overlay.dart';
import 'package:my_flutter_app/src/features/gamification/presentation/widgets/gamification_widgets.dart';

/// Enhanced Leaderboard Screen with time period tabs and category filters
/// per mockup #1 - Global Leaderboard
class LeaderboardScreen extends ConsumerStatefulWidget {
  const LeaderboardScreen({super.key});

  @override
  ConsumerState<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends ConsumerState<LeaderboardScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _selectedCategory = 'Global';
  bool _isCelebrating = false;

  final List<String> _categories = [
    'Global',
    'Python',
    'UX Design',
    'Marketing',
    'Data Sci',
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(socialEventsProvider, (previous, next) {
      next.whenData((data) {
        if (data['type'] == 'xp_gain') {
          // ... (existing xp logic)
          // Refers to XPToast logic usually, but here we show simple snackbar
          // We can remove it or keep it.
        }

        // Listen for Global Leaderboard Updates
        if (data['type'] == 'global_update' ||
            (data['type'] == 'leaderboard_update')) {
          // Backend sends { "type": "global_update", "data": { "type": "leaderboard_update", ... } }
          // Or direct map. We check nested types if needed.

          final dataMap = data['data'] as Map<String, dynamic>?;
          final innerType = dataMap != null ? dataMap['type'] : data['type'];

          if (innerType == 'leaderboard_update') {
            // Invalidate to fetch new order from Redis
            ref.invalidate(leaderboardProvider);
          }
        }
      });
    });

    final leaderboardAsync = ref.watch(leaderboardProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: Text(
          'Leaderboard',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () {
              _showFilterBottomSheet(context);
            },
          ),
        ],
      ),
      body: CelebrationOverlay(
        isCelebrating: _isCelebrating,
        onCelebrationEnd: () => setState(() => _isCelebrating = false),
        child: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
            ),
          ),
          child: Column(
            children: [
              // Time Period Tabs (Weekly, Monthly, All-Time)
              _buildTimePeriodTabs(),
              const SizedBox(height: 12),

              // Category Filter Chips
              _buildCategoryChips(),
              const SizedBox(height: 16),

              // User Stats Section
              Consumer(
                builder: (context, ref, child) {
                  final gameState = ref.watch(gamificationControllerProvider);
                  return gameState.when(
                    data: (state) => Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: XPBadgeWidget(
                        xp: state.xp ?? UserXP.empty,
                        streak: state.streak,
                      ),
                    ),
                    loading: () => const SizedBox.shrink(),
                    error: (err, stack) => const SizedBox.shrink(),
                  );
                },
              ),
              const SizedBox(height: 16),

              // Top 3 Podium (if data available)
              leaderboardAsync.when(
                data: (players) => players.length >= 3
                    ? _buildPodium(players.take(3).toList())
                    : const SizedBox.shrink(),
                loading: () => const SizedBox.shrink(),
                error: (_, __) => const SizedBox.shrink(),
              ),

              // Leaderboard List
              Expanded(
                child: leaderboardAsync.when(
                  data: (players) => RefreshIndicator(
                    onRefresh: () async {
                      ref
                        ..refresh(leaderboardProvider)
                        ..refresh(gamificationControllerProvider);
                    },
                    child: ListView.builder(
                      padding: const EdgeInsets.fromLTRB(
                          16, 0, 16, 80), // Fab padding
                      itemCount: players.length > 3 ? players.length - 3 : 0,
                      itemBuilder: (context, index) {
                        final actualIndex = index + 3;
                        return LeaderboardTile(entry: players[actualIndex])
                            .animate(delay: (50 * index).ms)
                            .slideX(begin: 0.2)
                            .fadeIn();
                      },
                    ),
                  ),
                  loading: () =>
                      const Center(child: CircularProgressIndicator()),
                  error: (err, stack) => _buildErrorState(err),
                ),
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _claimDailyReward,
        label: const Text('Claim Reward'),
        icon: const Icon(Icons.card_giftcard),
        backgroundColor: Colors.amber,
        foregroundColor: Colors.black,
      ),
    );
  }

  void _showFilterBottomSheet(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: const Color(0xFF1E293B),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Filter Leaderboard',
                style: GoogleFonts.outfit(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'Sort By',
                style: GoogleFonts.outfit(
                  color: Colors.grey,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: [
                  ChoiceChip(
                    label: const Text('XP (Default)'),
                    selected: true,
                    onSelected: (_) {},
                    selectedColor: const Color(0xFF3B82F6),
                    backgroundColor: const Color(0xFF0F172A),
                  ),
                  ChoiceChip(
                    label: const Text('Highest Streak'),
                    selected: false,
                    onSelected: (_) {},
                    backgroundColor: const Color(0xFF0F172A),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              Text(
                'Region',
                style: GoogleFonts.outfit(
                  color: Colors.grey,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: [
                  ChoiceChip(
                    label: const Text('Global'),
                    selected: true,
                    onSelected: (_) {},
                    selectedColor: const Color(0xFF3B82F6),
                    backgroundColor: const Color(0xFF0F172A),
                  ),
                  ChoiceChip(
                    label: const Text('My Country'),
                    selected: false,
                    onSelected: (_) {},
                    backgroundColor: const Color(0xFF0F172A),
                  ),
                  ChoiceChip(
                    label: const Text('Friends Only'),
                    selected: false,
                    onSelected: (_) {},
                    backgroundColor: const Color(0xFF0F172A),
                  ),
                ],
              ),
              const SizedBox(height: 32),
              FilledButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  ref.invalidate(leaderboardProvider);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Filters applied')),
                  );
                },
                child: const Text('Apply Filters'),
              ),
            ],
          ),
        );
      },
    );
  }

  void _claimDailyReward() {
    setState(() => _isCelebrating = true);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Row(
          children: [
            Icon(Icons.auto_awesome, color: Colors.amber),
            SizedBox(width: 8),
            Text('Daily Reward Claimed! +50 XP'),
          ],
        ),
        backgroundColor: const Color(0xFF0F172A),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  Widget _buildTimePeriodTabs() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(12),
      ),
      child: TabBar(
        controller: _tabController,
        indicator: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          color: const Color(0xFF3B82F6),
        ),
        indicatorSize: TabBarIndicatorSize.tab,
        dividerColor: Colors.transparent,
        labelColor: Colors.white,
        unselectedLabelColor: Colors.grey,
        labelStyle: GoogleFonts.outfit(fontWeight: FontWeight.w600),
        tabs: const [
          Tab(text: 'Weekly'),
          Tab(text: 'Monthly'),
          Tab(text: 'All-Time'),
        ],
        onTap: (index) {
          ref.invalidate(leaderboardProvider);
        },
      ),
    );
  }

  Widget _buildCategoryChips() {
    return SizedBox(
      height: 36,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _categories.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final category = _categories[index];
          final isSelected = category == _selectedCategory;
          return FilterChip(
            label: Text(
              category,
              style: GoogleFonts.outfit(
                color: isSelected ? Colors.white : Colors.grey,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
            selected: isSelected,
            onSelected: (selected) {
              setState(() {
                _selectedCategory = category;
              });
              ref.invalidate(leaderboardProvider);
            },
            backgroundColor: const Color(0xFF1E293B),
            selectedColor: const Color(0xFF3B82F6),
            checkmarkColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: BorderSide(
                color: isSelected ? Colors.transparent : Colors.grey.shade700,
              ),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 8),
          );
        },
      ),
    );
  }

  Widget _buildPodium(List<Map<String, dynamic>> topThree) {
    if (topThree.length < 3) {
      return const SizedBox.shrink();
    }

    return Container(
      height: 180,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          // 2nd Place
          _buildPodiumItem(topThree[1], 2, 100, const Color(0xFFC0C0C0)),
          const SizedBox(width: 8),
          // 1st Place (center, tallest)
          _buildPodiumItem(topThree[0], 1, 130, const Color(0xFFFFD700)),
          const SizedBox(width: 8),
          // 3rd Place
          _buildPodiumItem(topThree[2], 3, 80, const Color(0xFFCD7F32)),
        ],
      ),
    ).animate().scale(begin: const Offset(0.9, 0.9)).fadeIn(duration: 400.ms);
  }

  Widget _buildPodiumItem(
      Map<String, dynamic> entry, int rank, double height, Color accentColor) {
    final username =
        (entry['display_name'] ?? entry['username'] ?? '?').toString();
    final xp = entry['total_xp'] ?? 0;
    return Expanded(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Crown for 1st place
          if (rank == 1)
            Icon(Icons.workspace_premium, color: accentColor, size: 28)
                .animate()
                .shake(delay: 500.ms),
          // Avatar
          Container(
            width: rank == 1 ? 70 : 56,
            height: rank == 1 ? 70 : 56,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: accentColor, width: 3),
              boxShadow: [
                BoxShadow(
                  color: accentColor.withAlpha(100),
                  blurRadius: 10,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: CircleAvatar(
              backgroundColor: const Color(0xFF1E293B),
              child: Text(
                username.isNotEmpty ? username[0].toUpperCase() : '?',
                style: GoogleFonts.outfit(
                  fontSize: rank == 1 ? 24 : 18,
                  fontWeight: FontWeight.bold,
                  color: accentColor,
                ),
              ),
            ),
          ),
          const SizedBox(height: 4),
          // Name
          Text(
            username.length > 8 ? '${username.substring(0, 7)}...' : username,
            style: GoogleFonts.outfit(
              color: Colors.white,
              fontWeight: FontWeight.w600,
              fontSize: 12,
            ),
            textAlign: TextAlign.center,
          ),
          // XP
          Text(
            '$xp XP',
            style: GoogleFonts.outfit(
              color: const Color(0xFF22D3EE),
              fontWeight: FontWeight.bold,
              fontSize: 11,
            ),
          ),
          const SizedBox(height: 8),
          // Podium base
          Container(
            height: height,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  accentColor.withAlpha(200),
                  accentColor.withAlpha(100),
                ],
              ),
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(8),
              ),
            ),
            child: Center(
              child: Text(
                '#$rank',
                style: GoogleFonts.outfit(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 20,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(Object err) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.leaderboard_outlined, color: Colors.grey, size: 64),
          const SizedBox(height: 16),
          Text(
            'Failed to load leaderboard',
            style: GoogleFonts.outfit(color: Colors.white, fontSize: 16),
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: () => ref.refresh(leaderboardProvider),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }
}
