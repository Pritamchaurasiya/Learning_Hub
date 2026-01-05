import 'dart:math';
import '../../data/models/course_model.dart';

/// Search result with relevance score
class SearchResult<T> {
  final T item;
  final double score;
  final List<SearchHighlight> highlights;
  final Map<String, dynamic>? metadata;

  const SearchResult({
    required this.item,
    required this.score,
    this.highlights = const [],
    this.metadata,
  });
}

/// Highlighted match in search result
class SearchHighlight {
  final String field;
  final String text;
  final int startIndex;
  final int endIndex;

  const SearchHighlight({
    required this.field,
    required this.text,
    required this.startIndex,
    required this.endIndex,
  });
}

/// Search filter options
class SearchFilter {
  final String? category;
  final List<String>? tags;
  final double? minRating;
  final String? difficulty;
  final Duration? maxDuration;
  final bool? isFree;
  final String? instructorId;
  final DateTime? afterDate;

  const SearchFilter({
    this.category,
    this.tags,
    this.minRating,
    this.difficulty,
    this.maxDuration,
    this.isFree,
    this.instructorId,
    this.afterDate,
  });

  bool get hasFilters =>
      category != null ||
      (tags?.isNotEmpty == true) ||
      minRating != null ||
      difficulty != null ||
      maxDuration != null ||
      isFree != null ||
      instructorId != null ||
      afterDate != null;
}

/// Search sort options
enum SearchSortBy {
  relevance,
  rating,
  popularity,
  newest,
  title,
  duration,
}

/// Search configuration
class SearchConfig {
  final bool fuzzyMatching;
  final double fuzzyThreshold;
  final int maxResults;
  final bool includeHighlights;
  final List<String> searchFields;
  final Map<String, double> fieldWeights;

  const SearchConfig({
    this.fuzzyMatching = true,
    this.fuzzyThreshold = 0.6,
    this.maxResults = 50,
    this.includeHighlights = true,
    this.searchFields = const ['title', 'description', 'tags', 'instructor'],
    this.fieldWeights = const {
      'title': 3.0,
      'tags': 2.0,
      'instructor': 1.5,
      'description': 1.0,
    },
  });
}

/// Search suggestion
class SearchSuggestion {
  final String text;
  final String type; // 'history', 'popular', 'suggestion'
  final int? frequency;

  const SearchSuggestion({
    required this.text,
    required this.type,
    this.frequency,
  });
}

/// Advanced search service with fuzzy matching and ranking
class SearchService {
  static final SearchService _instance = SearchService._();
  static SearchService get instance => _instance;

  SearchService._();

  /// For testing
  factory SearchService() => _instance;

  final List<String> _searchHistory = [];
  final Map<String, int> _popularSearches = {};
  SearchConfig _config = const SearchConfig();

  /// Configure search behavior
  void configure(SearchConfig config) {
    _config = config;
  }

  /// Search courses with advanced features
  List<SearchResult<Course>> searchCourses(
    List<Course> courses,
    String query, {
    SearchFilter? filter,
    SearchSortBy sortBy = SearchSortBy.relevance,
    bool ascending = false,
    SearchConfig? config,
  }) {
    final cfg = config ?? _config;
    final normalizedQuery = _normalizeText(query);

    if (normalizedQuery.isEmpty) {
      return [];
    }

    // Track search history
    _addToHistory(query);

    // Score all courses
    final results = <SearchResult<Course>>[];

    for (final course in courses) {
      // Apply filters first
      if (filter != null && !_passesFilter(course, filter)) {
        continue;
      }

      // Calculate relevance score
      final scoreData = _calculateCourseScore(course, normalizedQuery, cfg);
      final scoreValue = scoreData['score'] as double;
      if (scoreValue > 0) {
        results.add(SearchResult(
          item: course,
          score: scoreValue,
          highlights: cfg.includeHighlights
              ? scoreData['highlights'] as List<SearchHighlight>
              : [],
        ));
      }
    }

    // Sort results
    _sortResults(results, sortBy, ascending);

    // Limit results
    return results.take(cfg.maxResults).toList();
  }

