import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:my_flutter_app/src/features/auth/presentation/auth_controller.dart';
import 'package:my_flutter_app/src/features/dsa/data/dsa_repository.dart';
import 'package:my_flutter_app/src/features/dsa/data/submission_websocket_service.dart';
import 'package:my_flutter_app/src/features/dsa/domain/dsa_models.dart';
import '../widgets/ai_chat_widget.dart';

class DsaProblemDetailScreen extends ConsumerStatefulWidget {
  const DsaProblemDetailScreen({super.key, required this.slug});
  final String slug;

  @override
  ConsumerState<DsaProblemDetailScreen> createState() =>
      _DsaProblemDetailScreenState();
}

class _DsaProblemDetailScreenState
    extends ConsumerState<DsaProblemDetailScreen> {
  final TextEditingController _codeController = TextEditingController();
  bool _isSubmitting = false;
  DsaSubmission? _latestSubmission;
  String? _realTimeStatus;

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final problem = ref.read(dsaProblemDetailProvider(widget.slug)).value;
    if (problem == null) {
      return;
    }

    setState(() {
      _isSubmitting = true;
      _latestSubmission = null;
      _realTimeStatus = 'Sending...';
    });

    try {
      final submission = await ref.read(dsaRepositoryProvider).submitSolution(
            problem.id,
            _codeController.text,
          );
      setState(() {
        _latestSubmission = submission;
      });
    } on Exception catch (e) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Submission failed: $e')),
      );
      setState(() {
        _isSubmitting = false;
        _realTimeStatus = null;
      });
    }
  }

  void _onWebSocketUpdate(Map<String, dynamic> data) {
    debugPrint('WebSocket update: $data');
    final status = data['status'] as String?;
    final submissionId = data['submission_id'] as String?;

    if (status == 'PROCESSING') {
      setState(() {
        _realTimeStatus = 'AI & Sandbox Executing...';
      });
    } else if (status == 'FINISHED') {
      setState(() {
        _realTimeStatus = 'Finalizing...';
      });
      // Re-fetch submission details once finished
      if (submissionId != null) {
        _refreshSubmission(submissionId);
      }
    }
  }

  Future<void> _refreshSubmission(String id) async {
    try {
      // In a real app, we might have a getSubmissionById method
      // For now, let's just wait a bit and re-fetch the latest for the problem if needed
      // but actually the backend should have updated the DB by now.
      await Future<void>.delayed(const Duration(milliseconds: 500));
      // Re-triggering the provider might be overkill if we just want one submission,
      // but let's assume we can get it from repository
      // For simplicity in this demo, we'll just stop the loading state
      // as the user sees the 'Accepted' from the initial submit if eager,
      // or we can add a polling link.
      setState(() {
        _isSubmitting = false;
        _realTimeStatus = null;
      });
      // Force refreshing the problem detail which includes latest submissions if provided
      ref.invalidate(dsaProblemDetailProvider(widget.slug));
    } on Exception catch (e) {
      debugPrint('Error refreshing submission: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final problemAsync = ref.watch(dsaProblemDetailProvider(widget.slug));
    final user = ref.watch(authControllerProvider).value;

    if (user != null) {
      ref.listen(submissionWebSocketServiceProvider(user.id), (previous, next) {
        if (next is AsyncData && next.value != null) {
          _onWebSocketUpdate(next.value!);
        }
      });
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Solve Challenge'),
      ),
      body: problemAsync.when(
        data: (problem) => Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      problem.title,
                      style:
                          Theme.of(context).textTheme.headlineMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: Colors.blueAccent,
                              ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.grey[200],
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        problem.difficulty,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Description',
                      style:
                          TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const Divider(),
                    MarkdownBody(data: problem.description),
                    if (problem.constraints.isNotEmpty) ...[
                      const SizedBox(height: 24),
                      const Text(
                        'Constraints',
                        style: TextStyle(
                            fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const Divider(),
                      MarkdownBody(data: problem.constraints),
                    ],
                    const SizedBox(height: 24),
                    const Text(
                      'Provide Your Solution (Python)',
                      style:
                          TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.05),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.grey[300]!),
                      ),
                      padding: const EdgeInsets.all(12),
                      child: TextField(
                        controller: _codeController,
                        maxLines: 15,
                        style: const TextStyle(
                            fontFamily: 'monospace', fontSize: 14),
                        decoration: const InputDecoration(
                          hintText:
                              '''# Read input from stdin and print to stdout
import sys

def solve():
    # Example: Read lines
    # lines = sys.stdin.readlines()
    # Process...
    # print(result)
    pass

if __name__ == "__main__":
    solve()
''',
                          border: InputBorder.none,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.blueGrey.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.info_outline,
                              size: 16, color: Colors.blueGrey),
                          SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Standard Input/Output (CP Style): Read from stdin, print to stdout.',
                              style: TextStyle(
                                  fontSize: 12, color: Colors.blueGrey),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    if (_isSubmitting && _realTimeStatus != null)
                      _buildRealTimeProgress(),
                    if (_latestSubmission != null) _buildSubmissionResult(),
                    const SizedBox(height: 80), // Space for FAB
                  ],
                ),
              ),
            ),
          ],
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _isSubmitting ? null : _submit,
        label: _isSubmitting
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                    color: Colors.white, strokeWidth: 2),
              )
            : const Text('Submit Solution'),
        icon: _isSubmitting ? null : const Icon(Icons.send),
      ),
    );
  }

  Widget _buildRealTimeProgress() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.blue.withValues(alpha: 0.05),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.blue.withValues(alpha: 0.1)),
        ),
        child: Row(
          children: [
            const SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            const SizedBox(width: 12),
            Text(
              _realTimeStatus!,
              style: const TextStyle(
                  fontWeight: FontWeight.bold, color: Colors.blue),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSubmissionResult() {
    final submission = _latestSubmission!;
    Color statusColor;
    switch (submission.status) {
      case SubmissionStatus.accepted:
        statusColor = Colors.green;
        break;
      case SubmissionStatus.pending:
        statusColor = Colors.orange;
        break;
      default:
        statusColor = Colors.red;
    }

    return Card(
      color: statusColor.withValues(alpha: 0.1),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.assignment_turned_in, color: statusColor),
                const SizedBox(width: 8),
                Text(
                  'Status: ${submission.statusDisplay}',
                  style: TextStyle(
                      color: statusColor,
                      fontWeight: FontWeight.bold,
                      fontSize: 16),
                ),
              ],
            ),
            if (submission.runtimeMs != null)
              Text('Runtime: ${submission.runtimeMs}ms'),
            if (submission.errorLog != null &&
                submission.errorLog!.isNotEmpty) ...[
              const SizedBox(height: 8),
              const Text('Logs:',
                  style: TextStyle(fontWeight: FontWeight.bold)),
              Text(submission.errorLog!,
                  style:
                      const TextStyle(fontFamily: 'monospace', fontSize: 12)),
            ],
            if (submission.aiFeedback != null) ...[
              const Divider(height: 24),
              _buildAiFeedback(submission.aiFeedback!),
              const SizedBox(height: 24),
              SizedBox(
                height: 400,
                child: DsaAiChatWidget(submissionId: submission.id),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildAiFeedback(Map<String, dynamic> feedback) {
    final complexity = feedback['complexity'] as Map<String, dynamic>?;
    final time = (complexity?['time'] as String?) ?? 'N/A';
    final space = (complexity?['space'] as String?) ?? 'N/A';
    final optimization = feedback['optimization_tip'] as String?;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.auto_awesome, color: Colors.purple, size: 20),
            const SizedBox(width: 8),
            Text(
              'AI Code Critic',
              style: TextStyle(
                color: Colors.purple[800],
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            _complexityBadge('Time', time, Colors.blue),
            const SizedBox(width: 8),
            _complexityBadge('Space', space, Colors.orange),
          ],
        ),
        const SizedBox(height: 12),
        Text(
          (feedback['feedback'] as String?) ?? 'Analyzing logic...',
          style: const TextStyle(fontSize: 14, fontStyle: FontStyle.italic),
        ),
        if (optimization != null && optimization.isNotEmpty) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.purple.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.purple.withValues(alpha: 0.1)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.lightbulb_outline,
                    color: Colors.purple, size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    optimization,
                    style: TextStyle(
                      color: Colors.purple[900],
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _complexityBadge(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Text(
        '$label: $value',
        style: TextStyle(
          color: color.darken(20),
          fontWeight: FontWeight.bold,
          fontSize: 12,
        ),
      ),
    );
  }
}

extension ColorExtension on Color {
  Color darken([int percent = 10]) {
    assert(1 <= percent && percent <= 100);
    final f = 1 - percent / 100;
    return Color.fromARGB(
      a.toInt(),
      (r * f).toInt(),
      (g * f).toInt(),
      (b * f).toInt(),
    );
  }
}
