import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:my_flutter_app/src/features/discussions/data/discussion_repository.dart';
import 'package:my_flutter_app/src/features/discussions/domain/discussion_models.dart';
import 'package:my_flutter_app/src/features/discussions/presentation/discussion_detail_screen.dart';

// Controller/Provider
final discussionListProvider =
    FutureProvider.family<List<dynamic>, String?>((ref, courseId) async {
  final repo = ref.watch(discussionRepositoryProvider);
  return repo.getThreads(courseId: courseId);
});

class DiscussionScreen extends ConsumerWidget {
  const DiscussionScreen({super.key, this.courseId});
  final String? courseId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final threadsAsync = ref.watch(discussionListProvider(courseId));
    final screenWidth = MediaQuery.of(context).size.width;
    final isDesktop = screenWidth > 900;

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
        title: Text('Community Forum',
            style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white70),
            onPressed: () => ref.invalidate(discussionListProvider(courseId)),
          ),
          const SizedBox(width: 8),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateThreadDialog(context, ref, courseId),
        backgroundColor: const Color(0xFF3B82F6),
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: Text('New Thread',
            style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: threadsAsync.when(
          loading: () => const Center(
              child: CircularProgressIndicator(color: Color(0xFF3B82F6))),
          error: (err, stack) => Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.cloud_off, size: 48, color: Colors.white24),
                const SizedBox(height: 16),
                Text('Failed to load discussions',
                    style: GoogleFonts.outfit(color: Colors.white54)),
                const SizedBox(height: 8),
                TextButton.icon(
                  onPressed: () =>
                      ref.invalidate(discussionListProvider(courseId)),
                  icon: const Icon(Icons.refresh, color: Color(0xFF3B82F6)),
                  label: Text('Retry',
                      style:
                          GoogleFonts.outfit(color: const Color(0xFF3B82F6))),
                ),
              ],
            ),
          ),
          data: (threads) {
            if (threads.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.forum_outlined,
                            size: 80, color: Colors.white24)
                        .animate()
                        .fadeIn()
                        .scale(delay: 200.ms),
                    const SizedBox(height: 16),
                    Text('No discussions yet',
                        style: GoogleFonts.outfit(
                            color: Colors.white70, fontSize: 18)),
                    const SizedBox(height: 8),
                    Text('Be the first to start a conversation!',
                        style: GoogleFonts.outfit(color: Colors.white38)),
                  ],
                ),
              );
            }
            return RefreshIndicator(
              color: const Color(0xFF3B82F6),
              backgroundColor: const Color(0xFF1E293B),
              onRefresh: () async {
                ref.invalidate(discussionListProvider(courseId));
                await ref.read(discussionListProvider(courseId).future);
              },
              child: isDesktop
                  ? _buildDesktopGrid(threads, context)
                  : _buildMobileList(threads, context),
            );
          },
        ),
      ),
    );
  }

  Widget _buildMobileList(List<dynamic> threads, BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
      itemCount: threads.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final thread = threads[index] as Map<String, dynamic>;
        return _buildThreadCard(thread, context, index);
      },
    );
  }

  Widget _buildDesktopGrid(List<dynamic> threads, BuildContext context) {
    return GridView.builder(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 80),
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 500,
        mainAxisExtent: 180,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
      ),
      itemCount: threads.length,
      itemBuilder: (context, index) {
        final thread = threads[index] as Map<String, dynamic>;
        return _buildThreadCard(thread, context, index);
      },
    );
  }

  Widget _buildThreadCard(
      Map<String, dynamic> thread, BuildContext context, int index) {
    final title = thread['title']?.toString() ?? 'No Title';
    final authorName = thread['author_name']?.toString() ?? 'User';
    final replyCount = thread['reply_count'] as int? ?? 0;
    final likeCount = thread['like_count'] as int? ?? 0;
    final isResolved = thread['is_resolved'] == true;
    final isPinned = thread['is_pinned'] == true;
    final content = thread['content']?.toString() ?? '';
    final createdAt = thread['created_at']?.toString() ?? '';

    return GestureDetector(
      onTap: () {
        final discussionThread = DiscussionThread.fromJson(thread);
        Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => DiscussionDetailScreen(thread: discussionThread),
          ),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isPinned
                ? const Color(0xFF3B82F6).withValues(alpha: 0.3)
                : Colors.white.withValues(alpha: 0.05),
          ),
          boxShadow: const [
            BoxShadow(
                color: Colors.black26, blurRadius: 10, offset: Offset(0, 4))
          ],
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header row
            Row(
              children: [
                CircleAvatar(
                  radius: 18,
                  backgroundColor: const Color(0xFF3B82F6),
                  child: Text(
                    authorName.isNotEmpty ? authorName[0].toUpperCase() : '?',
                    style: const TextStyle(
                        color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.outfit(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'By $authorName${createdAt.isNotEmpty ? ' • ${_formatDate(createdAt)}' : ''}',
                        style: GoogleFonts.outfit(
                            fontSize: 11, color: Colors.white38),
                      ),
                    ],
                  ),
                ),
                if (isPinned)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFF3B82F6).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.push_pin,
                            size: 10, color: Color(0xFF3B82F6)),
                        const SizedBox(width: 3),
                        Text('Pinned',
                            style: GoogleFonts.outfit(
                                fontSize: 9, color: const Color(0xFF3B82F6))),
                      ],
                    ),
                  ),
                if (isResolved)
                  Container(
                    margin: const EdgeInsets.only(left: 6),
                    padding:
                        const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.check_circle,
                            size: 10, color: Color(0xFF10B981)),
                        const SizedBox(width: 3),
                        Text('Resolved',
                            style: GoogleFonts.outfit(
                                fontSize: 9, color: const Color(0xFF10B981))),
                      ],
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            // Content preview
            if (content.isNotEmpty)
              Text(
                content,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.outfit(
                    color: Colors.white54, fontSize: 13, height: 1.4),
              ),
            const Spacer(),
            // Footer stats
            Row(
              children: [
                Icon(Icons.chat_bubble_outline,
                    size: 14, color: Colors.grey[500]),
                const SizedBox(width: 4),
                Text('$replyCount',
                    style:
                        GoogleFonts.outfit(fontSize: 12, color: Colors.grey)),
                const SizedBox(width: 16),
                Icon(Icons.favorite_border, size: 14, color: Colors.grey[500]),
                const SizedBox(width: 4),
                Text('$likeCount',
                    style:
                        GoogleFonts.outfit(fontSize: 12, color: Colors.grey)),
                const Spacer(),
                const Icon(Icons.chevron_right,
                    size: 18, color: Colors.white24),
              ],
            ),
          ],
        ),
      ),
    )
        .animate()
        .fadeIn(duration: 300.ms, delay: (80 * index).ms)
        .slideY(begin: 0.06);
  }

  String _formatDate(String dateStr) {
    final dt = DateTime.tryParse(dateStr);
    if (dt == null) {
      return '';
    }
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) {
      return 'Just now';
    }
    if (diff.inMinutes < 60) {
      return '${diff.inMinutes}m ago';
    }
    if (diff.inHours < 24) {
      return '${diff.inHours}h ago';
    }
    if (diff.inDays < 7) {
      return '${diff.inDays}d ago';
    }
    return '${dt.day}/${dt.month}/${dt.year}';
  }

  void _showCreateThreadDialog(
      BuildContext context, WidgetRef ref, String? courseId) {
    final titleController = TextEditingController();
    final contentController = TextEditingController();
    var isSubmitting = false;

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF1E293B),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(builder: (context, setState) {
          return Padding(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(context).viewInsets.bottom,
              left: 24,
              right: 24,
              top: 24,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.white24,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  'Create New Thread',
                  style: GoogleFonts.outfit(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 20),
                TextField(
                  controller: titleController,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    labelText: 'Title',
                    labelStyle: const TextStyle(color: Colors.white54),
                    filled: true,
                    fillColor: Colors.black26,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFF3B82F6)),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: contentController,
                  maxLines: 4,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    labelText: 'Content',
                    labelStyle: const TextStyle(color: Colors.white54),
                    filled: true,
                    fillColor: Colors.black26,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFF3B82F6)),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: isSubmitting
                      ? null
                      : () async {
                          if (titleController.text.trim().isEmpty ||
                              contentController.text.trim().isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Please fill all fields'),
                                behavior: SnackBarBehavior.floating,
                              ),
                            );
                            return;
                          }
                          setState(() => isSubmitting = true);
                          try {
                            final data = {
                              'title': titleController.text.trim(),
                              'content': contentController.text.trim(),
                            };
                            if (courseId != null) {
                              data['course'] = courseId;
                            }
                            await ref
                                .read(discussionRepositoryProvider)
                                .createThread(data);

                            if (!context.mounted) {
                              return;
                            }
                            Navigator.pop(context);
                            ref.invalidate(discussionListProvider(courseId));
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Thread created successfully!'),
                                backgroundColor: Color(0xFF10B981),
                                behavior: SnackBarBehavior.floating,
                              ),
                            );
                          } on Exception catch (e) {
                            if (!context.mounted) {
                              return;
                            }
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Failed: $e'),
                                behavior: SnackBarBehavior.floating,
                              ),
                            );
                            setState(() => isSubmitting = false);
                          }
                        },
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF3B82F6),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: isSubmitting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : Text('Post Thread',
                          style: GoogleFonts.outfit(
                              fontWeight: FontWeight.bold, fontSize: 16)),
                ),
                const SizedBox(height: 24),
              ],
            ),
          );
        });
      },
    );
  }
}