  /// Calculate course relevance score
  Map<String, dynamic> _calculateCourseScore(
    Course course,
    String query,
    SearchConfig cfg,
  ) {
    double score = 0;
    final highlights = <SearchHighlight>[];
    final queryTerms = query.split(RegExp(r'\s+'));

    // Search in title
    final titleScore = _calculateFieldScore(
      course.title,
      'title',
      queryTerms,
      cfg,
      highlights,
    );
    score += titleScore * (cfg.fieldWeights['title'] ?? 1.0);

    // Search in description
    final descScore = _calculateFieldScore(
      course.description,
      'description',
      queryTerms,
      cfg,
      highlights,
    );
    score += descScore * (cfg.fieldWeights['description'] ?? 1.0);

    // Search in tags
    final tagsText = course.tags.join(' ');
    final tagScore = _calculateFieldScore(
      tagsText,
      'tags',
      queryTerms,
      cfg,
      highlights,
    );
    score += tagScore * (cfg.fieldWeights['tags'] ?? 1.0);

    // Search in instructor name
    final instructorScore = _calculateFieldScore(
      course.instructorName,
      'instructor',
      queryTerms,
      cfg,
      highlights,
    );
    score += instructorScore * (cfg.fieldWeights['instructor'] ?? 1.0);

    // Bonus for exact phrase match in title
    if (_normalizeText(course.title).contains(query)) {
      score *= 1.5;
    }

    // Bonus for high-rated courses
    if (course.rating >= 4.5) {
      score *= 1.1;
    }

    return {'score': score, 'highlights': highlights};
  }

  /// Calculate score for a single field
  double _calculateFieldScore(
    String fieldValue,
    String fieldName,
    List<String> queryTerms,
    SearchConfig cfg,
    List<SearchHighlight> highlights,
  ) {
    if (fieldValue.isEmpty) {
      return 0;
    }

    final normalizedField = _normalizeText(fieldValue);
    double totalScore = 0;
    int matchedTerms = 0;

    for (final term in queryTerms) {
      if (term.isEmpty) {
        continue;
      }

      // Exact match
      if (normalizedField.contains(term)) {
        totalScore += 1.0;
        matchedTerms++;

        // Find highlight position
        final index = normalizedField.indexOf(term);
        if (index >= 0) {
          highlights.add(SearchHighlight(
            field: fieldName,
            text: fieldValue.substring(
              index,
              min(index + term.length, fieldValue.length),
            ),
            startIndex: index,
            endIndex: index + term.length,
          ));
        }
      } else if (cfg.fuzzyMatching) {
        // Fuzzy match
        final fuzzyScore =
            _fuzzyMatch(normalizedField, term, cfg.fuzzyThreshold);
        if (fuzzyScore > 0) {
          totalScore += fuzzyScore * 0.7; // Reduce score for fuzzy matches
          matchedTerms++;
        }
      }
    }

    // Normalize by number of query terms
    if (queryTerms.isNotEmpty) {
      totalScore = totalScore * (matchedTerms / queryTerms.length);
    }

    return totalScore;
  }

  /// Fuzzy string matching using Levenshtein distance
  double _fuzzyMatch(String text, String pattern, double threshold) {
    if (pattern.isEmpty) {
      return 0;
    }

    // Check if any word in text is similar to pattern
    final words = text.split(RegExp(r'\s+'));
    double bestScore = 0;

    for (final word in words) {
      if (word.startsWith(pattern)) {
        // Prefix match bonus
        bestScore = max(bestScore, 0.9);
      } else {
        final distance = _levenshteinDistance(word, pattern);
        final maxLen = max(word.length, pattern.length);
        final similarity = 1 - (distance / maxLen);

        if (similarity >= threshold) {
          bestScore = max(bestScore, similarity);
        }
      }
    }

    return bestScore;
  }

  /// Calculate Levenshtein distance between two strings
  int _levenshteinDistance(String s1, String s2) {
    if (s1.isEmpty) {
      return s2.length;
    }
    if (s2.isEmpty) {
      return s1.length;
    }

    final len1 = s1.length;
    final len2 = s2.length;

    // Initialize matrix
    final d = List.generate(len1 + 1, (i) => List.filled(len2 + 1, 0));

    for (var i = 0; i <= len1; i++) {
      d[i][0] = i;
    }
    for (var j = 0; j <= len2; j++) {
      d[0][j] = j;
    }

    for (var i = 1; i <= len1; i++) {
      for (var j = 1; j <= len2; j++) {
        final cost = s1[i - 1] == s2[j - 1] ? 0 : 1;
        d[i][j] = min(
          min(d[i - 1][j] + 1, d[i][j - 1] + 1),
          d[i - 1][j - 1] + cost,
        );
      }
    }

    return d[len1][len2];
  }

