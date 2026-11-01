import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/discussion_service.dart';

/// Discussion post model
class DiscussionPost {
  final String id;
  final String courseId;
  final String authorId;
  final String authorName;
  final String? authorAvatar;
  final bool isInstructor;
  final String title;
  final String content;
  final DateTime createdAt;
  final int likes;
  final int replyCount;
  final bool isLikedByUser;
  final bool isPinned;
  final List<String>? lessonTags;

  const DiscussionPost({
    required this.id,
    required this.courseId,
    required this.authorId,
    required this.authorName,
    this.authorAvatar,
    this.isInstructor = false,
    required this.title,
    required this.content,
    required this.createdAt,
    this.likes = 0,
    this.replyCount = 0,
    this.isLikedByUser = false,
    this.isPinned = false,
    this.lessonTags,
  });

  String get timeAgo {
    final diff = DateTime.now().difference(createdAt);
    if (diff.inDays > 0) {
      return '${diff.inDays}d ago';
    }
    if (diff.inHours > 0) {
      return '${diff.inHours}h ago';
    }
    if (diff.inMinutes > 0) {
      return '${diff.inMinutes}m ago';
    }
    return 'Just now';
  }

  DiscussionPost copyWith({
    int? likes,
    int? replyCount,
    bool? isLikedByUser,
    bool? isPinned,
  }) {
    return DiscussionPost(
      id: id,
      courseId: courseId,
      authorId: authorId,
      authorName: authorName,
      authorAvatar: authorAvatar,
      isInstructor: isInstructor,
      title: title,
      content: content,
      createdAt: createdAt,
      likes: likes ?? this.likes,
      replyCount: replyCount ?? this.replyCount,
      isLikedByUser: isLikedByUser ?? this.isLikedByUser,
      isPinned: isPinned ?? this.isPinned,
      lessonTags: lessonTags,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'courseId': courseId,
        'authorId': authorId,
        'authorName': authorName,
        'authorAvatar': authorAvatar,
        'isInstructor': isInstructor,
        'title': title,
        'content': content,
        'createdAt': createdAt.toIso8601String(),
        'likes': likes,
        'replyCount': replyCount,
        'isLikedByUser': isLikedByUser,
        'isPinned': isPinned,
        'lessonTags': lessonTags,
      };

  factory DiscussionPost.fromJson(Map<String, dynamic> json) {
    return DiscussionPost(
      id: json['id'] as String,
      courseId: json['courseId'] as String,
      authorId: json['authorId'] as String,
      authorName: json['authorName'] as String,
      authorAvatar: json['authorAvatar'] as String?,
      isInstructor: json['isInstructor'] as bool? ?? false,
      title: json['title'] as String,
      content: json['content'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      likes: json['likes'] as int? ?? 0,
      replyCount: json['replyCount'] as int? ?? 0,
      isLikedByUser: json['isLikedByUser'] as bool? ?? false,
      isPinned: json['isPinned'] as bool? ?? false,
      lessonTags: json['lessonTags'] != null
          ? List<String>.from(json['lessonTags'] as Iterable<dynamic>)
          : null,
    );
  }
}

/// Reply model
class DiscussionReply {
  final String id;
  final String postId;
  final String authorId;
  final String authorName;
  final String? authorAvatar;
  final bool isInstructor;
  final String content;
  final DateTime createdAt;
  final int likes;
  final bool isLikedByUser;
  final bool isAcceptedAnswer;

  const DiscussionReply({
    required this.id,
    required this.postId,
    required this.authorId,
    required this.authorName,
    this.authorAvatar,
    this.isInstructor = false,
    required this.content,
    required this.createdAt,
    this.likes = 0,
    this.isLikedByUser = false,
    this.isAcceptedAnswer = false,
  });

  String get timeAgo {
    final diff = DateTime.now().difference(createdAt);
    if (diff.inDays > 0) {
      return '${diff.inDays}d ago';
    }
    if (diff.inHours > 0) {
      return '${diff.inHours}h ago';
    }
    if (diff.inMinutes > 0) {
      return '${diff.inMinutes}m ago';
    }
    return 'Just now';
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'postId': postId,
        'authorId': authorId,
        'authorName': authorName,
        'authorAvatar': authorAvatar,
        'isInstructor': isInstructor,
        'content': content,
        'createdAt': createdAt.toIso8601String(),
        'likes': likes,
        'isLikedByUser': isLikedByUser,
        'isAcceptedAnswer': isAcceptedAnswer,
      };

  factory DiscussionReply.fromJson(Map<String, dynamic> json) {
    return DiscussionReply(
      id: json['id'] as String,
      postId: json['postId'] as String,
      authorId: json['authorId'] as String,
      authorName: json['authorName'] as String,
      authorAvatar: json['authorAvatar'] as String?,
      isInstructor: json['isInstructor'] as bool? ?? false,
      content: json['content'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      likes: json['likes'] as int? ?? 0,
      isLikedByUser: json['isLikedByUser'] as bool? ?? false,
      isAcceptedAnswer: json['isAcceptedAnswer'] as bool? ?? false,
    );
  }
}

/// Discussion sort type
enum DiscussionSortType {
  newest,
  popular,
  instructorFirst,
}

/// Discussion state
class DiscussionState {
  final List<DiscussionPost> posts;
  final Map<String, List<DiscussionReply>> replies;
  final String? selectedCourseId;
  final DiscussionSortType sortType;
  final String searchQuery;
  final bool isLoading;

  const DiscussionState({
    this.posts = const [],
    this.replies = const {},
    this.selectedCourseId,
    this.sortType = DiscussionSortType.newest,
    this.searchQuery = '',
    this.isLoading = false,
  });

  /// Get posts for current course with sorting
  List<DiscussionPost> get filteredPosts {
    var result = posts.toList();

    if (selectedCourseId != null) {
      result = result.where((p) => p.courseId == selectedCourseId).toList();
    }

    if (searchQuery.isNotEmpty) {
      final query = searchQuery.toLowerCase();
      result = result.where((p) {
        return p.title.toLowerCase().contains(query) ||
            p.content.toLowerCase().contains(query);
      }).toList();
    }

    // Sort pinned first, then by sort type
    result.sort((a, b) {
      if (a.isPinned != b.isPinned) {
        return a.isPinned ? -1 : 1;
      }

      switch (sortType) {
        case DiscussionSortType.newest:
          return b.createdAt.compareTo(a.createdAt);
        case DiscussionSortType.popular:
          return b.likes.compareTo(a.likes);
        case DiscussionSortType.instructorFirst:
          if (a.isInstructor != b.isInstructor) {
            return a.isInstructor ? -1 : 1;
          }
          return b.createdAt.compareTo(a.createdAt);
      }
    });

    return result;
  }

  /// Get replies for a post
  List<DiscussionReply> getRepliesForPost(String postId) {
    return replies[postId] ?? [];
  }

  DiscussionState copyWith({
    List<DiscussionPost>? posts,
    Map<String, List<DiscussionReply>>? replies,
    String? selectedCourseId,
    DiscussionSortType? sortType,
    String? searchQuery,
    bool? isLoading,
    bool clearCourse = false,
  }) {
    return DiscussionState(
      posts: posts ?? this.posts,
      replies: replies ?? this.replies,
      selectedCourseId:
          clearCourse ? null : (selectedCourseId ?? this.selectedCourseId),
      sortType: sortType ?? this.sortType,
      searchQuery: searchQuery ?? this.searchQuery,
      isLoading: isLoading ?? this.isLoading,
    );
  }

  Map<String, dynamic> toJson() => {
        'posts': posts.map((p) => p.toJson()).toList(),
        'replies': replies.map(
          (key, value) => MapEntry(key, value.map((r) => r.toJson()).toList()),
        ),
      };

  factory DiscussionState.fromJson(Map<String, dynamic> json) {
    final repliesJson = json['replies'] as Map<String, dynamic>? ?? {};
    final replies = <String, List<DiscussionReply>>{};

    repliesJson.forEach((key, value) {
      replies[key] = (value as List)
          .map((r) => DiscussionReply.fromJson(r as Map<String, dynamic>))
          .toList();
    });

    return DiscussionState(
      posts: (json['posts'] as List?)
              ?.map((p) => DiscussionPost.fromJson(p as Map<String, dynamic>))
              .toList() ??
          [],
      replies: replies,
    );
  }
}

/// Discussion notifier
class DiscussionNotifier extends AsyncNotifier<DiscussionState> {
  final _service = DiscussionService.instance;
  static const String _stateKey = 'discussion_state';

  @override
  Future<DiscussionState> build() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final stateJson = prefs.getString(_stateKey);

      if (stateJson != null) {
        final json = jsonDecode(stateJson) as Map<String, dynamic>;
        return DiscussionState.fromJson(json);
      } else {
        // Load mock data if no state exists
        return _loadMockData();
      }
    } catch (e) {
      return _loadMockData();
    }
  }

  Future<void> _saveState() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (state.value != null) {
        await prefs.setString(_stateKey, jsonEncode(state.value!.toJson()));
      }
    } catch (e) {
      // Handle silently
    }
  }

  /// Load mock data for demo
  DiscussionState _loadMockData() {
    if (state.value?.posts.isNotEmpty ?? false) {
      return state.value!;
    }

    final mockPosts = [
      DiscussionPost(
        id: 'post_1',
        courseId: 'course_1',
        authorId: 'user_2',
        authorName: 'Sarah M.',
        authorAvatar: 'https://i.pravatar.cc/150?u=sarah',
        title: 'How to handle state in complex widgets?',
        content:
            'I\'m building a complex form with multiple sections. What\'s the best approach for managing state across all these widgets? Should I use Riverpod providers or is there a simpler solution?',
        createdAt: DateTime.now().subtract(const Duration(hours: 2)),
        likes: 12,
        replyCount: 3,
      ),
      DiscussionPost(
        id: 'post_2',
        courseId: 'course_1',
        authorId: 'instructor_1',
        authorName: 'John Smith',
        authorAvatar: 'https://i.pravatar.cc/150?u=john',
        isInstructor: true,
        isPinned: true,
        title: 'Welcome to the Flutter Bootcamp! 👋',
        content:
            'Welcome everyone! This is the official discussion forum for our course. Feel free to ask questions, share your projects, and help fellow students. Remember to be respectful and constructive!',
        createdAt: DateTime.now().subtract(const Duration(days: 7)),
        likes: 45,
        replyCount: 8,
      ),
      DiscussionPost(
        id: 'post_3',
        courseId: 'course_1',
        authorId: 'user_3',
        authorName: 'Mike R.',
        authorAvatar: 'https://i.pravatar.cc/150?u=mike',
        title: 'Async/Await vs Futures - When to use what?',
        content:
            'I\'m confused about when to use async/await vs raw Futures. Both seem to do the same thing. Can someone explain the differences and best practices?',
        createdAt: DateTime.now().subtract(const Duration(hours: 5)),
        likes: 8,
        replyCount: 5,
      ),
    ];

    final mockReplies = <String, List<DiscussionReply>>{
      'post_1': [
        DiscussionReply(
          id: 'reply_1_1',
          postId: 'post_1',
          authorId: 'instructor_1',
          authorName: 'John Smith',
          isInstructor: true,
          content:
              'Great question! For complex forms, I recommend using a dedicated StateNotifier with Riverpod. This gives you centralized state management with proper separation of concerns.',
          createdAt: DateTime.now().subtract(const Duration(hours: 1)),
          likes: 5,
          isAcceptedAnswer: true,
        ),
      ],
    };

    return const DiscussionState().copyWith(
      posts: mockPosts,
      replies: mockReplies,
    );
  }

  /// Select course
  void selectCourse(String? courseId) {
    state = AsyncValue.data(state.value!.copyWith(
      selectedCourseId: courseId,
      clearCourse: courseId == null,
    ));
    if (courseId != null) {
      loadPosts(courseId);
    }
  }

  /// Load posts for course (backend sync)
  Future<void> loadPosts(String courseId) async {
    state = AsyncValue.data(state.value!.copyWith(isLoading: true));
    try {
      final posts = await _service.getPosts(courseId);
      if (posts.isNotEmpty) {
        state = AsyncValue.data(
            state.value!.copyWith(posts: posts, isLoading: false));
      } else {
        state = AsyncValue.data(state.value!.copyWith(isLoading: false));
      }
    } catch (_) {
      state = AsyncValue.data(state.value!.copyWith(isLoading: false));
    }
  }

  /// Set sort type
  void setSortType(DiscussionSortType type) {
    state = AsyncValue.data(state.value!.copyWith(sortType: type));
  }

  /// Set search query
  void setSearchQuery(String query) {
    state = AsyncValue.data(state.value!.copyWith(searchQuery: query));
  }

  /// Create a new post
  Future<void> createPost({
    required String courseId,
    required String title,
    required String content,
  }) async {
    final oldState = state.value;
    if (oldState == null) {
      return;
    }

    // Optimistic update
    final tempPost = DiscussionPost(
      id: 'post_${DateTime.now().millisecondsSinceEpoch}',
      courseId: courseId,
      authorId: 'current_user',
      authorName: 'You',
      title: title,
      content: content,
      createdAt: DateTime.now(),
    );

    state = AsyncValue.data(oldState.copyWith(
      posts: [tempPost, ...oldState.posts],
    ));

    try {
      // Backend call
      final post = await _service.createPost(
        courseId: courseId,
        title: title,
        content: content,
      );

      if (post == null) {
        // Revert if the post creation failed (e.g. returned null)
        state = AsyncValue.data(oldState);
        return;
      }

      // Replace temp post with real one from the server
      final currentPosts = state.value!.posts;
      final newPosts =
          currentPosts.map((p) => p.id == tempPost.id ? post : p).toList();
      state = AsyncValue.data(state.value!.copyWith(posts: newPosts));

      await _saveState();
    } catch (e) {
      // Revert if an exception was thrown
      state = AsyncValue.data(oldState);
    }
  }

  /// Like/unlike a post
  Future<void> toggleLike(String postId) async {
    final oldState = state.value;
    if (oldState == null) {
      return;
    }

    // Optimistic update
    state = AsyncValue.data(oldState.copyWith(
      posts: oldState.posts.map((p) {
        if (p.id == postId) {
          return p.copyWith(
            likes: p.isLikedByUser ? p.likes - 1 : p.likes + 1,
            isLikedByUser: !p.isLikedByUser,
          );
        }
        return p;
      }).toList(),
    ));

    try {
      await _service.togglePostLike(postId);
      await _saveState();
    } catch (_) {
      // Revert on failure
      state = AsyncValue.data(oldState);
    }
  }

  /// Add a reply
  Future<void> addReply({
    required String postId,
    required String content,
  }) async {
    final oldState = state.value;
    if (oldState == null) {
      return;
    }

    // Optimistic
    final tempReply = DiscussionReply(
      id: 'reply_${DateTime.now().millisecondsSinceEpoch}',
      postId: postId,
      authorId: 'current_user',
      authorName: 'You',
      content: content,
      createdAt: DateTime.now(),
    );

    final newReplies =
        Map<String, List<DiscussionReply>>.from(oldState.replies);
    newReplies[postId] = [tempReply, ...(newReplies[postId] ?? [])];

    final newPosts = oldState.posts.map((p) {
      if (p.id == postId) {
        return p.copyWith(replyCount: p.replyCount + 1);
      }
      return p;
    }).toList();

    state = AsyncValue.data(oldState.copyWith(
      replies: newReplies,
      posts: newPosts,
    ));

    try {
      // Backend call
      final reply = await _service.addReply(postId: postId, content: content);

      if (reply == null) {
        // Revert if reply creation failed
        state = AsyncValue.data(oldState);
        return;
      }

      // Replace temp reply with real one
      final currentReplies =
          Map<String, List<DiscussionReply>>.from(state.value!.replies);
      final list = currentReplies[postId] ?? [];
      final index = list.indexWhere((r) => r.id == tempReply.id);
      if (index != -1) {
        list[index] = reply;
        currentReplies[postId] = list;
        state = AsyncValue.data(state.value!.copyWith(replies: currentReplies));
      }

      await _saveState();
    } catch (_) {
      // Revert on failure
      state = AsyncValue.data(oldState);
    }
  }

  /// Reset
  Future<void> reset() async {
    state = const AsyncValue.data(DiscussionState());
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_stateKey);
  }
}

/// Discussion provider
final discussionProvider =
    AsyncNotifierProvider<DiscussionNotifier, DiscussionState>(() {
  return DiscussionNotifier();
});

/// Filtered posts provider
final filteredPostsProvider = Provider<List<DiscussionPost>>((ref) {
  return ref.watch(discussionProvider).value?.filteredPosts ?? [];
});
