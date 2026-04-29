import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:learning_hub/core/theme/app_colors.dart';
import 'package:learning_hub/core/providers/bookmark_provider.dart';
import 'package:learning_hub/shared/widgets/app_feedback.dart';
import 'package:learning_hub/shared/widgets/empty_state_view.dart';

/// Bookmarks screen for saved lessons and notes
class BookmarksScreen extends ConsumerStatefulWidget {
  const BookmarksScreen({super.key});

  @override
  ConsumerState<BookmarksScreen> createState() => _BookmarksScreenState();
}

class _BookmarksScreenState extends ConsumerState<BookmarksScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bookmarkState = ref.watch(bookmarkProvider);
    final filteredBookmarks = ref.watch(filteredBookmarksProvider);

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: const Text('Bookmarks'),
        actions: [
          IconButton(
            icon: const Icon(Icons.create_new_folder_outlined),
            onPressed: () => _showCreateFolderDialog(context),
            tooltip: 'New Folder',
          ),
        ],
      ),
      body: Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search bookmarks...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: bookmarkState.value?.searchQuery.isNotEmpty ?? false
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          ref
                              .read(bookmarkProvider.notifier)
                              .setSearchQuery('');
                        },
                      )
                    : null,
              ),
              onChanged: (value) {
                ref.read(bookmarkProvider.notifier).setSearchQuery(value);
              },
            ),
          ),

          // Folder chips
          if (bookmarkState.value?.folders.isNotEmpty ?? false)
            SizedBox(
              height: 40,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: [
                  _FolderChip(
                    name: 'All',
                    count: bookmarkState.value?.bookmarks.length ?? 0,
                    isSelected: bookmarkState.value?.selectedFolderId == null,
                    onTap: () {
                      ref.read(bookmarkProvider.notifier).selectFolder(null);
                    },
                  ),
                  const SizedBox(width: 8),
                  ...(bookmarkState.value?.folders ?? [])
                      .map((folder) => Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: _FolderChip(
                              name: folder.name,
                              count: bookmarkState.value
                                      ?.getBookmarkCount(folder.id) ??
                                  0,
                              isSelected:
                                  bookmarkState.value?.selectedFolderId ==
                                      folder.id,
                              onTap: () {
                                ref
                                    .read(bookmarkProvider.notifier)
                                    .selectFolder(folder.id);
                              },
                            ),
                          )),
                ],
              ),
            ),

          const SizedBox(height: 8),

          // Bookmarks list
          Expanded(
            child: filteredBookmarks.isEmpty
                ? ((bookmarkState.value?.searchQuery.isNotEmpty ?? false)
                    ? EmptyStateView.noSearchResults()
                    : EmptyStateView.noBookmarks(
                        onAction: () => context.go('/courses'),
                      ))
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: filteredBookmarks.length,
                    itemBuilder: (context, index) {
                      final bookmark = filteredBookmarks[index];
                      return _BookmarkCard(bookmark: bookmark)
                          .animate()
                          .fadeIn(delay: Duration(milliseconds: index * 50));
                    },
                  ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddBookmarkDemo(context),
        icon: const Icon(Icons.add),
        label: const Text('Add Bookmark'),
      ).animate().fadeIn(delay: 300.ms).scale(begin: const Offset(0.8, 0.8)),
    );
  }

  void _showCreateFolderDialog(BuildContext context) {
    String folderName = '';

    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('New Folder'),
        content: TextField(
          autofocus: true,
          decoration: const InputDecoration(
            labelText: 'Folder name',
            hintText: 'Enter folder name',
          ),
          onChanged: (value) => folderName = value,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              if (folderName.isNotEmpty) {
                ref.read(bookmarkProvider.notifier).createFolder(folderName);
              }
              Navigator.pop(context);
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }

  void _showAddBookmarkDemo(BuildContext context) {
    // Demo: add a sample bookmark
    ref.read(bookmarkProvider.notifier).addBookmark(
          courseId: 'course_1',
          courseName: 'Flutter Bootcamp',
          lessonId: 'lesson_${DateTime.now().millisecondsSinceEpoch}',
          lessonTitle: 'Understanding State Management',
          timestampSeconds: 125,
          note: 'Important concept to review',
        );

    AppFeedback.showSuccess(context, 'Demo bookmark added!');
  }
}

/// Folder chip widget
class _FolderChip extends StatelessWidget {
  final String name;
  final int count;
  final bool isSelected;
  final VoidCallback onTap;

  const _FolderChip({
    required this.name,
    required this.count,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      selected: isSelected,
      label: Text('$name ($count)'),
      onSelected: (_) => onTap(),
    );
  }
}

/// Bookmark card widget
class _BookmarkCard extends ConsumerWidget {
  final Bookmark bookmark;

  const _BookmarkCard({required this.bookmark});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return Dismissible(
      key: Key(bookmark.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 16),
        color: AppColors.error,
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      onDismissed: (_) {
        ref.read(bookmarkProvider.notifier).removeBookmark(bookmark.id);
      },
      child: Card(
        margin: const EdgeInsets.only(bottom: 12),
        child: ListTile(
          contentPadding: const EdgeInsets.all(16),
          leading: Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: AppColors.accent.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: bookmark.timestampSeconds != null
                ? Center(
                    child: Text(
                      bookmark.formattedTimestamp,
                      style: const TextStyle(
                        color: AppColors.accent,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  )
                : const Icon(Icons.bookmark, color: AppColors.accent),
          ),
          title: Text(
            bookmark.lessonTitle,
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 4),
              Text(
                bookmark.courseName,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              if (bookmark.note != null && bookmark.note!.isNotEmpty) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    bookmark.note!,
                    style: theme.textTheme.bodySmall,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ],
          ),
          trailing: IconButton(
            icon: const Icon(Icons.play_circle_outline),
            onPressed: () {
              // Navigate to lesson at timestamp
              context.push(
                  '/course/${bookmark.courseId}/lesson/${bookmark.lessonId}');
            },
          ),
        ),
      ),
    );
  }
}
