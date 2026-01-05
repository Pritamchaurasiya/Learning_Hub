import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:learning_hub/core/theme/app_colors.dart';
import 'package:learning_hub/core/providers/download_provider.dart';

/// Downloads screen for offline content management
class DownloadsScreen extends ConsumerWidget {
  const DownloadsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final downloadState = ref.watch(downloadProvider);
    final activeDownloads = ref.watch(activeDownloadsProvider);
    final completedDownloads = ref.watch(completedDownloadsProvider);

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.pop(),
          ),
          title: const Text('Downloads'),
          actions: [
            if (completedDownloads.isNotEmpty)
              IconButton(
                icon: const Icon(Icons.delete_sweep_outlined),
                onPressed: () => _showClearConfirmation(context, ref),
                tooltip: 'Clear completed',
              ),
          ],
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Active'),
              Tab(text: 'Completed'),
            ],
          ),
        ),
        body: Column(
          children: [
            // Storage indicator
            Container(
              padding: const EdgeInsets.all(16),
              color: theme.colorScheme.surfaceContainerHighest,
              child: Row(
                children: [
                  Icon(
                    Icons.storage,
                    color: theme.colorScheme.primary,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Storage Used',
                          style: theme.textTheme.bodySmall,
                        ),
                        Text(
                          downloadState.formattedStorageUsed,
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                  FilledButton.tonal(
                    onPressed: () => _showAddDownloadDemo(context, ref),
                    child: const Text('Add Demo'),
                  ),
                ],
              ),
            ),

            // Tabs content
            Expanded(
              child: TabBarView(
                children: [
                  // Active downloads
                  activeDownloads.isEmpty
                      ? const _EmptyState(
                          icon: Icons.download_outlined,
                          title: 'No active downloads',
                          subtitle:
                              'Start downloading courses for offline access',
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: activeDownloads.length,
                          itemBuilder: (context, index) {
                            return _ActiveDownloadCard(
                              download: activeDownloads[index],
                            ).animate().fadeIn(
                                  delay: Duration(milliseconds: index * 100),
                                );
                          },
                        ),

                  // Completed downloads
                  completedDownloads.isEmpty
                      ? const _EmptyState(
                          icon: Icons.download_done_outlined,
                          title: 'No completed downloads',
                          subtitle: 'Completed downloads will appear here',
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: completedDownloads.length,
                          itemBuilder: (context, index) {
                            return _CompletedDownloadCard(
                              download: completedDownloads[index],
                            ).animate().fadeIn(
                                  delay: Duration(milliseconds: index * 100),
                                );
                          },
                        ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showClearConfirmation(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear Completed'),
        content: const Text(
          'This will remove all completed downloads from your device. This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              ref.read(downloadProvider.notifier).clearCompleted();
              Navigator.pop(context);
            },
            child: const Text('Clear'),
          ),
        ],
      ),
    );
  }

  void _showAddDownloadDemo(BuildContext context, WidgetRef ref) {
    // Add demo download
    ref.read(downloadProvider.notifier).addDownload(
          courseId: 'course_${DateTime.now().millisecondsSinceEpoch}',
          courseName: 'Flutter Bootcamp',
          lessonId: 'lesson_1',
          title: 'Lesson ${DateTime.now().second}: Introduction to Widgets',
          totalSizeBytes: 50 * 1024 * 1024, // 50 MB
        );

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Demo download started!')),
    );
  }
}

/// Active download card
class _ActiveDownloadCard extends ConsumerWidget {
  final DownloadItem download;

  const _ActiveDownloadCard({required this.download});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isDownloading = download.status == DownloadStatus.downloading;
    final isPaused = download.status == DownloadStatus.paused;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    isDownloading
                        ? Icons.downloading
                        : (isPaused ? Icons.pause : Icons.hourglass_empty),
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        download.title,
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        download.courseName,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                _DownloadActions(download: download),
              ],
            ),
            const SizedBox(height: 16),
            LinearProgressIndicator(
              value: download.progress,
              backgroundColor: theme.colorScheme.surfaceContainerHighest,
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  download.formattedProgress,
                  style: theme.textTheme.bodySmall,
                ),
                Text(
                  '${(download.progress * 100).toStringAsFixed(0)}%',
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Download action buttons
class _DownloadActions extends ConsumerWidget {
  final DownloadItem download;

  const _DownloadActions({required this.download});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDownloading = download.status == DownloadStatus.downloading;
    final isPaused = download.status == DownloadStatus.paused;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (isDownloading)
          IconButton(
            icon: const Icon(Icons.pause),
            onPressed: () {
              ref.read(downloadProvider.notifier).pauseDownload(download.id);
            },
          )
        else if (isPaused)
          IconButton(
            icon: const Icon(Icons.play_arrow),
            onPressed: () {
              ref.read(downloadProvider.notifier).resumeDownload(download.id);
            },
          ),
        IconButton(
          icon: const Icon(Icons.close),
          onPressed: () {
            ref.read(downloadProvider.notifier).removeDownload(download.id);
          },
        ),
      ],
    );
  }
}

/// Completed download card
class _CompletedDownloadCard extends ConsumerWidget {
  final DownloadItem download;

  const _CompletedDownloadCard({required this.download});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return Dismissible(
      key: Key(download.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 16),
        color: AppColors.error,
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      onDismissed: (_) {
        ref.read(downloadProvider.notifier).removeDownload(download.id);
      },
      child: Card(
        margin: const EdgeInsets.only(bottom: 12),
        child: ListTile(
          contentPadding: const EdgeInsets.all(16),
          leading: Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: AppColors.success.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.download_done, color: AppColors.success),
          ),
          title: Text(
            download.title,
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 4),
              Text(
                download.courseName,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                download.formattedSize,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.primary,
                ),
              ),
            ],
          ),
          trailing: IconButton(
            icon: const Icon(Icons.play_circle_filled),
            iconSize: 40,
            color: AppColors.primary,
            onPressed: () {
              context.push(
                  '/course/${download.courseId}/lesson/${download.lessonId}');
            },
          ),
        ),
      ),
    );
  }
}

/// Empty state widget
class _EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;

  const _EmptyState({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 64, color: theme.colorScheme.onSurfaceVariant),
          const SizedBox(height: 16),
          Text(title, style: theme.textTheme.titleMedium),
          const SizedBox(height: 8),
          Text(
            subtitle,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
