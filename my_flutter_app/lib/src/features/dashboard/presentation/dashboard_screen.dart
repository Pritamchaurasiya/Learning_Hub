import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:my_flutter_app/l10n/app_localizations.dart';
import 'package:my_flutter_app/src/features/ai/presentation/widgets/recommended_courses_section.dart';
import 'package:my_flutter_app/src/features/analytics/data/analytics_repository.dart';
import 'package:my_flutter_app/src/features/auth/presentation/auth_controller.dart';
import 'package:my_flutter_app/src/features/dashboard/presentation/widgets/learning_analytics_chart.dart';
import 'package:my_flutter_app/src/features/notifications/data/notification_websocket_service.dart';

final userAnalyticsProvider = FutureProvider<UserAnalytics>((ref) {
  return ref.watch(analyticsRepositoryProvider).getUserAnalytics();
});

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userAsync = ref.watch(authControllerProvider);

    return userAsync.when(
      data: (user) {
        if (user == null) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            context.go('/login');
          });
          return const Scaffold(
              body: Center(child: CircularProgressIndicator()));
        }

        if (user.role == 'instructor' || user.username.startsWith('instr')) {
          return const _InstructorDashboard();
        }

        return const _StudentDashboard();
      },
      loading: () =>
          const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (_, __) =>
          const Scaffold(body: Center(child: Text('Error loading profile'))),
    );
  }
}

class _StudentDashboard extends ConsumerWidget {
  const _StudentDashboard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Listen to real-time AI background task completions
    ref.listen(notificationStreamProvider, (previous, next) {
      if (next.hasValue && next.value != null) {
        final payload = next.value!;
        if (payload['type'] == 'ai_action_result') {
          final data = payload['data'] as Map<String, dynamic>? ?? {};
          final result = data['result'] as Map<String, dynamic>? ?? {};
          final message = result['message']?.toString() ?? 'Action complete';

          if (!context.mounted) {
            return;
          }
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.auto_awesome, color: Colors.white),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'AI Assistant: $message',
                      style: GoogleFonts.outfit(color: Colors.white),
                    ),
                  ),
                ],
              ),
              backgroundColor: const Color(0xFF7C3AED),
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
              margin: const EdgeInsets.all(16),
              duration: const Duration(seconds: 5),
            ),
          );
        }
      }
    });

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC), // Light premium background
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.white,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF7C3AED).withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.school_rounded,
                  color: Color(0xFF7C3AED), size: 20),
            ),
            const SizedBox(width: 12),
            Text(AppLocalizations.of(context)?.appTitle ?? 'Learning Hub',
                style: GoogleFonts.outfit(
                    color: Colors.black87, fontWeight: FontWeight.bold)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.search, color: Colors.black54),
            onPressed: () => context.push('/courses'),
          ),
          IconButton(
            icon: const Icon(Icons.notifications_none_rounded,
                color: Colors.black54),
            onPressed: () => context.push('/notifications'),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Welcome Header
            Text(
              'Welcome back, Student!',
              style: GoogleFonts.outfit(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: const Color(0xFF1E293B),
              ),
            ).animate().fadeIn().slideX(),
            const SizedBox(height: 8),

            // Real AI Analytics Stats
            Consumer(
              builder: (context, ref, child) {
                final analyticsAsync = ref.watch(userAnalyticsProvider);
                return analyticsAsync.when(
                  data: (analytics) {
                    return Row(
                      children: [
                        const Icon(Icons.local_fire_department,
                            color: Colors.orange, size: 20),
                        const SizedBox(width: 4),
                        Text(
                          'Engagement: ${(analytics.engagementScore * 100).toInt()}% • ',
                          style: GoogleFonts.outfit(
                              color: Colors.grey[700],
                              fontWeight: FontWeight.w600),
                        ),
                        const Icon(Icons.timer,
                            color: Colors.blueGrey, size: 20),
                        const SizedBox(width: 4),
                        Text(
                          '${analytics.totalLearningHours.toStringAsFixed(1)} hrs total',
                          style: GoogleFonts.outfit(
                              color: Colors.grey[700],
                              fontWeight: FontWeight.w600),
                        )
                      ],
                    ).animate().fadeIn(delay: 100.ms);
                  },
                  loading: () => const SizedBox(height: 24),
                  error: (_, __) => const SizedBox(height: 24),
                );
              },
            ),

            const SizedBox(height: 24),

            // Stats Row
            const LearningAnalyticsChart().animate().fadeIn(delay: 200.ms),
            const SizedBox(height: 32),

            // Continue Learning
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Continue Learning',
                  style: GoogleFonts.outfit(
                      fontSize: 18, fontWeight: FontWeight.bold),
                ),
                TextButton(
                    onPressed: () => context.push('/courses'),
                    child: const Text('View All')),
              ],
            ),
            const SizedBox(height: 12),
            const _ContinueLearningCard(
              title: 'Flutter Masterclass 2024',
              progress: 0.65,
              lastLesson: 'State Management with Riverpod',
              imageColor: Colors.blueAccent,
            ).animate().fadeIn(delay: 300.ms),
            const SizedBox(height: 12),
            const _ContinueLearningCard(
              title: 'Data Structures & Algo',
              progress: 0.32,
              lastLesson: 'Graph Traversal (BFS/DFS)',
              imageColor: Colors.purpleAccent,
            ).animate().fadeIn(delay: 400.ms),

            const SizedBox(height: 32),

            // Recommended
            const RecommendedCoursesSection().animate().fadeIn(delay: 500.ms),

            const SizedBox(height: 48),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.go('/courses'),
        label: const Text('Explore Courses'),
        icon: const Icon(Icons.explore),
        backgroundColor: const Color(0xFF7C3AED),
      ),
    );
  }
}

