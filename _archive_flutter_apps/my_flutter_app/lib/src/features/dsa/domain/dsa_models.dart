class DsaTag {
  DsaTag({required this.id, required this.name, required this.slug});
  factory DsaTag.fromJson(Map<String, dynamic> json) {
    return DsaTag(
      id: json['id'] as int,
      name: json['name'] as String,
      slug: json['slug'] as String,
    );
  }
  final int id;
  final String name;
  final String slug;
}

class DsaProblem {
  DsaProblem({
    required this.id,
    required this.title,
    required this.slug,
    required this.description,
    required this.difficulty,
    required this.points,
    this.tags = const [],
    required this.constraints,
    required this.inputFormat,
    required this.outputFormat,
    required this.examples,
    this.starterCode = const {},
  });

  factory DsaProblem.fromJson(Map<String, dynamic> json) {
    final rawExamples = (json['examples'] ?? json['example_cases']) as List? ?? [];
    return DsaProblem(
      id: (json['id'] is int) ? json['id'] as int : int.tryParse(json['id'].toString()) ?? 0,
      title: json['title'] as String? ?? 'Problem',
      slug: json['slug'] as String? ?? '',
      description: (json['description'] ?? '') as String,
      difficulty: (json['difficulty'] ?? 'EASY') as String,
      points: (json['points'] is int) ? json['points'] as int : 10,
      tags: (json['tags'] as List? ?? [])
          .map((e) => e is Map<String, dynamic>
              ? DsaTag.fromJson(e)
              : DsaTag(id: 0, name: e.toString(), slug: e.toString()))
          .toList(),
      constraints: (json['constraints'] ?? '') as String,
      inputFormat: (json['input_format'] ?? '') as String,
      outputFormat: (json['output_format'] ?? '') as String,
      examples: rawExamples
          .map((e) => DsaTestCase.fromJson(e as Map<String, dynamic>))
          .toList(),
      starterCode: (json['starter_code'] as Map<String, dynamic>?)?.map(
            (k, v) => MapEntry(k, v.toString()),
          ) ??
          {
            'python': 'def solve():\n    # Write your solution here\n    pass\n',
            'javascript': 'function solve() {\n    // Write your solution here\n}\n',
            'cpp': '#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}\n',
          },
    );
  }

  final int id;
  final String title;
  final String slug;
  final String description;
  final String difficulty;
  final int points;
  final List<DsaTag> tags;
  final String constraints;
  final String inputFormat;
  final String outputFormat;
  final List<DsaTestCase> examples;
  final Map<String, String> starterCode;
}

class DsaTestCase {
  DsaTestCase({
    required this.id,
    required this.inputData,
    required this.expectedOutput,
    this.explanation,
  });

  factory DsaTestCase.fromJson(Map<String, dynamic> json) {
    return DsaTestCase(
      id: (json['id'] is int) ? json['id'] as int : 0,
      inputData: (json['input_data'] ?? json['input'] ?? '') as String,
      expectedOutput: (json['expected_output'] ?? json['output'] ?? '') as String,
      explanation: json['explanation'] as String?,
    );
  }
  final int id;
  final String inputData;
  final String expectedOutput;
  final String? explanation;
}

enum SubmissionStatus {
  pending,
  accepted,
  wrongAnswer,
  timeLimitExceeded,
  runtimeError,
  compilationError
}

class DsaSubmission {
  DsaSubmission({
    required this.id,
    required this.problemId,
    required this.code,
    required this.language,
    required this.status,
    required this.statusDisplay,
    this.runtimeMs,
    this.memoryKb,
    this.errorLog,
    this.aiFeedback,
    required this.submittedAt,
  });

