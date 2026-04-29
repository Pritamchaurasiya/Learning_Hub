import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/services/api_client.dart';
import '../../shared/widgets/app_feedback.dart';
import 'dart:async';

/// Model for Challenge data
class Challenge {
  final int id;
  final String title;
  final String description;
  final String type;
  final String difficulty;
  final int xpReward;
  final DateTime startsAt;
  final DateTime endsAt;
  final int participantCount;
  final double completionPercentage;
  final Map<String, dynamic> requirements;
  final ChallengeUserStatus userStatus;

  Challenge({
    required this.id,
    required this.title,
    required this.description,
    required this.type,
    required this.difficulty,
    required this.xpReward,
    required this.startsAt,
    required this.endsAt,
    required this.participantCount,
    required this.completionPercentage,
    required this.requirements,
    required this.userStatus,
  });

  factory Challenge.fromJson(Map<String, dynamic> json) {
    return Challenge(
      id: json['id'] as int,
      title: json['title'] as String,
      description: json['description'] as String,
      type: json['type'] as String,
      difficulty: json['difficulty'] as String,
      xpReward: json['xp_reward'] as int,
      startsAt: DateTime.parse(json['starts_at'] as String),
      endsAt: DateTime.parse(json['ends_at'] as String),
      participantCount: json['participant_count'] as int,
      completionPercentage:
          ((json['completion_percentage'] as num?) ?? 0).toDouble(),
      requirements: json['requirements'] as Map<String, dynamic>? ?? {},
      userStatus: ChallengeUserStatus.fromJson(
          json['user_status'] as Map<String, dynamic>),
    );
  }

  Duration get timeRemaining => endsAt.difference(DateTime.now());
  bool get isExpired => DateTime.now().isAfter(endsAt);
}

class ChallengeUserStatus {
  final bool joined;
  final int progress;
  final int target;
  final bool isCompleted;

  ChallengeUserStatus({
    required this.joined,
    required this.progress,
    required this.target,
    required this.isCompleted,
  });

  factory ChallengeUserStatus.fromJson(Map<String, dynamic> json) {
    return ChallengeUserStatus(
      joined: json['joined'] as bool? ?? false,
      progress: json['progress'] as int? ?? 0,
      target: json['target'] as int? ?? 1,
      isCompleted: json['is_completed'] as bool? ?? false,
    );
  }

  double get progressPercentage =>
      target > 0 ? (progress / target).clamp(0.0, 1.0) : 0.0;
}

/// Challenges Screen - Gamification 2.0
class ChallengesScreen extends ConsumerStatefulWidget {
  const ChallengesScreen({super.key});

  @override
  ConsumerState<ChallengesScreen> createState() => _ChallengesScreenState();
}

