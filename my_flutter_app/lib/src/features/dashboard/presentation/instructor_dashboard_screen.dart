import 'dart:convert';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/core/constants/api_constants.dart';
import 'package:my_flutter_app/src/features/dashboard/data/dashboard_repository.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

// Providers
final instructorStatsProvider =
    FutureProvider<Map<String, dynamic>>((ref) async {
  return ref.watch(dashboardRepositoryProvider).getStats();
});

final revenueChartProvider = FutureProvider<List<dynamic>>((ref) async {
  return ref.watch(dashboardRepositoryProvider).getRevenueChartData();
});

final dashboardStreamProvider =
    StreamProvider.autoDispose<Map<String, dynamic>>((ref) {
  final wsUrl = '${ApiConstants.wsUrl}dashboard/instructor/';
  final channel = WebSocketChannel.connect(Uri.parse(wsUrl));

  ref.onDispose(() => channel.sink.close());

  return channel.stream.map((event) {
    if (event is String) {
      return jsonDecode(event) as Map<String, dynamic>;
    }
    return {};
  });
});

class InstructorDashboardScreen extends ConsumerStatefulWidget {
  const InstructorDashboardScreen({super.key});

  @override
  ConsumerState<InstructorDashboardScreen> createState() =>
      _InstructorDashboardScreenState();
}

class _InstructorDashboardScreenState
    extends ConsumerState<InstructorDashboardScreen> {
  // Local state to hold merged data
  Map<String, dynamic>? _liveStats;

  @override
  Widget build(BuildContext context) {
    // Listen to stream for real-time updates
    ref.listen(dashboardStreamProvider, (previous, next) {
      next.whenData((event) {
        if (event['type'] == 'stats_update') {
          setState(() {
            // Merge or update local stats
            final data = event['data'] as Map<String, dynamic>;
            // Assuming the stream sends deltas or full objects.
            // For this demo, let's assume we update the 'total_revenue' and 'active_students'
            if (_liveStats != null) {
              // Parse current values
              var currentRev =
                  double.tryParse(_liveStats!['total_revenue'].toString()) ?? 0;
              var currentStudents =
                  int.tryParse(_liveStats!['total_students'].toString()) ?? 0;

              if (data.containsKey('revenue_bump')) {
                currentRev += data['revenue_bump'] as num;
              }
              if (data.containsKey('active_students')) {
                currentStudents = (data['active_students'] as num).toInt();
              }

              _liveStats!['total_revenue'] = currentRev.toStringAsFixed(2);
              _liveStats!['total_students'] = currentStudents;
            }
          });
        }
      });
    });

    final statsAsync = ref.watch(instructorStatsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Instructor Dashboard'),
        actions: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            margin: const EdgeInsets.only(right: 16),
            decoration: BoxDecoration(
              color: Colors.red.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(20),
              border:
                  Border.all(color: Colors.redAccent.withValues(alpha: 0.5)),
            ),
            child: Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Colors.redAccent,
                    shape: BoxShape.circle,
                  ),
                )
                    .animate(onPlay: (controller) => controller.repeat())
                    .fadeIn(duration: const Duration(seconds: 1))
                    .then()
                    .fadeOut(duration: const Duration(seconds: 1)),
                const SizedBox(width: 8),
                const Text(
                  'LIVE',
                  style: TextStyle(
                      color: Colors.redAccent,
                      fontWeight: FontWeight.bold,
                      fontSize: 12),
                ),
              ],
            ),
          )
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Overview',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            statsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, stack) => Text('Error: $e'),
              data: (data) {
                // Initialize live stats once with initial API data
                _liveStats ??= Map.from(data);

                return Row(
                  children: [
                    Expanded(
                        child: _StatCard(
                            title: 'Students',
                            value: '${_liveStats!['total_students']}',
                            icon: Icons.people,
                            color: Colors.blue)),
                    Expanded(
                        child: _StatCard(
                            title: 'Revenue',
                            value: '\$${_liveStats!['total_revenue']}',
                            icon: Icons.attach_money,
                            color: Colors.green)),
                    Expanded(
                        child: _StatCard(
                            title: 'Rating',
                            value: '${_liveStats!['avg_rating']} ★',
                            icon: Icons.star,
                            color: Colors.amber)),
                  ],
                ).animate().slideY(begin: 0.2, curve: Curves.easeOutQuad);
              },
            ),
            const SizedBox(height: 24),
            const Text('Revenue Trends',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            SizedBox(
              height: 300,
              child: _buildRevenueChart(ref),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRevenueChart(WidgetRef ref) {
    final chartAsync = ref.watch(revenueChartProvider);
    return chartAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, s) => const Center(child: Text('Error loading chart')),
        data: (data) {
          if (data.isEmpty) {
            return const Center(child: Text('No revenue data'));
          }

          final spots = <FlSpot>[];
          for (final pointDynamic in data) {
            if (pointDynamic is Map<String, dynamic>) {
              spots.add(FlSpot((pointDynamic['x'] as num).toDouble(),
                  (pointDynamic['y'] as num).toDouble()));
            }
          }

          return LineChart(
            LineChartData(
              gridData: const FlGridData(show: false),
              titlesData: FlTitlesData(
                bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (val, meta) {
                          return Text('M${val.toInt()}');
                        })),
                leftTitles: const AxisTitles(
                    sideTitles: SideTitles(showTitles: true, reservedSize: 40)),
                topTitles: const AxisTitles(),
                rightTitles: const AxisTitles(),
              ),
              borderData: FlBorderData(show: false),
              lineTouchData: LineTouchData(
                  touchTooltipData: LineTouchTooltipData(
                getTooltipColor: (spot) =>
                    Colors.blueGrey.withValues(alpha: 0.8),
              )),
              lineBarsData: [
                LineChartBarData(
                  spots: spots,
                  isCurved: true,
                  color: Colors.blue,
                  barWidth: 4,
                  isStrokeCapRound: true,
                  dotData: const FlDotData(show: false),
                  belowBarData: BarAreaData(
                      show: true, color: Colors.blue.withValues(alpha: 0.1)),
                ),
              ],
            ),
          ).animate().fadeIn(duration: 800.ms);
        });
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard(
      {required this.title,
      required this.value,
      required this.icon,
      required this.color});
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4,
      shadowColor: color.withValues(alpha: 0.4),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 28),
            ),
            const SizedBox(height: 12),
            Text(value,
                style:
                    const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                overflow: TextOverflow.ellipsis),
            const SizedBox(height: 4),
            Text(title,
                style: TextStyle(color: Colors.grey[600], fontSize: 12)),
          ],
        ),
      ),
    );
  }
}