class _ContinueLearningCard extends StatelessWidget {
  const _ContinueLearningCard({
    required this.title,
    required this.progress,
    required this.lastLesson,
    required this.imageColor,
  });

  final String title;
  final double progress;
  final String lastLesson;
  final Color imageColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.withValues(alpha: 0.1)),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 8,
              offset: const Offset(0, 2))
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              color: imageColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(Icons.play_circle_fill, color: imageColor, size: 30),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: GoogleFonts.outfit(
                        fontWeight: FontWeight.bold, fontSize: 16)),
                const SizedBox(height: 4),
                Text('Next: $lastLesson',
                    style:
                        GoogleFonts.outfit(color: Colors.grey, fontSize: 12)),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: progress,
                    minHeight: 6,
                    backgroundColor: Colors.grey[100],
                    color: imageColor,
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

class _InstructorDashboard extends ConsumerWidget {
  const _InstructorDashboard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark
          ? const Color(0xFF1E1E2E)
          : Colors.grey[50], // Dark bluish background
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Row(
          children: [
            const CircleAvatar(
              backgroundColor: Color(0xFF3B82F6),
              radius: 20,
              child: Icon(Icons.person, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Analytics Dashboard',
                  style: GoogleFonts.outfit(
                    fontSize: 12,
                    color: Colors.grey[400],
                  ),
                ),
                Text(
                  'Instructor Alex',
                  style: GoogleFonts.outfit(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined, color: Colors.white),
            onPressed: () => context.push('/notifications'),
          ),
        ],
      ),
      body: const SingleChildScrollView(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _PerformanceOverview(),
            SizedBox(height: 20),
            _CourseInsightsChart(),
            SizedBox(height: 20),
            _ImprovementSuggestion(),
            SizedBox(height: 20),
            Row(
              children: [
                Expanded(child: _SentimentAnalysis()),
                SizedBox(width: 16),
                Expanded(child: _AudienceGauge()),
              ],
            ),
            SizedBox(height: 20),
            _LessonPerformance(),
            SizedBox(height: 20),
            _RevenuePayouts(),
            SizedBox(height: 40),
          ],
        ),
      ),
    );
  }
}

