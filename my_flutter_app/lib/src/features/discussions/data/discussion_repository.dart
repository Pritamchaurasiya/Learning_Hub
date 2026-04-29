import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/core/constants/api_constants.dart';
import 'package:my_flutter_app/src/core/network/api_client.dart';

class DiscussionRepository {
  DiscussionRepository(this._apiClient);
  final ApiClient _apiClient;

  // List Threads (with optional filtering by course/tag)
  Future<List<dynamic>> getThreads({String? courseId}) async {
    final response = await _apiClient.get(
      ApiConstants.discussions,
      queryParameters: courseId != null ? {'course': courseId} : null,
    );
    final data = response.data;
    return (data?['results'] as List<dynamic>?) ?? <dynamic>[];
  }

  // Get Single Thread with Replies
  Future<Map<String, dynamic>> getThreadDetail(String threadId) async {
    final response =
        await _apiClient.get('${ApiConstants.discussions}$threadId/');
    return response.data ?? <String, dynamic>{};
  }

  // Create New Thread
  Future<void> createThread(Map<String, dynamic> data) async {
    await _apiClient.post(ApiConstants.discussions, data: data);
  }

  // Get Replies for a Thread
  Future<List<dynamic>> getReplies(String threadId) async {
    // Assuming backend nested or flat structure.
    // Based on views.py: class DiscussionReplyViewSet ...
    // It uses thread_pk in kwargs -> implies nested router usually,
    // OR standard router filters?
    // Let's assume URL: /discussions/{id}/replies/ based on standard DRF nesting
    // OR /discussions/replies/?thread=id

    // *Correction*: views.py doesn't show router config.
    // Let's deduce: If standard nested SimpleRouter from drf-nested-routers:
    // discussions/threads/{id}/replies/

    // For now, I'll attempt the most standard approach:
    final response =
        await _apiClient.get('${ApiConstants.discussions}$threadId/replies/');
    final data = response.data;
    return (data?['results'] as List<dynamic>?) ?? <dynamic>[];
  }

  // Create Reply
  Future<void> createReply(String threadId, String content) async {
    await _apiClient.post('${ApiConstants.discussions}$threadId/replies/',
        data: {'content': content});
  }

  // Get AI Summary
  Future<Map<String, dynamic>> getThreadSummary(String threadId) async {
    final response =
        await _apiClient.get('${ApiConstants.discussions}$threadId/summarize/');
    return response.data?['data'] as Map<String, dynamic>? ?? {};
  }
}

final discussionRepositoryProvider = Provider<DiscussionRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return DiscussionRepository(apiClient);
});