  factory DsaSubmission.fromJson(Map<String, dynamic> json) {
    SubmissionStatus parseStatus(String s) {
      switch (s.toUpperCase()) {
        case 'AC':
        case 'ACCEPTED':
          return SubmissionStatus.accepted;
        case 'WA':
        case 'WRONG_ANSWER':
          return SubmissionStatus.wrongAnswer;
        case 'TLE':
        case 'TIME_LIMIT_EXCEEDED':
          return SubmissionStatus.timeLimitExceeded;
        case 'RE':
        case 'RUNTIME_ERROR':
          return SubmissionStatus.runtimeError;
        case 'CE':
        case 'COMPILATION_ERROR':
          return SubmissionStatus.compilationError;
        default:
          return SubmissionStatus.pending;
      }
    }

    return DsaSubmission(
      id: (json['id'] is int) ? json['id'] as int : 0,
      problemId: (json['problem'] is int) ? json['problem'] as int : 0,
      code: json['code'] as String? ?? '',
      language: json['language'] as String? ?? 'python',
      status: parseStatus((json['status'] ?? 'PENDING') as String),
      statusDisplay: json['status_display'] as String? ?? (json['status'] as String? ?? 'Pending'),
      runtimeMs: json['runtime_ms'] as int?,
      memoryKb: json['memory_kb'] as int?,
      errorLog: json['error_log'] as String?,
      aiFeedback: json['ai_feedback'] as Map<String, dynamic>?,
      submittedAt: json['submitted_at'] != null
          ? DateTime.tryParse(json['submitted_at'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  final int id;
  final int problemId;
  final String code;
  final String language;
  final SubmissionStatus status;
  final String statusDisplay;
  final int? runtimeMs;
  final int? memoryKb;
  final String? errorLog;
  final Map<String, dynamic>? aiFeedback;
  final DateTime submittedAt;
}

class DsaValidationResult {
  DsaValidationResult({
    required this.submissionId,
    required this.status,
    required this.passedTests,
    required this.totalTests,
    this.executionTimeMs,
    this.memoryKb,
    this.feedback,
  });

  factory DsaValidationResult.fromJson(Map<String, dynamic> json) {
    return DsaValidationResult(
      submissionId: (json['submission_id'] is int) ? json['submission_id'] as int : 0,
      status: json['status'] as String? ?? 'UNKNOWN',
      passedTests: (json['passed_tests'] is int) ? json['passed_tests'] as int : 0,
      totalTests: (json['total_tests'] is int) ? json['total_tests'] as int : 0,
      executionTimeMs: (json['execution_time_ms'] is num) ? (json['execution_time_ms'] as num).toDouble() : null,
      memoryKb: json['memory_kb'] as int?,
      feedback: json['feedback'] as String?,
    );
  }

  final int submissionId;
  final String status;
  final int passedTests;
  final int totalTests;
  final double? executionTimeMs;
  final int? memoryKb;
  final String? feedback;

  bool get isPassed => passedTests == totalTests && totalTests > 0;
}

class DsaApproach {
  DsaApproach({
    required this.name,
    required this.timeComplexity,
    required this.spaceComplexity,
    required this.description,
  });

  factory DsaApproach.fromJson(Map<String, dynamic> json) {
    return DsaApproach(
      name: json['name'] as String? ?? 'Approach',
      timeComplexity: json['time_complexity'] as String? ?? 'O(N)',
      spaceComplexity: json['space_complexity'] as String? ?? 'O(1)',
      description: json['description'] as String? ?? '',
    );
  }

  final String name;
  final String timeComplexity;
  final String spaceComplexity;
  final String description;
}

class DsaExplanation {
  DsaExplanation({
    required this.title,
    required this.difficulty,
    required this.intuition,
    required this.approaches,
    this.edgeCases = const [],
  });

  factory DsaExplanation.fromJson(Map<String, dynamic> json) {
    return DsaExplanation(
      title: json['title'] as String? ?? '',
      difficulty: json['difficulty'] as String? ?? 'EASY',
      intuition: json['intuition'] as String? ?? '',
      approaches: (json['approaches'] as List? ?? [])
          .map((e) => DsaApproach.fromJson(e as Map<String, dynamic>))
          .toList(),
      edgeCases: (json['edge_cases'] as List? ?? [])
          .map((e) => e.toString())
          .toList(),
    );
  }

  final String title;
  final String difficulty;
  final String intuition;
  final List<DsaApproach> approaches;
  final List<String> edgeCases;
}

class DsaPOTD {
  DsaPOTD({
    required this.date,
    required this.bonusXp,
    required this.solvedCount,
    required this.problem,
  });

  factory DsaPOTD.fromJson(Map<String, dynamic> json) {
    return DsaPOTD(
      date: json['date'] as String? ?? '',
      bonusXp: (json['bonus_xp'] is int) ? json['bonus_xp'] as int : 50,
      solvedCount: (json['solved_count'] is int) ? json['solved_count'] as int : 0,
      problem: DsaProblem.fromJson(json['problem'] as Map<String, dynamic>),
    );
  }

  final String date;
  final int bonusXp;
  final int solvedCount;
  final DsaProblem problem;
}
