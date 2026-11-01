import 'dart:math';
import '../../data/models/course_model.dart';
import '../services/ai/embedding_client.dart';

/// Represents a piece of indexed knowledge
class KnowledgeSnippet {
  final String text;
  final String source; // Lesson title or Course title
  final List<double> embedding;
  final Map<String, dynamic> metadata;

  KnowledgeSnippet({
    required this.text,
    required this.source,
    required this.embedding,
    required this.metadata,
  });
}

/// Repository for semantic search across course materials
class KnowledgeRepository {
  final EmbeddingClient _embeddingClient;
  final List<KnowledgeSnippet> _snippets = [];

  KnowledgeRepository(this._embeddingClient);

  /// Index an entire course and its lessons
  Future<void> indexCourse(Course course) async {
    if (!_embeddingClient.isAvailable) return;

    final List<String> textsToIndex = [];
    final List<Map<String, String>> sourceMetadata = [];

    // 1. Add course overview
    textsToIndex.add(course.description);
    sourceMetadata.add({'source': course.title, 'type': 'course_overview'});

    // 2. Add each lesson
    for (final section in course.sections) {
      for (final lesson in section.lessons) {
        final content = _combineLessonContent(lesson);
        if (content.isNotEmpty) {
          textsToIndex.add(content);
          sourceMetadata.add({
            'source': '${course.title} > ${lesson.title}',
            'type': 'lesson'
          });
        }
      }
    }

    // 3. Batch generate embeddings
    try {
      final embeddings =
          await _embeddingClient.generateEmbeddings(textsToIndex);

      for (int i = 0; i < embeddings.length; i++) {
        _snippets.add(KnowledgeSnippet(
          text: textsToIndex[i],
          source: sourceMetadata[i]['source']!,
          embedding: embeddings[i],
          metadata: sourceMetadata[i],
        ));
      }
    } catch (e) {
      // Log error (God-Mode: fail gracefully)
    }
  }

  /// Find most relevant snippets for a query
  Future<List<KnowledgeSnippet>> findRelevantSnippets(String query,
      {int limit = 3}) async {
    if (!_embeddingClient.isAvailable || _snippets.isEmpty) return [];

    try {
      final queryEmbedding = await _embeddingClient.generateEmbedding(query);

      // Calculate cosine similarity for all snippets
      final List<MapEntry<KnowledgeSnippet, double>> scoredSnippets = [];

      for (final snippet in _snippets) {
        final score = _cosineSimilarity(queryEmbedding, snippet.embedding);
        scoredSnippets.add(MapEntry(snippet, score));
      }

      // Sort by score descending
      scoredSnippets.sort((a, b) => b.value.compareTo(a.value));

      return scoredSnippets
          .take(limit)
          .where((entry) => entry.value > 0.7) // Threshold for relevance
          .map((entry) => entry.key)
          .toList();
    } catch (e) {
      return [];
    }
  }

  String _combineLessonContent(Lesson lesson) {
    final buffer = StringBuffer();
    buffer.writeln(lesson.title);
    buffer.writeln(lesson.description);
    if (lesson.articleContent != null) {
      buffer.writeln(lesson.articleContent);
    }
    return buffer.toString();
  }

  /// God-Tier Math: Cosine Similarity implementation in pure Dart
  double _cosineSimilarity(List<double> vectorA, List<double> vectorB) {
    if (vectorA.length != vectorB.length) return 0.0;

    double dotProduct = 0.0;
    double normA = 0.0;
    double normB = 0.0;

    for (int i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    if (normA == 0.0 || normB == 0.0) return 0.0;
    return dotProduct / (sqrt(normA) * sqrt(normB));
  }
}