class _PerformanceOverview extends StatelessWidget {
  const _PerformanceOverview();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Performance Overview',
          style: GoogleFonts.outfit(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 12),
        const Row(
          children: [
            Expanded(
              child: _StatCard(
                title: 'TOTAL REVENUE',
                value: r'$12,450',
                icon: Icons.monetization_on_outlined,
                color: Color(0xFF10B981), // Green
                trend: '+12%',
              ),
            ),
            SizedBox(width: 12),
            Expanded(
              child: _StatCard(
                title: 'ACTIVE STUDENTS',
                value: '1,242',
                icon: Icons.school_outlined,
                color: Color(0xFF3B82F6), // Blue
                trend: '+5%',
              ),
            ),
            SizedBox(width: 12),
            Expanded(
              child: _StatCard(
                title: 'COURSE RATING',
                value: '4.8',
                icon: Icons.star_border,
                color: Color(0xFFF59E0B), // Amber
                trend: '',
                isRating: true,
              ),
            ),
          ],
        ),
      ],
    ).animate().fadeIn().slideY(begin: 0.1);
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
    required this.trend,
    this.isRating = false,
  });

  final String title;
  final String value;
  final IconData icon;
  final Color color;
  final String trend;
  final bool isRating;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF27273A),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: color, size: 18),
              ),
              if (trend.isNotEmpty)
                Text(
                  trend,
                  style: GoogleFonts.outfit(
                    fontSize: 10,
                    color: const Color(0xFF10B981),
                    fontWeight: FontWeight.bold,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            title,
            style: GoogleFonts.outfit(
              fontSize: 10,
              color: Colors.grey,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Text(
                value,
                style: GoogleFonts.outfit(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              if (isRating) ...[
                const SizedBox(width: 4),
                const Icon(Icons.star, size: 14, color: Color(0xFFF59E0B)),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class _CourseInsightsChart extends StatelessWidget {
  const _CourseInsightsChart();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF27273A),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.bar_chart,
                      color: Color(0xFF3B82F6), size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'Course Insights',
                    style: GoogleFonts.outfit(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '7 Days',
                  style: GoogleFonts.outfit(color: Colors.white, fontSize: 12),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          SizedBox(
            height: 180,
            child: BarChart(
              BarChartData(
                gridData: const FlGridData(show: false),
                titlesData: FlTitlesData(
                  leftTitles: const AxisTitles(),
                  topTitles: const AxisTitles(),
                  rightTitles: const AxisTitles(),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      getTitlesWidget: (value, meta) {
                        const style =
                            TextStyle(color: Colors.grey, fontSize: 10);
                        Widget text;
                        switch (value.toInt()) {
                          case 0:
                            text = const Text('Mon', style: style);
                          case 1:
                            text = const Text('Tue', style: style);
                          case 2:
                            text = const Text('Wed', style: style);
                          case 3:
                            text = const Text('Thu', style: style);
                          case 4:
                            text = const Text('Fri', style: style);
                          case 5:
                            text = const Text('Sat', style: style);
                          case 6:
                            text = const Text('Sun', style: style);
                          default:
                            text = const Text('', style: style);
                        }
                        return SideTitleWidget(
                            meta: meta, space: 4, child: text);
                      },
                    ),
                  ),
                ),
                borderData: FlBorderData(show: false),
                barGroups: [
                  _makeGroupData(0, 8, 5),
                  _makeGroupData(1, 10, 6),
                  _makeGroupData(2, 14, 8),
                  _makeGroupData(3, 11, 7),
                  _makeGroupData(4, 16, 12),
                  _makeGroupData(5, 7, 5),
                  _makeGroupData(6, 4, 3),
                ],
              ),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(delay: 200.ms);
  }

  BarChartGroupData _makeGroupData(int x, double y1, double y2) {
    return BarChartGroupData(
      barsSpace: 4,
      x: x,
      barRods: [
        BarChartRodData(
          toY: y1,
          color: const Color(0xFF3B82F6),
          width: 8,
          borderRadius: BorderRadius.circular(4),
        ),
        BarChartRodData(
          toY: y2,
          color: const Color(0xFF8B5CF6),
          width: 8,
          borderRadius: BorderRadius.circular(4),
        ),
      ],
    );
  }
}

class _ImprovementSuggestion extends StatelessWidget {
  const _ImprovementSuggestion();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF2E2E48), Color(0xFF27273A)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFF3B82F6).withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.auto_awesome, color: Color(0xFF3B82F6)),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Improvement Suggestion',
                  style: GoogleFonts.outfit(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Quiz #3 has a 45% fail rate. Consider adding a review summary before the quiz.',
                  style: GoogleFonts.outfit(
                    color: Colors.grey[400],
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'View Lesson Details',
                  style: GoogleFonts.outfit(
                    color: const Color(0xFF3B82F6),
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn(delay: 300.ms);
  }
}

class _SentimentAnalysis extends StatelessWidget {
  const _SentimentAnalysis();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 160,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF27273A),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.sentiment_satisfied,
                  color: Colors.grey[400], size: 16),
              const SizedBox(width: 8),
              Text(
                'SENTIMENT',
                style: GoogleFonts.outfit(
                    color: Colors.grey,
                    fontSize: 10,
                    fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const Spacer(),
          Text(
            '84%',
            style: GoogleFonts.outfit(
              color: Colors.white,
              fontSize: 32,
              fontWeight: FontWeight.bold,
            ),
          ),
          Text(
            'Positive',
            style: GoogleFonts.outfit(
                color: const Color(0xFF10B981), fontSize: 12),
          ),
          const SizedBox(height: 12),
          LinearProgressIndicator(
            value: 0.84,
            backgroundColor: Colors.grey[800],
            color: const Color(0xFF10B981),
            borderRadius: BorderRadius.circular(4),
          ),
          const SizedBox(height: 8),
          Text(
            '"Clear audio", "Good pacing"',
            style: GoogleFonts.outfit(color: Colors.grey[500], fontSize: 10),
          ),
        ],
      ),
    ).animate().fadeIn(delay: 400.ms);
  }
}