class _ChallengesScreenState extends ConsumerState<ChallengesScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<Challenge> _challenges = [];
  Map<String, dynamic> _stats = {};
  bool _isLoading = true;
  String? _error;
  Timer? _countdownTimer;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadData();
    _startCountdownTimer();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _countdownTimer?.cancel();
    super.dispose();
  }

  void _startCountdownTimer() {
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final apiClient = ApiClient.instance;

      // Load challenges
      final challengesResponse =
          await apiClient.get<Map<String, dynamic>>('/api/v1/ai/challenges/');
      final challengesData = challengesResponse.data;
      if (challengesData != null && challengesData['status'] == 'success') {
        final List<dynamic> data =
            (challengesData['data'] as List<dynamic>?) ?? [];
        _challenges = data
            .map((c) => Challenge.fromJson(c as Map<String, dynamic>))
            .toList();
      }

      // Load stats
      final statsResponse = await apiClient
          .get<Map<String, dynamic>>('/api/v1/ai/challenges/stats/');
      final statsData = statsResponse.data;
      if (statsData != null && statsData['status'] == 'success') {
        _stats = (statsData['data'] as Map<String, dynamic>?) ?? {};
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _joinChallenge(Challenge challenge) async {
    try {
      final apiClient = ApiClient.instance;
      await apiClient.post<Map<String, dynamic>>(
          '/api/v1/ai/challenges/${challenge.id}/join/');

      if (mounted) {
        AppFeedback.showSuccess(context, 'Joined "${challenge.title}"! 🎯');
      }

      unawaited(_loadData()); // Refresh
    } catch (e) {
      if (mounted) {
        AppFeedback.showError(context, 'Failed to join: $e');
      }
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
              Color(0xFF1A1A2E),
              Color(0xFF16213E),
              Color(0xFF0F3460),
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              _buildHeader(),
              _buildStatsBar(),
              _buildTabBar(),
              Expanded(
                child: _isLoading
                    ? _buildSkeletonLoader()
                    : _error != null
                        ? _buildError()
                        : _buildTabContent(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.white),
            onPressed: () => Navigator.pop(context),
          ),
          const SizedBox(width: 8),
          const Icon(Icons.emoji_events, color: Colors.amber, size: 32),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Challenges',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                'Complete and earn rewards!',
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.7),
                  fontSize: 14,
                ),
              ),
            ],
          ),
          const Spacer(),
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white70),
            onPressed: _loadData,
          ),
        ],
      ),
    );
  }

  Widget _buildStatsBar() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Colors.purple.withValues(alpha: 0.3),
            Colors.blue.withValues(alpha: 0.3),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildStatItem('Completed',
              _stats['total_completed']?.toString() ?? '0', Icons.check_circle),
          _buildStatItem(
              'Active',
              _stats['active_challenges']?.toString() ?? '0',
              Icons.play_circle),
          _buildStatItem(
              'XP Earned',
              _stats['total_xp_from_challenges']?.toString() ?? '0',
              Icons.star),
        ],
      ),
    );
  }

  Widget _buildStatItem(String label, String value, IconData icon) {
    return Column(
      children: [
        Icon(icon, color: Colors.amber, size: 28),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 20,
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

  Widget _buildTabBar() {
    return Container(
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: TabBar(
        controller: _tabController,
        indicator: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          color: Colors.amber,
        ),
        labelColor: Colors.black,
        unselectedLabelColor: Colors.white70,
        tabs: const [
          Tab(text: 'Active'),
          Tab(text: 'Joined'),
          Tab(text: 'Completed'),
        ],
      ),
    );
  }

  Widget _buildTabContent() {
    return TabBarView(
      controller: _tabController,
      children: [
        _buildChallengeList(
            _challenges.where((c) => !c.userStatus.isCompleted).toList()),
        _buildChallengeList(_challenges
            .where((c) => c.userStatus.joined && !c.userStatus.isCompleted)
            .toList()),
        _buildChallengeList(
            _challenges.where((c) => c.userStatus.isCompleted).toList()),
      ],
    );
  }

  Widget _buildChallengeList(List<Challenge> challenges) {
    if (challenges.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.emoji_events_outlined,
                size: 64, color: Colors.white.withValues(alpha: 0.3)),
            const SizedBox(height: 16),
            Text(
              'No challenges here',
              style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.5), fontSize: 16),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: challenges.length,
        itemBuilder: (context, index) => _buildChallengeCard(challenges[index]),
      ),
    );
  }

  Widget _buildChallengeCard(Challenge challenge) {
    final difficultyColors = {
      'easy': Colors.green,
      'medium': Colors.orange,
      'hard': Colors.red,
      'legendary': Colors.purple,
    };

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: challenge.userStatus.isCompleted
              ? [
                  Colors.green.withValues(alpha: 0.2),
                  Colors.green.withValues(alpha: 0.1)
                ]
              : [
                  Colors.white.withValues(alpha: 0.1),
                  Colors.white.withValues(alpha: 0.05)
                ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: challenge.userStatus.isCompleted
              ? Colors.green.withValues(alpha: 0.5)
              : Colors.white.withValues(alpha: 0.1),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color:
                        difficultyColors[challenge.difficulty] ?? Colors.grey,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    challenge.difficulty.toUpperCase(),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.blue.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    challenge.type.toUpperCase(),
                    style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 10,
                    ),
                  ),
                ),
                const Spacer(),
                if (challenge.userStatus.isCompleted)
                  const Icon(Icons.check_circle, color: Colors.green, size: 24),
              ],
            ),
            const SizedBox(height: 12),

            // Title & Description
            Text(
              challenge.title,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              challenge.description,
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.7),
                fontSize: 14,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 12),

            // Progress
            if (challenge.userStatus.joined &&
                !challenge.userStatus.isCompleted) ...[
              Row(
                children: [
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: LinearProgressIndicator(
                        value: challenge.userStatus.progressPercentage,
                        backgroundColor: Colors.white.withValues(alpha: 0.1),
                        valueColor: const AlwaysStoppedAnimation(Colors.amber),
                        minHeight: 8,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    '${challenge.userStatus.progress}/${challenge.userStatus.target}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
            ],

            // Footer
            Row(
              children: [
                Icon(Icons.people,
                    size: 16, color: Colors.white.withValues(alpha: 0.5)),
                const SizedBox(width: 4),
                Text(
                  '${challenge.participantCount} joined',
                  style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.5), fontSize: 12),
                ),
                const SizedBox(width: 16),
                Icon(Icons.timer,
                    size: 16, color: Colors.white.withValues(alpha: 0.5)),
                const SizedBox(width: 4),
                Text(
                  _formatTimeRemaining(challenge.timeRemaining),
                  style: TextStyle(
                    color: challenge.timeRemaining.inHours < 24
                        ? Colors.orange
                        : Colors.white.withValues(alpha: 0.5),
                    fontSize: 12,
                  ),
                ),
                const Spacer(),
                Row(
                  children: [
                    const Icon(Icons.star, color: Colors.amber, size: 16),
                    const SizedBox(width: 4),
                    Text(
                      '+${challenge.xpReward} XP',
                      style: const TextStyle(
                        color: Colors.amber,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ],
            ),

            // Join Button
            if (!challenge.userStatus.joined &&
                !challenge.userStatus.isCompleted) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => _joinChallenge(challenge),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.amber,
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text(
                    'JOIN CHALLENGE',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _formatTimeRemaining(Duration duration) {
    if (duration.isNegative) return 'Expired';
    if (duration.inDays > 0) return '${duration.inDays}d left';
    if (duration.inHours > 0) return '${duration.inHours}h left';
    if (duration.inMinutes > 0) return '${duration.inMinutes}m left';
    return '${duration.inSeconds}s left';
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 64, color: Colors.red),
          const SizedBox(height: 16),
          Text(
            'Error: $_error',
            style: const TextStyle(color: Colors.white),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _loadData,
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildSkeletonLoader() {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: 4,
      itemBuilder: (context, index) => Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.05),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                _shimmerBox(60, 20),
                const SizedBox(width: 8),
                _shimmerBox(70, 20),
              ],
            ),
            const SizedBox(height: 16),
            _shimmerBox(double.infinity, 22),
            const SizedBox(height: 8),
            _shimmerBox(200, 14),
            const SizedBox(height: 12),
            _shimmerBox(double.infinity, 8),
            const SizedBox(height: 12),
            Row(
              children: [
                _shimmerBox(80, 14),
                const Spacer(),
                _shimmerBox(60, 18),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _shimmerBox(double width, double height) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.3, end: 0.7),
      duration: const Duration(milliseconds: 800),
      builder: (context, value, child) {
        return Container(
          width: width == double.infinity ? double.infinity : width,
          height: height,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                Colors.white.withValues(alpha: value * 0.1),
                Colors.white.withValues(alpha: value * 0.2),
                Colors.white.withValues(alpha: value * 0.1),
              ],
            ),
            borderRadius: BorderRadius.circular(4),
          ),
        );
      },
    );
  }
}
