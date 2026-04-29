import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import 'package:learning_hub/core/theme/app_colors.dart';
import 'package:learning_hub/data/models/dsa_problem.dart';
import 'package:learning_hub/features/dsa/dsa_problem_detail_screen.dart';

/// State for DSA problems list
class DsaProblemsState {
  final List<DsaProblem> problems;
  final bool isLoading;
  final String? error;
  final String? selectedDifficulty;
  final String? selectedTag;

  const DsaProblemsState({
    this.problems = const [],
    this.isLoading = false,
    this.error,
    this.selectedDifficulty,
    this.selectedTag,
  });

  DsaProblemsState copyWith({
    List<DsaProblem>? problems,
    bool? isLoading,
    String? error,
    String? selectedDifficulty,
    String? selectedTag,
  }) {
    return DsaProblemsState(
      problems: problems ?? this.problems,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      selectedDifficulty: selectedDifficulty ?? this.selectedDifficulty,
      selectedTag: selectedTag ?? this.selectedTag,
    );
  }
}

/// Notifier for DSA problems
class DsaProblemsNotifier extends StateNotifier<DsaProblemsState> {
  final Dio _dio;

  DsaProblemsNotifier(this._dio) : super(const DsaProblemsState()) {
    loadProblems();
  }

  Future<void> loadProblems() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final queryParams = <String, String>{};
      if (state.selectedDifficulty != null) {
        queryParams['difficulty'] = state.selectedDifficulty!;
      }
      if (state.selectedTag != null) {
        queryParams['tag'] = state.selectedTag!;
      }

      final response = await _dio.get<Map<String, dynamic>>(
        '/api/v1/dsa/problems/',
        queryParameters: queryParams,
      );

      final results = response.data?['results'] as List<dynamic>? ?? [];
      final problems = results
          .map((e) => DsaProblem.fromJson(e as Map<String, dynamic>))
          .toList();

      state = state.copyWith(problems: problems, isLoading: false);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to load problems: $e',
      );
    }
  }

  void setDifficultyFilter(String? difficulty) {
    state = state.copyWith(selectedDifficulty: difficulty);
    loadProblems();
  }

  void setTagFilter(String? tag) {
    state = state.copyWith(selectedTag: tag);
    loadProblems();
  }
}

/// Provider for DSA problems
final dsaProblemsProvider =
    StateNotifierProvider<DsaProblemsNotifier, DsaProblemsState>((ref) {
  final dio = Dio(BaseOptions(
    baseUrl: 'http://127.0.0.1:8000',
    connectTimeout: const Duration(seconds: 10),
  ));
  return DsaProblemsNotifier(dio);
});

/// DSA Problems Screen
class DsaProblemsScreen extends ConsumerWidget {
  const DsaProblemsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(dsaProblemsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('DSA Practice'),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.filter_list),
            onSelected: (value) {
              ref.read(dsaProblemsProvider.notifier).setDifficultyFilter(
                    value == 'ALL' ? null : value,
                  );
            },
            itemBuilder: (context) => [
              const PopupMenuItem(value: 'ALL', child: Text('All Levels')),
              const PopupMenuItem(value: 'EASY', child: Text('Easy')),
              const PopupMenuItem(value: 'MEDIUM', child: Text('Medium')),
              const PopupMenuItem(value: 'HARD', child: Text('Hard')),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () =>
                ref.read(dsaProblemsProvider.notifier).loadProblems(),
          ),
        ],
      ),
      body: _buildBody(state, ref, context),
    );
  }

  Widget _buildBody(
      DsaProblemsState state, WidgetRef ref, BuildContext context) {
    if (state.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: AppColors.error),
            const SizedBox(height: 16),
            Text(state.error!, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () =>
                  ref.read(dsaProblemsProvider.notifier).loadProblems(),
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (state.problems.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.code, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text('No problems found'),
            SizedBox(height: 8),
            Text('Check your filters or try again later'),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: state.problems.length,
      itemBuilder: (context, index) {
        final problem = state.problems[index];
        return _ProblemCard(problem: problem);
      },
    );
  }
}

class _ProblemCard extends StatelessWidget {
  final DsaProblem problem;

  const _ProblemCard({required this.problem});

  Color _getDifficultyColor() {
    switch (problem.difficulty) {
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

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute<void>(
              builder: (context) => DsaProblemDetailScreen(problem: problem),
            ),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: _getDifficultyColor().withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  Icons.code,
                  color: _getDifficultyColor(),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      problem.title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Wrap(
                      spacing: 8,
                      children: [
                        _DifficultyChip(
                          difficulty: problem.difficulty,
                          color: _getDifficultyColor(),
                        ),
                        ...problem.tags.take(2).map(
                              (tag) => Chip(
                                label: Text(
                                  tag,
                                  style: const TextStyle(fontSize: 10),
                                ),
                                padding: EdgeInsets.zero,
                                materialTapTargetSize:
                                    MaterialTapTargetSize.shrinkWrap,
                              ),
                            ),
                      ],
                    ),
                  ],
                ),
              ),
              Column(
                children: [
                  Text(
                    '${problem.points}',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: AppColors.primary,
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const Text('pts', style: TextStyle(fontSize: 10)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DifficultyChip extends StatelessWidget {
  final String difficulty;
  final Color color;

  const _DifficultyChip({required this.difficulty, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color, width: 1),
      ),
      child: Text(
        difficulty,
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
