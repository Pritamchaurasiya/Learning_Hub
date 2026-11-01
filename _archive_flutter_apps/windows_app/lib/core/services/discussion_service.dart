import 'api_client.dart';
import '../../core/providers/discussion_provider.dart';

/// Service for handling discussion posts and replies
class DiscussionService {
  static final DiscussionService _instance = DiscussionService._();
  static DiscussionService get instance => _instance;

  DiscussionService._();

  final ApiClient _api = ApiClient.instance;

  /// Get posts for a course
  Future<List<DiscussionPost>> getPosts(String courseId) async {
    final response = await _api.get<Map<String, dynamic>>(
      '/courses/$courseId/discussions',
    );

    if (response.success && response.data != null) {
      final list = response.data!['posts'] as List;
      return list
          .map((e) => DiscussionPost.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Create a post
  Future<DiscussionPost?> createPost({
    required String courseId,
    required String title,
    required String content,
  }) async {
    final response = await _api.post<Map<String, dynamic>>(
      '/courses/$courseId/discussions',
      data: {
        'title': title,
        'content': content,
      },
    );

    if (response.success && response.data != null) {
      return DiscussionPost.fromJson(response.data!);
    }
    return null;
  }

  /// Get replies for a post
  Future<List<DiscussionReply>> getReplies(String postId) async {
    final response = await _api.get<Map<String, dynamic>>(
      '/discussions/$postId/replies',
    );

    if (response.success && response.data != null) {
      final list = response.data!['replies'] as List;
      return list
          .map((e) => DiscussionReply.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Add a reply
  Future<DiscussionReply?> addReply({
    required String postId,
    required String content,
  }) async {
    final response = await _api.post<Map<String, dynamic>>(
      '/discussions/$postId/replies',
      data: {'content': content},
    );

    if (response.success && response.data != null) {
      return DiscussionReply.fromJson(response.data!);
    }
    return null;
  }

  /// Toggle like on post
  Future<bool> togglePostLike(String postId) async {
    final response = await _api.post<Map<String, dynamic>>(
      '/discussions/$postId/like',
    );
    return response.success;
  }

  /// Toggle like on reply
  Future<bool> toggleReplyLike(String replyId) async {
    final response = await _api.post<Map<String, dynamic>>(
      '/discussions/replies/$replyId/like',
    );
    return response.success;
  }

  /// Delete post (author or admin)
  Future<bool> deletePost(String postId) async {
    final response = await _api.delete<void>('/discussions/$postId');
    return response.success;
  }
}
