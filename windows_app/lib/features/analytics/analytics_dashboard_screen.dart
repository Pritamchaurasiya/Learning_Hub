import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/services/api_client.dart';
import '../../core/widgets/skeleton_loader.dart';

/// Analytics Dashboard Screen - Shows user learning insights
class AnalyticsDashboardScreen extends ConsumerStatefulWidget {
  const AnalyticsDashboardScreen({super.key});

  @override
  ConsumerState<AnalyticsDashboardScreen> createState() =>
      _AnalyticsDashboardScreenState();
}

class _AnalyticsDashboardScreenState
    extends ConsumerState<AnalyticsDashboardScreen> {
  Map<String, dynamic> _analytics = {};
  Map<String, int> _heatmapData = {};
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadAnalytics();
  }

  Future<void> _loadAnalytics() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final apiClient = ApiClient.instance;

      // Load analytics
      final analyticsResponse =
          await apiClient.get<Map<String, dynamic>>('/api/v1/ai/analytics/');
      final analyticsData = analyticsResponse.data;
      if (analyticsData != null && analyticsData['status'] == 'success') {
        _analytics = Map<String, dynamic>.from(analyticsData['data'] as Map);
      }

      // Load heatmap
      final heatmapResponse = await apiClient
          .get<Map<String, dynamic>>('/api/v1/ai/analytics/heatmap/');
      final heatmapData = heatmapResponse.data;
      if (heatmapData != null && heatmapData['status'] == 'success') {
        _heatmapData = Map<String, int>.from(heatmapData['data'] as Map);
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF0D1117),
              Color(0xFF161B22),
              Color(0xFF21262D),
            ],
          ),
        ),
        child: SafeArea(
          child: _isLoading
              ? _buildSkeletonLoading()
              : _error != null
                  ? _buildError()
                  : RefreshIndicator(
                      onRefresh: _loadAnalytics,
                      child: SingleChildScrollView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _buildHeader(),
                            const SizedBox(height: 24),
                            _buildEngagementCard(),
                            const SizedBox(height: 16),
                            _buildStatsGrid(),
                            const SizedBox(height: 24),
                            _buildActivityHeatmap(),
                            const SizedBox(height: 24),
                            _buildInsightsCard(),
                          ],
                        ),
                      ),
                    ),
        ),
      ),
    );
  }

  Widget _buildSkeletonLoading() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Skeleton
          const Row(
            children: [
              SkeletonLoader(width: 40, height: 40, borderRadius: 20),
              SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SkeletonLoader(width: 200, height: 24),
                    SizedBox(height: 8),
                    SkeletonLoader(width: 150, height: 16),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 32),
          // Engagement Card Skeleton
          const SkeletonLoader(height: 200, borderRadius: 20),
          const SizedBox(height: 16),
          // Stats Grid Skeleton
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.5,
            children: List.generate(
              4,
              (index) => const SkeletonLoader(height: 100, borderRadius: 16),
            ),
          ),
          const SizedBox(height: 24),
          const SkeletonLoader(width: 150, height: 24), // Heatmap Title
          const SizedBox(height: 12),
          const SkeletonLoader(height: 150, borderRadius: 12),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      children: [
        IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        const SizedBox(width: 8),
        const Icon(Icons.analytics, color: Colors.cyan, size: 28),
        const SizedBox(width: 12),
        const Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Learning Analytics',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                'Your personalized insights',
                style: TextStyle(color: Colors.grey, fontSize: 14),
              ),
            ],
          ),
        ),
        IconButton(
          icon: const Icon(Icons.refresh, color: Colors.grey),
          onPressed: _loadAnalytics,
        ),
      ],
    );
  }

  Widget _buildEngagementCard() {
    final double engagementScore =
        ((_analytics['engagement_score'] as num?) ?? 0.0).toDouble() * 100;
    final double consistencyScore =
        ((_analytics['consistency_score'] as num?) ?? 0.0).toDouble() * 100;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Colors.purple.withValues(alpha: 0.3),
            Colors.blue.withValues(alpha: 0.3),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildCircularProgress(
                'Engagement',
                engagementScore,
                Colors.cyan,
              ),
              _buildCircularProgress(
                'Consistency',
                consistencyScore,
                Colors.purple,
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.schedule, color: Colors.amber, size: 20),
              const SizedBox(width: 8),
              Text(
                'Best time: ${_analytics['preferred_time'] ?? 'evening'}',
                style: const TextStyle(color: Colors.white70),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCircularProgress(String label, double value, Color color) {
    return Column(
      children: [
        SizedBox(
          width: 100,
          height: 100,
          child: Stack(
            fit: StackFit.expand,
            children: [
              CircularProgressIndicator(
                value: value / 100,
                strokeWidth: 8,
                backgroundColor: Colors.white.withValues(alpha: 0.1),
                valueColor: AlwaysStoppedAnimation(color),
              ),
              Center(
                child: Text(
                  '${value.toInt()}%',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Text(label, style: const TextStyle(color: Colors.white70)),
      ],
    );
  }

  Widget _buildStatsGrid() {
    final stats = (_analytics['stats'] as Map<String, dynamic>?) ?? {};

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.5,
      children: [
        _buildStatCard(
          'Total Hours',
          '${_analytics['total_learning_hours'] ?? 0}h',
          Icons.timer,
          Colors.green,
        ),
        _buildStatCard(
          'Weekly Avg',
          '${_analytics['weekly_average_hours'] ?? 0}h',
          Icons.trending_up,
          Colors.blue,
        ),
        _buildStatCard(
          'Lessons Done',
          '${stats['lessons_completed'] ?? 0}',
          Icons.school,
          Colors.orange,
        ),
        _buildStatCard(
          'AI Questions',
          '${stats['ai_questions_asked'] ?? 0}',
          Icons.psychology,
          Colors.purple,
        ),
      ],
    );
  }

  Widget _buildStatCard(
      String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: color, size: 24),
              const SizedBox(width: 8),
              Text(
                value,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12)),
        ],
      ),
    );
  }

  Widget _buildActivityHeatmap() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Activity Heatmap',
          style: TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(12),
          ),
          child: _buildHeatmapGrid(),
        ),
        const SizedBox(height: 8),
        _buildHeatmapLegend(),
      ],
    );
  }

  Widget _buildHeatmapGrid() {
    // Generate last 52 weeks x 7 days
    final now = DateTime.now();
    final weeks = <List<DateTime?>>[];

    for (int w = 51; w >= 0; w--) {
      final weekDays = <DateTime?>[];
      for (int d = 0; d < 7; d++) {
        final date = now.subtract(Duration(days: w * 7 + (6 - d)));
        weekDays.add(date);
      }
      weeks.add(weekDays);
    }

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: weeks.map((week) {
          return Column(
            children: week.map((date) {
              if (date == null) return const SizedBox(width: 10, height: 10);

              final dateStr =
                  '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
              final count = _heatmapData[dateStr] ?? 0;

              return Container(
                width: 10,
                height: 10,
                margin: const EdgeInsets.all(1),
                decoration: BoxDecoration(
                  color: _getHeatmapColor(count),
                  borderRadius: BorderRadius.circular(2),
                ),
              );
            }).toList(),
          );
        }).toList(),
      ),
    );
  }

  Color _getHeatmapColor(int count) {
    if (count == 0) return Colors.grey.withValues(alpha: 0.2);
    if (count <= 3) return Colors.green.withValues(alpha: 0.3);
    if (count <= 6) return Colors.green.withValues(alpha: 0.5);
    if (count <= 10) return Colors.green.withValues(alpha: 0.7);
    return Colors.green;
  }

  Widget _buildHeatmapLegend() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Text('Less', style: TextStyle(color: Colors.grey, fontSize: 10)),
        const SizedBox(width: 4),
        ...[0, 3, 6, 10, 15].map((count) => Container(
              width: 12,
              height: 12,
              margin: const EdgeInsets.symmetric(horizontal: 2),
              decoration: BoxDecoration(
                color: _getHeatmapColor(count),
                borderRadius: BorderRadius.circular(2),
              ),
            )),
        const SizedBox(width: 4),
        const Text('More', style: TextStyle(color: Colors.grey, fontSize: 10)),
      ],
    );
  }

  Widget _buildInsightsCard() {
    final double burnoutRisk =
        ((_analytics['burnout_risk'] as num?) ?? 0.0).toDouble() * 100;
    final strengthAreas =
        List<String>.from((_analytics['strength_areas'] as List?) ?? []);
    final improvementAreas =
        List<String>.from((_analytics['improvement_areas'] as List?) ?? []);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'AI Insights',
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),

          // AI Narrative
          if (_analytics.containsKey('ai_narrative') &&
              _analytics['ai_narrative'] != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: Colors.blue.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.blue.withValues(alpha: 0.3)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.auto_awesome, color: Colors.blue, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _analytics['ai_narrative'] as String,
                      style: const TextStyle(
                        color: Colors.white,
                        fontStyle: FontStyle.italic,
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 12),

          // Burnout Risk
          Row(
            children: [
              Icon(
                burnoutRisk > 50 ? Icons.warning : Icons.check_circle,
                color: burnoutRisk > 50 ? Colors.orange : Colors.green,
              ),
              const SizedBox(width: 8),
              Text(
                'Burnout Risk: ${burnoutRisk.toInt()}%',
                style: TextStyle(
                  color: burnoutRisk > 50 ? Colors.orange : Colors.green,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Strengths
          if (strengthAreas.isNotEmpty) ...[
            const Text('💪 Strengths:',
                style: TextStyle(color: Colors.white70)),
            Wrap(
              spacing: 8,
              children: strengthAreas
                  .map((s) => Chip(
                        label: Text(s, style: const TextStyle(fontSize: 12)),
                        backgroundColor: Colors.green.withValues(alpha: 0.2),
                        labelStyle: const TextStyle(color: Colors.green),
                      ))
                  .toList(),
            ),
            const SizedBox(height: 8),
          ],

          // Areas to improve
          if (improvementAreas.isNotEmpty) ...[
            const Text('📈 Focus Areas:',
                style: TextStyle(color: Colors.white70)),
            Wrap(
              spacing: 8,
              children: improvementAreas
                  .map((s) => Chip(
                        label: Text(s, style: const TextStyle(fontSize: 12)),
                        backgroundColor: Colors.orange.withValues(alpha: 0.2),
                        labelStyle: const TextStyle(color: Colors.orange),
                      ))
                  .toList(),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 64, color: Colors.red),
          const SizedBox(height: 16),
          Text('Error: $_error', style: const TextStyle(color: Colors.white)),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: _loadAnalytics, child: const Text('Retry')),
        ],
      ),
    );
  }
}