  /// Check if course passes filter criteria
  bool _passesFilter(Course course, SearchFilter filter) {
    if (filter.category != null &&
        course.category.toLowerCase() != filter.category!.toLowerCase()) {
      return false;
    }

    if (filter.tags != null && filter.tags!.isNotEmpty) {
      final hasMatchingTag = filter.tags!.any(
        (tag) => course.tags.any((t) => t.toLowerCase() == tag.toLowerCase()),
      );
      if (!hasMatchingTag) {
        return false;
      }
    }

    if (filter.minRating != null && course.rating < filter.minRating!) {
      return false;
    }

    if (filter.difficulty != null &&
        course.difficulty.name.toLowerCase() !=
            filter.difficulty!.toLowerCase()) {
      return false;
    }

    if (filter.maxDuration != null) {
      if (course.totalDuration > filter.maxDuration!) {
        return false;
      }
    }

    if (filter.isFree != null) {
      final courseIsFree = course.price == 0;
      if (courseIsFree != filter.isFree) {
        return false;
      }
    }

    if (filter.instructorId != null &&
        course.instructorId != filter.instructorId) {
      return false;
    }

    if (filter.afterDate != null &&
        course.createdAt.isBefore(filter.afterDate!)) {
      return false;
    }

    return true;
  }

  /// Sort search results
  void _sortResults(
    List<SearchResult<Course>> results,
    SearchSortBy sortBy,
    bool ascending,
  ) {
    final multiplier = ascending ? 1 : -1;

    results.sort((a, b) {
      switch (sortBy) {
        case SearchSortBy.relevance:
          return (b.score - a.score).sign.toInt();
        case SearchSortBy.rating:
          return (a.item.rating.compareTo(b.item.rating)) * multiplier;
        case SearchSortBy.popularity:
          return (a.item.enrolledStudents.compareTo(b.item.enrolledStudents)) *
              multiplier;
        case SearchSortBy.newest:
          return a.item.createdAt.compareTo(b.item.createdAt) * multiplier;
        case SearchSortBy.title:
          return a.item.title.compareTo(b.item.title) * multiplier;
        case SearchSortBy.duration:
          return (a.item.lessonsCount.compareTo(b.item.lessonsCount)) *
              multiplier;
      }
    });
  }

  /// Normalize text for search
  String _normalizeText(String text) {
    return text.toLowerCase().trim().replaceAll(RegExp(r'\s+'), ' ');
  }

  /// Add query to search history
  void _addToHistory(String query) {
    final normalized = query.trim();
    if (normalized.length < 2) {
      return;
    }

    _searchHistory.remove(normalized);
    _searchHistory.insert(0, normalized);

    // Keep history limited
    while (_searchHistory.length > 100) {
      _searchHistory.removeLast();
    }

    // Track popularity
    _popularSearches[normalized] = (_popularSearches[normalized] ?? 0) + 1;
  }

  /// Get search history
  List<String> getSearchHistory({int limit = 10}) {
    return _searchHistory.take(limit).toList();
  }

  /// Get search suggestions
  List<SearchSuggestion> getSuggestions(String query, {int limit = 8}) {
    final suggestions = <SearchSuggestion>[];
    final normalized = _normalizeText(query);

    if (normalized.isEmpty) {
      // Return popular searches
      final popular = _popularSearches.entries.toList()
        ..sort((a, b) => b.value.compareTo(a.value));
      for (final entry in popular.take(limit)) {
        suggestions.add(SearchSuggestion(
          text: entry.key,
          type: 'popular',
          frequency: entry.value,
        ));
      }
      return suggestions;
    }
    // Add matching history items
    for (final item in _searchHistory) {
      if (_normalizeText(item).contains(normalized) && item != query) {
        suggestions.add(SearchSuggestion(
          text: item,
          type: 'history',
        ));
        if (suggestions.length >= limit) break;
      }
    }

    // Add popular searches that match
    if (suggestions.length < limit) {
      final popular = _popularSearches.entries
          .where((e) => _normalizeText(e.key).contains(normalized))
          .toList()
        ..sort((a, b) => b.value.compareTo(a.value));

      for (final entry in popular) {
        if (suggestions.any((s) => s.text == entry.key)) continue;
        suggestions.add(SearchSuggestion(
          text: entry.key,
          type: 'popular',
          frequency: entry.value,
        ));
        if (suggestions.length >= limit) break;
      }
    }

    return suggestions;
  }

  /// Clear search history
  void clearHistory() {
    _searchHistory.clear();
  }

  /// Clear popular searches
  void clearPopular() {
    _popularSearches.clear();
  }

  /// Get available filter options from courses
  Map<String, Set<String>> getFilterOptions(List<Course> courses) {
    final categories = <String>{};
    final difficulties = <String>{};
    final tags = <String>{};
    final instructors = <String>{};

    for (final course in courses) {
      categories.add(course.category);
      difficulties.add(course.difficulty.name);
      tags.addAll(course.tags);
      instructors.add(course.instructorName);
    }

    return {
      'categories': categories,
      'difficulties': difficulties,
      'tags': tags,
      'instructors': instructors,
    };
  }
}

/// Global search service instance
final search = SearchService.instance;