class _AudienceGauge extends StatelessWidget {
  const _AudienceGauge();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 160,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF27273A),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.public, color: Colors.grey[400], size: 16),
              const SizedBox(width: 8),
              Text(
                'AUDIENCE',
                style: GoogleFonts.outfit(
                    color: Colors.grey,
                    fontSize: 10,
                    fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Expanded(
            child: Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  height: 80,
                  width: 80,
                  child: CircularProgressIndicator(
                    value: 0.65,
                    strokeWidth: 8,
                    backgroundColor:
                        const Color(0xFF8B5CF6).withValues(alpha: 0.2),
                    color: const Color(0xFF3B82F6),
                  ),
                ),
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '42',
                      style: GoogleFonts.outfit(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 18,
                      ),
                    ),
                    Text(
                      'Countries',
                      style: GoogleFonts.outfit(
                        color: Colors.grey,
                        fontSize: 10,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn(delay: 450.ms);
  }
}

class _LessonPerformance extends StatelessWidget {
  const _LessonPerformance();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF27273A),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Lesson Performance',
                style: GoogleFonts.outfit(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              Text(
                'View All',
                style: GoogleFonts.outfit(
                  color: const Color(0xFF3B82F6),
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const _LessonItem(
            title: '1. Intro to Mobile Design',
            score: '98% Retention',
            views: '1.2k Views',
            comments: '42 Comments',
            color: Color(0xFF10B981),
          ),
          const Divider(color: Colors.white10),
          const _LessonItem(
            title: '2. UX Principles Deep Dive',
            score: '85% Retention',
            views: '930 Views',
            comments: '21 Comments',
            color: Color(0xFF3B82F6),
          ),
          const Divider(color: Colors.white10),
          const _LessonItem(
            title: '3. Quiz: Research Methods',
            score: '45% Pass Rate',
            views: '890 Attempts',
            comments: 'Analyze Quiz ->',
            color: Color(0xFFEF4444),
            isAlert: true,
          ),
        ],
      ),
    ).animate().fadeIn(delay: 500.ms);
  }
}

class _LessonItem extends StatelessWidget {
  const _LessonItem({
    required this.title,
    required this.score,
    required this.views,
    required this.comments,
    required this.color,
    this.isAlert = false,
  });

  final String title;
  final String score;
  final String views;
  final String comments;
  final Color color;
  final bool isAlert;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              if (isAlert)
                const Icon(Icons.warning_amber_rounded,
                    color: Color(0xFFEF4444), size: 16)
              else
                const SizedBox.shrink(),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  title,
                  style: GoogleFonts.outfit(
                    color: Colors.white,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              Text(
                score,
                style: GoogleFonts.outfit(
                  color: color,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          LinearProgressIndicator(
            value: isAlert ? 0.45 : 0.9,
            backgroundColor: Colors.grey[800],
            color: color,
            minHeight: 4,
            borderRadius: BorderRadius.circular(2),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(Icons.remove_red_eye_outlined,
                  color: Colors.grey[600], size: 12),
              const SizedBox(width: 4),
              Text(
                views,
                style:
                    GoogleFonts.outfit(color: Colors.grey[600], fontSize: 10),
              ),
              const SizedBox(width: 16),
              Icon(Icons.chat_bubble_outline,
                  color: Colors.grey[600], size: 12),
              const SizedBox(width: 4),
              Text(
                comments,
                style: GoogleFonts.outfit(
                  color: isAlert ? const Color(0xFF3B82F6) : Colors.grey[600],
                  fontSize: 10,
                  fontWeight: isAlert ? FontWeight.bold : FontWeight.normal,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _RevenuePayouts extends StatelessWidget {
  const _RevenuePayouts();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF27273A),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: const BoxDecoration(
                  color: Color(0xFF10B981),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.attach_money,
                    color: Colors.white, size: 16),
              ),
              const SizedBox(width: 12),
              Text(
                'Revenue & Payouts',
                style: GoogleFonts.outfit(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Total Earnings (Oct)',
                    style: GoogleFonts.outfit(
                        color: Colors.grey[400], fontSize: 12),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    r'$1,240.50',
                    style: GoogleFonts.outfit(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 24,
                    ),
                  ),
                ],
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.grey[800],
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  children: [
                    Text(
                      'History',
                      style:
                          GoogleFonts.outfit(color: Colors.white, fontSize: 12),
                    ),
                    const SizedBox(width: 4),
                    const Icon(Icons.history, color: Colors.white, size: 14),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF1F1F35),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
            ),
            child: Row(
              children: [
                const Icon(Icons.calendar_today,
                    color: Color(0xFF10B981), size: 18),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Upcoming Payout',
                      style: GoogleFonts.outfit(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                        fontSize: 12,
                      ),
                    ),
                    Text(
                      'Est. Oct 31, 2025',
                      style: GoogleFonts.outfit(
                          color: Colors.grey[500], fontSize: 10),
                    ),
                  ],
                ),
                const Spacer(),
                Text(
                  r'$840.00',
                  style: GoogleFonts.outfit(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn(delay: 600.ms);
  }
}
