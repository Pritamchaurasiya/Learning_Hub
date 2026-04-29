import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:learning_hub/core/theme/app_colors.dart';
import 'package:learning_hub/core/providers/discussion_provider.dart';
import 'package:learning_hub/core/utils/debouncer.dart';
import 'package:learning_hub/shared/widgets/empty_state_view.dart';

/// Discussions screen for course Q&A
class DiscussionsScreen extends ConsumerStatefulWidget {
  final String courseId;

  const DiscussionsScreen({super.key, required this.courseId});

  @override
  ConsumerState<DiscussionsScreen> createState() => _DiscussionsScreenState();
}

class _DiscussionsScreenState extends ConsumerState<DiscussionsScreen> {
  final _searchController = TextEditingController();
  final _debouncer = Debouncer(milliseconds: 300);

  @override
  void initState() {
    super.initState();
    // Set course filter
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(discussionProvider.notifier).selectCourse(widget.courseId);
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _debouncer.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final discussionState = ref.watch(discussionProvider);
    final posts = ref.watch(filteredPostsProvider);

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: const Text('Discussions'),
        actions: [
          PopupMenuButton<DiscussionSortType>(
            icon: const Icon(Icons.sort),
            tooltip: 'Sort',
            onSelected: (type) {
              ref.read(discussionProvider.notifier).setSortType(type);
            },
            itemBuilder: (context) => [
              PopupMenuItem(
                value: DiscussionSortType.newest,
                child: Row(
                  children: [
                    Icon(
                      Icons.schedule,
                      color: discussionState.value?.sortType ==
                              DiscussionSortType.newest
                          ? AppColors.primary
                          : null,
                    ),
                    const SizedBox(width: 12),
                    const Text('Newest'),
                  ],
                ),
              ),
              PopupMenuItem(
                value: DiscussionSortType.popular,
                child: Row(
                  children: [
                    Icon(
                      Icons.trending_up,
                      color: discussionState.value?.sortType ==
                              DiscussionSortType.popular
                          ? AppColors.primary
                          : null,
                    ),
                    const SizedBox(width: 12),
                    const Text('Most Popular'),
                  ],
                ),
              ),
              PopupMenuItem(
                value: DiscussionSortType.instructorFirst,
                child: Row(
                  children: [
                    Icon(
                      Icons.school,
                      color: discussionState.value?.sortType ==
                              DiscussionSortType.instructorFirst
                          ? AppColors.primary
                          : null,
                    ),
                    const SizedBox(width: 12),
                    const Text('Instructor First'),
                  ],
                ),
              ),
            ],
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
                hintText: 'Search discussions...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon:
                    discussionState.value?.searchQuery.isNotEmpty ?? false
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _searchController.clear();
                              ref
                                  .read(discussionProvider.notifier)
                                  .setSearchQuery('');
                            },
                          )
                        : null,
              ),
              onChanged: (value) {
                _debouncer.run(() {
                  ref.read(discussionProvider.notifier).setSearchQuery(value);
                });
              },
            ),
          ),

          // Posts list
          Expanded(
            child: posts.isEmpty
                ? EmptyStateView(
                    icon:
                        (discussionState.value?.searchQuery.isNotEmpty ?? false)
                            ? Icons.search_off
                            : Icons.forum_outlined,
                    title:
                        (discussionState.value?.searchQuery.isNotEmpty ?? false)
                            ? 'No discussions found'
                            : 'No discussions yet',
                    subtitle:
                        (discussionState.value?.searchQuery.isNotEmpty ?? false)
                            ? 'Try a different search term'
                            : 'Start a conversation with fellow learners',
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: posts.length,
                    itemBuilder: (context, index) {
                      final post = posts[index];
                      return _PostCard(post: post)
                          .animate()
                          .fadeIn(delay: Duration(milliseconds: index * 50));
                    },
                  ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreatePostDialog(context),
        icon: const Icon(Icons.add),
        label: const Text('Ask Question'),
      ).animate().fadeIn(delay: 300.ms).scale(begin: const Offset(0.8, 0.8)),
    );
  }

  void _showCreatePostDialog(BuildContext context) {
    String title = '';
    String content = '';

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: Container(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Ask a Question',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 16),
              TextField(
                decoration: const InputDecoration(
                  labelText: 'Title',
                  hintText: 'What do you want to ask?',
                ),
                onChanged: (value) => title = value,
              ),
              const SizedBox(height: 16),
              TextField(
                decoration: const InputDecoration(
                  labelText: 'Details',
                  hintText: 'Provide more context...',
                  alignLabelWithHint: true,
                ),
                maxLines: 4,
                onChanged: (value) => content = value,
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Cancel'),
                  ),
                  const SizedBox(width: 12),
                  FilledButton(
                    onPressed: () {
                      if (title.isNotEmpty && content.isNotEmpty) {
                        ref.read(discussionProvider.notifier).createPost(
                              courseId: widget.courseId,
                              title: title,
                              content: content,
                            );
                        Navigator.pop(context);
                      }
                    },
                    child: const Text('Post'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Post card widget
class _PostCard extends ConsumerWidget {
  final DiscussionPost post;

  const _PostCard({required this.post});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => _showPostDetail(context, ref),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  CircleAvatar(
                    radius: 18,
                    backgroundColor: post.isInstructor
                        ? AppColors.accent
                        : AppColors.primary.withValues(alpha: 0.1),
                    child: post.authorAvatar != null
                        ? null
                        : Text(
                            post.authorName[0].toUpperCase(),
                            style: TextStyle(
                              color: post.isInstructor
                                  ? Colors.white
                                  : AppColors.primary,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              post.authorName,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            if (post.isInstructor) ...[
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 6,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.accent,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  'Instructor',
                                  style: theme.textTheme.labelSmall?.copyWith(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                        Text(
                          post.timeAgo,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (post.isPinned)
                    const Icon(Icons.push_pin,
                        size: 16, color: AppColors.accent),
                ],
              ),

              const SizedBox(height: 12),

              // Title
              Text(
                post.title,
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),

              const SizedBox(height: 8),

              // Content preview
              Text(
                post.content,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),

              const SizedBox(height: 12),

              // Actions
              Row(
                children: [
                  _ActionButton(
                    icon: post.isLikedByUser
                        ? Icons.favorite
                        : Icons.favorite_border,
                    label: '${post.likes}',
                    color: post.isLikedByUser ? AppColors.error : null,
                    onTap: () {
                      ref.read(discussionProvider.notifier).toggleLike(post.id);
                    },
                  ),
                  const SizedBox(width: 16),
                  _ActionButton(
                    icon: Icons.chat_bubble_outline,
                    label: '${post.replyCount}',
                    onTap: () => _showPostDetail(context, ref),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showPostDetail(BuildContext context, WidgetRef ref) {
    final replies = <DiscussionReply>[]; // TODO: Implement getRepliesForPost

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.9,
        maxChildSize: 0.9,
        minChildSize: 0.5,
        expand: false,
        builder: (context, scrollController) => _PostDetailSheet(
          post: post,
          replies: replies,
          scrollController: scrollController,
        ),
      ),
    );
  }
}

/// Action button widget
class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color? color;
  final VoidCallback onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Row(
          children: [
            Icon(icon, size: 18, color: color),
            const SizedBox(width: 4),
            Text(
              label,
              style: theme.textTheme.bodySmall?.copyWith(color: color),
            ),
          ],
        ),
      ),
    );
  }
}

/// Post detail sheet
class _PostDetailSheet extends ConsumerStatefulWidget {
  final DiscussionPost post;
  final List<DiscussionReply> replies;
  final ScrollController scrollController;

  const _PostDetailSheet({
    required this.post,
    required this.replies,
    required this.scrollController,
  });

  @override
  ConsumerState<_PostDetailSheet> createState() => _PostDetailSheetState();
}

class _PostDetailSheetState extends ConsumerState<_PostDetailSheet> {
  final _replyController = TextEditingController();

  @override
  void dispose() {
    _replyController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      children: [
        // Handle
        Container(
          margin: const EdgeInsets.only(top: 8),
          width: 40,
          height: 4,
          decoration: BoxDecoration(
            color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.4),
            borderRadius: BorderRadius.circular(2),
          ),
        ),

        Expanded(
          child: ListView(
            controller: widget.scrollController,
            padding: const EdgeInsets.all(16),
            children: [
              // Post
              Text(
                widget.post.title,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(widget.post.content),
              const SizedBox(height: 16),
              const Divider(),
              const SizedBox(height: 16),

              // Replies
              Text(
                'Replies (${widget.replies.length})',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 12),

              if (widget.replies.isEmpty)
                Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(
                      'No replies yet. Be the first to respond!',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                )
              else
                ...widget.replies.map((reply) => _ReplyCard(reply: reply)),
            ],
          ),
        ),

        // Reply input
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: theme.colorScheme.surface,
            border: Border(
              top: BorderSide(color: theme.dividerColor),
            ),
          ),
          child: SafeArea(
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _replyController,
                    decoration: const InputDecoration(
                      hintText: 'Write a reply...',
                      isDense: true,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                IconButton.filled(
                  onPressed: () {
                    if (_replyController.text.isNotEmpty) {
                      ref.read(discussionProvider.notifier).addReply(
                            postId: widget.post.id,
                            content: _replyController.text,
                          );
                      _replyController.clear();
                      Navigator.pop(context);
                    }
                  },
                  icon: const Icon(Icons.send),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

/// Reply card widget
class _ReplyCard extends StatelessWidget {
  final DiscussionReply reply;

  const _ReplyCard({required this.reply});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: reply.isAcceptedAnswer
            ? AppColors.success.withValues(alpha: 0.1)
            : theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
        border: reply.isAcceptedAnswer
            ? Border.all(color: AppColors.success)
            : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 14,
                backgroundColor: reply.isInstructor
                    ? AppColors.accent
                    : AppColors.primary.withValues(alpha: 0.2),
                child: Text(
                  reply.authorName[0],
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color:
                        reply.isInstructor ? Colors.white : AppColors.primary,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Row(
                  children: [
                    Text(
                      reply.authorName,
                      style: theme.textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (reply.isInstructor) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 4,
                          vertical: 1,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.accent,
                          borderRadius: BorderRadius.circular(3),
                        ),
                        child: Text(
                          'Instructor',
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: Colors.white,
                            fontSize: 9,
                          ),
                        ),
                      ),
                    ],
                    if (reply.isAcceptedAnswer) ...[
                      const SizedBox(width: 6),
                      const Icon(
                        Icons.check_circle,
                        size: 14,
                        color: AppColors.success,
                      ),
                    ],
                  ],
                ),
              ),
              Text(
                reply.timeAgo,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                  fontSize: 11,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            reply.content,
            style: theme.textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}
