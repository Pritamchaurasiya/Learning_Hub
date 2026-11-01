import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';
import 'package:learning_hub/data/models/dsa_problem.dart';
import 'package:learning_hub/features/dsa/dsa_problem_controller.dart';
import 'package:learning_hub/core/theme/app_colors.dart';
import 'package:google_fonts/google_fonts.dart';

// Ephemeral state for code and language
final dsaCodeProvider = StateProvider.autoDispose<String>((ref) => '');
final dsaLanguageProvider = StateProvider.autoDispose<String>((ref) => 'python');

class DsaProblemDetailScreen extends ConsumerStatefulWidget {
  final DsaProblem problem;

  const DsaProblemDetailScreen({super.key, required this.problem});

  @override
  ConsumerState<DsaProblemDetailScreen> createState() => _DsaProblemDetailScreenState();
}

class _DsaProblemDetailScreenState extends ConsumerState<DsaProblemDetailScreen> {
  @override
  void initState() {
    super.initState();
    // Trigger fetch details
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(dsaProblemDetailProvider(widget.problem.slug).notifier).fetchProblemDetails();
    });
  }

  @override
  Widget build(BuildContext context) {
    // Watch the specific provider family
    final detailState = ref.watch(dsaProblemDetailProvider(widget.problem.slug));
    
    // Merge initial problem with fetched detailed problem
    final currentProblem = detailState.problem ?? widget.problem;

    return Scaffold(
      appBar: AppBar(
        title: Text(currentProblem.title),
        actions: [
          Chip(
            label: Text('${currentProblem.points} pts'),
            backgroundColor: AppColors.primary.withValues(alpha: 0.1),
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: Stack(
        children: [
          LayoutBuilder(
            builder: (context, constraints) {
              if (constraints.maxWidth > 800) {
                return _buildSplitView(context, ref, currentProblem);
              } else {
                return _buildTabView(context, ref, currentProblem);
              }
            },
          ),
          if (detailState.isLoading || detailState.isSubmitting)
             const LinearProgressIndicator(),
        ],
      ),
    );
  }

  Widget _buildSplitView(BuildContext context, WidgetRef ref, DsaProblem problem) {
    return Row(
      children: [
        Expanded(
          flex: 1,
          child: Container(
             decoration: BoxDecoration(
              border: Border(right: BorderSide(color: Colors.grey.withValues(alpha: 0.2))),
            ),
            child: _buildProblemDescription(context, problem),
          ),
        ),
        Expanded(
          flex: 1,
          child: _buildCodeEditorPanel(context, ref, problem),
        ),
      ],
    );
  }

  Widget _buildTabView(BuildContext context, WidgetRef ref, DsaProblem problem) {
    return DefaultTabController(
      length: 2,
      child: Column(
        children: [
          const TabBar(
            tabs: [
              Tab(text: 'Description'),
              Tab(text: 'Code & Submit'),
            ],
          ),
          Expanded(
            child: TabBarView(
              children: [
                _buildProblemDescription(context, problem),
                _buildCodeEditorPanel(context, ref, problem),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProblemDescription(BuildContext context, DsaProblem problem) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            problem.title,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _buildBadge(problem.difficulty, _getDifficultyColor(problem.difficulty)),
              const SizedBox(width: 8),
              ...problem.tags.map((t) => Padding(
                    padding: const EdgeInsets.only(right: 8.0),
                    child: _buildBadge(t, Colors.grey),
                  )),
            ],
          ),
          const SizedBox(height: 24),
          const Divider(),
          const SizedBox(height: 16),
          if (problem.description != null)
            MarkdownBody(
              data: problem.description!,
              selectable: true,
              styleSheet: MarkdownStyleSheet.fromTheme(Theme.of(context)).copyWith(
                p: Theme.of(context).textTheme.bodyLarge?.copyWith(height: 1.6),
                code: GoogleFonts.firaCode(
                  backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                ),
                codeblockDecoration: BoxDecoration(
                   color: Theme.of(context).colorScheme.surfaceContainerHighest,
                   borderRadius: BorderRadius.circular(8),
                ),
              ),
            )
          else
             const Center(child: Text('Loading description...')), 
          
          if (problem.constraints != null)...[
             const SizedBox(height: 24),
             Text('Constraints', style: Theme.of(context).textTheme.titleLarge),
             const SizedBox(height: 8),
             MarkdownBody(data: problem.constraints!)
          ]
        ],
      ),
    );
  }

  Widget _buildCodeEditorPanel(BuildContext context, WidgetRef ref, DsaProblem problem) {
    final selectedLang = ref.watch(dsaLanguageProvider);
    final code = ref.watch(dsaCodeProvider);
    final detailState = ref.watch(dsaProblemDetailProvider(problem.slug));

    return Column(
      children: [
        // Editor Toolbar
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
             color: Theme.of(context).colorScheme.surface,
             border: Border(bottom: BorderSide(color: Colors.grey.withValues(alpha: 0.2))),
          ),
          child: Row(
            children: [
              const Text('Language:'),
              const SizedBox(width: 12),
              DropdownButton<String>(
                value: selectedLang,
                underline: const SizedBox(),
                items: const [
                  DropdownMenuItem(value: 'python', child: Text('Python 3')),
                  DropdownMenuItem(value: 'dart', child: Text('Dart')),
                  DropdownMenuItem(value: 'cpp', child: Text('C++')),
                ],
                onChanged: (val) {
                  if (val != null) ref.read(dsaLanguageProvider.notifier).state = val;
                },
              ),
              const Spacer(),
              if (detailState.executionResult != null)
                 Text(detailState.submissionStatus ?? '', style: TextStyle(
                   color: detailState.submissionStatus == 'AC' ? Colors.green : Colors.red,
                   fontWeight: FontWeight.bold
                 )),
            ],
          ),
        ),
        
        // Code Area
        Expanded(
          child: Container(
            color: const Color(0xFF1E1E1E), // Dark editor background
            child: SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: TextField(
                  controller: TextEditingController(text: code)
                    ..selection = TextSelection.fromPosition(
                        TextPosition(offset: code.length)), 
                  onChanged: (val) {
                     ref.read(dsaCodeProvider.notifier).state = val;
                  },
                  maxLines: null,
                  style: GoogleFonts.firaCode(
                    color: const Color(0xFFD4D4D4),
                    fontSize: 14,
                    height: 1.5,
                  ),
                  decoration: const InputDecoration(
                    border: InputBorder.none,
                    hintText: '# Write your code here...',
                    hintStyle: TextStyle(color: Colors.grey),
                  ),
                ),
              ),
            ),
          ),
        ),

        // Action Bar
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            border: Border(top: BorderSide(color: Colors.grey.withValues(alpha: 0.2))),
            color: Theme.of(context).colorScheme.surface,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              OutlinedButton.icon(
                onPressed: () {
                   // TODO: Run tests local or basic
                },
                icon: const Icon(Icons.play_arrow),
                label: const Text('Run Tests'),
              ),
              const SizedBox(width: 16),
              FilledButton.icon(
                onPressed: detailState.isSubmitting ? null : () {
                   ref.read(dsaProblemDetailProvider(problem.slug).notifier)
                      .submitSolution(code, selectedLang);
                },
                icon: const Icon(Icons.cloud_upload),
                label: const Text('Submit'),
              ),
            ],
          ),
        ),
        
        // Output Area (if result exists)
        if (detailState.executionResult != null)
          Container(
            height: 150,
             width: double.infinity,
             padding: const EdgeInsets.all(16),
             color: Colors.black87,
             child: SingleChildScrollView(
               child: Text(
                 detailState.executionResult ?? '',
                 style: GoogleFonts.firaCode(color: Colors.white),
               ),
             ),
          )
      ],
    );
  }

  Widget _buildBadge(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color.withValues(alpha: 0.5)),
      ),
      child: Text(
        text.toUpperCase(),
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Color _getDifficultyColor(String difficulty) {
    switch (difficulty.toUpperCase()) {
      case 'EASY':
        return Colors.green;
      case 'MEDIUM':
        return Colors.orange;
      case 'HARD':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }
}
