import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:my_flutter_app/src/features/ai/data/ai_repository.dart';
import 'package:my_flutter_app/src/features/ai/presentation/widgets/ai_tutor_drawer.dart';

final moduleContentProvider =
    FutureProvider.family<String, String>((ref, filename) async {
  return ref.watch(aiRepositoryProvider).getModuleContent(filename);
});

class ModuleDetailScreen extends ConsumerWidget {
  const ModuleDetailScreen({super.key, required this.filename});
  final String filename;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final contentAsync = ref.watch(moduleContentProvider(filename));

    return Scaffold(
      appBar: AppBar(
        title: Text(
            filename.replaceAll('.md', '').replaceAll('_', ' ').toUpperCase()),
        actions: [
          IconButton(
            icon: const Icon(Icons.quiz),
            tooltip: 'Take Quiz',
            onPressed: () => context.push('/curriculum/$filename/quiz'),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          showModalBottomSheet<void>(
            context: context,
            isScrollControlled: true,
            backgroundColor: Colors.transparent,
            builder: (context) => AITutorDrawer(moduleFilename: filename),
          );
        },
        child: const Icon(Icons.psychology),
      ),
      body: contentAsync.when(
        data: (content) => Markdown(
          data: content,
          selectable: true,
          styleSheet: MarkdownStyleSheet.fromTheme(Theme.of(context)).copyWith(
            h1: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.primary,
                ),
            h2: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.secondary,
                ),
            code: TextStyle(
              backgroundColor:
                  Theme.of(context).colorScheme.surfaceContainerHighest,
              fontFamily: 'monospace',
            ),
            codeblockDecoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(8),
            ),
          ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
      ),
    );
  }
}
