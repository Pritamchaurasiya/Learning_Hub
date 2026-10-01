import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

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
    extends ConsumerState<DsaProblemDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _codeController = TextEditingController();

  String _selectedLanguage = 'python';
  bool _isRunning = false;
  bool _isSubmitting = false;
  DsaValidationResult? _validationResult;
  DsaSubmission? _latestSubmission;
  String? _realTimeStatus;
  Timer? _draftTimer;
  List<DsaSubmission> _pastSubmissions = [];
  bool _isLoadingSubmissions = false;

  final Map<String, String> _languageTemplates = {
    'python': '''# Read input from standard input and print output
import sys

def solve():
    # input_data = sys.stdin.read()
    pass

if __name__ == "__main__":
    solve()
''',
    'javascript': '''// Read input from standard input and print output
const fs = require('fs');

function solve() {
    // const input = fs.readFileSync(0, 'utf-8');
}

solve();
''',
    'cpp': '''#include <iostream>
#include <vector>
#include <string>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    // Write solution here
    return 0;
}
''',
  };

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _codeController.text = _languageTemplates['python']!;
    _loadDraft();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _codeController.dispose();
    _draftTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadDraft() async {
    final draft = await ref
        .read(dsaRepositoryProvider)
        .getDraft(widget.slug, language: _selectedLanguage);
    if (draft.trim().isNotEmpty && mounted) {
      setState(() {
        _codeController.text = draft;
      });
    }
  }

  void _onCodeChanged(String text) {
    _draftTimer?.cancel();
    _draftTimer = Timer(const Duration(seconds: 2), () {
      ref
          .read(dsaRepositoryProvider)
          .saveDraft(widget.slug, text, language: _selectedLanguage);
    });
  }

  void _onLanguageChanged(String newLang) {
    if (newLang == _selectedLanguage) return;
    setState(() {
      _selectedLanguage = newLang;
      _codeController.text = _languageTemplates[newLang] ?? '';
    });
    _loadDraft();
  }

  Future<void> _runCode() async {
    final problem = ref.read(dsaProblemDetailProvider(widget.slug)).value;
    if (problem == null) return;

    setState(() {
      _isRunning = true;
      _validationResult = null;
    });

    try {
      final result = await ref.read(dsaRepositoryProvider).validateSolution(
            problem.id,
            _codeController.text,
            language: _selectedLanguage,
          );
      if (mounted) {
        setState(() {
          _validationResult = result;
          _isRunning = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isRunning = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Test execution error: $e')),
        );
      }
    }
  }

  Future<void> _submit() async {
    final problem = ref.read(dsaProblemDetailProvider(widget.slug)).value;
    if (problem == null) return;

    setState(() {
      _isSubmitting = true;
      _latestSubmission = null;
      _realTimeStatus = 'Enqueuing in execution sandbox...';
    });

    try {
      final submission = await ref.read(dsaRepositoryProvider).submitSolution(
            problem.id,
            _codeController.text,
            language: _selectedLanguage,
          );
      if (mounted) {
        setState(() {
          _latestSubmission = submission;
          _isSubmitting = false;
          _realTimeStatus = null;
        });
        _fetchSubmissions(problem.id);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Submission failed: $e')),
        );
        setState(() {
          _isSubmitting = false;
          _realTimeStatus = null;
        });
      }
    }
  }

  Future<void> _fetchSubmissions(int problemId) async {
    setState(() {
      _isLoadingSubmissions = true;
    });
    try {
      final list = await ref
          .read(dsaRepositoryProvider)
          .getSubmissions(problemId: problemId);
      if (mounted) {
        setState(() {
          _pastSubmissions = list;
          _isLoadingSubmissions = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isLoadingSubmissions = false;
        });
      }
    }
  }

  void _onWebSocketUpdate(Map<String, dynamic> data) {
    final status = data['status'] as String?;

    if (status == 'PROCESSING') {
      setState(() {
        _realTimeStatus = 'AI & Sandbox Executing...';
      });
    } else if (status == 'FINISHED') {
      setState(() {
        _realTimeStatus = 'Finalizing...';
        _isSubmitting = false;
      });
      final problem = ref.read(dsaProblemDetailProvider(widget.slug)).value;
      if (problem != null) {
        _fetchSubmissions(problem.id);
      }
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
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        elevation: 0,
        title: problemAsync.when(
          data: (problem) => Row(
            children: [
              Expanded(
                child: Text(
                  problem.title,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.outfit(
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                    color: Colors.white,
                  ),
                ),
              ),
              _buildDifficultyBadge(problem.difficulty),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.amber.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.stars, color: Colors.amber, size: 14),
                    const SizedBox(width: 4),
                    Text(
                      '${problem.points} XP',
                      style: GoogleFonts.outfit(
                        color: Colors.amber,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          loading: () => const Text('Loading Challenge...'),
          error: (_, __) => const Text('Challenge Error'),
        ),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: const Color(0xFF38BDF8),
          indicatorWeight: 3,
          labelColor: const Color(0xFF38BDF8),
          unselectedLabelColor: Colors.white60,
          labelStyle: GoogleFonts.outfit(fontWeight: FontWeight.bold),
          tabs: const [
            Tab(icon: Icon(Icons.description_outlined, size: 18), text: 'Problem'),
            Tab(icon: Icon(Icons.code_rounded, size: 18), text: 'Editor & Sandbox'),
            Tab(icon: Icon(Icons.psychology_outlined, size: 18), text: 'AI Guide'),
            Tab(icon: Icon(Icons.history_rounded, size: 18), text: 'Submissions'),
          ],
        ),
      ),
      body: problemAsync.when(
        data: (problem) => TabBarView(
          controller: _tabController,
          children: [
            _buildProblemTab(problem),
            _buildEditorTab(problem),
            _buildAiGuideTab(problem),
            _buildSubmissionsTab(problem),
          ],
        ),
        loading: () => const Center(
          child: CircularProgressIndicator(color: Color(0xFF38BDF8)),
        ),
        error: (err, _) => Center(
          child: Text(
            'Error loading problem: $err',
            style: const TextStyle(color: Colors.redAccent),
          ),
        ),
      ),
    );
  }

  Widget _buildDifficultyBadge(String difficulty) {
    Color color;
    switch (difficulty.toUpperCase()) {
      case 'EASY':
        color = const Color(0xFF10B981);
        break;
      case 'MEDIUM':
        color = const Color(0xFFF59E0B);
        break;
      case 'HARD':
        color = const Color(0xFFEF4444);
        break;
      default:
        color = const Color(0xFF3B82F6);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        difficulty.toUpperCase(),
        style: GoogleFonts.outfit(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildProblemTab(DsaProblem problem) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Tags
          if (problem.tags.isNotEmpty)
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: problem.tags
                  .map(
                    (tag) => Container(
                      padding:
                          const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.06),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '#${tag.name}',
                        style: GoogleFonts.outfit(
                          fontSize: 12,
                          color: const Color(0xFF94A3B8),
                        ),
                      ),
                    ),
                  )
                  .toList(),
            ),
          const SizedBox(height: 16),

          // Problem Description
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
            ),
            child: MarkdownBody(
              data: problem.description,
              styleSheet: MarkdownStyleSheet(
                p: GoogleFonts.outfit(color: const Color(0xFFE2E8F0), fontSize: 14),
                code: const TextStyle(
                  fontFamily: 'monospace',
                  backgroundColor: Color(0xFF0F172A),
                  color: Color(0xFF38BDF8),
                ),
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Examples
          if (problem.examples.isNotEmpty) ...[
            Text(
              'Examples',
              style: GoogleFonts.outfit(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 12),
            ...problem.examples.asMap().entries.map((entry) {
              final idx = entry.key + 1;
              final eg = entry.value;
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Example $idx:',
                      style: GoogleFonts.outfit(
                        fontWeight: FontWeight.bold,
                        color: const Color(0xFF38BDF8),
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 8),
                    _buildCodeBlock('Input:', eg.inputData),
                    const SizedBox(height: 6),
                    _buildCodeBlock('Output:', eg.expectedOutput),
                    if (eg.explanation != null && eg.explanation!.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        'Explanation: ${eg.explanation}',
                        style: GoogleFonts.outfit(
                          fontSize: 12,
                          color: const Color(0xFF94A3B8),
                        ),
                      ),
                    ],
                  ],
                ),
              );
            }),
          ],

          // Constraints
          if (problem.constraints.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(
              'Constraints',
              style: GoogleFonts.outfit(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
              ),
              child: Text(
                problem.constraints,
                style: const TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 13,
                  color: Color(0xFFCBD5E1),
                ),
              ),
            ),
          ],
          const SizedBox(height: 30),
        ],
      ),
    );
  }

  Widget _buildCodeBlock(String label, String code) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 55,
          child: Text(
            label,
            style: GoogleFonts.outfit(
              color: const Color(0xFF94A3B8),
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              code,
              style: const TextStyle(
                fontFamily: 'monospace',
                fontSize: 12,
                color: Color(0xFFE2E8F0),
              ),
            ),
          ),
        ),
        IconButton(
          icon: const Icon(Icons.copy, size: 14, color: Color(0xFF64748B)),
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(),
          tooltip: 'Copy',
          onPressed: () {
            Clipboard.setData(ClipboardData(text: code));
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Copied to clipboard!'),
                duration: Duration(seconds: 1),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildEditorTab(DsaProblem problem) {
    return Column(
      children: [
        // Editor Control Bar
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          color: const Color(0xFF1E293B),
          child: Row(
            children: [
              // Language Selector
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedLanguage,
                    dropdownColor: const Color(0xFF1E293B),
                    style: GoogleFonts.outfit(color: Colors.white, fontSize: 13),
                    items: const [
                      DropdownMenuItem(value: 'python', child: Text('Python 3')),
                      DropdownMenuItem(
                          value: 'javascript', child: Text('JavaScript (Node)')),
                      DropdownMenuItem(value: 'cpp', child: Text('C++ (GCC 11)')),
                    ],
                    onChanged: (val) {
                      if (val != null) _onLanguageChanged(val);
                    },
                  ),
                ),
              ),
              const Spacer(),
              // Run Test Cases Button
              OutlinedButton.icon(
                onPressed: _isRunning ? null : _runCode,
                icon: _isRunning
                    ? const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.play_arrow, size: 16),
                label: const Text('Run Tests'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF38BDF8),
                  side: const BorderSide(color: Color(0xFF38BDF8)),
                ),
              ),
              const SizedBox(width: 8),
              // Submit Button
              FilledButton.icon(
                onPressed: _isSubmitting ? null : _submit,
                icon: _isSubmitting
                    ? const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.cloud_upload_outlined, size: 16),
                label: const Text('Submit'),
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF10B981),
                ),
              ),
            ],
          ),
        ),

        // Live Real-Time Sandbox Status Bar
        if (_realTimeStatus != null)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: const Color(0xFF3B82F6).withValues(alpha: 0.15),
            child: Row(
              children: [
                const SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
                const SizedBox(width: 10),
                Text(
                  _realTimeStatus!,
                  style: GoogleFonts.outfit(
                    color: const Color(0xFF60A5FA),
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),

        // Code Editor
        Expanded(
          flex: 3,
          child: Container(
            color: const Color(0xFF0B1120),
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _codeController,
              onChanged: _onCodeChanged,
              maxLines: null,
              expands: true,
              style: const TextStyle(
                fontFamily: 'monospace',
                fontSize: 14,
                color: Color(0xFFE2E8F0),
                height: 1.5,
              ),
              decoration: const InputDecoration(
                border: InputBorder.none,
                hintText: '# Write your code here...',
                hintStyle: TextStyle(color: Colors.white24),
              ),
            ),
          ),
        ),

        // Test Results & Validation Console Panel
        if (_validationResult != null || _latestSubmission != null)
          Expanded(
            flex: 2,
            child: Container(
              padding: const EdgeInsets.all(16),
              color: const Color(0xFF1E293B),
              child: _validationResult != null
                  ? _buildValidationResultPanel(_validationResult!)
                  : _buildSubmissionResultPanel(_latestSubmission!),
            ),
          ),
      ],
    );
  }

  Widget _buildValidationResultPanel(DsaValidationResult result) {
    final isPassed = result.isPassed;
    final color = isPassed ? const Color(0xFF10B981) : const Color(0xFFEF4444);

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                isPassed ? Icons.check_circle : Icons.cancel,
                color: color,
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                isPassed ? 'All Test Cases Passed!' : 'Test Cases Failed',
                style: GoogleFonts.outfit(
                  color: color,
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                ),
              ),
              const Spacer(),
              Text(
                'Passed: ${result.passedTests} / ${result.totalTests}',
                style: GoogleFonts.outfit(
                  color: Colors.white70,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (result.executionTimeMs != null) ...[
                const SizedBox(width: 12),
                Text(
                  '${result.executionTimeMs!.toStringAsFixed(1)} ms',
                  style: GoogleFonts.outfit(
                    color: const Color(0xFF38BDF8),
                    fontSize: 12,
                  ),
                ),
              ],
            ],
          ),
          if (result.feedback != null && result.feedback!.isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                result.feedback!,
                style: const TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 12,
                  color: Color(0xFFCBD5E1),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSubmissionResultPanel(DsaSubmission submission) {
    final isAccepted = submission.status == SubmissionStatus.accepted;
    final color =
        isAccepted ? const Color(0xFF10B981) : const Color(0xFFEF4444);

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                isAccepted ? Icons.verified : Icons.error_outline,
                color: color,
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                'Submission: ${submission.statusDisplay}',
                style: GoogleFonts.outfit(
                  color: color,
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                ),
              ),
              const Spacer(),
              if (submission.runtimeMs != null)
                Text(
                  '${submission.runtimeMs} ms',
                  style: GoogleFonts.outfit(
                    color: const Color(0xFF38BDF8),
                    fontSize: 12,
                  ),
                ),
            ],
          ),
          if (submission.errorLog != null &&
              submission.errorLog!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                submission.errorLog!,
                style: const TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 12,
                  color: Colors.redAccent,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildAiGuideTab(DsaProblem problem) {
    final explanationAsync =
        ref.watch(dsaProblemExplanationProvider(problem.slug));

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // AI Hints Section
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.purple.withValues(alpha: 0.3)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.auto_awesome, color: Colors.purpleAccent, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'AI Intelligent Hint',
                      style: GoogleFonts.outfit(
                        fontWeight: FontWeight.bold,
                        color: Colors.purpleAccent,
                        fontSize: 16,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  'Stuck on this problem? Unlock progressive hints tailored to your current logic.',
                  style: GoogleFonts.outfit(color: Colors.white70, fontSize: 13),
                ),
                const SizedBox(height: 12),
                FilledButton.tonalIcon(
                  onPressed: () async {
                    final hint = await ref
                        .read(dsaRepositoryProvider)
                        .getAiHint(problem.slug);
                    if (context.mounted) {
                      showDialog<void>(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          backgroundColor: const Color(0xFF1E293B),
                          title: Row(
                            children: [
                              const Icon(Icons.lightbulb, color: Colors.amber),
                              const SizedBox(width: 8),
                              Text('AI Hint',
                                  style: GoogleFonts.outfit(color: Colors.white)),
                            ],
                          ),
                          content: Text(
                            hint,
                            style: GoogleFonts.outfit(color: const Color(0xFFE2E8F0)),
                          ),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(ctx),
                              child: const Text('Got it!'),
                            ),
                          ],
                        ),
                      );
                    }
                  },
                  icon: const Icon(Icons.lightbulb_outline, size: 16),
                  label: const Text('Get AI Hint'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Structured Explanation & Approaches
          explanationAsync.when(
            data: (explanation) => Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Problem Intuition',
                  style: GoogleFonts.outfit(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    explanation.intuition,
                    style: GoogleFonts.outfit(
                      color: const Color(0xFFE2E8F0),
                      fontSize: 13,
                      height: 1.4,
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  'Architectural Approaches',
                  style: GoogleFonts.outfit(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 12),
                ...explanation.approaches.map((app) => Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.05),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                app.name,
                                style: GoogleFonts.outfit(
                                  fontWeight: FontWeight.bold,
                                  color: const Color(0xFF38BDF8),
                                  fontSize: 14,
                                ),
                              ),
                              Row(
                                children: [
                                  _buildComplexityChip('Time: ${app.timeComplexity}'),
                                  const SizedBox(width: 6),
                                  _buildComplexityChip('Space: ${app.spaceComplexity}'),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            app.description,
                            style: GoogleFonts.outfit(
                              fontSize: 13,
                              color: const Color(0xFFCBD5E1),
                            ),
                          ),
                        ],
                      ),
                    )),
              ],
            ),
            loading: () => const Center(
              child: CircularProgressIndicator(),
            ),
            error: (_, __) => const SizedBox.shrink(),
          ),

          const SizedBox(height: 20),
          // AI Chat Assistant Embedded
          Text(
            'Ask AI Assistant',
            style: GoogleFonts.outfit(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            height: 350,
            child: DsaAiChatWidget(submissionId: problem.id),
          ),
        ],
      ),
    );
  }

  Widget _buildComplexityChip(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: const TextStyle(
          fontFamily: 'monospace',
          fontSize: 10,
          color: Color(0xFF94A3B8),
        ),
      ),
    );
  }

  Widget _buildSubmissionsTab(DsaProblem problem) {
    if (_isLoadingSubmissions) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_pastSubmissions.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.history_toggle_off, size: 48, color: Colors.white24),
            const SizedBox(height: 12),
            Text(
              'No submissions yet.',
              style: GoogleFonts.outfit(color: Colors.white54),
            ),
            const SizedBox(height: 8),
            FilledButton.tonal(
              onPressed: () => _fetchSubmissions(problem.id),
              child: const Text('Refresh Submissions'),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _pastSubmissions.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final sub = _pastSubmissions[index];
        final isAc = sub.status == SubmissionStatus.accepted;
        final color = isAc ? const Color(0xFF10B981) : const Color(0xFFEF4444);

        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
          ),
          child: Row(
            children: [
              Icon(isAc ? Icons.check_circle : Icons.cancel, color: color, size: 20),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    sub.statusDisplay,
                    style: GoogleFonts.outfit(
                      color: color,
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                  Text(
                    '${sub.language} • ${sub.submittedAt.toLocal().toString().substring(0, 16)}',
                    style: GoogleFonts.outfit(color: Colors.white38, fontSize: 11),
                  ),
                ],
              ),
              const Spacer(),
              if (sub.runtimeMs != null)
                Text(
                  '${sub.runtimeMs} ms',
                  style: GoogleFonts.outfit(
                    color: const Color(0xFF38BDF8),
                    fontSize: 12,
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

