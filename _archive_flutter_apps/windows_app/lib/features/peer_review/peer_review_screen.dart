import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart'; // For kDebugMode
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:learning_hub/core/theme/app_colors.dart';
import 'package:learning_hub/core/providers/peer_review_provider.dart';
import 'package:learning_hub/core/services/peer_review_service.dart';

class PeerReviewScreen extends ConsumerStatefulWidget {
  const PeerReviewScreen({super.key});

  @override
  ConsumerState<PeerReviewScreen> createState() => _PeerReviewScreenState();
}

class _PeerReviewScreenState extends ConsumerState<PeerReviewScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reviewState = ref.watch(peerReviewProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Peer Reviews'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Pending Reviews'),
            Tab(text: 'My Feedback'),
          ],
        ),
        actions: [
          // specific debug action to generate data
          if (kDebugMode)
            IconButton(
              icon: const Icon(Icons.add_task),
              tooltip: 'Add Mock Assignment',
              onPressed: () {
                ref
                    .read(peerReviewProvider.notifier)
                    .createMockAssignment('sub_999');
              },
            ),
        ],
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _PendingReviewsTab(
            reviews: reviewState.pendingReviews,
            isLoading: reviewState.isLoading,
            onReviewPressed: (assignment) {
              _showGradingSheet(context, assignment, ref);
            },
          ),
          _MyFeedbackTab(feedback: reviewState.myFeedback),
        ],
      ),
    );
  }

  void _showGradingSheet(
      BuildContext context, PeerReviewAssignment assignment, WidgetRef ref) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _GradingSheet(assignment: assignment),
    );
  }
}

class _PendingReviewsTab extends StatelessWidget {
  final List<PeerReviewAssignment> reviews;
  final bool isLoading;
  final void Function(PeerReviewAssignment) onReviewPressed;

  const _PendingReviewsTab({
    required this.reviews,
    required this.isLoading,
    required this.onReviewPressed,
  });

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    final theme = Theme.of(context);

    if (reviews.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.assignment_turned_in_outlined,
                size: 64,
                color:
                    theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.5)),
            const SizedBox(height: 16),
            const Text(
              'No pending reviews',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'You\'re all caught up! Great job.',
              style: TextStyle(color: theme.colorScheme.onSurfaceVariant),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: reviews.length,
      itemBuilder: (context, index) {
        final review = reviews[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            contentPadding: const EdgeInsets.all(16),
            leading: CircleAvatar(
              backgroundColor: AppColors.primary.withValues(alpha: 0.1),
              child: const Icon(Icons.code, color: AppColors.primary),
            ),
            title: Text('Submission #${review.submissionId.substring(0, 8)}'),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 4),
                Text('Due: ${review.dueBy.toString().split(' ')[0]}'),
                const SizedBox(height: 4),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.warning.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    'Pending Review',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.warning.withValues(alpha: 1.0),
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            trailing: ElevatedButton(
              onPressed: () => onReviewPressed(review),
              child: const Text('Review'),
            ),
          ),
        );
      },
    );
  }
}

class _MyFeedbackTab extends StatelessWidget {
  final List<PeerReviewFeedback> feedback;

  const _MyFeedbackTab({required this.feedback});

  @override
  Widget build(BuildContext context) {
    if (feedback.isEmpty) {
      return const Center(child: Text('No feedback received yet.'));
    }
    // Implementation placeholder...
    return ListView(
        children: const [ListTile(title: Text('Feedback item placeholder'))]);
  }
}

class _GradingSheet extends ConsumerStatefulWidget {
  final PeerReviewAssignment assignment;

  const _GradingSheet({required this.assignment});

  @override
  ConsumerState<_GradingSheet> createState() => _GradingSheetState();
}

class _GradingSheetState extends ConsumerState<_GradingSheet> {
  final _commentController = TextEditingController();
  final Map<String, double> _scores = {
    'Code Quality': 5.0,
    'Logic': 5.0,
    'Naming': 5.0,
  };

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final notifier = ref.read(peerReviewProvider.notifier);

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Grade Submission',
            style: theme.textTheme.headlineSmall,
          ),
          const Divider(height: 32),

          // Criteria Sliders
          ..._scores.entries.map((entry) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(entry.key, style: theme.textTheme.titleMedium),
                    Text(entry.value.toStringAsFixed(1),
                        style: const TextStyle(fontWeight: FontWeight.bold)),
                  ],
                ),
                Slider(
                  value: entry.value,
                  min: 0,
                  max: 10,
                  divisions: 20,
                  label: entry.value.toString(),
                  onChanged: (val) {
                    setState(() => _scores[entry.key] = val);
                  },
                ),
                const SizedBox(height: 12),
              ],
            );
          }),

          const SizedBox(height: 16),
          TextField(
            controller: _commentController,
            decoration: const InputDecoration(
              labelText: 'Feedback Comments',
              border: OutlineInputBorder(),
              alignLabelWithHint: true,
            ),
            maxLines: 4,
          ),
          const SizedBox(height: 24),

          ElevatedButton(
            onPressed: () {
              notifier.submitReview(
                widget.assignment.id,
                _commentController.text,
                _scores,
              );
              Navigator.pop(context);
            },
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
            child: const Text('Submit Review'),
          ),
        ],
      ),
    );
  }
}
