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
  });

  factory DsaProblem.fromJson(Map<String, dynamic> json) {
    return DsaProblem(
      id: json['id'] as int,
      title: json['title'] as String,
      slug: json['slug'] as String,
      description: (json['description'] ?? '') as String,
      difficulty: json['difficulty'] as String,
      points: json['points'] as int,
      tags: (json['tags'] as List? ?? [])
          .map((e) => DsaTag.fromJson(e as Map<String, dynamic>))
          .toList(),
      constraints: (json['constraints'] ?? '') as String,
      inputFormat: (json['input_format'] ?? '') as String,
      outputFormat: (json['output_format'] ?? '') as String,
      examples: (json['example_cases'] as List? ?? [])
          .map((e) => DsaTestCase.fromJson(e as Map<String, dynamic>))
          .toList(),
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
      id: json['id'] as int,
      inputData: json['input_data'] as String,
      expectedOutput: json['expected_output'] as String,
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
      switch (s) {
        case 'AC':
          return SubmissionStatus.accepted;
        case 'WA':
          return SubmissionStatus.wrongAnswer;
        case 'TLE':
          return SubmissionStatus.timeLimitExceeded;
        case 'RE':
          return SubmissionStatus.runtimeError;
        case 'CE':
          return SubmissionStatus.compilationError;
        default:
          return SubmissionStatus.pending;
      }
    }

    return DsaSubmission(
      id: json['id'] as int,
      problemId: json['problem'] as int,
      code: json['code'] as String,
      language: json['language'] as String,
      status: parseStatus(json['status'] as String),
      statusDisplay: json['status_display'] as String,
      runtimeMs: json['runtime_ms'] as int?,
      memoryKb: json['memory_kb'] as int?,
      errorLog: json['error_log'] as String?,
      aiFeedback: json['ai_feedback'] as Map<String, dynamic>?,
      submittedAt: DateTime.parse(json['submitted_at'] as String),
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
