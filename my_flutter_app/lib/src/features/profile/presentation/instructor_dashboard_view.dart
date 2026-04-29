import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:my_flutter_app/src/core/widgets/glass_container.dart';
import 'package:my_flutter_app/src/features/profile/data/instructor_repository.dart';

class InstructorDashboardView extends ConsumerWidget {
  const InstructorDashboardView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statsAsync = ref.watch(instructorDashboardProvider);
    final revenueAsync = ref.watch(instructorRevenueChartProvider);

    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF0F172A), Color(0xFF334155)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: statsAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: Color(0xFF3B82F6)),
        ),
        error: (err, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline,
                  color: Colors.redAccent, size: 48),
              const SizedBox(height: 16),
              Text(
                'Error loading dashboard',
                style: GoogleFonts.outfit(color: Colors.white70, fontSize: 16),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => ref.invalidate(instructorDashboardProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (stats) {
          final totalCourses = (stats['total_courses'] as num?)?.toInt() ?? 0;
          final totalStudents = (stats['total_students'] as num?)?.toInt() ?? 0;
          final totalRevenue =
              (stats['total_revenue'] as num?)?.toDouble() ?? 0.0;
          final avgRating = (stats['avg_rating'] as num?)?.toDouble() ?? 0.0;

          return RefreshIndicator(
            onRefresh: () async {
              ref
                ..invalidate(instructorDashboardProvider)
                ..invalidate(instructorRevenueChartProvider);
            },
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: [
                // 1. Performance Overview Header
                Row(
                  children: [
                    Text(
                      'Performance Overview',
                      style: GoogleFonts.outfit(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const Spacer(),
                    // Refresh button
                    IconButton(
                      onPressed: () {
                        ref
                          ..invalidate(instructorDashboardProvider)
                          ..invalidate(instructorRevenueChartProvider);
                      },
                      icon: const Icon(Icons.refresh,
                          color: Colors.white54, size: 20),
                      tooltip: 'Refresh Data',
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // 2. Key Metrics Row — REAL DATA
                LayoutBuilder(
                  builder: (context, constraints) {
                    final isWide = constraints.maxWidth > 600;
                    final metrics = [
                      _MetricCard(
                        title: 'Total Revenue',
                        value: '\$${_formatNumber(totalRevenue)}',
                        trend: totalRevenue > 0 ? 'Active' : 'No sales yet',
                        icon: Icons.monetization_on,
                        color: const Color(0xFF10B981),
                      ),
                      _MetricCard(
                        title: 'Active Students',
                        value: _formatNumber(totalStudents.toDouble()),
                        trend: totalStudents > 100
                            ? 'Growing'
                            : '$totalStudents enrolled',
                        icon: Icons.people,
                        color: const Color(0xFF3B82F6),
                      ),
                      _MetricCard(
                        title: 'Course Rating',
                        value: avgRating.toStringAsFixed(1),
                        trend: avgRating >= 4.5
                            ? '⭐ Top Rated'
                            : avgRating > 0
                                ? 'Keep improving'
                                : 'No ratings yet',
                        icon: Icons.star,
                        color: Colors.amber,
                      ),
                    ];

                    if (isWide) {
                      return Row(
                        children: metrics
                            .map((m) => Expanded(
                                    child: Padding(
                                  padding:
                                      const EdgeInsets.symmetric(horizontal: 4),
                                  child: m,
                                )))
                            .toList(),
                      ).animate().slideY(begin: 0.2, duration: 400.ms).fadeIn();
                    }
                    return Column(
                      children: metrics
                          .map((m) => Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: m,
                              ))
                          .toList(),
                    ).animate().slideY(begin: 0.2, duration: 400.ms).fadeIn();
                  },
                ),

                const SizedBox(height: 8),

                // Courses published metric
                GlassContainer(
                  opacity: 0.05,
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color:
                              const Color(0xFF8B5CF6).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.school,
                            color: Color(0xFF8B5CF6), size: 24),
                      ),
                      const SizedBox(width: 16),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Courses Published',
                            style: GoogleFonts.outfit(
                                color: Colors.white70, fontSize: 12),
                          ),
                          Text(
                            '$totalCourses',
                            style: GoogleFonts.outfit(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 24,
                            ),
                          ),
                        ],
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color:
                              const Color(0xFF10B981).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          totalCourses > 0 ? 'Active' : 'Get Started',
                          style: GoogleFonts.outfit(
                            color: const Color(0xFF10B981),
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ).animate().fadeIn(delay: 150.ms),

                const SizedBox(height: 24),

                // 3. Revenue Chart — REAL DATA
                revenueAsync.when(
                  loading: () => const GlassContainer(
                    height: 300,
                    opacity: 0.05,
                    padding: EdgeInsets.all(20),
                    child: Center(
                      child:
                          CircularProgressIndicator(color: Color(0xFF3B82F6)),
                    ),
                  ),
                  error: (_, __) => GlassContainer(
                    height: 300,
                    opacity: 0.05,
                    padding: const EdgeInsets.all(20),
                    child: Center(
                      child: Text(
                        'Revenue chart unavailable',
                        style: GoogleFonts.outfit(color: Colors.white38),
                      ),
                    ),
                  ),
                  data: (revenueData) {
                    return GlassContainer(
                      height: 300,
                      opacity: 0.05,
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Revenue Trends',
                                    style: GoogleFonts.outfit(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                  Text(
                                    revenueData.isNotEmpty
                                        ? '${revenueData.length}-Month Overview'
                                        : 'No data yet',
                                    style: GoogleFonts.outfit(
                                      fontSize: 12,
                                      color: Colors.white70,
                                    ),
                                  ),
                                ],
                              ),
                              _buildLiveIndicator(),
                            ],
                          ),
                          const SizedBox(height: 24),
                          Expanded(
                            child: revenueData.isEmpty
                                ? Center(
                                    child: Column(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        Icon(Icons.bar_chart,
                                            color: Colors.white
                                                .withValues(alpha: 0.15),
                                            size: 48),
                                        const SizedBox(height: 8),
                                        Text(
                                          'Revenue data will appear after your first sale',
                                          style: GoogleFonts.outfit(
                                            color: Colors.white38,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ],
                                    ),
                                  )
                                : _buildRevenueChart(revenueData),
                          ),
                        ],
                      ),
                    ).animate().fadeIn(delay: 200.ms);
                  },
                ),

                const SizedBox(height: 24),

                // 4. AI-Powered Improvement Suggestion
                _buildAiSuggestionCard(context, totalStudents, avgRating),

                const SizedBox(height: 24),

                // 5. Quick Actions Grid
                Text(
                  'Quick Actions',
                  style: GoogleFonts.outfit(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _QuickActionCard(
                        icon: Icons.add_circle_outline,
                        label: 'New Course',
                        color: const Color(0xFF3B82F6),
                        onTap: () {},
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _QuickActionCard(
                        icon: Icons.analytics_outlined,
                        label: 'Analytics',
                        color: const Color(0xFF10B981),
                        onTap: () {},
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _QuickActionCard(
                        icon: Icons.message_outlined,
                        label: 'Messages',
                        color: const Color(0xFFF59E0B),
                        onTap: () {},
                      ),
                    ),
                  ],
                ).animate().fadeIn(delay: 600.ms),

                const SizedBox(height: 40),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildLiveIndicator() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: const Color(0xFF10B981).withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border:
            Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: const BoxDecoration(
              color: Color(0xFF10B981),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            'Live Data',
            style: GoogleFonts.outfit(
              fontSize: 11,
              color: const Color(0xFF10B981),
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRevenueChart(List<Map<String, dynamic>> data) {
    final maxY = data.fold<double>(
        0,
        (prev, e) => (e['y'] as num).toDouble() > prev
            ? (e['y'] as num).toDouble()
            : prev);

    return BarChart(
      BarChartData(
        alignment: BarChartAlignment.spaceAround,
        maxY: maxY > 0 ? maxY * 1.2 : 20,
        barTouchData: BarTouchData(
          touchTooltipData: BarTouchTooltipData(
            getTooltipItem: (group, groupIndex, rod, rodIndex) {
              final label = groupIndex < data.length
                  ? (data[groupIndex]['x'] ?? '').toString()
                  : '';
              return BarTooltipItem(
                '$label\n\$${rod.toY.toStringAsFixed(0)}',
                GoogleFonts.outfit(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              );
            },
          ),
        ),
        titlesData: FlTitlesData(
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (value, meta) {
                final idx = value.toInt();
                if (idx >= 0 && idx < data.length) {
                  final label = (data[idx]['x'] ?? '').toString();
                  // Extract the month abbreviation
                  final shortLabel =
                      label.length > 3 ? label.substring(0, 3) : label;
                  return Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      shortLabel,
                      style: GoogleFonts.outfit(
                        fontSize: 11,
                        color: Colors.white60,
                      ),
                    ),
                  );
                }
                return const SizedBox.shrink();
              },
            ),
          ),
          leftTitles: const AxisTitles(),
          topTitles: const AxisTitles(),
          rightTitles: const AxisTitles(),
        ),
        gridData: const FlGridData(show: false),
        borderData: FlBorderData(show: false),
        barGroups: data.asMap().entries.map((entry) {
          final i = entry.key;
          final y = (entry.value['y'] as num).toDouble();
          return BarChartGroupData(
            x: i,
            barRods: [
              BarChartRodData(
                toY: y,
                gradient: const LinearGradient(
                  colors: [Color(0xFF3B82F6), Color(0xFF60A5FA)],
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                ),
                width: 18,
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(6)),
                backDrawRodData: BackgroundBarChartRodData(
                  show: true,
                  toY: maxY > 0 ? maxY * 1.2 : 20,
                  color: const Color(0xFF3B82F6).withValues(alpha: 0.06),
                ),
              ),
            ],
          );
        }).toList(),
      ),
    );
  }

  Widget _buildAiSuggestionCard(
      BuildContext context, int students, double rating) {
    String suggestion;
    String title;

    if (students == 0) {
      title = 'Getting Started';
      suggestion =
          'Create your first course to start building your student base. High-quality video content gets 3x more enrollments.';
    } else if (rating < 4.0 && rating > 0) {
      title = 'Improvement Opportunity';
      suggestion =
          'Your average rating of ${rating.toStringAsFixed(1)} can be improved. Consider adding more interactive quizzes and responding to student reviews.';
    } else if (students < 50) {
      title = 'Growth Strategy';
      suggestion =
          'Promote your courses with free preview videos. Courses with previews see 40% higher enrollment rates.';
    } else {
      title = 'Keep Growing';
      suggestion =
          'Great performance! Consider creating a course bundle or offering group discounts to boost revenue further.';
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF2E2E48), Color(0xFF1A1A2E)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF3B82F6).withValues(alpha: 0.2),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.auto_awesome, color: Colors.blueAccent),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '💡 $title',
                  style: GoogleFonts.outfit(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  suggestion,
                  style: GoogleFonts.outfit(
                    color: Colors.white70,
                    fontSize: 12,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn(delay: 400.ms);
  }

  String _formatNumber(double value) {
    if (value >= 1000000) {
      return '${(value / 1000000).toStringAsFixed(1)}M';
    } else if (value >= 1000) {
      return '${(value / 1000).toStringAsFixed(1)}K';
    }
    return value.toStringAsFixed(value.truncateToDouble() == value ? 0 : 2);
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.title,
    required this.value,
    required this.trend,
    required this.icon,
    required this.color,
  });

  final String title;
  final String value;
  final String trend;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return GlassContainer(
      opacity: 0.05,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: color, size: 18),
              ),
              const Spacer(),
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.6),
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: GoogleFonts.outfit(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title.toUpperCase(),
            style: GoogleFonts.outfit(
              fontSize: 9,
              color: Colors.white60,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.5,
            ),
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          Text(
            trend,
            style: GoogleFonts.outfit(
              fontSize: 11,
              color: color,
              fontWeight: FontWeight.w600,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

class _QuickActionCard extends StatelessWidget {
  const _QuickActionCard({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: GlassContainer(
          opacity: 0.05,
          padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 12),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: color, size: 22),
              ),
              const SizedBox(height: 10),
              Text(
                label,
                style: GoogleFonts.outfit(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
