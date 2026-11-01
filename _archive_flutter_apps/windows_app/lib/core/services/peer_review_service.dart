import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

/// Review status
enum PeerReviewStatus {
  pending,
  submitted,
  graded,
  disputed,
}

/// Peer review assignment
class PeerReviewAssignment {
  final String id;
  final String submissionId;
  final String reviewerId;
  final String revieweeId;
  final DateTime assignedAt;
  final DateTime dueBy;
  PeerReviewStatus status;
  PeerReviewFeedback? feedback;

  PeerReviewAssignment({
    required this.id,
    required this.submissionId,
    required this.reviewerId,
    required this.revieweeId,
    required this.assignedAt,
    required this.dueBy,
    this.status = PeerReviewStatus.pending,
    this.feedback,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'submissionId': submissionId,
        'reviewerId': reviewerId,
        'revieweeId': revieweeId,
        'assignedAt': assignedAt.toIso8601String(),
        'dueBy': dueBy.toIso8601String(),
        'status': status.index,
        'feedback': feedback?.toJson(),
      };

  factory PeerReviewAssignment.fromJson(Map<String, dynamic> json) {
    return PeerReviewAssignment(
      id: json['id'] as String,
      submissionId: json['submissionId'] as String,
      reviewerId: json['reviewerId'] as String,
      revieweeId: json['revieweeId'] as String,
      assignedAt: DateTime.parse(json['assignedAt'] as String),
      dueBy: DateTime.parse(json['dueBy'] as String),
      status: PeerReviewStatus.values[json['status'] as int],
      feedback: json['feedback'] != null
          ? PeerReviewFeedback.fromJson(
              json['feedback'] as Map<String, dynamic>)
          : null,
    );
  }
}

/// Feedback content
class PeerReviewFeedback {
  final String comments;
  final double score; // 0-100
  final Map<String, double> criteriaScores; // criterionId -> score
  final DateTime submittedAt;

  PeerReviewFeedback({
    required this.comments,
    required this.score,
    required this.criteriaScores,
    required this.submittedAt,
  });

  Map<String, dynamic> toJson() => {
        'comments': comments,
        'score': score,
        'criteriaScores': criteriaScores,
        'submittedAt': submittedAt.toIso8601String(),
      };

  factory PeerReviewFeedback.fromJson(Map<String, dynamic> json) {
    return PeerReviewFeedback(
      comments: json['comments'] as String,
      score: (json['score'] as num).toDouble(),
      criteriaScores: Map<String, double>.from((json['criteriaScores'] ??
          <String, double>{}) as Map<dynamic, dynamic>),
      submittedAt: DateTime.parse(json['submittedAt'] as String),
    );
  }
}

/// Service to manage peer reviews with local persistence
class PeerReviewService {
  static final PeerReviewService _instance = PeerReviewService._();
  static PeerReviewService get instance => _instance;
  static const String _storageKey = 'peer_reviews';

  PeerReviewService._();

  Future<List<PeerReviewAssignment>> _loadAssignments() async {
    final prefs = await SharedPreferences.getInstance();
    final jsonString = prefs.getString(_storageKey);
    if (jsonString == null) return [];

    final List<dynamic> jsonList = jsonDecode(jsonString) as List<dynamic>;
    return jsonList
        .map((j) => PeerReviewAssignment.fromJson(j as Map<String, dynamic>))
        .toList();
  }

  Future<void> _saveAssignments(List<PeerReviewAssignment> assignments) async {
    final prefs = await SharedPreferences.getInstance();
    final jsonString = jsonEncode(assignments.map((a) => a.toJson()).toList());
    await prefs.setString(_storageKey, jsonString);
  }

  /// Assign a peer reviewer
  Future<PeerReviewAssignment> assignReviewer(
      String submissionId, String reviewerId, String revieweeId) async {
    final assignments = await _loadAssignments();

    final id = const Uuid().v4();
    final assignment = PeerReviewAssignment(
      id: id,
      submissionId: submissionId,
      reviewerId: reviewerId,
      revieweeId: revieweeId,
      assignedAt: DateTime.now(),
      dueBy: DateTime.now().add(const Duration(days: 3)),
    );

    assignments.add(assignment);
    await _saveAssignments(assignments);
    return assignment;
  }

  /// Submit a review
  Future<void> submitReview(String assignmentId, String comments,
      Map<String, double> criteriaScores) async {
    final assignments = await _loadAssignments();
    final index = assignments.indexWhere((a) => a.id == assignmentId);

    if (index == -1) throw Exception('Assignment not found');
    final assignment = assignments[index];

    // Calculate weighted average score
    double totalScore = 0;
    if (criteriaScores.isNotEmpty) {
      totalScore =
          criteriaScores.values.reduce((a, b) => a + b) / criteriaScores.length;
    }

    assignment.feedback = PeerReviewFeedback(
      comments: comments,
      score: totalScore,
      criteriaScores: criteriaScores,
      submittedAt: DateTime.now(),
    );
    assignment.status = PeerReviewStatus.graded;

    assignments[index] = assignment;
    await _saveAssignments(assignments);

    // Trigger notification service here
    if (kDebugMode) {
      debugPrint(
          'Review submitted for ${assignment.submissionId}: Score $totalScore');
    }
  }

  /// Get pending reviews for a user
  Future<List<PeerReviewAssignment>> getPendingReviews(String userId) async {
    final assignments = await _loadAssignments();
    return assignments
        .where((a) =>
            a.reviewerId == userId && a.status == PeerReviewStatus.pending)
        .toList();
  }

  /// Get completed reviews for a submission
  Future<List<PeerReviewFeedback>> getFeedbackForSubmission(
      String submissionId) async {
    final assignments = await _loadAssignments();
    return assignments
        .where((a) => a.submissionId == submissionId && a.feedback != null)
        .map((a) => a.feedback!)
        .toList();
  }
}
