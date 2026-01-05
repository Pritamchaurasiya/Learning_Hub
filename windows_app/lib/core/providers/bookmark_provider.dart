import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Bookmark model for saved lessons
class Bookmark {
  final String id;
  final String courseId;
  final String courseName;
  final String lessonId;
  final String lessonTitle;
  final int? timestampSeconds;
  final String? note;
  final DateTime createdAt;
  final String? folderId;
  final List<String> tags;

  const Bookmark({
    required this.id,
    required this.courseId,
    required this.courseName,
    required this.lessonId,
    required this.lessonTitle,
    this.timestampSeconds,
    this.note,
    required this.createdAt,
    this.folderId,
    this.tags = const [],
  });

  String get formattedTimestamp {
    if (timestampSeconds == null) {
      return '';
    }
    final mins = timestampSeconds! ~/ 60;
    final secs = timestampSeconds! % 60;
    return '${mins.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
  }

  Bookmark copyWith({
    String? note,
    String? folderId,
    List<String>? tags,
  }) {
    return Bookmark(
      id: id,
      courseId: courseId,
      courseName: courseName,
      lessonId: lessonId,
      lessonTitle: lessonTitle,
      timestampSeconds: timestampSeconds,
      note: note ?? this.note,
      createdAt: createdAt,
      folderId: folderId ?? this.folderId,
      tags: tags ?? this.tags,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'courseId': courseId,
        'courseName': courseName,
        'lessonId': lessonId,
        'lessonTitle': lessonTitle,
        'timestampSeconds': timestampSeconds,
        'note': note,
        'createdAt': createdAt.toIso8601String(),
        'folderId': folderId,
        'tags': tags,
      };

  factory Bookmark.fromJson(Map<String, dynamic> json) {
    return Bookmark(
      id: json['id'] as String,
      courseId: json['courseId'] as String,
      courseName: json['courseName'] as String,
      lessonId: json['lessonId'] as String,
      lessonTitle: json['lessonTitle'] as String,
      timestampSeconds: json['timestampSeconds'] as int?,
      note: json['note'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      folderId: json['folderId'] as String?,
      tags:
          List<String>.from((json['tags'] ?? <String>[]) as Iterable<dynamic>),
    );
  }
}

/// Bookmark folder for organization
class BookmarkFolder {
  final String id;
  final String name;
  final String? iconName;
  final int? color;
  final DateTime createdAt;

  const BookmarkFolder({
    required this.id,
    required this.name,
    this.iconName,
    this.color,
    required this.createdAt,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'iconName': iconName,
        'color': color,
        'createdAt': createdAt.toIso8601String(),
      };

  factory BookmarkFolder.fromJson(Map<String, dynamic> json) {
    return BookmarkFolder(
      id: json['id'] as String,
      name: json['name'] as String,
      iconName: json['iconName'] as String?,
      color: json['color'] as int?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

/// Bookmark state
class BookmarkState {
  final List<Bookmark> bookmarks;
  final List<BookmarkFolder> folders;
  final String? selectedFolderId;
  final String searchQuery;

  const BookmarkState({
    this.bookmarks = const [],
    this.folders = const [],
    this.selectedFolderId,
    this.searchQuery = '',
  });

  /// Get bookmarks for current folder (null = all)
  List<Bookmark> get filteredBookmarks {
    var result = bookmarks;

    if (selectedFolderId != null) {
      result = result.where((b) => b.folderId == selectedFolderId).toList();
    }

    if (searchQuery.isNotEmpty) {
      final query = searchQuery.toLowerCase();
      result = result.where((b) {
        return b.lessonTitle.toLowerCase().contains(query) ||
            b.courseName.toLowerCase().contains(query) ||
            (b.note?.toLowerCase().contains(query) ?? false);
      }).toList();
    }

    return result..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  }

  /// Get bookmark count for a folder
  int getBookmarkCount(String? folderId) {
    if (folderId == null) {
      return bookmarks.length;
    }
    return bookmarks.where((b) => b.folderId == folderId).length;
  }

  BookmarkState copyWith({
    List<Bookmark>? bookmarks,
    List<BookmarkFolder>? folders,
    String? selectedFolderId,
    String? searchQuery,
    bool clearSelection = false,
  }) {
    return BookmarkState(
      bookmarks: bookmarks ?? this.bookmarks,
      folders: folders ?? this.folders,
      selectedFolderId:
          clearSelection ? null : (selectedFolderId ?? this.selectedFolderId),
      searchQuery: searchQuery ?? this.searchQuery,
    );
  }

  Map<String, dynamic> toJson() => {
        'bookmarks': bookmarks.map((b) => b.toJson()).toList(),
        'folders': folders.map((f) => f.toJson()).toList(),
      };

  factory BookmarkState.fromJson(Map<String, dynamic> json) {
    return BookmarkState(
      bookmarks: (json['bookmarks'] as List?)
              ?.map((b) => Bookmark.fromJson(b as Map<String, dynamic>))
              .toList() ??
          [],
      folders: (json['folders'] as List?)
              ?.map((f) => BookmarkFolder.fromJson(f as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

/// Bookmark notifier
class BookmarkNotifier extends AsyncNotifier<BookmarkState> {
  static const String _stateKey = 'bookmarks_state';

  @override
  Future<BookmarkState> build() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final stateJson = prefs.getString(_stateKey);

      if (stateJson != null) {
        final json = jsonDecode(stateJson) as Map<String, dynamic>;
        return BookmarkState.fromJson(json);
      }
    } catch (e) {
      // Keep initial state
    }
    return const BookmarkState();
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

  /// Add a new bookmark
  Future<void> addBookmark({
    required String courseId,
    required String courseName,
    required String lessonId,
    required String lessonTitle,
    int? timestampSeconds,
    String? note,
  }) async {
    final bookmark = Bookmark(
      id: 'bookmark_${DateTime.now().millisecondsSinceEpoch}',
      courseId: courseId,
      courseName: courseName,
      lessonId: lessonId,
      lessonTitle: lessonTitle,
      timestampSeconds: timestampSeconds,
      note: note,
      createdAt: DateTime.now(),
    );

    state = AsyncValue.data(state.value!.copyWith(
      bookmarks: [...state.value!.bookmarks, bookmark],
    ));
    await _saveState();
  }

  /// Remove a bookmark
  Future<void> removeBookmark(String bookmarkId) async {
    state = AsyncValue.data(state.value!.copyWith(
      bookmarks:
          state.value!.bookmarks.where((b) => b.id != bookmarkId).toList(),
    ));
    await _saveState();
  }

  /// Update bookmark note
  Future<void> updateNote(String bookmarkId, String note) async {
    state = AsyncValue.data(state.value!.copyWith(
      bookmarks: state.value!.bookmarks.map((b) {
        return b.id == bookmarkId ? b.copyWith(note: note) : b;
      }).toList(),
    ));
    await _saveState();
  }

  /// Move bookmark to folder
  Future<void> moveToFolder(String bookmarkId, String? folderId) async {
    state = AsyncValue.data(state.value!.copyWith(
      bookmarks: state.value!.bookmarks.map((b) {
        return b.id == bookmarkId ? b.copyWith(folderId: folderId) : b;
      }).toList(),
    ));
    await _saveState();
  }

  /// Create a folder
  Future<void> createFolder(String name) async {
    final folder = BookmarkFolder(
      id: 'folder_${DateTime.now().millisecondsSinceEpoch}',
      name: name,
      createdAt: DateTime.now(),
    );

    state = AsyncValue.data(state.value!.copyWith(
      folders: [...state.value!.folders, folder],
    ));
    await _saveState();
  }

  /// Delete a folder
  Future<void> deleteFolder(String folderId) async {
    // Move bookmarks in folder to root
    state = AsyncValue.data(state.value!.copyWith(
      bookmarks: state.value!.bookmarks.map((b) {
        return b.folderId == folderId ? b.copyWith(folderId: null) : b;
      }).toList(),
      folders: state.value!.folders.where((f) => f.id != folderId).toList(),
    ));
    await _saveState();
  }

  /// Select a folder
  void selectFolder(String? folderId) {
    state = AsyncValue.data(state.value!.copyWith(
      selectedFolderId: folderId,
      clearSelection: folderId == null,
    ));
  }

  /// Update search query
  void setSearchQuery(String query) {
    state = AsyncValue.data(state.value!.copyWith(searchQuery: query));
  }

  /// Check if lesson is bookmarked
  bool isBookmarked(String lessonId) {
    return state.value?.bookmarks.any((b) => b.lessonId == lessonId) ?? false;
  }

  /// Get bookmark for lesson
  Bookmark? getBookmarkForLesson(String lessonId) {
    return state.value?.bookmarks
        .where((b) => b.lessonId == lessonId)
        .firstOrNull;
  }

  /// Reset
  Future<void> reset() async {
    state = const AsyncValue.data(BookmarkState());
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_stateKey);
  }
}

/// Bookmark provider
final bookmarkProvider =
    AsyncNotifierProvider<BookmarkNotifier, BookmarkState>(() {
  return BookmarkNotifier();
});

/// Filtered bookmarks provider
final filteredBookmarksProvider = Provider<List<Bookmark>>((ref) {
  return ref.watch(bookmarkProvider).value?.filteredBookmarks ?? [];
});
