class DsaProblem {
  final int? id; // Nullable because list view might not return it? No, list view serializer has it.
  final String slug;
  final String title;
  final String difficulty;
  final int points;
  final List<String> tags;
  final String? description;
  final String? constraints;
  final String? inputFormat;
  final String? outputFormat;

  DsaProblem({
    this.id,
    required this.slug,
    required this.title,
    required this.difficulty,
    required this.points,
    required this.tags,
    this.description,
    this.constraints,
    this.inputFormat,
    this.outputFormat,
  });

  factory DsaProblem.fromJson(Map<String, dynamic> json) {
    return DsaProblem(
      id: json['id'] as int?,
      slug: json['slug'] as String? ?? '',
      title: json['title'] as String? ?? 'Untitled',
      difficulty: json['difficulty'] as String? ?? 'MEDIUM',
      points: json['points'] as int? ?? 0,
      tags: (json['tags'] as List<dynamic>?)
              ?.map((e) => (e is Map) ? e['name'] as String : e.toString())
              .toList() ??
          [],
      description: json['description'] as String?,
      constraints: json['constraints'] as String?,
      inputFormat: json['input_format'] as String?,
      outputFormat: json['output_format'] as String?,
    );
  }
}
