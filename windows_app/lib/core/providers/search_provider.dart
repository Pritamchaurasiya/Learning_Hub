import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rxdart/rxdart.dart';
import '../services/search_service.dart';
import '../services/course_service.dart';
import '../../data/models/course_model.dart';

/// Search Filter State
class SearchFilters {
  final String query;
  final String category;
  final String level;
  final String sortBy;
  final double? minRating;
  final RangeValues? priceRange;

  const SearchFilters({
    this.query = '',
    this.category = 'All',
    this.level = 'All',
    this.sortBy = 'Relevance',
    this.minRating,
    this.priceRange,
  });

  SearchFilters copyWith({
    String? query,
    String? category,
    String? level,
    String? sortBy,
    double? minRating,
    RangeValues? priceRange,
  }) {
    return SearchFilters(
      query: query ?? this.query,
      category: category ?? this.category,
      level: level ?? this.level,
      sortBy: sortBy ?? this.sortBy,
      minRating: minRating ?? this.minRating,
      priceRange: priceRange ?? this.priceRange,
    );
  }
}

/// Search State
class SearchState {
  final List<Course> results;
  final bool isLoading;
  final List<String> recentSearches;
  final List<String> suggestions;
  final SearchFilters filters;

  const SearchState({
    required this.results,
    required this.filters,
    this.isLoading = false,
    this.recentSearches = const [],
    this.suggestions = const [],
  });

  SearchState copyWith({
    List<Course>? results,
    SearchFilters? filters,
    bool? isLoading,
    List<String>? recentSearches,
    List<String>? suggestions,
  }) {
    return SearchState(
      results: results ?? this.results,
      filters: filters ?? this.filters,
      isLoading: isLoading ?? this.isLoading,
      recentSearches: recentSearches ?? this.recentSearches,
      suggestions: suggestions ?? this.suggestions,
    );
  }
}

/// Search Notifier
class SearchNotifier extends Notifier<SearchState> {
  final _searchService = SearchService.instance;
  final _courseService = CourseService.instance;
  final _searchSubject = PublishSubject<String>();

  @override
  SearchState build() {
    _loadHistory();

    // Debounce search input
    _searchSubject
        .debounceTime(const Duration(milliseconds: 300))
        .listen((query) {
      _performSearch(query);
    });

    return const SearchState(
      results: [],
      filters: SearchFilters(),
      recentSearches: [],
    );
  }

  Future<void> _loadHistory() async {
    final history = _searchService.getSearchHistory();
    state = state.copyWith(recentSearches: history);
  }

  void updateQuery(String query) {
    state = state.copyWith(
      filters: state.filters.copyWith(query: query),
      suggestions: query.isEmpty
          ? []
          : _searchService.getSuggestions(query).map((s) => s.text).toList(),
    );
    _searchSubject.add(query);
  }

  void updateFilters({
    String? category,
    String? level,
    String? sortBy,
  }) {
    state = state.copyWith(
      filters: state.filters.copyWith(
        category: category,
        level: level,
        sortBy: sortBy,
      ),
    );
    // Re-run search with new filters
    _performSearch(state.filters.query);
  }

  Future<void> _performSearch(String query) async {
    if (query.isEmpty &&
        state.filters.category == 'All' &&
        state.filters.level == 'All') {
      state = state.copyWith(results: [], isLoading: false);
      return;
    }

    state = state.copyWith(isLoading: true);

    try {
      // Fetch all courses to search through
      // In a real app with pagination, this would be an API search call
      // But preserving specific 'SearchService' client-side logic as requested
      final allCourses = await _courseService.getCourses();

      final results = _searchService.searchCourses(
        allCourses,
        query,
        filter: SearchFilter(
          category:
              state.filters.category == 'All' ? null : state.filters.category,
          difficulty: state.filters.level == 'All' ? null : state.filters.level,
          minRating: state.filters.minRating,
          // Map other filters as needed
        ),
        sortBy: _mapSortOption(state.filters.sortBy),
      );

      // Extract Course items from SearchResult
      final courseResults = results.map((r) => r.item).toList();

      state = state.copyWith(
        results: courseResults,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, results: []);
      // Handle error cleanly
    }
  }

  SearchSortBy _mapSortOption(String sort) {
    switch (sort) {
      case 'Relevance':
        return SearchSortBy.relevance;
      case 'Most Popular':
        return SearchSortBy.popularity;
      case 'Highest Rated':
        return SearchSortBy.rating;
      case 'Newest':
        return SearchSortBy.newest;
      case 'Duration':
        return SearchSortBy.duration;
      case 'Title':
        return SearchSortBy.title;
      default:
        return SearchSortBy.relevance;
    }
  }

  void clearHistory() {
    _searchService.clearHistory();
    state = state.copyWith(recentSearches: []);
  }

  /// Get search suggestions
  List<String> getSuggestions(String query) {
    // Adapter for UI consuming List<String>
    return _searchService.getSuggestions(query).map((s) => s.text).toList();
  }
}

final searchProvider = NotifierProvider<SearchNotifier, SearchState>(() {
  return SearchNotifier();
});
