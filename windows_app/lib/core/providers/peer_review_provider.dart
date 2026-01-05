import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/peer_review_service.dart';

/// State for the Peer Review feature
class PeerReviewState {
  final bool isLoading;
  final List<PeerReviewAssignment> pendingReviews;
  final List<PeerReviewFeedback> myFeedback;
  final String? error;
  final bool isSubmitting;

  const PeerReviewState({
    this.isLoading = false,
    this.pendingReviews = const [],
    this.myFeedback = const [],
    this.error,
    this.isSubmitting = false,
  });

  PeerReviewState copyWith({
    bool? isLoading,
    List<PeerReviewAssignment>? pendingReviews,
    List<PeerReviewFeedback>? myFeedback,
    String? error,
    bool? isSubmitting,
  }) {
    return PeerReviewState(
      isLoading: isLoading ?? this.isLoading,
      pendingReviews: pendingReviews ?? this.pendingReviews,
      myFeedback: myFeedback ?? this.myFeedback,
      error: error ?? this.error,
      isSubmitting: isSubmitting ?? this.isSubmitting,
    );
  }
}

class PeerReviewNotifier extends StateNotifier<PeerReviewState> {
  final PeerReviewService _service;
  final String userId; // In real app, this comes from auth provider

  PeerReviewNotifier(this._service, this.userId)
      : super(const PeerReviewState()) {
    loadData();
  }

  Future<void> loadData() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final pending = await _service.getPendingReviews(userId);
      // Mock fetching feedback for my submissions
      // In real implementation, service would have getFeedbackForUser(userId)
      final feedback = <PeerReviewFeedback>[];

      state = state.copyWith(
        isLoading: false,
        pendingReviews: pending,
        myFeedback: feedback,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> submitReview(
      String assignmentId, String comments, Map<String, double> scores) async {
    state = state.copyWith(isSubmitting: true);
    try {
      await _service.submitReview(assignmentId, comments, scores);

      // Refresh list
      final pending = await _service.getPendingReviews(userId);
      state = state.copyWith(
        isSubmitting: false,
        pendingReviews: pending,
      );
    } catch (e) {
      state = state.copyWith(isSubmitting: false, error: e.toString());
    }
  }

  // Debug helper to create a mock assignment for testing UI
  Future<void> createMockAssignment(String submissionId) async {
    await _service.assignReviewer(submissionId, userId, 'student_456');
    await loadData();
  }
}

// Mock user ID for dev
const _currentUserId = 'user_123';

final peerReviewProvider =
    StateNotifierProvider<PeerReviewNotifier, PeerReviewState>((ref) {
  return PeerReviewNotifier(PeerReviewService.instance, _currentUserId);
});
