import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:learning_hub/core/providers/analytics_provider.dart';
import '../../core/providers/gamification_provider.dart';
import '../gamification/domain/entities/achievement.dart';

class AnalyticsScreen extends ConsumerStatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  ConsumerState<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends ConsumerState<AnalyticsScreen>
    with TickerProviderStateMixin {
  late TabController _tabController;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final analyticsState = ref.watch(analyticsProvider);
    final gamificationState = ref.watch(gamificationProvider);

    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      appBar: AppBar(
        title: const Text('Analytics'),
        backgroundColor: theme.colorScheme.surface,
        foregroundColor: theme.colorScheme.onSurface,
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Progress'),
            Tab(text: 'Performance'),
            Tab(text: 'Insights'),
          ],
          indicatorColor: theme.colorScheme.primary,
          labelColor: theme.colorScheme.primary,
          unselectedLabelColor:
              theme.colorScheme.onSurface.withValues(alpha: 0.6),
        ),
      ),
      body: analyticsState.isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildProgressTab(analyticsState),
                _buildPerformanceTab(analyticsState, gamificationState),
                _buildInsightsTab(analyticsState),
              ],
            ),
    );
  }

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

  Widget _buildProgressTab(AnalyticsState state) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Course Progress',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ).animate().fadeIn(),
          const SizedBox(height: 16),
          // Use real data from state
          if (state.studyStats.isEmpty)
            const Text('No study data available yet.'),

          ...state.studyStats.entries.map((entry) {
            // Assuming studyStats keys are subjects/course names
            // If studyStats is not Map<String, double>, need to adapt.
            // AnalyticsState definition: Map<String, dynamic> studyStats;
            // Let's assume keys are subject names and values are 0.0-1.0 progress for now,
            // or adapt based on actual structure.
            // Checking AnalyticsState definition... it's Map<String, dynamic>.
            // Let's safe cast.
            final progress =
                (entry.value is num) ? (entry.value as num).toDouble() : 0.0;
            return _buildProgressCard(
              subject: entry.key,
              progress: progress,
            ).animate().slideX();
          }),

          const SizedBox(height: 24),
          Text(
            'Weekly Study Hours',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ).animate().fadeIn(delay: 200.ms),
          const SizedBox(height: 16),
          _buildWeeklyChart(state.dailyStudyHours),
        ],
      ),
    );
  }

  Widget _buildPerformanceTab(
      AnalyticsState state, GamificationState gamificationState) {
    final theme = Theme.of(context);

    // Mock scores if not in state, or use weekly activity as proxy
    // AnalyticsState has: dailyStudyHours, studyStats, completedCourses, totalStudySeconds
    // It doesn't seem to have 'monthlyScores'.
    // We can show daily study hours here too or just placeholders for now.
    // Let's use dailyStudyHours for performance chart too but different viz?
    // Or just keep the chart structure but feed it 0-100 logic if relevant.
    // Let's use a placeholder list for scores until backend provides it.
    // Use data from provider
    final scores = state.weeklyScores;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Performance Trends',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ).animate().fadeIn(),
          const SizedBox(height: 16),
          _buildScoreChart(scores),
          const SizedBox(height: 24),
          Text(
            'Recent Achievements',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ).animate().fadeIn(delay: 200.ms),
          const SizedBox(height: 16),
          _buildAchievementsList(gamificationState),
          // Ideally AnalyticsScreen shouldn't duplicate GamificationUI
          // But for now let's keep it consistent.
        ],
      ),
    );
  }

  Widget _buildInsightsTab(AnalyticsState state) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Learning Insights',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ).animate().fadeIn(),
          const SizedBox(height: 16),
          _buildInsightCard(
            icon: Icons.trending_up,
            title: 'Study Consistency',
            description: 'You\'ve maintained a regular study schedule!',
            color: theme.colorScheme.primary,
          ).animate().slideY(),
          const SizedBox(height: 12),
          _buildInsightCard(
            icon: Icons.emoji_events,
            title: 'Goal Progress',
            description:
                'You have completed ${state.completedCourses} courses.',
            color: Colors.amber,
          ).animate().slideY(delay: 200.ms),
          const SizedBox(height: 12),
          _buildInsightCard(
            icon: Icons.timer,
            title: 'Total Time',
            description: 'Total focused time: ${state.formattedTotalTime}',
            color: theme.colorScheme.secondary,
          ).animate().slideY(delay: 200.ms),
        ],
      ),
    );
  }

  Widget _buildProgressCard({
    required String subject,
    required double progress,
  }) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  subject,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  '${(progress * 100).toInt()}%',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: theme.colorScheme.primary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            LinearProgressIndicator(
              value: progress,
              backgroundColor: theme.colorScheme.surfaceContainerHighest,
              valueColor: AlwaysStoppedAnimation<Color>(
                progress >= 1.0
                    ? theme.colorScheme.primary
                    : theme.colorScheme.primary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWeeklyChart(List<int> hours) {
    final theme = Theme.of(context);
    // Convert int to double for chart
    final spotsData = hours.asMap().entries.map((e) {
      return FlSpot(e.key.toDouble(), e.value.toDouble());
    }).toList();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: SizedBox(
          height: 200,
          child: LineChart(
            LineChartData(
              gridData: FlGridData(
                show: true,
                drawVerticalLine: true,
                horizontalInterval: 1,
                verticalInterval: 1,
                getDrawingHorizontalLine: (value) => FlLine(
                  color: theme.colorScheme.surfaceContainerHighest,
                  strokeWidth: 1,
                ),
                getDrawingVerticalLine: (value) => FlLine(
                  color: theme.colorScheme.surfaceContainerHighest,
                  strokeWidth: 1,
                ),
              ),
              titlesData: FlTitlesData(
                show: true,
                rightTitles: const AxisTitles(
                  sideTitles: SideTitles(showTitles: false),
                ),
                topTitles: const AxisTitles(
                  sideTitles: SideTitles(showTitles: false),
                ),
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: 30,
                    interval: 1,
                    getTitlesWidget: (value, meta) {
                      const days = [
                        'Mon',
                        'Tue',
                        'Wed',
                        'Thu',
                        'Fri',
                        'Sat',
                        'Sun'
                      ];
                      if (value.toInt() >= 0 && value.toInt() < days.length) {
                        return Text(
                          days[value.toInt()],
                          style: theme.textTheme.bodySmall,
                        );
                      }
                      return const Text('');
                    },
                  ),
                ),
                leftTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    interval: 1,
                    getTitlesWidget: (value, meta) {
                      return Text(
                        '${value.toInt()}h',
                        style: theme.textTheme.bodySmall,
                      );
                    },
                    reservedSize: 42,
                  ),
                ),
              ),
              borderData: FlBorderData(
                show: true,
                border: Border.all(
                  color: theme.colorScheme.outline,
                ),
              ),
              minX: 0,
              maxX: 6,
              minY: 0,
              maxY: 12, // Increased max Y for realistic study hours
              lineTouchData: const LineTouchData(
                enabled: true,
              ),
              lineBarsData: [
                LineChartBarData(
                  spots: spotsData,
                  isCurved: true,
                  color: theme.colorScheme.primary,
                  barWidth: 3,
                  isStrokeCapRound: true,
                  dotData: FlDotData(
                    show: true,
                    getDotPainter: (spot, percent, barData, index) {
                      return FlDotCirclePainter(
                        radius: 4,
                        color: theme.colorScheme.primary,
                        strokeWidth: 2,
                        strokeColor: theme.colorScheme.surface,
                      );
                    },
                  ),
                  belowBarData: BarAreaData(
                    show: true,
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        theme.colorScheme.primary.withValues(alpha: 0.3),
                        theme.colorScheme.primary.withValues(alpha: 0.05),
                      ],
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

  Widget _buildScoreChart(List<double> scores) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: SizedBox(
          height: 200,
          child: LineChart(
            LineChartData(
              gridData: FlGridData(
                show: true,
                drawVerticalLine: true,
                horizontalInterval: 10,
                verticalInterval: 1,
                getDrawingHorizontalLine: (value) => FlLine(
                  color: theme.colorScheme.surfaceContainerHighest,
                  strokeWidth: 1,
                ),
                getDrawingVerticalLine: (value) => FlLine(
                  color: theme.colorScheme.surfaceContainerHighest,
                  strokeWidth: 1,
                ),
              ),
              titlesData: FlTitlesData(
                show: true,
                rightTitles: const AxisTitles(
                  sideTitles: SideTitles(showTitles: false),
                ),
                topTitles: const AxisTitles(
                  sideTitles: SideTitles(showTitles: false),
                ),
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: 30,
                    interval: 1,
                    getTitlesWidget: (value, meta) {
                      return Text(
                        'W${(value + 1).toInt()}',
                        style: theme.textTheme.bodySmall,
                      );
                    },
                  ),
                ),
                leftTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    interval: 10,
                    getTitlesWidget: (value, meta) {
                      return Text(
                        '${value.toInt()}',
                        style: theme.textTheme.bodySmall,
                      );
                    },
                    reservedSize: 42,
                  ),
                ),
              ),
              borderData: FlBorderData(
                show: true,
                border: Border.all(
                  color: theme.colorScheme.outline,
                ),
              ),
              minX: 0,
              maxX: 6,
              minY: 0,
              maxY: 100,
              lineTouchData: const LineTouchData(
                enabled: true,
              ),
              lineBarsData: [
                LineChartBarData(
                  spots: scores.asMap().entries.map((e) {
                    return FlSpot(e.key.toDouble(), e.value);
                  }).toList(),
                  isCurved: true,
                  color: theme.colorScheme.secondary,
                  barWidth: 3,
                  isStrokeCapRound: true,
                  dotData: FlDotData(
                    show: true,
                    getDotPainter: (spot, percent, barData, index) {
                      return FlDotCirclePainter(
                        radius: 4,
                        color: theme.colorScheme.secondary,
                        strokeWidth: 2,
                        strokeColor: theme.colorScheme.surface,
                      );
                    },
                  ),
                  belowBarData: BarAreaData(
                    show: true,
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        theme.colorScheme.secondary.withValues(alpha: 0.3),
                        theme.colorScheme.secondary.withValues(alpha: 0.05),
                      ],
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

  Widget _buildAchievementsList(GamificationState state) {
    if (state.unlockedAchievements.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              const Icon(Icons.emoji_events_outlined,
                  color: Colors.grey, size: 48),
              const SizedBox(height: 8),
              Text(
                'No achievements yet',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const Text('Start learning to earn badges!'),
            ],
          ),
        ),
      );
    }

    // Show last 3 unlocked
    final recents = state.unlockedAchievements.reversed.take(3).toList();

    return Column(
      children: recents
          .map((achievement) => _buildAchievementItem(achievement))
          .toList(),
    );
  }

  Widget _buildAchievementItem(Achievement achievement) {
    final theme = Theme.of(context);

    return Card(
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: theme.colorScheme.primaryContainer,
          child:
              Text(achievement.iconPath, style: const TextStyle(fontSize: 20)),
        ),
        title: Text(
          achievement.title,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        subtitle: Text(
          achievement.description,
          style: theme.textTheme.bodyMedium,
        ),
        trailing: Icon(
          Icons.check_circle,
          color: theme.colorScheme.primary,
        ),
      ),
    );
  }

  Widget _buildInsightCard({
    required IconData icon,
    required String title,
    required String description,
    required Color color,
  }) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
            color: theme.colorScheme.outlineVariant.withValues(alpha: 0.5)),
      ),
      padding: const EdgeInsets.all(20),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              icon,
              color: color,
              size: 24,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
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
