import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../logic/notes_provider.dart';

class NotesTab extends ConsumerStatefulWidget {
  final String courseId;
  final String? currentLessonId;
  final Duration? currentTimestamp;
  final VoidCallback? onTimestampTap;

  const NotesTab({
    super.key,
    required this.courseId,
    this.currentLessonId,
    this.currentTimestamp,
    this.onTimestampTap,
  });

  @override
  ConsumerState<NotesTab> createState() => _NotesTabState();
}

class _NotesTabState extends ConsumerState<NotesTab> {
  final TextEditingController _controller = TextEditingController();
  bool _isAdding = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _handleAdd() {
    setState(() {
      _isAdding = true;
    });
  }

  void _handleSave() {
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    ref.read(courseNotesProvider(widget.courseId).notifier).addNote(
          content: text,
          lessonId: widget.currentLessonId,
          timestamp: widget.currentTimestamp,
        );

    _controller.clear();
    setState(() {
      _isAdding = false;
    });
  }

  void _handleCancel() {
    _controller.clear();
    setState(() {
      _isAdding = false;
    });
  }

  String _formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    final minutes = twoDigits(duration.inMinutes.remainder(60));
    final seconds = twoDigits(duration.inSeconds.remainder(60));
    return '$minutes:$seconds';
  }

  @override
  Widget build(BuildContext context) {
    final notesState = ref.watch(courseNotesProvider(widget.courseId));
    final theme = Theme.of(context);

    return Column(
      children: [
        // Add Note bar
        if (!_isAdding)
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: FilledButton.icon(
              onPressed: _handleAdd,
              icon: const Icon(Icons.add),
              label: const Text('Add a new note'),
              style: FilledButton.styleFrom(
                minimumSize: const Size(double.infinity, 48),
              ),
            ),
          ),

        // Add Note Input
        if (_isAdding)
          Container(
            padding: const EdgeInsets.all(16),
            color: theme.colorScheme.surfaceContainerHighest
                .withValues(alpha: 0.3),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Create a new note',
                    style: theme.textTheme.titleSmall
                        ?.copyWith(fontWeight: FontWeight.bold)),
                if (widget.currentTimestamp != null) ...[
                  const SizedBox(height: 8),
                  Chip(
                    label:
                        Text('At ${_formatDuration(widget.currentTimestamp!)}'),
                    avatar: const Icon(Icons.access_time, size: 16),
                    visualDensity: VisualDensity.compact,
                  ),
                ],
                const SizedBox(height: 8),
                TextField(
                  controller: _controller,
                  maxLines: 3,
                  autofocus: true,
                  decoration: const InputDecoration(
                    hintText: 'Type your note here...',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: _handleCancel,
                      child: const Text('Cancel'),
                    ),
                    const SizedBox(width: 8),
                    FilledButton(
                      onPressed: _handleSave,
                      child: const Text('Save Note'),
                    ),
                  ],
                ),
              ],
            ),
          ),

        // Notes List
        Expanded(
          child: notesState.when(
            data: (notes) {
              if (notes.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.edit_note,
                          size: 64, color: theme.disabledColor),
                      const SizedBox(height: 16),
                      Text(
                        'No notes yet',
                        style: theme.textTheme.bodyLarge
                            ?.copyWith(color: theme.disabledColor),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Click the button above to add one',
                        style: theme.textTheme.bodySmall
                            ?.copyWith(color: theme.disabledColor),
                      ),
                    ],
                  ),
                );
              }

              return Column(
                children: [
                  Padding(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '${notes.length} Notes',
                          style: theme.textTheme.labelLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                        TextButton.icon(
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                  content:
                                      Text('AI Summarization Coming Soon!')),
                            );
                          },
                          icon: const Icon(Icons.auto_awesome, size: 16),
                          label: const Text('Summarize with AI'),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: notes.length,
                      itemBuilder: (context, index) {
                        final note = notes[index];
                        return Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    if (note.timestamp != null)
                                      ActionChip(
                                        label: Text(
                                            _formatDuration(note.timestamp!)),
                                        avatar: const Icon(
                                            Icons.play_circle_outline,
                                            size: 16),
                                        visualDensity: VisualDensity.compact,
                                        onPressed: widget.onTimestampTap,
                                        backgroundColor: theme
                                            .colorScheme.primaryContainer
                                            .withValues(alpha: 0.2),
                                      ),
                                    const Spacer(),
                                    Text(
                                      _formatDate(note.createdAt),
                                      style: theme.textTheme.labelSmall
                                          ?.copyWith(
                                              color: theme.colorScheme
                                                  .onSurfaceVariant),
                                    ),
                                    PopupMenuButton(
                                      itemBuilder: (context) => [
                                        const PopupMenuItem(
                                          value: 'delete',
                                          child: Text('Delete'),
                                        ),
                                      ],
                                      onSelected: (value) {
                                        if (value == 'delete') {
                                          ref
                                              .read(courseNotesProvider(
                                                      widget.courseId)
                                                  .notifier)
                                              .deleteNote(note.id);
                                        }
                                      },
                                      icon:
                                          const Icon(Icons.more_vert, size: 18),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(note.content),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(child: Text('Error: $e')),
          ),
        ),
      ],
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}
