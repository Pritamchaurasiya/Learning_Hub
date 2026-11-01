import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/features/analytics/data/analytics_repository.dart';

final heatmapProvider = FutureProvider<Map<String, int>>((ref) {
  return ref.watch(analyticsRepositoryProvider).getActivityHeatmap();
});

class LearningAnalyticsChart extends ConsumerWidget {
  const LearningAnalyticsChart({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final heatmapAsync = ref.watch(heatmapProvider);

    return Container(
      height: 220,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Weekly Activity Intensity',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 20),
          Expanded(
            child: heatmapAsync.when(
              data: (data) {
                // Compute spots based on real data for the last 7 days.
                // Fallback to 0 if no data exists.
                final now = DateTime.now();
                final spots = <FlSpot>[];
                for (var i = 0; i < 7; i++) {
                  // Days going backward from today, but mapped 0(Mon)-6(Sun)
                  // or just 0 (6 days ago) to 6 (today) for display timeline.
                  final d = now.subtract(Duration(days: 6 - i));
                  final dateStr =
                      "${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}";
                  final count = data[dateStr] ?? 0;
                  spots.add(FlSpot(i.toDouble(), count.toDouble()));
                }

                // Calculate max Y for dynamic scaling
                double maxY = 10; // min fallback
                for (final spot in spots) {
                  if (spot.y > maxY) {
                    maxY = spot.y + 5;
                  }
                }

                return LineChart(
                  LineChartData(
                    minY: 0,
                    maxY: maxY,
                    gridData: const FlGridData(show: false),
                    titlesData: FlTitlesData(
                      leftTitles: const AxisTitles(),
                      topTitles: const AxisTitles(),
                      rightTitles: const AxisTitles(),
                      bottomTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          getTitlesWidget: (value, meta) {
                            if (value.toInt() < 0 || value.toInt() > 6) {
                              return const SizedBox();
                            }
                            final d =
                                now.subtract(Duration(days: 6 - value.toInt()));
                            final weekdays = [
                              'M',
                              'T',
                              'W',
                              'T',
                              'F',
                              'S',
                              'S'
                            ];
                            // weekday is 1-7 in Dart where 1 = Monday.
                            final letter = weekdays[d.weekday - 1];

                            return Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: Text(
                                letter,
                                style: Theme.of(context)
                                    .textTheme
                                    .bodySmall
                                    ?.copyWith(
                                      color: Colors.grey,
                                      fontWeight: FontWeight.bold,
                                    ),
                              ),
                            );
                          },
                          interval: 1,
                        ),
                      ),
                    ),
                    borderData: FlBorderData(show: false),
                    lineBarsData: [
                      LineChartBarData(
                        spots: spots,
                        isCurved: true,
                        gradient: const LinearGradient(
                          colors: [Colors.purple, Colors.blue],
                        ),
                        barWidth: 4,
                        isStrokeCapRound: true,
                        dotData: const FlDotData(show: false),
                        belowBarData: BarAreaData(
                          show: true,
                          gradient: LinearGradient(
                            colors: [
                              Colors.purple.withValues(alpha: 0.2),
                              Colors.blue.withValues(alpha: 0),
                            ],
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (_, __) =>
                  const Center(child: Text('Failed to load heatmap')),
            ),
          ),
        ],
      ),
    );
  }
}
